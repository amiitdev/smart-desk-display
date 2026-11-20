package expo.modules.smartdesknative.widget

import android.content.Context
import android.widget.RemoteViews
import expo.modules.smartdesknative.R

/**
 * The widget clock is a native TextClock inside the RemoteViews layout, so
 * Android updates the digits itself every second — no WorkManager job, alarm or
 * wake-up is needed to keep the time accurate. This helper only forces the
 * app's 12/24-hour preference over the system setting.
 */
object WidgetClock {
  fun applyFormat(views: RemoteViews, use24Hour: Boolean, seconds: Boolean) {
    val format24 = if (seconds) "HH:mm:ss" else "HH:mm"
    val format12 = if (seconds) "h:mm:ss" else "h:mm"
    val format = if (use24Hour) format24 else format12
    views.setCharSequence(R.id.widget_clock, "setFormat24Hour", format)
    views.setCharSequence(R.id.widget_clock, "setFormat12Hour", format)
  }
}
