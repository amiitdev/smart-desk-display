package expo.modules.smartdesknative.widget

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

/**
 * Deferrable background work: keeps the widget's weather reasonably fresh while
 * the app is closed. WorkManager batches this with other system work, so it costs
 * little battery; the in-app experience uses live push updates instead.
 */
class WidgetRefreshWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
  override suspend fun doWork(): Result {
    WeatherFetcher.refresh(applicationContext)
    WidgetUpdater.updateAllNow(applicationContext)
    return Result.success()
  }

  companion object {
    private const val WORK_NAME = "smart-desk-widget-refresh"

    fun schedule(context: Context) {
      val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(15, TimeUnit.MINUTES)
        .setConstraints(
          Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        )
        .build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        WORK_NAME,
        ExistingPeriodicWorkPolicy.KEEP,
        request
      )
    }
  }
}
