// Config plugin: keeps the SystemAudioVisualizer React Native module alive
// across `npx expo prebuild`.
//
// The Kotlin sources live in the local module
// (`modules/smart-desk-native/android/.../audio/`), which CNG never regenerates,
// but the *registration* lives in the generated `MainApplication.kt`. This mod
// re-adds the import and `add(SystemAudioVisualizerPackage())` every time
// prebuild rewrites that file. It is idempotent: running prebuild twice does not
// duplicate anything.
const { withAndroidManifest, withMainApplication } = require('expo/config-plugins');

const IMPORT_LINE = 'import expo.modules.smartdesknative.audio.SystemAudioVisualizerPackage';
const REGISTRATION = 'add(SystemAudioVisualizerPackage())';
const PERMISSIONS = ['android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS'];

function withVisualizerRegistration(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes('SystemAudioVisualizerPackage')) return cfg;

    if (!contents.includes(IMPORT_LINE)) {
      const anchor = 'import expo.modules.ExpoReactHostFactory';
      if (contents.includes(anchor)) {
        contents = contents.replace(anchor, `${anchor}\n${IMPORT_LINE}`);
      } else {
        // Fallback: after the last import of the generated file.
        const imports = contents.match(/^import .*$/gm);
        const last = imports?.[imports.length - 1];
        if (last) contents = contents.replace(last, `${last}\n${IMPORT_LINE}`);
      }
    }

    const applyAnchor = 'PackageList(this).packages.apply {';
    if (contents.includes(applyAnchor)) {
      contents = contents.replace(applyAnchor, `${applyAnchor}\n          ${REGISTRATION}`);
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

function withVisualizerManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const entries = manifest['uses-permission'] ?? [];
    for (const name of PERMISSIONS) {
      if (!entries.some((entry) => entry.$?.['android:name'] === name)) {
        entries.push({ $: { 'android:name': name } });
      }
    }
    manifest['uses-permission'] = entries;
    return cfg;
  });
}

module.exports = function withAudioVisualizer(config) {
  return withVisualizerManifest(withVisualizerRegistration(config));
};

// exported for tests
module.exports.withVisualizerRegistration = withVisualizerRegistration;
module.exports.withVisualizerManifest = withVisualizerManifest;
