package expo.modules.smartdesknative.data

import android.content.Context
import org.json.JSONObject
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Persistent store shared by React Native, the widgets and background workers.
 *
 * One SharedPreferences document holds the whole versioned dashboard state, so
 * there is exactly one copy of the data. Writes are serialised through a lock
 * because widgets, broadcast receivers and the React Native bridge can all
 * mutate the state from different threads.
 */
object DashboardStore {
  private const val PREFS_NAME = "smart_desk_state"
  private const val STATE_KEY = "dashboard_state_v1"
  private const val MAX_MEDIA_HISTORY = 24

  private val lock = Any()
  private val listeners = CopyOnWriteArrayList<(DashboardState) -> Unit>()

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun read(context: Context): DashboardState {
    val raw = try {
      prefs(context).getString(STATE_KEY, null)
    } catch (error: Exception) {
      null
    } ?: return DashboardState.empty()

    return try {
      DashboardState.fromJson(JSONObject(raw))
    } catch (error: Exception) {
      DashboardState.empty()
    }
  }

  /** Persists [state] and returns the stored version with an updated timestamp. */
  fun write(context: Context, state: DashboardState, bumpTimestamp: Boolean = true): DashboardState {
    val next = state.copy(
      version = DashboardState.SCHEMA_VERSION,
      updatedAt = if (bumpTimestamp) System.currentTimeMillis() else state.updatedAt
    )
    val serialized = next.toJson().toString()
    synchronized(lock) {
      prefs(context).edit().putString(STATE_KEY, serialized).apply()
    }
    notifyListeners(next)
    return next
  }

  /** Atomic read-modify-write used by widget actions and background workers. */
  fun update(context: Context, block: (DashboardState) -> DashboardState): DashboardState {
    synchronized(lock) {
      val current = read(context)
      return write(context, block(current))
    }
  }

  fun toggleTask(context: Context, taskId: String): DashboardState = update(context) { state ->
    state.copy(
      tasks = state.tasks.map { task ->
        if (task.id == taskId) task.copy(completed = !task.completed) else task
      }
    )
  }

  /**
   * Records a track in the "recently played" list. Consecutive duplicates are
   * collapsed so re-reading the same session metadata does not spam the list.
   */
  fun recordMediaEntry(context: Context, title: String, artist: String?, packageName: String?): Boolean {
    if (title.isBlank()) return false
    synchronized(lock) {
      val state = read(context)
      val newest = state.mediaHistory.firstOrNull()
      if (newest != null && newest.title == title && newest.artist == artist) {
        return false
      }
      val entry = MediaHistoryEntry(
        title = title.take(120),
        artist = artist?.take(120),
        packageName = packageName,
        playedAt = System.currentTimeMillis()
      )
      val history = (listOf(entry) + state.mediaHistory)
        .distinctBy { "${it.title}|${it.artist}" }
        .take(MAX_MEDIA_HISTORY)
      write(context, state.copy(mediaHistory = history))
    }
    return true
  }

  fun clearMediaHistory(context: Context): DashboardState = update(context) { state ->
    state.copy(mediaHistory = emptyList())
  }

  fun addListener(listener: (DashboardState) -> Unit) {
    listeners.addIfAbsent(listener)
  }

  fun removeListener(listener: (DashboardState) -> Unit) {
    listeners.remove(listener)
  }

  private fun notifyListeners(state: DashboardState) {
    listeners.forEach { listener ->
      runCatching { listener(state) }
    }
  }
}
