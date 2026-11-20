package expo.modules.smartdesknative.system

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager

data class BatteryInfo(
  val level: Int,
  val isCharging: Boolean,
  val chargingType: String,
  val statusLabel: String,
  val temperatureC: Double?,
  val voltage: Double,
  val currentMa: Double,
  val powerMw: Double?,
  val health: String,
  val technology: String?
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "level" to level,
    "isCharging" to isCharging,
    "chargingType" to chargingType,
    "statusLabel" to statusLabel,
    "temperatureC" to temperatureC,
    "voltage" to voltage,
    "currentMa" to currentMa,
    "powerMw" to powerMw,
    "health" to health,
    "technology" to technology
  )
}

/**
 * Battery telemetry from the sticky ACTION_BATTERY_CHANGED broadcast plus
 * BatteryManager properties. No polling: the module subscribes to the battery
 * broadcast while the app is in the foreground.
 */
object BatteryReader {
  private const val UNKNOWN_VALUE = Int.MIN_VALUE

  fun read(context: Context): BatteryInfo {
    val intent = try {
      context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
    } catch (error: Exception) {
      null
    }

    val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
    val scale = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
    val percent = if (level >= 0 && scale > 0) (level * 100 / scale) else 0
    val status = intent?.getIntExtra(BatteryManager.EXTRA_STATUS, BatteryManager.BATTERY_STATUS_UNKNOWN)
      ?: BatteryManager.BATTERY_STATUS_UNKNOWN
    val plugged = intent?.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) ?: 0
    val voltageMv = intent?.getIntExtra(BatteryManager.EXTRA_VOLTAGE, 0) ?: 0
    val temperatureTenths = intent?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, Int.MIN_VALUE)
      ?: Int.MIN_VALUE
    val health = intent?.getIntExtra(BatteryManager.EXTRA_HEALTH, BatteryManager.BATTERY_HEALTH_UNKNOWN)
      ?: BatteryManager.BATTERY_HEALTH_UNKNOWN
    val technology = intent?.getStringExtra(BatteryManager.EXTRA_TECHNOLOGY)

    val manager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
    val currentUa = manager?.getLongProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW) ?: 0L
    // Some devices report Integer.MIN_VALUE-ish garbage when the property is
    // unsupported; treat implausible values as "unknown".
    val currentMa = if (currentUa in -20_000_000L..20_000_000L) currentUa / 1000.0 else 0.0
    val voltage = voltageMv / 1000.0

    return BatteryInfo(
      level = percent,
      isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL,
      chargingType = pluggedLabel(plugged),
      statusLabel = statusLabel(status),
      temperatureC = if (temperatureTenths == Int.MIN_VALUE) null else temperatureTenths / 10.0,
      voltage = voltage,
      currentMa = currentMa,
      powerMw = if (voltage > 0 && currentMa != 0.0) voltage * currentMa else null,
      health = healthLabel(health),
      technology = technology
    )
  }

  private fun statusLabel(status: Int): String = when (status) {
    BatteryManager.BATTERY_STATUS_CHARGING -> "Charging"
    BatteryManager.BATTERY_STATUS_FULL -> "Full"
    BatteryManager.BATTERY_STATUS_DISCHARGING -> "Discharging"
    BatteryManager.BATTERY_STATUS_NOT_CHARGING -> "Not charging"
    else -> "Unknown"
  }

  private fun pluggedLabel(plugged: Int): String = when {
    plugged and BatteryManager.BATTERY_PLUGGED_AC != 0 -> "AC"
    plugged and BatteryManager.BATTERY_PLUGGED_USB != 0 -> "USB"
    plugged and BatteryManager.BATTERY_PLUGGED_WIRELESS != 0 -> "Wireless"
    // BATTERY_PLUGGED_DOCK was added in API 33.
    plugged != 0 -> "Dock"
    else -> "None"
  }

  private fun healthLabel(health: Int): String = when (health) {
    BatteryManager.BATTERY_HEALTH_GOOD -> "Good"
    BatteryManager.BATTERY_HEALTH_OVERHEAT -> "Overheat"
    BatteryManager.BATTERY_HEALTH_DEAD -> "Dead"
    BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "Over voltage"
    BatteryManager.BATTERY_HEALTH_COLD -> "Cold"
    BatteryManager.BATTERY_HEALTH_UNSPECIFIED_FAILURE -> "Failure"
    else -> "Unknown"
  }
}
