package expo.modules.smartdesknative.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.RemoteViews

private const val TAG = "SmartDeskWidget"

/**
 * Base receiver for the plain-RemoteViews home-screen widgets.
 *
 * Every update rebuilds the full RemoteViews from the shared dashboard store, so
 * the widget and the app can never drift apart.
 */
abstract class SmartDeskWidgetReceiver : AppWidgetProvider() {
  abstract fun build(context: Context, data: WidgetData, heightDp: Int): RemoteViews

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    Log.i(TAG, "${javaClass.simpleName} onUpdate ids=${appWidgetIds.toList()}")
    push(context, appWidgetManager, appWidgetIds)
    WidgetRefreshWorker.schedule(context)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle
  ) {
    push(context, appWidgetManager, intArrayOf(appWidgetId))
  }

  override fun onEnabled(context: Context) {
    WidgetRefreshWorker.schedule(context)
  }

  private fun push(context: Context, manager: AppWidgetManager, ids: IntArray) {
    if (ids.isEmpty()) return
    val data = runCatching { WidgetDataLoader.load(context) }
      .onFailure { Log.e(TAG, "load failed", it) }
      .getOrNull() ?: return
    ids.forEach { id ->
      runCatching { manager.updateAppWidget(id, build(context, data, heightDp(manager, id))) }
        .onFailure { Log.e(TAG, "updateAppWidget failed id=$id", it) }
    }
  }

  private fun heightDp(manager: AppWidgetManager, id: Int): Int {
    val options = runCatching { manager.getAppWidgetOptions(id) }.getOrNull() ?: return 110
    val max = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
    val min = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
    return maxOf(max, min).takeIf { it > 0 } ?: 110
  }
}

class SmallWidgetReceiver : SmartDeskWidgetReceiver() {
  override fun build(context: Context, data: WidgetData, heightDp: Int) =
    WidgetViews.small(context, data, heightDp)
}

class MediumWidgetReceiver : SmartDeskWidgetReceiver() {
  override fun build(context: Context, data: WidgetData, heightDp: Int) =
    WidgetViews.medium(context, data, heightDp)
}

class LargeWidgetReceiver : SmartDeskWidgetReceiver() {
  override fun build(context: Context, data: WidgetData, heightDp: Int) =
    WidgetViews.large(context, data)
}

/** Shared helpers for the receivers and the Expo module. */
object WidgetProviders {
  fun small(context: Context) = ComponentName(context, SmallWidgetReceiver::class.java)
  fun medium(context: Context) = ComponentName(context, MediumWidgetReceiver::class.java)
  fun large(context: Context) = ComponentName(context, LargeWidgetReceiver::class.java)

  fun all(context: Context) = listOf(small(context), medium(context), large(context))
}

/**
 * Handles system events that must refresh the widgets: reboot, app update,
 * power connect/disconnect and date/time changes.
 */
class SystemEventReceiver : AppWidgetProvider() {
  override fun onReceive(context: Context, intent: Intent) {
    Log.i(TAG, "SystemEventReceiver action=${intent.action}")
    super.onReceive(context, intent)
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED -> {
        WidgetRefreshWorker.schedule(context)
        WidgetUpdater.updateAllNow(context)
        WeatherFetcher.refresh(context)
      }
      else -> WidgetUpdater.updateAllNow(context)
    }
  }
}
