package expo.modules.smartdesknative.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Coalesces widget refreshes: media callbacks, battery broadcasts and React
 * Native saves can all fire within milliseconds, but a launcher only needs one
 * rebuild. Requests within [DEBOUNCE_MS] are merged.
 */
object WidgetUpdater {
  private const val DEBOUNCE_MS = 350L
  private const val TAG = "SmartDeskWidget"

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
  private val handler = Handler(Looper.getMainLooper())
  private var scheduled = false

  fun updateAll(context: Context) {
    val appContext = context.applicationContext
    synchronized(this) {
      if (scheduled) return
      scheduled = true
    }
    handler.postDelayed({
      synchronized(this) { scheduled = false }
      dispatch(appContext)
    }, DEBOUNCE_MS)
  }

  fun updateAllNow(context: Context) {
    dispatch(context.applicationContext)
  }

  private fun dispatch(context: Context) {
    scope.launch {
      val data = runCatching { WidgetDataLoader.load(context) }
        .onFailure { Log.e(TAG, "dispatch: load failed", it) }
        .getOrNull() ?: return@launch

      val manager = AppWidgetManager.getInstance(context)
      val providers = listOf(
        WidgetProviders.small(context) to { h: Int -> WidgetViews.small(context, data, h) },
        WidgetProviders.medium(context) to { h: Int -> WidgetViews.medium(context, data, h) },
        WidgetProviders.large(context) to { _: Int -> WidgetViews.large(context, data) },
      )
      providers.forEach { (provider, build) ->
        manager.getAppWidgetIds(provider).forEach { id ->
          val heightDp = runCatching {
            val options = manager.getAppWidgetOptions(id)
            maxOf(
              options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0),
              options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
            ).takeIf { it > 0 } ?: 110
          }.getOrDefault(110)
          runCatching { manager.updateAppWidget(id, build(heightDp)) }
            .onFailure { Log.e(TAG, "dispatch: update failed id=$id", it) }
        }
      }
    }
  }
}
