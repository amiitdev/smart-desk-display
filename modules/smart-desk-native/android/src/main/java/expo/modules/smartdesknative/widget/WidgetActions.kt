package expo.modules.smartdesknative.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import expo.modules.smartdesknative.data.DashboardStore
import expo.modules.smartdesknative.media.MediaRepository

/** Intent contract between the widget RemoteViews and [WidgetActionReceiver]. */
object WidgetActions {
  const val ACTION_MEDIA = "expo.modules.smartdesknative.widget.action.MEDIA"
  const val ACTION_TOGGLE_TASK = "expo.modules.smartdesknative.widget.action.TOGGLE_TASK"
  const val EXTRA_MEDIA_ACTION = "smartdesk_media_action"
  const val EXTRA_TASK_ID = "smartdesk_task_id"
}

/**
 * Transport controls and task toggles invoked straight from the widget, without
 * opening the app. The broadcast is sent through a PendingIntent, so it always
 * carries this app's identity.
 */
class WidgetActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      WidgetActions.ACTION_MEDIA -> {
        val action = intent.getStringExtra(WidgetActions.EXTRA_MEDIA_ACTION) ?: return
        MediaRepository.control(context, action)
      }

      WidgetActions.ACTION_TOGGLE_TASK -> {
        val taskId = intent.getStringExtra(WidgetActions.EXTRA_TASK_ID) ?: return
        DashboardStore.toggleTask(context, taskId)
      }

      else -> return
    }
    WidgetUpdater.updateAllNow(context)
  }
}
