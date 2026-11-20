package expo.modules.smartdesknative.widget

import android.content.Context
import android.util.Log
import expo.modules.smartdesknative.data.DashboardStore
import expo.modules.smartdesknative.data.ForecastDay
import expo.modules.smartdesknative.data.WeatherSnapshot
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * Weather refresh for the widget when the app is not running. Uses the same
 * Open-Meteo endpoint as the React Native service and writes the result into the
 * shared dashboard state, so app and widget stay in sync.
 */
object WeatherFetcher {
  private const val TAG = "SmartDeskWeather"
  private const val STALE_MS = 30 * 60 * 1000L
  private const val BASE_URL = "https://api.open-meteo.com/v1/forecast"

  fun refresh(context: Context): Boolean {
    val state = DashboardStore.read(context)
    val location = state.settings.location ?: return false
    val current = state.weather
    if (current != null && System.currentTimeMillis() - current.updatedAt < STALE_MS) return false

    val url = buildString {
      append(BASE_URL)
      append("?latitude=").append(location.latitude)
      append("&longitude=").append(location.longitude)
      append("&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m")
      append("&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max")
      append("&timezone=auto&forecast_days=5")
    }

    return try {
      val json = httpGet(url) ?: return false
      val snapshot = parse(json, location.name) ?: return false
      DashboardStore.update(context) { latest -> latest.copy(weather = snapshot) }
      WidgetUpdater.updateAllNow(context)
      true
    } catch (error: Exception) {
      Log.w(TAG, "Weather refresh failed: ${error.message}")
      false
    }
  }

  private fun httpGet(url: String): JSONObject? {
    val connection = (URL(url).openConnection() as HttpURLConnection).apply {
      requestMethod = "GET"
      connectTimeout = TimeUnit.SECONDS.toMillis(10).toInt()
      readTimeout = TimeUnit.SECONDS.toMillis(10).toInt()
      setRequestProperty("Accept", "application/json")
    }
    return try {
      if (connection.responseCode !in 200..299) {
        Log.w(TAG, "Open-Meteo HTTP ${connection.responseCode}")
        null
      } else {
        JSONObject(connection.inputStream.bufferedReader().use { it.readText() })
      }
    } finally {
      connection.disconnect()
    }
  }

  private fun parse(json: JSONObject, locationName: String): WeatherSnapshot? {
    val current = json.optJSONObject("current") ?: return null
    val daily = json.optJSONObject("daily")
    val dates = daily?.optJSONArray("time")
    val codes = daily?.optJSONArray("weather_code")
    val mins = daily?.optJSONArray("temperature_2m_min")
    val maxs = daily?.optJSONArray("temperature_2m_max")
    val precipitation = daily?.optJSONArray("precipitation_probability_max")

    val forecast = mutableListOf<ForecastDay>()
    if (dates != null) {
      for (index in 0 until dates.length()) {
        forecast.add(
          ForecastDay(
            date = dates.optString(index),
            minC = mins?.optDouble(index, 0.0) ?: 0.0,
            maxC = maxs?.optDouble(index, 0.0) ?: 0.0,
            code = codes?.optInt(index, 0) ?: 0,
            precipitationChance = if (precipitation == null || precipitation.isNull(index)) null else precipitation.optDouble(index)
          )
        )
      }
    }

    return WeatherSnapshot(
      tempC = current.optDouble("temperature_2m", 0.0),
      feelsLikeC = current.optDouble("apparent_temperature", 0.0),
      humidity = current.optInt("relative_humidity_2m", 0),
      windKph = current.optDouble("wind_speed_10m", 0.0),
      code = current.optInt("weather_code", 0),
      isDay = current.optInt("is_day", 1) == 1,
      locationName = locationName,
      updatedAt = System.currentTimeMillis(),
      forecast = forecast
    )
  }
}
