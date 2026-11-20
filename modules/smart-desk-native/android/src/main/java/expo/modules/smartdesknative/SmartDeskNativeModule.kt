package expo.modules.smartdesknative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.os.BatteryManager
import android.os.Build
import android.provider.Settings
import android.net.Uri
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.smartdesknative.data.DashboardState
import expo.modules.smartdesknative.data.DashboardStore
import expo.modules.smartdesknative.media.AudioLevelMeter
import expo.modules.smartdesknative.media.MediaRepository
import expo.modules.smartdesknative.system.BatteryReader
import expo.modules.smartdesknative.system.NetworkReader
import expo.modules.smartdesknative.system.SystemReader
import expo.modules.smartdesknative.widget.WidgetProviders
import expo.modules.smartdesknative.widget.WidgetRefreshWorker
import expo.modules.smartdesknative.widget.WidgetUpdater
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Expo module that exposes the native dashboard data, device telemetry and media
 * controls to React Native, and keeps the home-screen widgets in sync.
 */
class SmartDeskNativeModule : Module() {
  private var batteryReceiver: BroadcastReceiver? = null
  private var dashboardListener: ((DashboardState) -> Unit)? = null
  private var lastBatteryLevel: Int = -1
  private var lastCharging: Boolean = false

  private fun context(): Context =
    appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SmartDeskNative")

    Events("onMediaChanged", "onStateChanged", "onBatteryChanged")

    OnCreate {
      val ctx = appContext.reactContext?.applicationContext ?: return@OnCreate

      MediaRepository.initialize(ctx)
      MediaRepository.setEventSink { media ->
        sendEvent("onMediaChanged", media.toMap())
      }
      MediaRepository.setWidgetRefresh { refreshContext ->
        WidgetUpdater.updateAll(refreshContext)
      }

      val listener: (DashboardState) -> Unit = { state ->
        sendEvent("onStateChanged", state.toMap())
        WidgetUpdater.updateAll(ctx)
      }
      dashboardListener = listener
      DashboardStore.addListener(listener)

      registerBatteryReceiver(ctx)
      WidgetRefreshWorker.schedule(ctx)
    }

    OnDestroy {
      dashboardListener?.let { DashboardStore.removeListener(it) }
      dashboardListener = null
      MediaRepository.setEventSink(null)
      MediaRepository.setWidgetRefresh(null)
      unregisterBatteryReceiver()
    }

    AsyncFunction("getBatteryInfo") {
      BatteryReader.read(context()).toMap()
    }

    AsyncFunction("getNetworkInfo") {
      NetworkReader.read(context()).toMap()
    }

    AsyncFunction("getSystemInfo") {
      SystemReader.read(context()).toMap()
    }

    AsyncFunction("getMediaInfo") {
      MediaRepository.snapshot(context()).toMap()
    }

    AsyncFunction("controlMedia") { action: String ->
      val (ok, message) = MediaRepository.control(context(), action)
      mapOf("ok" to ok, "message" to message)
    }

    AsyncFunction("saveDashboardData") { payload: Map<String, Any?> ->
      val json = JSONObject.wrap(payload) as? JSONObject
        ?: throw IllegalArgumentException("Dashboard payload must be an object")
      val state = DashboardState.fromJson(json)
      DashboardStore.write(context(), state)
      WidgetUpdater.updateAll(context())
      true
    }

    AsyncFunction("getDashboardData") {
      DashboardStore.read(context()).toMap()
    }

    AsyncFunction("getMediaHistory") {
      DashboardStore.read(context()).mediaHistory.map { it.toMap() }
    }

    AsyncFunction("clearMediaHistory") {
      DashboardStore.clearMediaHistory(context())
      WidgetUpdater.updateAll(context())
      true
    }

    AsyncFunction("updateWidget") {
      WidgetUpdater.updateAllNow(context())
      true
    }

    AsyncFunction("isNotificationAccessGranted") {
      MediaRepository.isNotificationAccessGranted(context())
    }

    AsyncFunction("getAudioLevel") {
      AudioLevelMeter.snapshot()
    }

    AsyncFunction("requestAudioPermission") {
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      if (AudioLevelMeter.permissionGranted(context())) return@AsyncFunction true
      ActivityCompat.requestPermissions(activity, arrayOf(android.Manifest.permission.RECORD_AUDIO), 4211)
      false
    }

    AsyncFunction("setVolume") { level: Double ->
      val ctx = context()
      val audio = ctx.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        ?: return@AsyncFunction mapOf("level" to 0, "max" to 0)
      val max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
      val target = (level.coerceIn(0.0, 1.0) * max).roundToInt()
      try {
        // setStreamVolume is a synchronous binder call; skip it when the finger
        // is still inside the same integer step so dragging stays cheap.
        if (audio.getStreamVolume(AudioManager.STREAM_MUSIC) != target) {
          audio.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0)
        }
      } catch (error: SecurityException) {
        return@AsyncFunction mapOf("level" to audio.getStreamVolume(AudioManager.STREAM_MUSIC), "max" to max)
      }
      mapOf("level" to audio.getStreamVolume(AudioManager.STREAM_MUSIC), "max" to max)
    }

    AsyncFunction("getScreenBrightness") {
      val ctx = context()
      val windowLevel = appContext.currentActivity?.window?.attributes?.screenBrightness ?: -1f
      if (windowLevel >= 0f) {
        windowLevel.toDouble()
      } else {
        Settings.System.getInt(ctx.contentResolver, Settings.System.SCREEN_BRIGHTNESS, 128) / 255.0
      }
    }

    AsyncFunction("setScreenBrightness") { level: Double ->
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      val target = level.coerceIn(0.02, 1.0).toFloat()
      // Rewriting window attributes forces a relayout; ignore sub-percent moves
      // so a drag does not thrash the window.
      if (abs((activity.window.attributes.screenBrightness) - target) < 0.01f) {
        return@AsyncFunction true
      }
      activity.runOnUiThread {
        val attributes = activity.window.attributes
        attributes.screenBrightness = target
        activity.window.attributes = attributes
      }
      true
    }

    AsyncFunction("openSettings") { section: String ->
      val ctx = appContext.currentActivity ?: context()
      val intent = when (section) {
        "notification_listener" ->
          Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        "wifi" -> Intent(Settings.ACTION_WIFI_SETTINGS)
        "location" -> Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
        "battery_optimization" -> Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
        else -> Intent(
          Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
          Uri.fromParts("package", ctx.packageName, null)
        )
      }
      if (appContext.currentActivity == null) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      try {
        ctx.startActivity(intent)
        true
      } catch (error: Exception) {
        false
      }
    }

    AsyncFunction("pinWidget") { size: String ->
      val ctx = appContext.currentActivity ?: context()
      val manager = ctx.getSystemService(Context.APPWIDGET_SERVICE) as? android.appwidget.AppWidgetManager
        ?: return@AsyncFunction false
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !manager.isRequestPinAppWidgetSupported) {
        return@AsyncFunction false
      }
      val provider = when (size) {
        "medium" -> WidgetProviders.medium(ctx)
        "large" -> WidgetProviders.large(ctx)
        else -> WidgetProviders.small(ctx)
      }
      manager.requestPinAppWidget(provider, null, null)
      true
    }

    AsyncFunction("isWidgetPinned") {
      val ctx = context()
      val manager = ctx.getSystemService(Context.APPWIDGET_SERVICE) as? android.appwidget.AppWidgetManager
        ?: return@AsyncFunction mapOf("small" to false, "medium" to false, "large" to false)
      mapOf(
        "small" to manager.getAppWidgetIds(WidgetProviders.small(ctx)).isNotEmpty(),
        "medium" to manager.getAppWidgetIds(WidgetProviders.medium(ctx)).isNotEmpty(),
        "large" to manager.getAppWidgetIds(WidgetProviders.large(ctx)).isNotEmpty()
      )
    }
  }

  private fun registerBatteryReceiver(context: Context) {
    if (batteryReceiver != null) return
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(receiverContext: Context?, intent: Intent?) {
        val ctx = receiverContext ?: return
        if (intent?.action != Intent.ACTION_BATTERY_CHANGED) return
        val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val charging = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ==
          BatteryManager.BATTERY_STATUS_CHARGING
        // Only push when something meaningful changed; the broadcast itself fires
        // frequently during charge level updates.
        if (level == lastBatteryLevel && charging == lastCharging) return
        lastBatteryLevel = level
        lastCharging = charging
        runCatching { sendEvent("onBatteryChanged", BatteryReader.read(ctx).toMap()) }
        runCatching { WidgetUpdater.updateAll(ctx) }
      }
    }
    val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
    ContextCompat.registerReceiver(context, receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
    batteryReceiver = receiver
  }

  private fun unregisterBatteryReceiver() {
    val receiver = batteryReceiver ?: return
    runCatching { context().unregisterReceiver(receiver) }
    batteryReceiver = null
  }
}
