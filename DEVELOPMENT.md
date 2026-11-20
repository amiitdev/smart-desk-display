# Smart Desk Display — development log

A native Android dashboard (React Native + Expo) with three real RemoteViews
home-screen widgets that share one persistent data store.

## Stack

| Layer | Tech |
| --- | --- |
| App | Expo SDK 58, React Native 0.88.1, React 19.3, TypeScript strict |
| Routing | Expo Router (file based, `src/app/`) |
| State | Zustand (`dashboardStore` = persisted state, `deviceStore` = live telemetry) |
| Native bridge | Expo Modules API, local module `modules/smart-desk-native` (Kotlin) |
| Widgets | Plain Android RemoteViews + native TextClock, WorkManager 2.12 |
| Storage | Single SharedPreferences document (Kotlin `DashboardStore`, schema v1) |
| Weather | Open-Meteo (forecast + geocoding), no API key |
| Reminders | expo-notifications, local scheduled notifications |

## Data flow

```
React Native (Zustand)
   │  saveDashboardData / getDashboardData
   ▼
Expo module (SmartDeskNativeModule.kt)
   ▼
DashboardStore.kt  ── SharedPreferences "smart_desk_state" (single copy, schema v1)
   ▲
   │  read / atomic update (widget task toggle)
Android widgets (RemoteViews)  +  WorkManager worker  +  broadcast receivers
```

Both the app and the widgets read and write the same document, so there is never
a second conflicting copy of dashboard state. Every write bumps `updatedAt` and
notifies listeners (React Native `onStateChanged` event + widget refresh).

## Build & run

```bash
npm install                      # first time
npx expo prebuild --platform android --clean   # regenerates android/ from app.json + config plugins
cd android && ./gradlew :app:assembleDebug      # APK: android/app/build/outputs/apk/debug/app-debug.apk
cd android && ./gradlew :app:assembleRelease    # signed release (debug keystore by default — replace before shipping)
```

Development (device connected over USB):

```bash
adb reverse tcp:8081 tcp:8081
npx expo start --localhost          # in a second terminal
adb shell am start -n com.amiitdev.smartdesk/.MainActivity
```

Useful scripts: `npm run typecheck`, `npm run build:apk`, `npm run build:release`.

> Native changes (Kotlin, widgets, manifest) are **not** picked up by Fast Refresh:
> rebuild with `./gradlew :app:assembleDebug` and reinstall.

## Permissions and manual setup

| Permission | Why | Where |
| --- | --- | --- |
| Notification access | Read/control other apps' media sessions (Spotify, YouTube Music, VLC) | Settings → Apps → Special access → Notification access → Smart Desk |
| POST_NOTIFICATIONS | Task reminders | Prompted on first reminder, or Settings → Apps → Smart Desk → Notifications |
| Location (fine/coarse) | Local weather + Wi-Fi SSID (Android redacts SSID without it) | Runtime prompt; can be refused and replaced by a city search |
| Modify audio settings | Volume slider | Normal permission, granted at install |

The in-app **Permissions** screen opens each system page directly and shows live
GRANTED / REQUIRED status.

## Widgets

Three providers, all resizable, all **plain RemoteViews** (`WidgetViews.kt`):

- `SmallWidgetReceiver` — clock, date, weather, battery, SSID. Fills extra room
  (when resized) with media, tasks and a mini calendar.
- `MediumWidgetReceiver` — clock, weather, media + transport buttons, battery.
  Adds calendar/tasks when the widget is tall.
- `LargeWidgetReceiver` — clock with seconds, month calendar, weather, media,
  next 3 tasks (toggleable), 4-day forecast, recently played, footer.

### Why plain RemoteViews and not Jetpack Glance

Glance composes a `ViewStub`-based RemoteViews (`root_match_match` +
`addStableView`). Several OEM launchers — vivo/OriginOS on the iQOO I2305 among
them — never inflate it: composition succeeds, `AppWidgetManager.updateAppWidget`
is called, and the launcher still shows `glance_default_loading_layout` (a white
box with a spinner) forever. Verified by A/B: a plain `RemoteViews` renders on
the same launcher, Glance's never does. Do not reintroduce Glance.

RemoteViews only allows an annotated whitelist of framework views. **`<View>` and
`<Space>` are rejected at inflation** (`Class not allowed to be inflated`), which
silently leaves the widget on its initial layout — use `FrameLayout` for spacers
and dividers.

### Sizing

`WidgetViews.small/medium` receive the widget height from
`AppWidgetManager.getAppWidgetOptions` and add optional blocks while a dp budget
lasts, so nothing is ever clipped and a compact 2x2 stays compact.

### Actions

Widget buttons send broadcasts to `WidgetActionReceiver` (`exported="false"`,
delivered through `PendingIntent` so it carries the app identity): media
transport via `MediaRepository.control`, task toggle via `DashboardStore.toggleTask`.

Refresh strategy: native TextClock (no work for time), push updates from the app,
broadcast receivers for battery/power/clock changes, and one WorkManager periodic
job (15 min, network constrained) that also refreshes weather for the widget.

## Project layout

```
src/
  app/                  expo-router screens: index (dashboard), tasks, settings, permissions, _layout
  components/
    dashboard/          Clock, Calendar, Backlight/Power, Weather, Music, Playlist, Tasks, System, Network
    ui/                 Card, Slider, ProgressBar, IconButton/Chip, ScreenHeader, SettingRow, WeatherIcon
    tasks/TaskEditor    create/edit modal with deadline + reminder pickers
  hooks/                useNow (1s clock), useDeviceTelemetry (events + polling)
  native/               typed wrapper over the Kotlin module (+ schema types)
  services/             weather (Open-Meteo), notifications (expo-notifications)
  store/                dashboardStore (persisted), deviceStore (live)
  theme/                design tokens sampled from the reference artwork
modules/smart-desk-native/
  android/src/main/java/expo/modules/smartdesknative/
    SmartDeskNativeModule.kt   Expo module: telemetry, media, persistence, settings, widget pinning
    data/                      DashboardSchema.kt (v1) + DashboardStore.kt (shared prefs, locked writes)
    system/                    BatteryReader, NetworkReader, SystemReader
    media/                     MediaRepository + MediaListenerService (notification listener)
    widget/                    RemoteViews builders, actions, receivers, WeatherFetcher, refresh worker
plugins/withSmartDeskWidgets.js  config plugin (manifest queries for media buttons)
```

`android/` is generated by CNG — never edit it by hand; change `app.json`,
`plugins/`, or the local module instead.
