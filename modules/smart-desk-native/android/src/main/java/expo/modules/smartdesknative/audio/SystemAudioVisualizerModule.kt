package expo.modules.smartdesknative.audio

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import expo.modules.smartdesknative.media.AudioLevelMeter
import java.util.concurrent.Executors

/**
 * Real-time beat meter for whatever another app is playing.
 *
 * Primary path: `Visualizer(0)` on the global output mix (no screen capture, no
 * MediaProjection, no foreground service). Android 16 frequently hands back a
 * Visualizer that never produces samples, so after 1.5 s without energy the
 * module falls back to a low-latency microphone capture and computes its own
 * FFT — the display sits next to a speaker, which is enough to follow the beat.
 *
 * Frames are pushed to JS as `onFftUpdate` at ~20 Hz; the UI animates between
 * them on the native driver, so nothing re-renders React per frame.
 */
class SystemAudioVisualizerModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private companion object {
    const val TAG = "SystemAudioVisualizer"
    const val EVENT_NAME = "onFftUpdate"
    const val FALLBACK_DELAY_MS = 1_500L
    const val EMIT_INTERVAL_MS = 50L
    const val DEFAULT_BANDS = 12
    const val SOURCE_OUTPUT = "visualizer"
    const val SOURCE_MIC = "microphone"
    const val SOURCE_NONE = "none"
  }

  private val mainHandler = Handler(Looper.getMainLooper())
  private val worker = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "smart-desk-visualizer").apply { isDaemon = true }
  }

  private var mapper: BandMapper? = null
  private var output: OutputFftSource? = null
  private var microphone: MicrophoneFftSource? = null
  private var fallbackTask: Runnable? = null

  @Volatile private var running = false
  @Volatile private var bandCount = DEFAULT_BANDS
  @Volatile private var source = SOURCE_NONE
  @Volatile private var lastEmitAt = 0L
  @Volatile private var lastLevel = 0f

  override fun getName(): String = "SystemAudioVisualizer"

  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  @ReactMethod
  fun start(numBars: Int, promise: Promise) {
    if (!hasPermission()) {
      promise.resolve(result(false, SOURCE_NONE, "permission"))
      return
    }

    worker.execute {
      try {
        stopInternal()
        bandCount = numBars.coerceIn(4, 32)
        val bandMapper = BandMapper(bandCount)
        mapper = bandMapper
        running = true

        val context = reactContext.applicationContext
        val outputSource = OutputFftSource(bandMapper, outputSampleRate(context)) { bands, level ->
          publish(bands, level, SOURCE_OUTPUT)
        }
        output = outputSource

        if (outputSource.start()) {
          source = SOURCE_OUTPUT
          scheduleFallbackCheck()
        } else if (startMicrophone()) {
          source = SOURCE_MIC
        } else {
          source = SOURCE_NONE
          running = false
        }

        AudioLevelMeter.onCapturingChanged(source != SOURCE_NONE)
        promise.resolve(result(source != SOURCE_NONE, source, null))
      } catch (error: Exception) {
        Log.w(TAG, "start failed: ${error.message}")
        stopInternal()
        promise.resolve(result(false, SOURCE_NONE, error.message ?: "error"))
      }
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    worker.execute {
      stopInternal()
      promise.resolve(true)
    }
  }

  /** Which path is currently feeding the meter (useful for the debug badge). */
  @ReactMethod
  fun getSource(promise: Promise) {
    promise.resolve(source)
  }

  override fun invalidate() {
    stopInternal()
    worker.shutdownNow()
    super.invalidate()
  }

  private fun scheduleFallbackCheck() {
    val task = Runnable {
      if (!running || source != SOURCE_OUTPUT) return@Runnable
      val visualizer = output
      if (visualizer != null && visualizer.hasEnergy) return@Runnable
      Log.i(TAG, "Visualizer(0) delivered no energy, switching to microphone")
      visualizer?.stop()
      if (startMicrophone()) {
        source = SOURCE_MIC
      } else {
        source = SOURCE_NONE
        running = false
        AudioLevelMeter.onCapturingChanged(false)
      }
    }
    fallbackTask = task
    mainHandler.postDelayed(task, FALLBACK_DELAY_MS)
  }

  private fun startMicrophone(): Boolean {
    val bandMapper = mapper ?: return false
    val mic = MicrophoneFftSource(reactContext.applicationContext, bandMapper) { bands, level ->
      publish(bands, level, SOURCE_MIC)
    }
    return if (mic.start()) {
      microphone = mic
      true
    } else {
      false
    }
  }

  private fun stopInternal() {
    fallbackTask?.let { mainHandler.removeCallbacks(it) }
    fallbackTask = null
    output?.stop()
    output = null
    microphone?.stop()
    microphone = null
    running = false
    source = SOURCE_NONE
    mapper?.reset()
    lastLevel = 0f
    AudioLevelMeter.onCapturingChanged(false)
  }

  /** Copy the frame, throttle to ~20 Hz, and hand it to JS + the widget meter. */
  private fun publish(bands: FloatArray, level: Float, frameSource: String) {
    if (!running) return
    val now = SystemClock.elapsedRealtime()
    if (now - lastEmitAt < EMIT_INTERVAL_MS) return
    lastEmitAt = now
    lastLevel = level

    val copy = bands.copyOf()
    AudioLevelMeter.push(level, downsample(copy, AudioLevelMeter.BANDS))

    if (!reactContext.hasActiveReactInstance()) return
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENT_NAME, payload(copy, level, frameSource))
    } catch (error: Exception) {
      Log.w(TAG, "emit failed: ${error.message}")
    }
  }

  private fun payload(bands: FloatArray, level: Float, frameSource: String): WritableMap =
    Arguments.createMap().apply {
      putArray("bands", Arguments.fromList(bands.map { it.toDouble() }))
      putDouble("level", level.toDouble())
      putString("source", frameSource)
    }

  private fun result(ok: Boolean, frameSource: String, reason: String?): WritableMap =
    Arguments.createMap().apply {
      putBoolean("ok", ok)
      putString("source", frameSource)
      putString("reason", reason)
      putInt("bands", bandCount)
    }

  private fun downsample(bands: FloatArray, size: Int): FloatArray =
    FloatArray(size) { index ->
      val start = index * bands.size / size
      val end = ((index + 1) * bands.size / size).coerceAtLeast(start + 1)
      var sum = 0f
      for (position in start until end.coerceAtMost(bands.size)) sum += bands[position]
      sum / (end - start).coerceAtLeast(1)
    }

  private fun hasPermission(): Boolean =
    reactContext.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

  private fun outputSampleRate(context: Context): Int {
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return 44_100
    return runCatching {
      audio.getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE)?.toIntOrNull() ?: 44_100
    }.getOrDefault(44_100)
  }
}
