package expo.modules.smartdesknative.audio

import kotlin.math.cos
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sqrt

/**
 * Small, allocation-light FFT + band mapper shared by the two capture paths
 * (Visualizer on the output mix and the AudioRecord microphone fallback).
 *
 * Everything here runs on a capture thread, so it must not allocate per frame:
 * buffers are created once by the callers and reused.
 */
internal object AudioFft {
  /**
   * In-place iterative radix-2 Cooley-Tukey FFT. [re] and [im] must have the
   * same power-of-two length.
   */
  fun transform(re: FloatArray, im: FloatArray) {
    val n = re.size
    if (n < 2 || n and (n - 1) != 0) return

    var j = 0
    for (i in 1 until n) {
      var bit = n shr 1
      while (j and bit != 0) {
        j = j xor bit
        bit = bit shr 1
      }
      j = j or bit
      if (i < j) {
        val tr = re[i]; re[i] = re[j]; re[j] = tr
        val ti = im[i]; im[i] = im[j]; im[j] = ti
      }
    }

    var len = 2
    while (len <= n) {
      val angle = -2.0 * Math.PI / len
      val wRe = cos(angle).toFloat()
      val wIm = kotlin.math.sin(angle).toFloat()
      val half = len shr 1
      var i = 0
      while (i < n) {
        var curRe = 1f
        var curIm = 0f
        for (k in 0 until half) {
          val a = i + k
          val b = a + half
          val vRe = re[b] * curRe - im[b] * curIm
          val vIm = re[b] * curIm + im[b] * curRe
          val uRe = re[a]
          val uIm = im[a]
          re[a] = uRe + vRe
          im[a] = uIm + vIm
          re[b] = uRe - vRe
          im[b] = uIm - vIm
          val nextRe = curRe * wRe - curIm * wIm
          curIm = curRe * wIm + curIm * wRe
          curRe = nextRe
        }
        i += len
      }
      len = len shl 1
    }
  }

  /** Hann window, cached per size by the caller. */
  fun hann(size: Int): FloatArray =
    FloatArray(size) { index ->
      (0.5 - 0.5 * cos(2.0 * Math.PI * index / (size - 1))).toFloat()
    }
}

/**
 * Maps a magnitude spectrum onto a fixed number of logarithmically spaced bands
 * (so kick drums and sub-bass get as much room as the mids) and applies an
 * envelope follower so the bars follow the beat instead of twitching.
 *
 * Input magnitudes are linear (0..1) for both capture paths — the output path
 * runs its own FFT over the Visualizer waveform instead of trusting the
 * Visualizer FFT bytes, which are clipped and erratic on recent Android builds.
 *
 * A single global ceiling (slow decay) keeps the spectral shape intact while
 * making beats visible, and the caller-supplied gate drops the bars to zero when
 * nothing is playing.
 */
internal class BandMapper(private val bandCount: Int) {
  private var edges = IntArray(0)
  private var binCount = -1
  private var nyquist = -1.0
  private val raw = FloatArray(bandCount)
  private val values = FloatArray(bandCount)
  private val targets = FloatArray(bandCount)
  private var ceiling = 0.3f

  private companion object {
    const val MIN_HZ = 40.0
    const val MAX_HZ = 15_000.0
    const val FLOOR_DB = -58.0
    const val CEILING_DECAY = 0.96f
    const val CEILING_MIN = 0.28f
  }

  /** [binCount] bins spanning 0..[nyquistHz]. Cheap no-op when unchanged. */
  fun configure(binCount: Int, nyquistHz: Double) {
    if (binCount == this.binCount && nyquistHz == this.nyquist) return
    this.binCount = binCount
    this.nyquist = nyquistHz

    val top = min(nyquistHz * 0.92, MAX_HZ)
    val ratio = top / MIN_HZ
    val next = IntArray(bandCount + 1) { index ->
      val hz = MIN_HZ * ratio.pow(index.toDouble() / bandCount)
      ((hz / nyquistHz) * binCount).toInt().coerceIn(0, binCount - 1)
    }
    for (index in 1..bandCount) {
      if (next[index] <= next[index - 1]) {
        next[index] = (next[index - 1] + 1).coerceAtMost(binCount)
      }
    }
    edges = next
    raw.fill(0f)
    values.fill(0f)
    targets.fill(0f)
    ceiling = CEILING_MIN
  }

  /**
   * [magnitudes] are linear amplitudes indexed by frequency bin.
   * [gate] (0..1) is the source's loudness: 0 fades the whole meter out.
   * The returned array is reused between frames — copy it if you keep it.
   */
  fun map(magnitudes: FloatArray, gate: Float): FloatArray {
    if (edges.isEmpty()) return values
    val gated = gate.coerceIn(0f, 1f)

    var loudest = 0f
    for (band in 0 until bandCount) {
      var peak = 0f
      val start = edges[band]
      val end = min(edges[band + 1], magnitudes.size)
      var index = start
      while (index < end) {
        val value = magnitudes[index]
        if (value > peak) peak = value
        index++
      }
      val db = 20.0 * log10((peak + 1e-7).toDouble())
      val level = ((db - FLOOR_DB) / -FLOOR_DB).coerceIn(0.0, 1.0).toFloat().pow(1.25f)
      raw[band] = level
      if (level > loudest) loudest = level
    }

    // One ceiling for the whole spectrum: keeps bass/mid/high balance while
    // still making the loudest band hit the top on a beat.
    ceiling = max(loudest, ceiling * CEILING_DECAY).coerceAtLeast(CEILING_MIN)

    for (band in 0 until bandCount) {
      val target = (raw[band] / ceiling).coerceIn(0f, 1f) * gated
      targets[band] = target
      val current = values[band]
      values[band] = if (target > current) {
        current + (target - current) * 0.62f
      } else {
        current * 0.78f + target * 0.22f
      }
    }
    return values
  }

  /** Overall loudness (0..1) from the smoothed bands. */
  fun level(): Float {
    var sum = 0f
    for (band in 0 until bandCount) sum += values[band]
    return (sum / bandCount).coerceIn(0f, 1f)
  }

  fun reset() {
    raw.fill(0f)
    values.fill(0f)
    targets.fill(0f)
    ceiling = CEILING_MIN
  }

  fun rmsToLevel(rms: Double): Float {
    val db = 20.0 * log10(rms + 1e-7)
    return ((db - FLOOR_DB) / -FLOOR_DB).coerceIn(0.0, 1.0).toFloat()
  }
}
