package expo.modules.smartdesknative.system

import android.app.ActivityManager
import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.os.SystemClock
import java.io.File

data class SystemInfo(
  val deviceModel: String,
  val manufacturer: String,
  val brand: String,
  val androidVersion: String,
  val apiLevel: Int,
  val cpuCores: Int,
  val cpuAbi: String,
  val cpuMaxFreqMhz: Int?,
  val totalRamBytes: Long,
  val availableRamBytes: Long,
  val usedRamBytes: Long,
  val totalStorageBytes: Long,
  val freeStorageBytes: Long,
  val uptimeMs: Long,
  val screenWidthPx: Int,
  val screenHeightPx: Int,
  val density: Float,
  val volumeLevel: Int,
  val volumeMax: Int
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "deviceModel" to deviceModel,
    "manufacturer" to manufacturer,
    "brand" to brand,
    "androidVersion" to androidVersion,
    "apiLevel" to apiLevel,
    "cpuCores" to cpuCores,
    "cpuAbi" to cpuAbi,
    "cpuMaxFreqMhz" to cpuMaxFreqMhz,
    "totalRamBytes" to totalRamBytes,
    "availableRamBytes" to availableRamBytes,
    "usedRamBytes" to usedRamBytes,
    "totalStorageBytes" to totalStorageBytes,
    "freeStorageBytes" to freeStorageBytes,
    "uptimeMs" to uptimeMs,
    "screenWidthPx" to screenWidthPx,
    "screenHeightPx" to screenHeightPx,
    "density" to density,
    "volumeLevel" to volumeLevel,
    "volumeMax" to volumeMax
  )
}

/**
 * System information available to a normal (non-root) app. CPU frequency is
 * read from sysfs when the kernel exposes it; everything else comes from public
 * Android APIs. No private or privileged metrics are reported.
 */
object SystemReader {
  fun read(context: Context): SystemInfo {
    val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
    val memoryInfo = ActivityManager.MemoryInfo()
    activityManager?.getMemoryInfo(memoryInfo)

    val statFs = try {
      StatFs(Environment.getDataDirectory().absolutePath)
    } catch (error: Exception) {
      null
    }
    val totalStorage = statFs?.totalBytes ?: 0L
    val freeStorage = statFs?.availableBytes ?: 0L

    val metrics = context.resources.displayMetrics
    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

    return SystemInfo(
      deviceModel = Build.MODEL,
      manufacturer = Build.MANUFACTURER.replaceFirstChar { it.uppercase() },
      brand = Build.BRAND.replaceFirstChar { it.uppercase() },
      androidVersion = Build.VERSION.RELEASE,
      apiLevel = Build.VERSION.SDK_INT,
      cpuCores = Runtime.getRuntime().availableProcessors(),
      cpuAbi = Build.SUPPORTED_ABIS.firstOrNull() ?: "unknown",
      cpuMaxFreqMhz = readMaxCpuFreqMhz(),
      totalRamBytes = if (memoryInfo.totalMem > 0) memoryInfo.totalMem else 0L,
      availableRamBytes = if (memoryInfo.availMem > 0) memoryInfo.availMem else 0L,
      usedRamBytes = (if (memoryInfo.totalMem > 0) memoryInfo.totalMem else 0L) -
        (if (memoryInfo.availMem > 0) memoryInfo.availMem else 0L),
      totalStorageBytes = totalStorage,
      freeStorageBytes = freeStorage,
      uptimeMs = SystemClock.elapsedRealtime(),
      screenWidthPx = metrics.widthPixels,
      screenHeightPx = metrics.heightPixels,
      density = metrics.densityDpi.toFloat(),
      volumeLevel = audioManager?.getStreamVolume(AudioManager.STREAM_MUSIC) ?: 0,
      volumeMax = audioManager?.getStreamMaxVolume(AudioManager.STREAM_MUSIC) ?: 15
    )
  }

  private fun readMaxCpuFreqMhz(): Int? = try {
    val file = File("/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq")
    if (file.exists() && file.canRead()) {
      val khz = file.readText().trim().toLongOrNull() ?: return null
      (khz / 1000).toInt()
    } else {
      null
    }
  } catch (error: Exception) {
    null
  }
}
