package expo.modules.smartdesknative.system

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiInfo
import android.os.Build
import android.telephony.TelephonyManager
import java.net.Inet4Address

data class NetworkInfo(
  val connected: Boolean,
  val transport: String,
  val ssid: String?,
  val signalLevel: Int,
  val signalDbm: Int?,
  val linkSpeedMbps: Int?,
  val frequencyMhz: Int?,
  val ipAddress: String?,
  val hasInternet: Boolean,
  val isMetered: Boolean,
  val carrierName: String?,
  val ssidPermissionGranted: Boolean
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "connected" to connected,
    "transport" to transport,
    "ssid" to ssid,
    "signalLevel" to signalLevel,
    "signalDbm" to signalDbm,
    "linkSpeedMbps" to linkSpeedMbps,
    "frequencyMhz" to frequencyMhz,
    "ipAddress" to ipAddress,
    "hasInternet" to hasInternet,
    "isMetered" to isMetered,
    "carrierName" to carrierName,
    "ssidPermissionGranted" to ssidPermissionGranted
  )
}

/**
 * Connectivity + Wi-Fi details via ConnectivityManager and NetworkCapabilities.
 * SSID and signal strength are intentionally optional: Android only exposes
 * them with the location permission and location services enabled.
 */
object NetworkReader {
  fun read(context: Context): NetworkInfo {
    val manager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
      ?: return disconnected()

    val network = try {
      manager.activeNetwork
    } catch (error: Exception) {
      null
    } ?: return disconnected()

    val capabilities = manager.getNetworkCapabilities(network) ?: return disconnected()

    val transport = when {
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "Wi-Fi"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "Cellular"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "Ethernet"
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "VPN"
      else -> "Other"
    }

    val permissionGranted = context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) ==
      PackageManager.PERMISSION_GRANTED
    val locationEnabled = isLocationEnabled(context)

    var ssid: String? = null
    var rssi: Int? = null
    var linkSpeed: Int? = null
    var frequency: Int? = null

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val wifiInfo = capabilities.transportInfo as? WifiInfo
      if (wifiInfo != null) {
        // The SSID is redacted to "<unknown ssid>" unless location is allowed.
        if (permissionGranted && locationEnabled) {
          ssid = cleanSsid(wifiInfo.ssid) ?: legacySsid(context)
        }
        if (wifiInfo.rssi < 0) rssi = wifiInfo.rssi
        if (wifiInfo.linkSpeed > 0) linkSpeed = wifiInfo.linkSpeed
        if (wifiInfo.frequency > 0) frequency = wifiInfo.frequency
      }
    }

    if (ssid == null && permissionGranted && locationEnabled) {
      ssid = legacySsid(context)
    }

    val ipAddress = try {
      manager.getLinkProperties(network)?.linkAddresses
        ?.firstOrNull { it.address is Inet4Address && !it.address.isLoopbackAddress }
        ?.address?.hostAddress
    } catch (error: Exception) {
      null
    }

    val carrierName = try {
      (context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager)
        ?.networkOperatorName
        ?.takeIf { it.isNotBlank() }
    } catch (error: Exception) {
      null
    }

    return NetworkInfo(
      connected = true,
      transport = transport,
      ssid = ssid,
      signalLevel = signalLevel(rssi),
      signalDbm = rssi,
      linkSpeedMbps = linkSpeed,
      frequencyMhz = frequency,
      ipAddress = ipAddress,
      hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
        capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED),
      isMetered = !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED),
      carrierName = carrierName,
      ssidPermissionGranted = permissionGranted && locationEnabled
    )
  }

  private fun cleanSsid(raw: String?): String? {
    val value = raw?.trim()?.trim('"')
    return if (value.isNullOrBlank() || value == "<unknown ssid>") null else value
  }

  private fun legacySsid(context: Context): String? = try {
    val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? android.net.wifi.WifiManager
    cleanSsid(wifi?.connectionInfo?.ssid)
  } catch (error: Exception) {
    null
  }

  private fun disconnected() = NetworkInfo(
    connected = false,
    transport = "None",
    ssid = null,
    signalLevel = 0,
    signalDbm = null,
    linkSpeedMbps = null,
    frequencyMhz = null,
    ipAddress = null,
    hasInternet = false,
    isMetered = false,
    carrierName = null,
    ssidPermissionGranted = false
  )

  private fun isLocationEnabled(context: Context): Boolean = try {
    val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      manager?.isLocationEnabled ?: false
    } else {
      @Suppress("DEPRECATION")
      manager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true ||
        manager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true
    }
  } catch (error: Exception) {
    false
  }

  private fun signalLevel(rssi: Int?): Int {
    val value = rssi ?: return 0
    return when {
      value >= -50 -> 4
      value >= -60 -> 3
      value >= -70 -> 2
      value >= -80 -> 1
      else -> 0
    }
  }
}
