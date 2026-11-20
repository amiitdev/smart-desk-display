package expo.modules.smartdesknative.audio

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import kotlin.math.max
import kotlin.math.sqrt

/**
 * Android 16 fallback beat source.
 *
 * When the global output Visualizer stays silent (the common case on recent
 * Android builds), the only way to follow music from Spotify/YouTube without
 * MediaProjection is to listen to the speakers with the microphone. The app runs
 * on a wall-mounted desk display with the speaker at full volume, so a
 * low-latency 16 kHz capture is enough to recover the kick/snare envelope.
 *
 * Uses UNPROCESSED when the device supports it (no AGC, no noise suppression),
 * otherwise VOICE_RECOGNITION, and always releases the AudioRecord on stop.
 */
internal class MicrophoneFftSource(
  private val context: Context,
  private val mapper: BandMapper,
  private val onFrame: (FloatArray, Float) -> Unit
) {
  private companion object {
    const val TAG = "SystemAudioVisualizer"
    const val SAMPLE_RATE = 16_000
    const val FFT_SIZE = 1024
  }

  private var record: AudioRecord? = null
  private var worker: Thread? = null

  @Volatile
  private var running = false

  val isRunning: Boolean get() = running

  @SuppressLint("MissingPermission")
  fun start(): Boolean {
    if (running) return true
    if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      return false
    }

    val minBuffer = AudioRecord.getMinBufferSize(
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )
    if (minBuffer <= 0) {
      Log.w(TAG, "Microphone capture unsupported (min buffer $minBuffer)")
      return false
    }

    val source = if (supportsUnprocessed()) {
      MediaRecorder.AudioSource.UNPROCESSED
    } else {
      MediaRecorder.AudioSource.VOICE_RECOGNITION
    }

    val recorder = try {
      AudioRecord(
        source,
        SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        max(minBuffer, FFT_SIZE * 8)
      )
    } catch (error: Exception) {
      Log.w(TAG, "AudioRecord creation failed: ${error.message}")
      return false
    }

    if (recorder.state != AudioRecord.STATE_INITIALIZED) {
      recorder.release()
      Log.w(TAG, "AudioRecord did not initialize")
      return false
    }

    return try {
      recorder.startRecording()
      Log.i(TAG, "mic started source=$source minBuffer=$minBuffer")
      record = recorder
      running = true
      mapper.configure(FFT_SIZE / 2, SAMPLE_RATE / 2.0)
      worker = Thread({ loop(recorder) }, "smart-desk-mic-fft").also { it.start() }
      true
    } catch (error: Exception) {
      Log.w(TAG, "AudioRecord could not start: ${error.message}")
      runCatching { recorder.release() }
      running = false
      false
    }
  }

  fun stop() {
    running = false
    worker?.interrupt()
    worker = null
    val recorder = record
    record = null
    if (recorder != null) {
      runCatching { recorder.stop() }
      runCatching { recorder.release() }
    }
  }

  private fun loop(recorder: AudioRecord) {
    val samples = ShortArray(FFT_SIZE)
    val re = FloatArray(FFT_SIZE)
    val im = FloatArray(FFT_SIZE)
    val window = AudioFft.hann(FFT_SIZE)
    val magnitudes = FloatArray(FFT_SIZE / 2)

    while (running) {
      val read = try {
        recorder.read(samples, 0, FFT_SIZE)
      } catch (error: Exception) {
        Log.w(TAG, "Microphone read failed: ${error.message}")
        -1
      }
      if (read <= 0) {
        if (read < 0) break
        continue
      }

      var sumSquares = 0.0
      for (index in 0 until FFT_SIZE) {
        if (index < read) {
          val sample = samples[index] / 32768f
          sumSquares += (sample * sample).toDouble()
          re[index] = sample * window[index]
        } else {
          re[index] = 0f
        }
        im[index] = 0f
      }

      AudioFft.transform(re, im)

      val gain = FFT_SIZE / 4f
      for (index in 0 until FFT_SIZE / 2) {
        val real = re[index]
        val imag = im[index]
        magnitudes[index] = sqrt(real * real + imag * imag) / gain
      }

      val rms = sqrt(sumSquares / read)
      val level = mapper.rmsToLevel(rms)
      val bands = mapper.map(magnitudes, level)
      onFrame(bands, level)
    }
  }

  private fun supportsUnprocessed(): Boolean {
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return false
    return runCatching {
      audio.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED) == "true"
    }.getOrDefault(false)
  }
}
