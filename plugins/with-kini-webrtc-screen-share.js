const { withAndroidManifest, withMainApplication } = require("@expo/config-plugins");

const MEDIA_PROJECTION_PERMISSIONS = [
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION",
];

/** Bổ sung foreground service WebRTC cần thiết cho MediaProjection trên Android 14+. */
module.exports = function withKiniWebRtcScreenShare(config) {
  config = withAndroidManifest(config, (mod) => {
    const permissions = mod.modResults.manifest["uses-permission"] ?? [];
    const existing = new Set(permissions.map((item) => item.$?.["android:name"]));
    for (const permission of MEDIA_PROJECTION_PERMISSIONS) {
      if (!existing.has(permission)) permissions.push({ $: { "android:name": permission } });
    }
    mod.modResults.manifest["uses-permission"] = permissions;
    return mod;
  });

  return withMainApplication(config, (mod) => {
    if (mod.modResults.language !== "kt") return mod;
    let contents = mod.modResults.contents;
    if (!contents.includes("com.oney.WebRTCModule.WebRTCModuleOptions")) {
      const firstImport = contents.indexOf("import ");
      if (firstImport >= 0) contents = `${contents.slice(0, firstImport)}import com.oney.WebRTCModule.WebRTCModuleOptions\n${contents.slice(firstImport)}`;
    }
    const marker = "override fun onCreate() {";
    if (!contents.includes("enableMediaProjectionService") && contents.includes(marker)) {
      contents = contents.replace(marker, `${marker}\n    WebRTCModuleOptions.getInstance().enableMediaProjectionService = true`);
    }
    mod.modResults.contents = contents;
    return mod;
  });
};
