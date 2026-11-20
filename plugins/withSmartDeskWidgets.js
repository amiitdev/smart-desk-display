// Config plugin: wires the Android manifest bits the widgets and media controls
// need. Kept idempotent so repeated `expo prebuild` runs never duplicate entries.
//
// NOTE: the widgets are built with plain RemoteViews, so this plugin no longer
// injects the Compose compiler plugin (that was only needed for Jetpack Glance,
// whose ViewStub based RemoteViews some OEM launchers refuse to inflate).
const { withAndroidManifest } = require('expo/config-plugins');

function withWidgetManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) return cfg;

    // The launcher queries our widget providers, and the media buttons need the
    // MEDIA_BUTTON action to be visible on Android 11+ (package visibility).
    const queries = manifest.queries ?? [];
    const hasMediaIntent = queries.some((q) =>
      (q.intent ?? []).some((i) => (i.action ?? []).some((a) => a.$['android:name'] === 'android.intent.action.MEDIA_BUTTON')),
    );
    if (!hasMediaIntent) {
      queries.push({ intent: [{ action: [{ $: { 'android:name': 'android.intent.action.MEDIA_BUTTON' } }] }] });
      manifest.queries = queries;
    }
    return cfg;
  });
}

module.exports = function withSmartDeskWidgets(config) {
  return withWidgetManifest(config);
};

// exported for tests
module.exports.withWidgetManifest = withWidgetManifest;
