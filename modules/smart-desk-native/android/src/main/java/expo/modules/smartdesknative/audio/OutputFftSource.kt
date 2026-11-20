package expo.modules.smartdesknative.audio

import android.media.audiofx.Visualizer
import android.util.Log
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.sqrt

/**
 * Primary beat source: `Visualizer(0)` on the global output mix.
 *
 * It deliberately uses the **waveform** callback, not the FFT callback: on
 * Android 14/16 devices the FFT byte array comes back clipped and erratic
 * (adjacent bins jumping 0 → 255, the second half of the buffer filled with
 * 0xFF), which makes every band saturate. The waveform is plain 8-bit PCM of
 * the output mix, so we run the same windowed FFT + band mapping as the
 * microphone fallback and get a spectrum we can trust.
 *
 * `Visualizer(0)` still needs no MediaProjection and no screen capture, but on
 * some builds it never delivers samples at all — [hasEnergy] tells the owner to
 * switch to the microphone.
 */
internal class OutputFftSource(
  private val mapper: BandMapper,
  private val sampleRate: Int,
  private val onFrame: (FloatArray, Float) -> Unit
) {
  private companion object {
    const val TAG = "SystemAudioVisualizer"
    /** 20000 mHz = 20 frames per second, plenty for a beat meter. */
    const val CAPTURE_RATE_MHZ = 20_000
  }

  private var visualizer: Visualizer? = null
  private var window = FloatArray(0)
  private var re = FloatArray(0)
  private var im = FloatArray(0)
  private var magnitudes = FloatArray(0)

  @Volatile
  var hasEnergy: Boolean = false
    private set

  @Volatile
  var isRunning: Boolean = false
    private set

  /** @return true when the Visualizer was created and enabled. */
  fun start(): Boolean {
    if (isRunning) return true
    return try {
      val effect = Visualizer(0)
      val captureSize = min(Visualizer.getCaptureSizeRange()[1], 1024)
      effect.captureSize = captureSize

      window = AudioFft.hann(captureSize)
      re = FloatArray(captureSize)
      im = FloatArray(captureSize)
      magnitudes = FloatArray(captureSize / 2)
      mapper.configure(captureSize / 2, sampleRate / 2.0)

      val listener = object : Visualizer.OnDataCaptureListener {
        override fun onWaveFormDataCapture(
          visualizer: Visualizer?,
          waveform: ByteArray?,
          samplingRate: Int
        ) {
          if (waveform == null || waveform.isEmpty()) return
          val count = min(waveform.size, re.size)

          var sumSquares = 0.0
          var peak = 0
          for (index in 0 until count) {
            // Unsigned 8-bit PCM centred on 128.
            val sample = (waveform[index].toInt() and 0xFF) - 128
            val magnitude = abs(sample)
            if (magnitude > peak) peak = magnitude
            val value = sample / 128f
            sumSquares += (value * value).toDouble()
            re[index] = value * window[index]
            im[index] = 0f
          }
          for (index in count until re.size) {
            re[index] = 0f
            im[index] = 0f
          }
          if (peak > 3) hasEnergy = true

          AudioFft.transform(re, im)
          val gain = captureSize / 4f
          for (index in 0 until captureSize / 2) {
            val real = re[index]
            val imag = im[index]
            magnitudes[index] = sqrt(real * real + imag * imag) / gain
          }

          val rms = sqrt(sumSquares / count.coerceAtLeast(1))
          val level = mapper.rmsToLevel(rms)
          onFrame(mapper.map(magnitudes, level), level)
        }

        override fun onFftDataCapture(
          visualizer: Visualizer?,
          fft: ByteArray?,
          samplingRate: Int
        ) = Unit
      }

      // The framework invokes the listener on its own audio thread; Visualizer
      // has no Handler overload, so frames are handled inline.
      effect.setDataCaptureListener(listener, CAPTURE_RATE_MHZ, true, false)
      effect.enabled = true

      visualizer = effect
      isRunning = true
      true
    } catch (error: Exception) {
      Log.w(TAG, "Visualizer(0) unavailable: ${error.message}")
      release()
      false
    }
  }

  fun stop() {
    isRunning = false
    release()
  }

  private fun release() {
    hasEnergy = false
    try {
      visualizer?.enabled = false
    } catch (error: Exception) {
      // Already released or the effect was never enabled.
    }
    try {
      visualizer?.release()
    } catch (error: Exception) {
      // Nothing to do; the effect is gone either way.
    }
    visualizer = null
  }
}
