# Project: Smart Desk Display

Act as a senior Android engineer, React Native architect, Kotlin developer, and UI/UX designer.

Build a production-quality Android application called **Smart Desk Display**, inspired by the attached reference image of an ESP32 Smart Desk Display dashboard.

## 1. Technology Stack

Use the following architecture:

- React Native with Expo.
- Expo Prebuild (NOT Expo Go).
- TypeScript.
- Kotlin for native Android functionality.
- Expo Modules API for communication between React Native and Kotlin.
- Jetpack Glance for Android home-screen widgets.
- Android AppWidget APIs.
- Zustand for application state management.
- Android DataStore or SharedPreferences for shared native persistence.
- WorkManager for deferrable background work.
- Expo Notifications or native Android notifications for reminders.
- Open-Meteo API for weather information.
- Android MediaSession APIs for controlling external music applications.

Use compatible, stable dependency versions. Verify compatibility before installing packages.

## 2. Main Objective

Build TWO interconnected experiences:

### A. Full-screen Dashboard Application

A visually rich, interactive dashboard closely inspired by the reference image.

### B. Native Android Home-screen Widget

A real Android widget that users can add to their launcher, resize, and interact with independently of the React Native application.

Both experiences must share dashboard data and remain synchronized.

IMPORTANT: Do not attempt to render React Native components directly inside Android widgets. Implement widgets using Kotlin and Jetpack Glance or RemoteViews.

## 3. Dashboard UI Design

Create a premium futuristic dashboard.

Design language:

- AMOLED dark background.
- Deep navy and electric blue cards.
- Cyan highlights.
- Subtle neon borders.
- Rounded corners.
- Compact information-dense layout.
- Clean typography.
- Smooth transitions.
- Responsive phone and tablet layouts.

The interface should resemble a professional smart desk control panel rather than a conventional mobile application.

### Dashboard Components

1. Header
   - Application title.
   - Current date.
   - Connectivity status.

2. Clock and Calendar
   - Live digital clock.
   - 12-hour/24-hour preference.
   - Current date and weekday.
   - Monthly calendar.
   - Highlight current day.
   - Navigate between months.

3. Weather
   - Current temperature.
   - Weather condition.
   - Humidity.
   - Feels-like temperature.
   - Weather icon.
   - Location selection.
   - Last updated timestamp.
   - Weather forecast.

4. Music Player
   - Current song title.
   - Artist.
   - Album artwork.
   - Playback state.
   - Play/pause.
   - Previous and next.
   - Progress information when available.
   - Volume controls where supported.

5. Battery Monitoring
   - Battery percentage.
   - Charging status.
   - Battery health information only if reliably available.
   - Charging indicator.

6. System Monitoring
   - RAM usage.
   - Available storage.
   - Total storage.
   - Device model.
   - Android version.
   - CPU information where accessible.

7. Network Monitoring
   - Wi-Fi connection status.
   - SSID when permitted.
   - Signal strength when accessible.
   - Network transport.
   - Internet connectivity.

8. Tasks and Reminders
   - Create tasks.
   - Edit tasks.
   - Delete tasks.
   - Completion checkbox.
   - Deadline.
   - Reminder scheduling.
   - Overdue task indicator.
   - Upcoming tasks.

## 4. Native Kotlin Integration

Create a local Expo native module named:

smart-desk-native

Implement the following native interfaces:

- getBatteryInfo()
- getNetworkInfo()
- getMediaInfo()
- controlMedia(action)
- getSystemInfo()
- saveDashboardData(data)
- getDashboardData()
- updateWidget()

Use Android APIs appropriately.

### Music Integration

Implement notification listener access and MediaSessionManager integration.

Support external media applications such as:

- Spotify.
- YouTube Music.
- VLC.
- Other compatible Android media applications.

Read active media session metadata and playback state.

Implement play, pause, next and previous using MediaController transport controls.

Do not pretend every media application exposes complete metadata or supports all controls.

Provide a clear permission setup screen for notification listener access.

### Battery Integration

Use BatteryManager and battery change broadcasts.

Avoid unnecessary polling.

### Network Integration

Use ConnectivityManager, NetworkCapabilities and WifiManager.

Respect Android location and nearby Wi-Fi permissions.

Handle unavailable SSID and signal information gracefully.

### System Monitoring

Use Android-supported APIs.

Do not claim unrestricted CPU monitoring or access to private system information.

## 5. Weather Integration

Use Open-Meteo.

Implement:

- Current weather.
- Temperature.
- Humidity.
- Weather codes.
- Forecast.
- Location selection.
- Cached weather data.
- Error handling.
- Offline fallback.

Do not hardcode location coordinates.

Allow users to select their location or grant location access.

## 6. Task Management

Create a complete task management system.

Requirements:

- Persistent local task storage.
- Task CRUD operations.
- Deadline management.
- Local notifications.
- Completed and pending task categories.
- Widget synchronization.

Tasks must remain available after restarting the application.

## 7. Native Android Home-screen Widgets

Implement actual Android home-screen widgets using Kotlin.

Create three supported layouts:

### Small Widget
- Clock.
- Date.
- Weather.
- Battery.

### Medium Widget
- Clock.
- Weather.
- Music controls.
- Battery.

### Large Widget
- Clock.
- Calendar.
- Weather.
- Music controls.
- Battery.
- Network information.
- Tasks.

Requirements:

- Resizable widgets.
- Dark dashboard styling.
- Widget configuration where appropriate.
- Clickable actions.
- Shared persistent state.
- Update widget after task changes.
- Update widget after music state changes.
- Handle device reboot.
- Use efficient refresh mechanisms.
- Avoid excessive background processing.

Use native TextClock or appropriate Android widget mechanisms for efficient clock updates.

## 8. Shared Architecture

Create a reliable shared data architecture.

React Native application
    |
    v
Expo Native Module
    |
    v
Kotlin Dashboard Repository
    |
    v
Persistent Shared Storage
    |
    v
Android Home-screen Widget

Both React Native and the widget must be able to read and update shared data.

Define a versioned data schema.

Avoid maintaining separate conflicting copies of dashboard state.

## 9. Suggested Folder Structure

smart-desk/
├── app/
├── src/
│   ├── components/
│   ├── screens/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── native/
│   └── theme/
├── modules/
│   └── smart-desk-native/
│       ├── src/
│       └── android/
├── android/
│   └── app/src/main/
│       ├── java/
│       └── res/
├── plugins/
├── assets/
└── package.json

Adapt the structure when necessary, but maintain a clear separation between React Native, native modules, and widget functionality.

## 10. Development Phases

Implement the project incrementally.

Phase 1: Project initialization
- Initialize Expo.
- Configure TypeScript.
- Configure Expo Prebuild.
- Install dependencies.
- Create the local Kotlin module.
- Verify Android build.

Phase 2: Dashboard UI
- Implement the dashboard layout.
- Create reusable components.
- Implement responsive phone/tablet layouts.
- Use mock data initially.

Phase 3: Native functionality
- Battery monitoring.
- Network monitoring.
- System information.
- Media session integration.

Phase 4: Data and services
- Weather API.
- Task management.
- Persistent storage.
- Notifications.
- Shared native repository.

Phase 5: Android widgets
- Implement Jetpack Glance widgets.
- Add small, medium and large layouts.
- Implement interactions.
- Synchronize data with the application.

Phase 6: Testing and release
- Test on physical Android devices.
- Test permissions.
- Test background behavior.
- Test device reboot.
- Optimize battery usage.
- Generate signed release APK.

## 11. Engineering Rules

These rules are mandatory:

1. Do not build a static UI prototype and call it complete.
2. Do not use fake device metrics in production functionality.
3. Do not use mock data after implementing a real integration, except in explicitly labelled development previews.
4. Do not use Expo Go for native functionality.
5. Do not put all application logic inside one component.
6. Use reusable TypeScript components and well-organized Kotlin classes.
7. Implement proper error handling.
8. Respect Android permission restrictions.
9. Optimize background execution and battery consumption.
10. Preserve native changes across Expo Prebuild.
11. Use config plugins for reproducible Android configuration.
12. Do not overwrite existing project files without inspecting them.
13. Test every phase before proceeding to the next.
14. Never claim a feature is working without verifying it.
15. Document Android permissions and setup instructions.

## 12. Execution Instructions

First inspect the current project directory and environment.

If this is a new project, initialize it.

If an existing project is provided, inspect its architecture before modifying anything.

Then:

1. Present the implementation plan.
2. Initialize the project.
3. Implement Phase 1.
4. Verify the Android build.
5. Implement Phase 2.
6. Continue phase by phase.
7. Maintain a DEVELOPMENT.md file containing completed work, pending tasks, known limitations and build instructions.

Do not stop after generating a plan. Actually create and implement the project files.

If a feature requires a permission, native configuration, or manual Android setup, explain exactly how to enable it.

The final objective is a fully functional, beautiful, efficient Smart Desk Display application with a native Android home-screen widget.

Prioritize functionality, architecture, reliability and visual fidelity.



## CRITICAL UI IMPLEMENTATION REQUIREMENT

Use the attached Smart Desk Display dashboard image as the primary visual reference.

Recreate its layout as closely as possible in React Native.

Do not redesign it into a generic modern dashboard. Preserve the original visual identity.

### Exact visual requirements

- Deep navy / almost-black background.
- Thin electric-blue borders around dashboard sections.
- Bright cyan highlights.
- Compact information-dense arrangement.
- Large digital clock on the upper left.
- Monthly calendar on the upper right.
- Bright yellow backlight slider.
- Power and battery information card.
- Light cyan weather card.
- Music playlist on the left.
- Music player and equalizer on the right.
- Volume slider.
- Tasks reminder banner.
- Full-width deadline and task table.
- Wi-Fi and connection information at the bottom.

### Layout requirements

Use a responsive grid.

On a tablet, recreate the reference image's two-column arrangement.

On a phone, intelligently reorganize the cards vertically without losing their visual identity.

Use reusable React Native components.

### Design accuracy

Pay special attention to:

1. Card proportions and spacing.
2. Border thickness and corner radius.
3. Typography hierarchy.
4. Cyan and yellow accent colors.
5. Digital clock styling.
6. Calendar grid alignment.
7. Music equalizer visualization.
8. Compact dashboard density.

### Functional requirement

Every displayed metric must eventually use actual data from its corresponding service or Android native API.

Do not leave permanent dummy values.

First implement the UI with clearly separated mock data, then connect real functionality incrementally.

The final result should look like a faithful Android adaptation of the attached Smart Desk Display reference.