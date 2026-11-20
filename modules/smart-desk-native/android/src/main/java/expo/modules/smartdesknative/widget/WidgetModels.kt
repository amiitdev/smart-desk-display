package expo.modules.smartdesknative.widget

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

data class CalendarCell(
  val day: Int,
  val inMonth: Boolean,
  val isToday: Boolean
)

object WidgetModels {
  fun calendarMatrix(today: Calendar = Calendar.getInstance()): List<List<CalendarCell>> {
    val first = (today.clone() as Calendar).apply {
      set(Calendar.DAY_OF_MONTH, 1)
      set(Calendar.HOUR_OF_DAY, 12)
    }
    val offset = first.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY
    val cursor = (first.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, -offset) }
    val month = first.get(Calendar.MONTH)
    val rows = mutableListOf<List<CalendarCell>>()
    repeat(6) {
      val row = mutableListOf<CalendarCell>()
      repeat(7) {
        row.add(
          CalendarCell(
            day = cursor.get(Calendar.DAY_OF_MONTH),
            inMonth = cursor.get(Calendar.MONTH) == month,
            isToday = isSameDay(cursor, today)
          )
        )
        cursor.add(Calendar.DAY_OF_MONTH, 1)
      }
      rows.add(row)
    }
    return rows
  }

  private fun isSameDay(a: Calendar, b: Calendar): Boolean =
    a.get(Calendar.YEAR) == b.get(Calendar.YEAR) &&
      a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR)

  fun weekdayLabels(): List<String> = listOf("Su", "Mo", "Tu", "We", "Th", "Fr", "Sa")

  fun formatDate(calendar: Calendar = Calendar.getInstance()): String =
    SimpleDateFormat("d MMMM yyyy", Locale.getDefault()).format(calendar.time)

  fun formatWeekday(calendar: Calendar = Calendar.getInstance()): String =
    SimpleDateFormat("EEEE", Locale.getDefault()).format(calendar.time)

  fun formatDayMonth(date: Date): String =
    SimpleDateFormat("d MMM", Locale.getDefault()).format(date)

  fun formatTime(timestamp: Long): String =
    SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(timestamp))

  /** "2026-11-21" -> "Sat"; falls back to the raw value when it is not ISO. */
  fun formatForecastDay(date: String): String = runCatching {
    SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(date)?.let {
      SimpleDateFormat("EEE", Locale.getDefault()).format(it)
    }
  }.getOrNull() ?: date

  /** Short human deadline used by the large widget, mirroring the app's labels. */
  fun deadlineLabel(deadline: Long?, completed: Boolean): String {
    if (completed) return "done"
    if (deadline == null) return "someday"
    val now = Calendar.getInstance()
    val target = Calendar.getInstance().apply { timeInMillis = deadline }
    val startToday = (now.clone() as Calendar).apply {
      set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    val startTarget = (target.clone() as Calendar).apply {
      set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    val days = Math.round((startTarget.timeInMillis - startToday.timeInMillis).toDouble() / 86_400_000.0).toInt()
    return when {
      days < 0 -> "overdue"
      days == 0 -> "today"
      days == 1 -> "tomorrow"
      days < 7 -> "in ${days}d"
      else -> formatDayMonth(target.time)
    }
  }

  fun temperature(celsius: Double, unit: String): String {
    val value = if (unit == "f") celsius * 9 / 5 + 32 else celsius
    return "${Math.round(value)}°"
  }

  fun weatherLabel(code: Int): String = when (code) {
    0 -> "Clear"
    1, 2 -> "Partly cloudy"
    3 -> "Overcast"
    45, 48 -> "Fog"
    51, 53, 55 -> "Drizzle"
    56, 57, 66, 67 -> "Freezing rain"
    61, 63, 65, 80, 81, 82 -> "Rain"
    71, 73, 75, 77, 85, 86 -> "Snow"
    95, 96, 99 -> "Thunderstorm"
    else -> "Weather"
  }

  fun weatherEmoji(code: Int): String = when (code) {
    0 -> "☀"
    1, 2 -> "⛅"
    3 -> "☁"
    45, 48 -> "🌫"
    51, 53, 55, 56, 57 -> "🌦"
    61, 63, 65, 66, 67, 80, 81, 82 -> "🌧"
    71, 73, 75, 77, 85, 86 -> "❄"
    95, 96, 99 -> "⛈"
    else -> "☁"
  }
}
