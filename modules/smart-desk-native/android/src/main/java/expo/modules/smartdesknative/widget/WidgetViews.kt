package expo.modules.smartdesknative.widget

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import expo.modules.smartdesknative.R
import expo.modules.smartdesknative.data.DashboardState
import expo.modules.smartdesknative.data.TaskItem
import expo.modules.smartdesknative.system.BatteryInfo
import expo.modules.smartdesknative.system.NetworkInfo

/**
 * Builds the RemoteViews for the three home-screen widgets.
 *
 * Deliberately plain RemoteViews (no Jetpack Glance): Glance composes a
 * ViewStub based RemoteViews that some OEM launchers — vivo/OriginOS among them
 * — never inflate, so the widget stays on the white "loading" layout forever.
 *
 * RemoteViews also only allows a whitelist of framework views, so no `<View>`
 * and no `<Space>`: dividers/spacers are FrameLayouts here.
 */
object WidgetViews {

  private const val FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

  // Rough dp budget for each block, used to decide what fits in the current
  // widget height. Kept generous so nothing is ever clipped.
  private const val PADDING_DP = 20
  private const val CLOCK_DP = 32
  private const val DATE_DP = 14
  private const val WEATHER_DP = 34
  private const val RULE_DP = 15
  private const val MEDIA_DP = 38
  private const val TASKS_HEADER_DP = 16
  private const val TASK_ROW_DP = 19
  private const val CALENDAR_DP = 118
  private const val CAL_HEADER_DP = 14
  private const val CAL_ROW_DP = 16
  private const val FOOTER_DP = 18

  /**
   * @param heightDp current widget height from AppWidgetManager options; the
   * optional media / task / calendar blocks only appear when there is room, so
   * a 2x2 stays compact and a resized widget fills its space instead of leaving
   * a big empty gap.
   */
  fun small(context: Context, data: WidgetData, heightDp: Int): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_small)
    applyClock(views, data.use24Hour, seconds = false)
    views.setTextViewText(R.id.widget_date, shortDateLine(data))
    applyWeather(views, data)
    applyBattery(views, data.battery)
    applyNetwork(views, data.network)

    // Fill the widget bottom-up with whatever actually fits: media, then tasks,
    // then the mini calendar. Nothing is ever clipped, and a compact 2x2 stays
    // exactly as designed.
    var budget = heightDp - PADDING_DP - CLOCK_DP - DATE_DP - WEATHER_DP - FOOTER_DP

    if (budget >= MEDIA_DP) {
      views.setViewVisibility(R.id.widget_extra_media, View.VISIBLE)
      applyMedia(
        views, context, data,
        iconId = R.id.widget_extra_media_icon,
        titleId = R.id.widget_extra_media_title,
        artistId = R.id.widget_extra_media_artist,
        previousId = R.id.widget_extra_media_previous,
        toggleId = R.id.widget_extra_media_toggle,
        nextId = R.id.widget_extra_media_next,
        requestBase = 20
      )
      budget -= MEDIA_DP
    }

    if (budget >= TASKS_HEADER_DP + TASK_ROW_DP) {
      val rows = ((budget - TASKS_HEADER_DP) / TASK_ROW_DP).coerceIn(1, 3)
      views.setViewVisibility(R.id.widget_extra_tasks_block, View.VISIBLE)
      applyTasks(
        views, context, data,
        countId = R.id.widget_extra_tasks_count,
        containerId = R.id.widget_extra_tasks,
        requestBase = 30,
        limit = rows
      )
      views.setOnClickPendingIntent(R.id.widget_extra_tasks_header, openRoute(context, 31, "tasks"))
      budget -= TASKS_HEADER_DP + rows * TASK_ROW_DP
    }

    if (budget >= CAL_HEADER_DP + CAL_ROW_DP) {
      val rows = ((budget - CAL_HEADER_DP) / CAL_ROW_DP).toInt().coerceIn(1, 6)
      views.setViewVisibility(R.id.widget_extra_calendar_block, View.VISIBLE)
      applyCalendar(views, context, data, R.id.widget_extra_calendar_weeks, rows)
    }

    views.setOnClickPendingIntent(R.id.widget_root, openApp(context, 0))
    return views
  }

  fun medium(context: Context, data: WidgetData, heightDp: Int): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_medium)
    applyClock(views, data.use24Hour, seconds = false)
    views.setTextViewText(R.id.widget_date, shortDateLine(data))
    applyWeather(views, data)
    applyMedia(
      views, context, data,
      iconId = R.id.widget_music_icon,
      titleId = R.id.widget_media_title,
      artistId = R.id.widget_media_artist,
      previousId = R.id.widget_media_previous,
      toggleId = R.id.widget_media_toggle,
      nextId = R.id.widget_media_next,
      requestBase = 10
    )
    applyBattery(views, data.battery)
    applyNetwork(views, data.network)
    views.setTextViewText(
      R.id.widget_network_detail,
      data.network.signalDbm?.let { "${data.network.transport} ${it}dBm" } ?: ""
    )

    var budget = heightDp - PADDING_DP - CLOCK_DP - DATE_DP - WEATHER_DP - RULE_DP - MEDIA_DP - FOOTER_DP

    if (budget >= CALENDAR_DP) {
      views.setViewVisibility(R.id.widget_medium_calendar_block, View.VISIBLE)
      applyCalendar(views, context, data, R.id.widget_medium_calendar_weeks, 6)
      budget -= CALENDAR_DP
    }

    if (budget >= TASKS_HEADER_DP + TASK_ROW_DP) {
      val rows = ((budget - TASKS_HEADER_DP) / TASK_ROW_DP).coerceIn(1, 3)
      views.setViewVisibility(R.id.widget_medium_tasks_block, View.VISIBLE)
      applyTasks(
        views, context, data,
        countId = R.id.widget_medium_tasks_count,
        containerId = R.id.widget_medium_tasks,
        requestBase = 40,
        limit = rows
      )
      views.setOnClickPendingIntent(R.id.widget_medium_tasks_header, openRoute(context, 41, "tasks"))
    }

    views.setOnClickPendingIntent(R.id.widget_root, openApp(context, 1))
    return views
  }

  fun large(context: Context, data: WidgetData): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_large)
    applyClock(views, data.use24Hour, seconds = true)
    views.setTextViewText(R.id.widget_date, shortDateLine(data))
    applyBattery(views, data.battery)
    applyNetwork(views, data.network)
    applyWeather(views, data)
    applyMedia(
      views, context, data,
      iconId = R.id.widget_music_icon,
      titleId = R.id.widget_media_title,
      artistId = R.id.widget_media_artist,
      previousId = R.id.widget_media_previous,
      toggleId = R.id.widget_media_toggle,
      nextId = R.id.widget_media_next,
      requestBase = 50
    )
    applyCalendar(views, context, data, R.id.widget_calendar_weeks, 6)
    applyTasks(
      views, context, data,
      countId = R.id.widget_tasks_count,
      containerId = R.id.widget_tasks,
      requestBase = 60
    )
    applyForecast(views, context, data)
    applyHistory(views, context, data)
    views.setTextViewText(R.id.widget_updated, updatedLabel(data.state))
    views.setOnClickPendingIntent(R.id.widget_weather_row, openApp(context, 2))
    views.setOnClickPendingIntent(R.id.widget_tasks_header, openRoute(context, 3, "tasks"))
    return views
  }

  // ---------------------------------------------------------------- sections

  private fun applyClock(views: RemoteViews, use24Hour: Boolean, seconds: Boolean) {
    // Setting both variants to the same value makes the app preference win over
    // the system 12/24h setting.
    WidgetClock.applyFormat(views, use24Hour, seconds)
  }

  private fun applyWeather(views: RemoteViews, data: WidgetData) {
    val weather = data.state.weather
    views.setTextViewText(
      R.id.widget_temp,
      weather?.let { WidgetModels.temperature(it.tempC, data.temperatureUnit) } ?: "—"
    )
    views.setTextViewText(
      R.id.widget_weather,
      weather?.let { WidgetModels.weatherLabel(it.code) } ?: "No weather"
    )
    views.setTextViewText(
      R.id.widget_location,
      weather?.let { "${it.locationName} · ${it.humidity}% humidity" } ?: "Set a location in the app"
    )
  }

  private fun applyBattery(views: RemoteViews, battery: BatteryInfo) {
    val color = when {
      battery.level <= 15 -> WidgetPalette.red
      battery.level <= 35 -> WidgetPalette.yellow
      else -> WidgetPalette.green
    }
    views.setTextColor(R.id.widget_battery, color)
    views.setTextViewText(
      R.id.widget_battery,
      "${battery.level}%" + if (battery.isCharging) " ⚡" else ""
    )
  }

  private fun applyNetwork(views: RemoteViews, network: NetworkInfo) {
    val label = network.ssid ?: if (network.connected) network.transport else "Offline"
    views.setTextViewText(R.id.widget_network, label)
    views.setTextColor(R.id.widget_network, if (network.connected) WidgetPalette.cyanDim else WidgetPalette.red)
  }

  private fun applyMedia(
    views: RemoteViews,
    context: Context,
    data: WidgetData,
    iconId: Int,
    titleId: Int,
    artistId: Int,
    previousId: Int,
    toggleId: Int,
    nextId: Int,
    requestBase: Int
  ) {
    val media = data.media
    views.setTextViewText(titleId, media.title ?: "No media session")
    views.setTextViewText(
      artistId,
      media.artist ?: if (media.enabled) "Tap play in your music app" else "Grant media access"
    )
    views.setImageViewResource(
      toggleId,
      if (media.isPlaying) R.drawable.ic_pause else R.drawable.ic_play
    )
    views.setOnClickPendingIntent(previousId, mediaAction(context, requestBase, "previous"))
    views.setOnClickPendingIntent(toggleId, mediaAction(context, requestBase + 1, "toggle"))
    views.setOnClickPendingIntent(nextId, mediaAction(context, requestBase + 2, "next"))
  }

  private fun applyCalendar(
    views: RemoteViews,
    context: Context,
    data: WidgetData,
    containerId: Int,
    rows: Int
  ) {
    views.removeAllViews(containerId)
    val matrix = WidgetModels.calendarMatrix(data.calendar)
    // Show the weeks around today when only part of the month fits.
    val todayIndex = matrix.indexOfFirst { week -> week.any { it.isToday } }.coerceAtLeast(0)
    val start = (todayIndex - rows / 2).coerceIn(0, (matrix.size - rows).coerceAtLeast(0))
    matrix.drop(start).take(rows).forEach { week ->
      val row = RemoteViews(context.packageName, R.layout.widget_calendar_row)
      week.forEachIndexed { index, cell ->
        val id = CELL_IDS[index]
        row.setTextViewText(id, cell.day.toString())
        row.setTextColor(id, if (cell.inMonth) WidgetPalette.text else WidgetPalette.textDim)
        row.setInt(
          id,
          "setBackgroundResource",
          when {
            cell.isToday -> R.drawable.widget_calendar_today
            cell.inMonth -> R.drawable.widget_calendar_day
            else -> R.drawable.widget_calendar_day_off
          }
        )
      }
      views.addView(containerId, row)
    }
  }

  private fun applyTasks(
    views: RemoteViews,
    context: Context,
    data: WidgetData,
    countId: Int,
    containerId: Int,
    requestBase: Int,
    limit: Int = 3
  ) {
    val pending = data.state.tasks
      .filter { !it.completed }
      .sortedWith(compareBy({ it.deadline ?: Long.MAX_VALUE }, { it.createdAt }))

    views.setTextViewText(countId, "${pending.size} open")
    views.removeAllViews(containerId)

    if (pending.isEmpty()) {
      val row = RemoteViews(context.packageName, R.layout.widget_task_row)
      row.setViewVisibility(R.id.task_check, View.GONE)
      row.setTextViewText(R.id.task_deadline, "")
      row.setTextColor(R.id.task_title, WidgetPalette.textDim)
      row.setTextViewText(R.id.task_title, "Nothing pending — enjoy the desk.")
      views.addView(containerId, row)
      return
    }

    pending.take(limit).forEachIndexed { index, task ->
      val row = RemoteViews(context.packageName, R.layout.widget_task_row)
      row.setTextViewText(R.id.task_deadline, WidgetModels.deadlineLabel(task.deadline, task.completed))
      row.setTextColor(
        R.id.task_deadline,
        if (task.isOverdue()) WidgetPalette.red else WidgetPalette.cyan
      )
      row.setTextViewText(R.id.task_title, task.title)
      row.setImageViewResource(
        R.id.task_check,
        if (task.completed) R.drawable.ic_checkbox_on else R.drawable.ic_checkbox_off
      )
      row.setOnClickPendingIntent(R.id.task_check, taskAction(context, requestBase + index, task))
      row.setOnClickPendingIntent(R.id.task_row, taskAction(context, requestBase + 10 + index, task))
      views.addView(containerId, row)
    }
  }

  private fun applyForecast(views: RemoteViews, context: Context, data: WidgetData) {
    val forecast = data.state.weather?.forecast.orEmpty()
      .filter { it.date.isNotBlank() }
      .take(4)
    if (forecast.isEmpty()) {
      views.setViewVisibility(R.id.widget_forecast_block, View.GONE)
      return
    }
    views.setViewVisibility(R.id.widget_forecast_block, View.VISIBLE)
    views.removeAllViews(R.id.widget_forecast)
    forecast.forEach { day ->
      val cell = RemoteViews(context.packageName, R.layout.widget_forecast_day)
      cell.setTextViewText(R.id.forecast_day, WidgetModels.formatForecastDay(day.date))
      cell.setTextViewText(
        R.id.forecast_temp,
        "${WidgetModels.temperature(day.maxC, data.temperatureUnit)} / " +
          WidgetModels.temperature(day.minC, data.temperatureUnit)
      )
      cell.setTextViewText(R.id.forecast_label, WidgetModels.weatherLabel(day.code))
      views.addView(R.id.widget_forecast, cell)
    }
  }

  private fun applyHistory(views: RemoteViews, context: Context, data: WidgetData) {
    val recent = data.state.mediaHistory
      .sortedByDescending { it.playedAt }
      .distinctBy { it.title }
      .take(3)
    if (recent.isEmpty()) {
      views.setViewVisibility(R.id.widget_history_block, View.GONE)
      return
    }
    views.setViewVisibility(R.id.widget_history_block, View.VISIBLE)
    views.removeAllViews(R.id.widget_history)
    recent.forEach { entry ->
      val row = RemoteViews(context.packageName, R.layout.widget_history_row)
      row.setTextViewText(R.id.history_title, entry.title)
      row.setTextViewText(
        R.id.history_meta,
        entry.artist ?: WidgetModels.formatTime(entry.playedAt)
      )
      views.addView(R.id.widget_history, row)
    }
  }

  // --------------------------------------------------------------- intents

  private fun openApp(context: Context, requestCode: Int): PendingIntent {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: Intent(Intent.ACTION_MAIN).setPackage(context.packageName)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(context, requestCode, intent, FLAGS)
  }

  private fun openRoute(context: Context, requestCode: Int, route: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("smartdesk://$route"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(context, requestCode, intent, FLAGS)
  }

  private fun mediaAction(context: Context, requestCode: Int, action: String): PendingIntent {
    val intent = Intent(context, WidgetActionReceiver::class.java)
      .setAction(WidgetActions.ACTION_MEDIA)
      .putExtra(WidgetActions.EXTRA_MEDIA_ACTION, action)
    return PendingIntent.getBroadcast(context, requestCode, intent, FLAGS)
  }

  private fun taskAction(context: Context, requestCode: Int, task: TaskItem): PendingIntent {
    val intent = Intent(context, WidgetActionReceiver::class.java)
      .setAction(WidgetActions.ACTION_TOGGLE_TASK)
      .putExtra(WidgetActions.EXTRA_TASK_ID, task.id)
    return PendingIntent.getBroadcast(context, requestCode, intent, FLAGS)
  }

  // --------------------------------------------------------------- helpers

  private val CELL_IDS = intArrayOf(
    R.id.cell0, R.id.cell1, R.id.cell2, R.id.cell3, R.id.cell4, R.id.cell5, R.id.cell6
  )

  private fun shortDateLine(data: WidgetData): String =
    "${WidgetModels.formatDayMonth(data.calendar.time)} · ${WidgetModels.formatWeekday(data.calendar)}"

  private fun updatedLabel(state: DashboardState): String {
    val timestamp = state.weather?.updatedAt?.takeIf { it > 0 } ?: state.updatedAt
    return if (timestamp > 0) "upd ${WidgetModels.formatTime(timestamp)}" else ""
  }
}
