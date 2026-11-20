package expo.modules.smartdesknative.media

import android.service.notification.NotificationListenerService

/**
 * Required by Android to obtain a MediaSessionManager session token.
 *
 * The service itself does not parse notifications: active sessions are read via
 * MediaSessionManager, which is the supported API for third-party media apps.
 */
class MediaListenerService : NotificationListenerService() {
  companion object {
    @Volatile
    var isConnected: Boolean = false
      private set

    @Volatile
    private var instance: MediaListenerService? = null
  }

  override fun onCreate() {
    super.onCreate()
    instance = this
    MediaRepository.initialize(applicationContext)
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    isConnected = true
    MediaRepository.onListenerConnected(applicationContext)
  }

  override fun onListenerDisconnected() {
    super.onListenerDisconnected()
    isConnected = false
    MediaRepository.onListenerDisconnected(applicationContext)
  }

  override fun onDestroy() {
    isConnected = false
    instance = null
    MediaRepository.stopObserving()
    super.onDestroy()
  }
}
