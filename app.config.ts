// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "com.app.kinimobile";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "KINI",
  appSlug: "kini-mobile",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "/manus-storage/kini-icon_eceb161d.png",
  scheme: schemeFromBundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.8.9",
  // Web chỉ dùng cho preview và kiểm thử; bản cài đặt phát hành vẫn là APK Android.
  platforms: ["android", "web"],
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "light",
  newArchEnabled: true,
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
    },
    edgeToEdgeEnabled: true,
    // Buộc Android thu nhỏ vùng app khi bàn phím mở để không che composer trong chat.
    softwareKeyboardLayoutMode: "resize",
    predictiveBackGestureEnabled: false,
    versionCode: 9,
    package: env.androidPackage,
    permissions: [
      "POST_NOTIFICATIONS",
      "READ_MEDIA_IMAGES",
      "READ_MEDIA_VIDEO",
      "CAMERA",
      "RECORD_AUDIO",
      "ACCESS_NETWORK_STATE",
      "CHANGE_NETWORK_STATE",
      "MODIFY_AUDIO_SETTINGS",
      "INTERNET",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_MEDIA_PROJECTION",
    ],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  extra: {
    // Android không thể gọi relative /api như web preview, nên APK dùng domain production ổn định.
    apiBaseUrl: "https://kinimobile-cr7qe9vh.manus.space",
    releaseCode: "v1.6",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    "expo-notifications",
    [
      "expo-media-library",
      {
        photosPermission: "Cho phép KINI truy cập ảnh và video để lưu media.",
        savePhotosPermission: "Cho phép KINI lưu ảnh và video vào thư viện.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Cho phép KINI truy cập thư viện ảnh để gửi ảnh và video trong cuộc trò chuyện.",
      },
    ],
    "expo-document-picker",
    "expo-audio",
    [
      "@config-plugins/react-native-webrtc",
      {
        cameraPermission: "Cho phép KINI sử dụng camera để gọi video.",
        microphonePermission: "Cho phép KINI sử dụng micro để gọi thoại và video.",
      },
    ],
    "./plugins/with-kini-webrtc-screen-share",
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#FFFFFF",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
