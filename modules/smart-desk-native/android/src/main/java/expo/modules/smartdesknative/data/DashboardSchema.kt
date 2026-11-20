package expo.modules.smartdesknative.data

import org.json.JSONArray
import org.json.JSONObject

/**
 * Versioned dashboard schema.
 *
 * This is the single source of truth shared by the React Native app, the Kotlin
 * module and the home-screen widgets. Version 1 is the initial schema; when a
 * field changes, bump [DashboardState.SCHEMA_VERSION] and migrate in
 * [DashboardState.fromJson].
 */
data class SavedLocation(
  val name: String,
  val latitude: Double,
  val longitude: Double
) {
  fun toJson() = JSONObject().apply {
    put("name", name)
    put("latitude", latitude)
    put("longitude", longitude)
  }

  fun toMap(): Map<String, Any?> = mapOf(
    "name" to name,
    "latitude" to latitude,
    "longitude" to longitude
  )

  companion object {
    fun fromJson(json: JSONObject?): SavedLocation? {
      if (json == null || json.isNull("name")) return null
      return SavedLocation(
        name = json.optString("name", "Location"),
        latitude = json.optDouble("latitude", 0.0),
        longitude = json.optDouble("longitude", 0.0)
      )
    }
  }
}

data class DashboardSettings(
  val use24Hour: Boolean = true,
  val backlight: Double = 0.85,
  val volume: Double = 0.6,
  val temperatureUnit: String = "c",
  val location: SavedLocation? = null
) {
  fun toJson() = JSONObject().apply {
    put("use24Hour", use24Hour)
    put("backlight", backlight)
    put("volume", volume)
    put("temperatureUnit", temperatureUnit)
    put("location", location?.toJson() ?: JSONObject.NULL)
  }

  fun toMap(): Map<String, Any?> = mapOf(
    "use24Hour" to use24Hour,
    "backlight" to backlight,
    "volume" to volume,
    "temperatureUnit" to temperatureUnit,
    "location" to location?.toMap()
  )

  companion object {
    fun fromJson(json: JSONObject?): DashboardSettings {
      if (json == null) return DashboardSettings()
      return DashboardSettings(
        use24Hour = json.optBoolean("use24Hour", true),
        backlight = json.optDouble("backlight", 0.85).coerceIn(0.0, 1.0),
        volume = json.optDouble("volume", 0.6).coerceIn(0.0, 1.0),
        temperatureUnit = json.optString("temperatureUnit", "c").let { if (it == "f") "f" else "c" },
        location = if (json.isNull("location")) null else SavedLocation.fromJson(json.optJSONObject("location"))
      )
    }
  }
}

data class ForecastDay(
  val date: String,
  val minC: Double,
  val maxC: Double,
  val code: Int,
  val precipitationChance: Double? = null
) {
  fun toJson() = JSONObject().apply {
    put("date", date)
    put("minC", minC)
    put("maxC", maxC)
    put("code", code)
    put("precipitationChance", precipitationChance ?: JSONObject.NULL)
  }

  fun toMap(): Map<String, Any?> = mapOf(
    "date" to date,
    "minC" to minC,
    "maxC" to maxC,
    "code" to code,
    "precipitationChance" to precipitationChance
  )

  companion object {
    fun fromJson(json: JSONObject) = ForecastDay(
      date = json.optString("date", ""),
      minC = json.optDouble("minC", 0.0),
      maxC = json.optDouble("maxC", 0.0),
      code = json.optInt("code", 0),
      precipitationChance = if (json.isNull("precipitationChance")) null else json.optDouble("precipitationChance")
    )
  }
}

data class WeatherSnapshot(
  val tempC: Double,
  val feelsLikeC: Double,
  val humidity: Int,
  val windKph: Double,
  val code: Int,
  val isDay: Boolean,
  val locationName: String,
  val updatedAt: Long,
  val forecast: List<ForecastDay> = emptyList()
) {
  fun toJson() = JSONObject().apply {
    put("tempC", tempC)
    put("feelsLikeC", feelsLikeC)
    put("humidity", humidity)
    put("windKph", windKph)
    put("code", code)
    put("isDay", isDay)
    put("locationName", locationName)
    put("updatedAt", updatedAt)
    put("forecast", JSONArray().apply { forecast.forEach { put(it.toJson()) } })
  }

  fun toMap(): Map<String, Any?> = mapOf(
    "tempC" to tempC,
    "feelsLikeC" to feelsLikeC,
    "humidity" to humidity,
    "windKph" to windKph,
    "code" to code,
    "isDay" to isDay,
    "locationName" to locationName,
    "updatedAt" to updatedAt,
    "forecast" to forecast.map { it.toMap() }
  )

  companion object {
    fun fromJson(json: JSONObject?): WeatherSnapshot? {
      if (json == null || json.isNull("tempC")) return null
      val forecastJson = json.optJSONArray("forecast")
      val forecast = mutableListOf<ForecastDay>()
      if (forecastJson != null) {
        for (index in 0 until forecastJson.length()) {
          forecastJson.optJSONObject(index)?.let { forecast.add(ForecastDay.fromJson(it)) }
        }
      }
      return WeatherSnapshot(
        tempC = json.optDouble("tempC", 0.0),
        feelsLikeC = json.optDouble("feelsLikeC", 0.0),
        humidity = json.optInt("humidity", 0),
        windKph = json.optDouble("windKph", 0.0),
        code = json.optInt("code", 0),
        isDay = json.optBoolean("isDay", true),
        locationName = json.optString("locationName", ""),
        updatedAt = json.optLong("updatedAt", 0L),
        forecast = forecast
      )
    }
  }
}

data class TaskItem(
  val id: String,
  val title: String,
  val deadline: Long? = null,
  val completed: Boolean = false,
  val reminderAt: Long? = null,
  val createdAt: Long = System.currentTimeMillis()
) {
  fun isOverdue(now: Long = System.currentTimeMillis()) = !completed && deadline != null && deadline < now

  fun toJson() = JSONObject().apply {
    put("id", id)
    put("title", title)
    put("deadline", deadline ?: JSONObject.NULL)
    put("completed", completed)
    put("reminderAt", reminderAt ?: JSONObject.NULL)
    put("createdAt", createdAt)
  }

  fun toMap(): Map<String, Any?> = mapOf(
    "id" to id,
    "title" to title,
    "deadline" to deadline,
    "completed" to completed,
    "reminderAt" to reminderAt,
    "createdAt" to createdAt
  )

  companion object {
    fun fromJson(json: JSONObject) = TaskItem(
      id = json.optString("id", ""),
      title = json.optString("title", "Untitled task"),
      deadline = if (json.isNull("deadline")) null else json.optLong("deadline"),
      completed = json.optBoolean("completed", false),
      reminderAt = if (json.isNull("reminderAt")) null else json.optLong("reminderAt"),
      createdAt = json.optLong("createdAt", System.currentTimeMillis())
    )
  }
}

data class MediaHistoryEntry(
  val title: String,
  val artist: String? = null,
  val packageName: String? = null,
  val playedAt: Long = System.currentTimeMillis()
) {
  fun toJson() = JSONObject().apply {
    put("title", title)
    put("artist", artist ?: JSONObject.NULL)
    put("packageName", packageName ?: JSONObject.NULL)
    put("playedAt", playedAt)
  }

  fun toMap(): Map<String, Any?> = mapOf(
    "title" to title,
    "artist" to artist,
    "packageName" to packageName,
    "playedAt" to playedAt
  )

  companion object {
    fun fromJson(json: JSONObject) = MediaHistoryEntry(
      title = json.optString("title", ""),
      artist = if (json.isNull("artist")) null else json.optString("artist"),
      packageName = if (json.isNull("packageName")) null else json.optString("packageName"),
      playedAt = json.optLong("playedAt", 0L)
    )
  }
}

data class DashboardState(
  val version: Int = SCHEMA_VERSION,
  val updatedAt: Long = 0L,
  val settings: DashboardSettings = DashboardSettings(),
  val weather: WeatherSnapshot? = null,
  val tasks: List<TaskItem> = emptyList(),
  val mediaHistory: List<MediaHistoryEntry> = emptyList()
) {
  fun toJson() = JSONObject().apply {
    put("version", version)
    put("updatedAt", updatedAt)
    put("settings", settings.toJson())
    put("weather", weather?.toJson() ?: JSONObject.NULL)
    put("tasks", JSONArray().apply { tasks.forEach { put(it.toJson()) } })
    put("mediaHistory", JSONArray().apply { mediaHistory.forEach { put(it.toJson()) } })
  }

  fun toMap(): Map<String, Any?> = mapOf(
    "version" to version,
    "updatedAt" to updatedAt,
    "settings" to settings.toMap(),
    "weather" to weather?.toMap(),
    "tasks" to tasks.map { it.toMap() },
    "mediaHistory" to mediaHistory.map { it.toMap() }
  )

  companion object {
    const val SCHEMA_VERSION = 1

    fun empty() = DashboardState()

    fun fromJson(json: JSONObject?): DashboardState {
      if (json == null) return empty()
      val version = json.optInt("version", 0)
      // Future migrations land here (version 1 is the first schema).
      if (version > SCHEMA_VERSION) {
        // Unknown newer schema written by a newer build: read what we can.
      }
      val tasksJson = json.optJSONArray("tasks")
      val tasks = mutableListOf<TaskItem>()
      if (tasksJson != null) {
        for (index in 0 until tasksJson.length()) {
          tasksJson.optJSONObject(index)?.let { tasks.add(TaskItem.fromJson(it)) }
        }
      }
      val historyJson = json.optJSONArray("mediaHistory")
      val history = mutableListOf<MediaHistoryEntry>()
      if (historyJson != null) {
        for (index in 0 until historyJson.length()) {
          historyJson.optJSONObject(index)?.let { history.add(MediaHistoryEntry.fromJson(it)) }
        }
      }
      return DashboardState(
        version = SCHEMA_VERSION,
        updatedAt = json.optLong("updatedAt", 0L),
        settings = DashboardSettings.fromJson(json.optJSONObject("settings")),
        weather = if (json.isNull("weather")) null else WeatherSnapshot.fromJson(json.optJSONObject("weather")),
        tasks = tasks,
        mediaHistory = history
      )
    }
  }
}
