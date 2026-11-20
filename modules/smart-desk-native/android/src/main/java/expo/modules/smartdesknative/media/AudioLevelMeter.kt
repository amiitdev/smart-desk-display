package expo.modules.smartdesknative.media

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager

/**
 * Shared holder for the FFT bands produced by the RN `SystemAudioVisualizer`
 * module (Visualizer on the global output mix). The Expo module only reads it so
 * the widget/dashboard can show a level without touching the RN bridge.
 */
object AudioLevelMeter {
  private const val FRESH_MS = 2000L
  const val BANDS = 4

  @Volatile private var level: Float = 0f
  @Volatile private var bands: FloatArray = FloatArray(BANDS)
  @Volatile private var lastDataAt: Long = 0L
  @Volatile var capturing: Boolean = false
    private set

  fun permissionGranted(context: Context): Boolean =
    context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

  fun onCapturingChanged(value: Boolean) {
    capturing = value
    if (!value) clear()
  }

  fun push(newLevel: Float, newBands: FloatArray) {
    level = newLevel.coerceIn(0f, 1f)
    bands = newBands
    lastDataAt = System.currentTimeMillis()
  }

  fun clear() {
    level = 0f
    bands = FloatArray(BANDS)
    lastDataAt = 0L
  }

  fun snapshot(): Map<String, Any?> {
    val fresh = capturing && lastDataAt > 0 && System.currentTimeMillis() - lastDataAt < FRESH_MS
    return mapOf(
      "level" to (if (fresh) level.toDouble() else 0.0),
      "available" to fresh,
      "bands" to (if (fresh) bands.map { it.toDouble() } else List(BANDS) { 0.0 })
    )
  }
}
