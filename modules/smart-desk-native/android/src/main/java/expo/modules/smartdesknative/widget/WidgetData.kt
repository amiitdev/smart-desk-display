package expo.modules.smartdesknative.widget

import android.content.Context
import expo.modules.smartdesknative.data.DashboardState
import expo.modules.smartdesknative.data.DashboardStore
import expo.modules.smartdesknative.media.MediaRepository
import expo.modules.smartdesknative.media.MediaSnapshot
import expo.modules.smartdesknative.system.BatteryInfo
import expo.modules.smartdesknative.system.BatteryReader
import expo.modules.smartdesknative.system.NetworkInfo
import expo.modules.smartdesknative.system.NetworkReader
import java.util.Calendar

data class WidgetData(
  val state: DashboardState,
  val battery: BatteryInfo,
  val network: NetworkInfo,
  val media: MediaSnapshot,
  val calendar: Calendar = Calendar.getInstance()
) {
  val use24Hour: Boolean get() = state.settings.use24Hour
  val temperatureUnit: String get() = state.settings.temperatureUnit
}

object WidgetDataLoader {
  fun load(context: Context): WidgetData = WidgetData(
    state = DashboardStore.read(context),
    battery = BatteryReader.read(context),
    network = NetworkReader.read(context),
    media = runCatching { MediaRepository.lastKnownSnapshot(context) }
      .getOrElse { MediaSnapshot.empty(false) }
  )
}
