package expo.modules.smartdesknative.media

import android.content.ComponentName
import android.content.Context
import android.graphics.Bitmap
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import java.io.File
import java.io.FileOutputStream

data class MediaSnapshot(
  val enabled: Boolean,
  val hasSession: Boolean,
  val isPlaying: Boolean,
  val title: String?,
  val artist: String?,
  val album: String?,
  val packageName: String?,
  val appLabel: String?,
  val durationMs: Long,
  val positionMs: Long,
  val artworkUri: String?,
  val supportsNext: Boolean,
  val supportsPrevious: Boolean
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "enabled" to enabled,
    "hasSession" to hasSession,
    "isPlaying" to isPlaying,
    "title" to title,
    "artist" to artist,
    "album" to album,
    "packageName" to packageName,
    "appLabel" to appLabel,
    "durationMs" to durationMs,
    "positionMs" to positionMs,
    "artworkUri" to artworkUri,
    "supportsNext" to supportsNext,
    "supportsPrevious" to supportsPrevious
  )

  companion object {
    fun empty(enabled: Boolean) = MediaSnapshot(
      enabled = enabled,
      hasSession = false,
      isPlaying = false,
      title = null,
      artist = null,
      album = null,
      packageName = null,
      appLabel = null,
      durationMs = 0L,
      positionMs = 0L,
      artworkUri = null,
      supportsNext = false,
      supportsPrevious = false
    )
  }
}

/**
 * Reads the active media session through MediaSessionManager and forwards
 * playback controls through MediaController.TransportControls.
 *
 * Android requires notification-listener access for third-party media sessions,
 * therefore every entry point degrades gracefully when that access is missing
 * instead of pretending metadata exists.
 */
object MediaRepository {
  private var controller: MediaController? = null
  private var callback: MediaController.Callback? = null
  private var sessionsListener: MediaSessionManager.OnActiveSessionsChangedListener? = null
  private var sessionsManager: MediaSessionManager? = null
  private var eventSink: ((MediaSnapshot) -> Unit)? = null
  private var widgetRefresh: ((Context) -> Unit)? = null

  @Volatile
  private var lastSnapshot: MediaSnapshot? = null
  private var lastArtworkSignature: String? = null

  fun setEventSink(sink: ((MediaSnapshot) -> Unit)?) {
    eventSink = sink
  }

  fun setWidgetRefresh(refresh: ((Context) -> Unit)?) {
    widgetRefresh = refresh
  }

  fun isNotificationAccessGranted(context: Context): Boolean = try {
    NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
  } catch (error: Exception) {
    false
  }

  fun initialize(context: Context) {
    if (isNotificationAccessGranted(context)) {
      startObserving(context)
    } else {
      lastSnapshot = MediaSnapshot.empty(false)
    }
  }

  fun onListenerConnected(context: Context) {
    startObserving(context)
  }

  fun onListenerDisconnected(context: Context) {
    stopObserving()
    lastSnapshot = MediaSnapshot.empty(isNotificationAccessGranted(context))
    eventSink?.invoke(lastSnapshot!!)
  }

  fun startObserving(context: Context) {
    if (sessionsListener != null) return
    val manager = context.getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager ?: return
    val component = ComponentName(context, MediaListenerService::class.java)
    val listener = MediaSessionManager.OnActiveSessionsChangedListener { controllers ->
      bindController(context, controllers)
    }
    try {
      manager.addOnActiveSessionsChangedListener(listener, component)
      sessionsListener = listener
      sessionsManager = manager
      bindController(context, manager.getActiveSessions(component))
    } catch (error: SecurityException) {
      sessionsListener = null
      lastSnapshot = MediaSnapshot.empty(false)
    } catch (error: Exception) {
      sessionsListener = null
    }
  }

  fun stopObserving() {
    callback?.let { cb -> runCatching { controller?.unregisterCallback(cb) } }
    callback = null
    controller = null
    sessionsListener?.let { listener ->
      runCatching { sessionsManager?.removeOnActiveSessionsChangedListener(listener) }
    }
    sessionsListener = null
    sessionsManager = null
  }

  private fun bindController(context: Context, controllers: List<MediaController>?) {
    val candidates = controllers.orEmpty().filter { it.packageName != context.packageName }
    val best = candidates.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
      ?: candidates.firstOrNull()

    callback?.let { cb -> runCatching { controller?.unregisterCallback(cb) } }

    controller = best
    if (best == null) {
      callback = null
      publish(context, recordHistory = false)
      return
    }

    val newCallback = object : MediaController.Callback() {
      override fun onPlaybackStateChanged(state: PlaybackState?) {
        publish(context, recordHistory = false)
      }

      override fun onMetadataChanged(metadata: MediaMetadata?) {
        publish(context, recordHistory = true)
      }

      override fun onSessionDestroyed() {
        publish(context, recordHistory = false)
      }
    }
    callback = newCallback
    runCatching { best.registerCallback(newCallback) }
    publish(context, recordHistory = true)
  }

  fun snapshot(context: Context, includeArtwork: Boolean = true): MediaSnapshot {
    val enabled = isNotificationAccessGranted(context)
    if (!enabled) return MediaSnapshot.empty(false)

    val active = currentController(context)
    val state = active?.playbackState
    val metadata = active?.metadata
    if (active == null || metadata == null) {
      return MediaSnapshot.empty(true)
    }

    val title = metadata.getString(MediaMetadata.METADATA_KEY_TITLE)
      ?: metadata.getString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE)
    val artist = metadata.getString(MediaMetadata.METADATA_KEY_ARTIST)
      ?: metadata.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)
      ?: metadata.getString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE)
    val album = metadata.getString(MediaMetadata.METADATA_KEY_ALBUM)
    val duration = metadata.getLong(MediaMetadata.METADATA_KEY_DURATION)
    val actions = state?.actions ?: 0L

    val snapshot = MediaSnapshot(
      enabled = true,
      hasSession = true,
      isPlaying = state?.state == PlaybackState.STATE_PLAYING,
      title = title,
      artist = artist,
      album = album,
      packageName = active.packageName,
      appLabel = appLabel(context, active.packageName),
      durationMs = if (duration > 0) duration else 0L,
      positionMs = state?.position?.coerceAtLeast(0L) ?: 0L,
      artworkUri = if (includeArtwork) artworkUri(context, metadata) else null,
      supportsNext = actions and PlaybackState.ACTION_SKIP_TO_NEXT != 0L,
      supportsPrevious = actions and PlaybackState.ACTION_SKIP_TO_PREVIOUS != 0L
    )
    lastSnapshot = snapshot
    return snapshot
  }

  fun lastKnownSnapshot(context: Context): MediaSnapshot =
    lastSnapshot ?: snapshot(context, includeArtwork = false)

  fun control(context: Context, action: String): Pair<Boolean, String?> {
    if (!isNotificationAccessGranted(context)) {
      return false to "Notification access is required to control other apps' media"
    }
    val active = currentController(context) ?: return false to "No active media session"
    val state = active.playbackState
    val actions = state?.actions ?: 0L

    return try {
      when (action) {
        "play" -> active.transportControls.play()
        "pause" -> active.transportControls.pause()
        "toggle" -> {
          if (state?.state == PlaybackState.STATE_PLAYING) active.transportControls.pause()
          else active.transportControls.play()
        }
        "next" -> {
          if (actions and PlaybackState.ACTION_SKIP_TO_NEXT == 0L) {
            return false to "This app does not support next track"
          }
          active.transportControls.skipToNext()
        }
        "previous" -> {
          if (actions and PlaybackState.ACTION_SKIP_TO_PREVIOUS == 0L) {
            return false to "This app does not support previous track"
          }
          active.transportControls.skipToPrevious()
        }
        "stop" -> active.transportControls.stop()
        else -> return false to "Unknown media action: $action"
      }
      publish(context, recordHistory = false)
      true to null
    } catch (error: Exception) {
      false to (error.message ?: "Media control failed")
    }
  }

  private fun publish(context: Context, recordHistory: Boolean) {
    val snapshot = try {
      snapshot(context)
    } catch (error: Exception) {
      MediaSnapshot.empty(isNotificationAccessGranted(context))
    }
    lastSnapshot = snapshot

    if (recordHistory && snapshot.title != null) {
      expo.modules.smartdesknative.data.DashboardStore.recordMediaEntry(
        context,
        snapshot.title,
        snapshot.artist,
        snapshot.packageName
      )
    }

    eventSink?.invoke(snapshot)
    widgetRefresh?.invoke(context)
  }

  private fun currentController(context: Context): MediaController? {
    controller?.let { return it }
    val manager = context.getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager ?: return null
    val component = ComponentName(context, MediaListenerService::class.java)
    return try {
      val controllers = manager.getActiveSessions(component)
        .filter { it.packageName != context.packageName }
      val best = controllers.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
        ?: controllers.firstOrNull()
      controller = best
      best
    } catch (error: Exception) {
      null
    }
  }

  private fun appLabel(context: Context, packageName: String?): String? {
    if (packageName == null) return null
    return try {
      val manager = context.packageManager
      val info = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        manager.getApplicationInfo(packageName, android.content.pm.PackageManager.ApplicationInfoFlags.of(0))
      } else {
        @Suppress("DEPRECATION")
        manager.getApplicationInfo(packageName, 0)
      }
      manager.getApplicationLabel(info).toString()
    } catch (error: Exception) {
      packageName
    }
  }

  /**
   * Album artwork is written to the app cache so React Native can render it with
   * a plain file:// URI. The signature check avoids rewriting identical images on
   * every metadata callback.
   */
  private fun artworkUri(context: Context, metadata: MediaMetadata): String? {
    val bitmap: Bitmap = metadata.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART)
      ?: metadata.getBitmap(MediaMetadata.METADATA_KEY_ART)
      ?: metadata.getBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON)
      ?: return null

    val signature = "${metadata.getString(MediaMetadata.METADATA_KEY_TITLE)}|${
      metadata.getString(MediaMetadata.METADATA_KEY_ARTIST)
    }|${bitmap.width}x${bitmap.height}"

    val directory = File(context.cacheDir, "media_art").apply { mkdirs() }
    val file = File(directory, "current.png")
    if (signature != lastArtworkSignature || !file.exists()) {
      try {
        FileOutputStream(file).use { stream ->
          bitmap.compress(Bitmap.CompressFormat.PNG, 90, stream)
        }
        lastArtworkSignature = signature
      } catch (error: Exception) {
        return null
      }
    }
    return "file://${file.absolutePath}"
  }
}
