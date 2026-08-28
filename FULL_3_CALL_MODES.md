# KINI — FULL 3 CALL MODES

## DANH SÁCH FILE

- `/home/ubuntu/kini-mobile/app.config.ts`
- `/home/ubuntu/kini-mobile/app/_layout.tsx`
- `/home/ubuntu/kini-mobile/app/chat/[id].tsx`
- `/home/ubuntu/kini-mobile/components/push-notification-manager.tsx`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/call-provider.tsx`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/components/CallControls.tsx`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/components/RtcVideo.native.tsx`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/components/RtcVideo.tsx`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/components/RtcVideo.web.tsx`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/components/ScreenShare.tsx`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/components/VideoCall.tsx`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/components/VoiceCall.tsx`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/config/iceServers.ts`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/hooks/useCallSounds.ts`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/hooks/useWebRTC.ts`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/services/signalingClient.ts`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/services/types.ts`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/services/webrtcService.native.ts`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/services/webrtcService.ts`
- `/home/ubuntu/kini-mobile/features/webrtc-calling/services/webrtcService.web.ts`
- `/home/ubuntu/kini-mobile/plugins/with-kini-incoming-call.js`
- `/home/ubuntu/kini-mobile/plugins/with-kini-webrtc-screen-share.js`
- `/home/ubuntu/kini-mobile/server/_core/index.ts`
- `/home/ubuntu/kini-mobile/server/push.ts`
- `/home/ubuntu/kini-mobile/server/routers.ts`
- `/home/ubuntu/kini-mobile/server/signaling/index.ts`

## FILE: /home/ubuntu/kini-mobile/app.config.ts
```ts
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
  version: "1.8.34",
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
    // Expo SDK Android dùng edge-to-edge; từng màn phải chừa inset thật để không bị system bars che.
    edgeToEdgeEnabled: true,
    // Buộc Android thu nhỏ vùng app khi bàn phím mở để không che composer trong chat.
    softwareKeyboardLayoutMode: "resize",
    predictiveBackGestureEnabled: false,
    versionCode: 34,
    package: env.androidPackage,
    googleServicesFile: "./google-services.json",
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
      "REQUEST_INSTALL_PACKAGES",
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
    releaseCode: "v1.31",
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
      "expo-location",
      {
        locationWhenInUsePermission: "Cho phép KINI dùng vị trí khi mở Tìm Quanh Đây để tìm bạn gần bạn.",
      },
    ],
    [
      "@config-plugins/react-native-webrtc",
      {
        cameraPermission: "Cho phép KINI sử dụng camera để gọi video.",
        microphonePermission: "Cho phép KINI sử dụng micro để gọi thoại và video.",
      },
    ],
    "./plugins/with-kini-webrtc-screen-share",
    "./plugins/with-kini-incoming-call",
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
```

## FILE: /home/ubuntu/kini-mobile/app/_layout.tsx
```tsx
import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { PushNotificationManager } from "@/components/push-notification-manager";
import { ReleaseUpdateManager } from "@/components/release-update-manager";
import { CallProvider } from "@/features/webrtc-calling/call-provider";
import { MediaUploadProvider } from "@/features/media-upload/media-upload-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <MediaUploadProvider>
          <CallProvider>
          <PushNotificationManager />
          <ReleaseUpdateManager />
          {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
          {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
          {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="oauth/callback" />
            </Stack>
            <StatusBar style="dark" backgroundColor="#FFFFFF" />
          </CallProvider>
          </MediaUploadProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
```

## FILE: /home/ubuntu/kini-mobile/app/chat/[id].tsx
```tsx
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import { useAudioPlayer } from "expo-audio";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView as NativeKeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatComposer } from "@/components/chat-composer";
import { KiniMessageStatus } from "@/components/kini-message-status";
import { Avatar, kiniColors } from "@/components/kini-ui";
import { useKiniMediaUploadQueue, type MediaUploadJob } from "@/features/media-upload/media-upload-provider";
import { useKiniCall } from "@/features/webrtc-calling/call-provider";
import { useAuth } from "@/hooks/use-auth";
import { formatCallDuration } from "@/lib/kini-call-format";
import { formatKiniPresence } from "@/lib/kini-presence";
import { trpc } from "@/lib/trpc";

type ReplyTarget = { id: number; content: string };
const sentMessageSound = require("@/assets/audio/kini-message-sent.mp3");
type Message = {
  id: number | string;
  conversationId: number;
  senderId: number;
  clientMessageId?: string | null;
  kind: "text" | "image" | "album" | "video" | "file" | "sticker";
  content: string;
  attachmentUrl?: string | null;
  attachmentUrls?: string | null;
  attachmentName?: string | null;
  createdAt: string | Date;
  status?: "sent" | "delivered" | "read";
  failed?: boolean;
  uploadState?: "queued" | "uploading" | "sent" | "failed";
  uploadProgress?: number;
  uploadError?: string;
  replyToMessageId?: number;
};

function KeyboardAvoidingView({ behavior: _ignoredBehavior, keyboardVerticalOffset: _ignoredOffset, ...props }: ComponentProps<typeof NativeKeyboardAvoidingView>) {
  // Android đã dùng windowSoftInputMode=adjustResize từ app.config; KeyboardAvoidingView "height" có thể giữ vùng trống sau khi bàn phím đóng trên một số ROM.
  return <NativeKeyboardAvoidingView {...props} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0} />;
}

function createClientMessageId() {
  const nativeUuid = globalThis.crypto?.randomUUID?.();
  if (nativeUuid) return nativeUuid;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (letter) => {
    const random = Math.floor(Math.random() * 16);
    return (letter === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function VideoPreview({ url, fullscreen = false }: { url: string; fullscreen?: boolean }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
  });
  return <VideoView player={player} contentFit="contain" allowsFullscreen allowsPictureInPicture style={fullscreen ? styles.fullscreenVideo : styles.videoPreview} />;
}

function albumUrls(item: Message) {
  try {
    const parsed = item.attachmentUrls ? JSON.parse(item.attachmentUrls) : [];
    return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string") : [];
  } catch {
    return item.attachmentUrl ? [item.attachmentUrl] : [];
  }
}

function AlbumGrid({ urls, fullscreen = false }: { urls: string[]; fullscreen?: boolean }) {
  const visible = urls.slice(0, fullscreen ? 12 : 4);
  return (
    <View style={fullscreen ? styles.fullscreenAlbum : styles.albumGrid}>
      {visible.map((url, index) => (
        <View key={`${url}-${index}`} style={fullscreen ? styles.fullscreenAlbumItem : styles.albumItem}>
          <Image source={{ uri: url }} contentFit="cover" cachePolicy="disk" style={StyleSheet.absoluteFill} />
          {!fullscreen && index === 3 && urls.length > 4 ? (
            <View style={styles.albumMore}>
              <Text style={styles.albumMoreText}>+{urls.length - 4}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

type CallLog = {
  id: string;
  mode: "voice" | "video";
  status: "ringing" | "answered" | "declined" | "missed" | "cancelled" | "ended" | "failed";
  startedAt: string | Date;
  answeredAt?: string | Date | null;
  durationSeconds: number;
  isOutgoing: boolean;
};

type TimelineItem =
  | { entryType: "message"; key: string; timestamp: number; message: Message }
  | { entryType: "call"; key: string; timestamp: number; call: CallLog };

const httpUrlPattern = /(https?:\/\/[^\s<>"']+)/gi;

function cleanUrl(value: string) {
  return value.replace(/[),.!?;:]+$/g, "");
}

function firstHttpUrl(content: string) {
  const match = content.match(httpUrlPattern);
  return match?.[0] ? cleanUrl(match[0]) : null;
}

function LinkMessageText({ content, isMine }: { content: string; isMine: boolean }) {
  const pieces = content.split(httpUrlPattern);
  return <Text style={[styles.messageText, isMine && styles.mineText]}>{pieces.map((part, index) => {
    const url = /^https?:\/\//i.test(part) ? cleanUrl(part) : null;
    return url ? <Text key={`${url}-${index}`} accessibilityRole="link" onPress={() => void Linking.openURL(url).catch(() => Alert.alert("Không thể mở liên kết", "Liên kết này không hợp lệ hoặc thiết bị không có trình duyệt."))} style={[styles.inlineLink, isMine && styles.mineInlineLink]}>{part}</Text> : <Text key={`${part}-${index}`}>{part}</Text>;
  })}</Text>;
}

function LinkCard({ url, isMine }: { url: string; isMine: boolean }) {
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* Link đã được kiểm tra bởi renderer. */ }
  return <TouchableOpacity accessibilityRole="link" accessibilityLabel={`Mở liên kết ${host}`} onPress={() => void Linking.openURL(url).catch(() => Alert.alert("Không thể mở liên kết", "Liên kết này không hợp lệ hoặc thiết bị không có trình duyệt."))} style={[styles.linkCard, isMine && styles.mineLinkCard]}><MaterialIcons name="language" size={19} color={isMine ? kiniColors.white : kiniColors.blue} /><View style={styles.linkCardCopy}><Text numberOfLines={1} style={[styles.linkHost, isMine && styles.mineText]}>{host}</Text><Text numberOfLines={1} style={[styles.linkUrl, isMine && styles.mineSubtext]}>{url}</Text></View><MaterialIcons name="open-in-new" size={17} color={isMine ? "#D9E9FF" : kiniColors.muted} /></TouchableOpacity>;
}

function callLogCopy(item: CallLog) {
  const at = new Date(item.answeredAt ?? item.startedAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  if (item.status === "missed") return item.isOutgoing ? `Không trả lời · ${at}` : `Cuộc gọi nhỡ · ${at}`;
  if (item.status === "declined") return item.isOutgoing ? `Bị từ chối · ${at}` : `Đã từ chối · ${at}`;
  if (item.status === "cancelled") return "Đã hủy trước khi kết nối";
  if (item.status === "failed") return "Kết nối không thành công";
  if (item.status === "answered" || item.status === "ended") return `Đã nghe ${at} · ${formatCallDuration(item.durationSeconds)}`;
  return "Đang đổ chuông…";
}

function CallTimelineEntry({ call }: { call: CallLog }) {
  const missed = call.status === "missed" || call.status === "declined" || call.status === "failed";
  return <View style={styles.callTimeline}>
    <MaterialIcons name={call.mode === "video" ? "videocam" : "call"} size={17} color={missed ? kiniColors.coral : kiniColors.blue} />
    <View style={styles.callLogCopy}><Text style={[styles.callLogTitle, missed && styles.callLogMissed]}>{call.isOutgoing ? "Cuộc gọi đi" : "Cuộc gọi đến"}</Text><Text style={styles.callLogDetail}>{callLogCopy(call)}</Text></View>
  </View>;
}

function MessageBubble({ item, isMine, onLongPress, onOpenMedia, onRetryUpload }: {
  item: Message;
  isMine: boolean;
  onLongPress: (message: Message) => void;
  onOpenMedia: (message: Message) => void;
  onRetryUpload: (message: Message) => void;
}) {
  const time = new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const file = item.kind === "file";
  const media = item.kind === "image" || item.kind === "album" || item.kind === "video";
  const sticker = item.kind === "sticker";
  const mediaUrls = albumUrls(item);
  const mediaUrl = item.attachmentUrl || mediaUrls[0] || undefined;
  const url = !sticker && !file && !media ? firstHttpUrl(item.content) : null;

  return (
    <View style={[styles.messageRow, isMine ? styles.mineRow : styles.theirRow]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={media ? "Media, chạm để xem, nhấn giữ để lưu" : "Tin nhắn, nhấn giữ để chọn thao tác"}
        onPress={item.uploadState === "failed" ? () => onRetryUpload(item) : media && mediaUrl && !item.uploadState ? () => onOpenMedia(item) : undefined}
        onLongPress={() => onLongPress(item)}
        delayLongPress={350}
        style={[
          styles.bubble,
          isMine ? styles.mineBubble : styles.theirBubble,
          media && styles.mediaBubble,
          media && { backgroundColor: "transparent" },
          sticker && styles.stickerBubble,
          item.failed && styles.failedBubble,
        ]}
      >
        {sticker ? <Text style={styles.sticker}>{item.content}</Text> : null}
        {file ? (
          <View style={styles.fileRow}>
            <View style={[styles.fileIcon, isMine && styles.mineFileIcon]}>
              <MaterialIcons name="insert-drive-file" size={25} color={isMine ? kiniColors.blue : kiniColors.coral} />
            </View>
            <View style={styles.fileCopy}>
              <Text numberOfLines={1} style={[styles.fileName, isMine && styles.mineText]}>{item.attachmentName ?? item.content}</Text>
              <Text style={[styles.fileMeta, isMine && styles.mineSubtext]}>Tệp đính kèm</Text>
            </View>
          </View>
        ) : null}
        {media ? (
          mediaUrl ? (
            item.kind === "album" ? <View style={styles.mediaFrame}><AlbumGrid urls={mediaUrls} />{item.uploadState ? <UploadOverlay item={item} /> : null}</View> : item.kind === "video" ? (
              <View style={styles.mediaFrame}>
                <VideoPreview url={mediaUrl} />
                <View style={styles.playBadge}><MaterialIcons name="play-arrow" size={22} color={kiniColors.white} /></View>
                {item.uploadState ? <UploadOverlay item={item} /> : null}
              </View>
            ) : <View style={styles.mediaFrame}><Image source={{ uri: mediaUrl }} contentFit="cover" cachePolicy="disk" style={styles.mediaImage} />{item.uploadState ? <UploadOverlay item={item} /> : null}</View>
          ) : (
            <View style={styles.mediaPlaceholder}>
              <MaterialIcons name={item.kind === "video" ? "videocam" : item.kind === "album" ? "collections" : "image"} size={31} color={isMine ? kiniColors.white : kiniColors.blue} />
              <Text style={[styles.mediaLabel, isMine && styles.mineText]}>Đang tải media…</Text>
            </View>
          )
        ) : null}
        {!sticker && !file && !media ? <><LinkMessageText content={item.content} isMine={isMine} />{url ? <LinkCard url={url} isMine={isMine} /> : null}</> : null}
        <View style={styles.meta}>
          <Text style={[styles.time, isMine && styles.mineSubtext]}>{item.failed ? "Chưa gửi" : time}</Text>
          {isMine && !item.failed ? <KiniMessageStatus status={item.status} /> : null}
        </View>
      </Pressable>
    </View>
  );
}

function UploadOverlay({ item }: { item: Message }) {
  const failed = item.uploadState === "failed";
  const label = failed ? item.uploadError ?? "Không thể gửi. Chạm để thử lại" : item.uploadState === "queued" ? "Đang chờ gửi · giữ để hủy" : "Đang gửi · giữ để hủy";
  return <View style={styles.uploadOverlay} pointerEvents="none"><View style={styles.uploadProgressRing}>{failed ? <MaterialIcons name="error-outline" size={30} color={kiniColors.white} /> : <ActivityIndicator size="large" color={kiniColors.white} />}<Text style={styles.uploadProgressText}>{failed ? "" : `${item.uploadProgress ?? 0}%`}</Text></View><Text numberOfLines={2} style={styles.uploadOverlayLabel}>{label}</Text></View>;
}

export default function ChatScreen() {
  const parsed = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(parsed.id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<TimelineItem>>(null);
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<Message | null>(null);
  const [viewer, setViewer] = useState<Message | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [pasteNonce, setPasteNonce] = useState(0);
  const [androidKeyboardOverlap, setAndroidKeyboardOverlap] = useState(0);
  const [sentFeedbackNonce, setSentFeedbackNonce] = useState(0);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const sentMessagePlayer = useAudioPlayer(sentMessageSound);
  const summaryQuery = trpc.chat.list.useQuery({ filter: "all" }, { enabled: isAuthenticated, refetchInterval: 8000, refetchIntervalInBackground: false, staleTime: 1_500, retry: 3, retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000) });
  const conversation = useMemo(() => summaryQuery.data?.find((item) => item.id === conversationId), [conversationId, summaryQuery.data]);
  const directCallEnabled = isAuthenticated && conversation?.kind === "direct";
  const call = useKiniCall();
  const mediaQueue = useKiniMediaUploadQueue();
  const messagesQuery = trpc.chat.messages.useQuery({ conversationId }, { enabled: isAuthenticated && Number.isFinite(conversationId), refetchInterval: 5000, refetchIntervalInBackground: false, staleTime: 1_000, retry: 3, retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000) });
  const presenceQuery = trpc.chat.presence.useQuery({ conversationId }, { enabled: isAuthenticated && Number.isFinite(conversationId), refetchInterval: 45_000, refetchIntervalInBackground: false, staleTime: 8_000, retry: 2 });
  const callsQuery = trpc.calls.list.useQuery({ conversationId }, { enabled: directCallEnabled && Number.isFinite(conversationId), refetchInterval: 20_000, refetchIntervalInBackground: false, staleTime: 4_000, retry: 2 });
  const markRead = trpc.chat.markRead.useMutation({ onSuccess: () => { void utils.chat.list.invalidate(); void utils.notifications.summary.invalidate(); } });
  const send = trpc.chat.send.useMutation();
  const removeConversation = trpc.chat.delete.useMutation({
    onSuccess: () => {
      void utils.chat.list.invalidate();
      void utils.notifications.summary.invalidate();
      router.replace("/(tabs)" as never);
    },
    onError: () => Alert.alert("Không thể xóa cuộc trò chuyện", "Vui lòng thử lại sau."),
  });
  const headerPresence = formatKiniPresence(presenceQuery.data);

  const scrollToLatest = () => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  const confirmMessageSent = () => {
    setSentFeedbackNonce((value) => value + 1);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    try {
      sentMessagePlayer.volume = 0.24;
      sentMessagePlayer.seekTo(0);
      sentMessagePlayer.play();
    } catch { /* Âm thanh là phản hồi bổ sung; gửi tin vẫn thành công nếu thiết bị chặn media. */ }
  };
  useEffect(() => {
    if (messagesQuery.data?.length) markRead.mutate({ conversationId });
  }, [conversationId, messagesQuery.data?.length]);
  useEffect(() => {
    if (!messagesQuery.data?.length) return;
    setOptimisticMessages((current) => current.filter((local) => !messagesQuery.data.some((server) =>
      (local.clientMessageId && server.clientMessageId === local.clientMessageId) ||
      (!local.clientMessageId && server.senderId === local.senderId && server.kind === local.kind && server.content === local.content && (server.attachmentUrl || null) === (local.attachmentUrl || null) && Math.abs(new Date(server.createdAt).getTime() - new Date(local.createdAt).getTime()) < 15000),
    )));
  }, [messagesQuery.data]);
  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", (event) => {
      // Khi ROM không áp dụng adjustResize vì edge-to-edge, chỉ bù phần keyboard thật sự đang đè lên window.
      if (Platform.OS === "android") {
        const windowHeight = Dimensions.get("window").height;
        const keyboardTop = event.endCoordinates.screenY;
        setAndroidKeyboardOverlap(Math.max(0, Math.round(windowHeight - keyboardTop)));
      }
      scrollToLatest();
      requestAnimationFrame(scrollToLatest);
    });
    const hideListener = Keyboard.addListener("keyboardDidHide", () => setAndroidKeyboardOverlap(0));
    return () => { showListener.remove(); hideListener.remove(); };
  }, []);

  const sendOptimistically = (payload: { kind: Message["kind"]; content: string; attachmentName?: string; attachmentUrl?: string; replyToMessageId?: number }) => {
    const clientMessageId = createClientMessageId();
    const localMessage: Message = { id: `local-${clientMessageId}`, clientMessageId, conversationId, senderId: user?.id ?? 0, createdAt: new Date().toISOString(), status: "sent", ...payload };
    setOptimisticMessages((current) => [...current, localMessage]);
    scrollToLatest();
    send.mutate({ conversationId, clientMessageId, ...payload }, {
      onSuccess: (result) => {
        setOptimisticMessages((current) => current.filter((message) => message.clientMessageId !== clientMessageId));
        utils.chat.messages.setData({ conversationId }, (current) => {
          const existing = current ?? [];
          if (existing.some((message) => Number(message.id) === result.id || message.clientMessageId === clientMessageId)) return existing;
          return [...existing, { ...localMessage, id: result.id, status: result.status, failed: false, editedAt: null }] as typeof existing;
        });
        void utils.chat.list.invalidate();
        setReplyTarget(null);
        confirmMessageSent();
      },
      onError: () => setOptimisticMessages((current) => current.map((message) => message.clientMessageId === clientMessageId ? { ...message, failed: true, status: "sent" } : message)),
    });
  };
  const sendText = (content: string) => sendOptimistically({ kind: "text", content, ...(replyTarget ? { replyToMessageId: replyTarget.id } : {}) });
  const sendAttachment = (attachment: { kind: "image" | "video" | "file" | "sticker"; name: string; uri?: string }) => sendOptimistically({ kind: attachment.kind, content: attachment.kind === "sticker" ? attachment.name : attachment.kind === "video" ? "Video" : attachment.name, attachmentName: attachment.name, attachmentUrl: attachment.uri });
  const queueAttachment = (attachment: { kind: "image" | "video" | "file"; name: string; uri: string; contentType: string; size?: number | null }) => mediaQueue.enqueue({ ...attachment, conversationId });
  const selectReply = () => { if (selected) setReplyTarget({ id: Number(selected.id), content: selected.content }); setSelected(null); };
  const copyMessage = async () => { if (selected) await Clipboard.setStringAsync(selected.content); setSelected(null); };
  const pasteMessage = () => { setPasteNonce((value) => value + 1); setSelected(null); };
  const queuedMessages = useMemo<Message[]>(() => mediaQueue.jobs.filter((job) => job.conversationId === conversationId).map((job: MediaUploadJob) => ({
    id: `upload-${job.id}`, clientMessageId: job.clientMessageId, conversationId: job.conversationId, senderId: user?.id ?? 0, kind: job.kind, content: job.kind === "video" ? "Video" : job.name, attachmentName: job.name, attachmentUrl: job.remoteUrl ?? job.uri, createdAt: job.createdAt, status: "sent", failed: job.state === "failed", uploadState: job.state, uploadProgress: job.progress, uploadError: job.error,
  })), [conversationId, mediaQueue.jobs, user?.id]);
  const thread = useMemo<Message[]>(() => {
    const serverMessages = (messagesQuery.data ?? []) as Message[];
    const serverClientIds = new Set(serverMessages.map((message) => message.clientMessageId).filter(Boolean));
    return [...serverMessages, ...optimisticMessages.filter((message) => !message.clientMessageId || !serverClientIds.has(message.clientMessageId)), ...queuedMessages.filter((message) => !message.clientMessageId || !serverClientIds.has(message.clientMessageId))].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messagesQuery.data, optimisticMessages, queuedMessages]);
  const timeline = useMemo<TimelineItem[]>(() => {
    const messageItems = thread.map((message) => ({ entryType: "message" as const, key: `message-${message.id}`, timestamp: new Date(message.createdAt).getTime(), message }));
    const callItems = ((callsQuery.data ?? []) as CallLog[]).map((call) => ({ entryType: "call" as const, key: `call-${call.id}`, timestamp: new Date(call.startedAt).getTime(), call }));
    return [...messageItems, ...callItems].sort((left, right) => left.timestamp - right.timestamp || left.key.localeCompare(right.key));
  }, [callsQuery.data, thread]);
  const retryQueuedUpload = (message: Message) => {
    const jobId = typeof message.id === "string" && message.id.startsWith("upload-") ? message.id.slice("upload-".length) : null;
    if (jobId) mediaQueue.retry(jobId);
  };
  const dismissQueuedUpload = (message: Message) => {
    const jobId = typeof message.id === "string" && message.id.startsWith("upload-") ? message.id.slice("upload-".length) : null;
    if (jobId) mediaQueue.dismiss(jobId);
  };
  const saveMedia = async () => {
    const media = selected;
    setSelected(null);
    if (!media?.attachmentUrl) return;
    if (Platform.OS === "web") { await Linking.openURL(media.attachmentUrl); return; }
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) { Alert.alert("Cần quyền lưu media", "Cho phép KINI truy cập thư viện để lưu ảnh hoặc video."); return; }
      const safeName = (media.attachmentName || `${media.kind}-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
      const downloaded = await FileSystem.downloadAsync(media.attachmentUrl, `${FileSystem.cacheDirectory}${safeName}`);
      await MediaLibrary.createAssetAsync(downloaded.uri);
      Alert.alert("Đã lưu", `${media.kind === "video" ? "Video" : "Ảnh"} đã được lưu vào thư viện thiết bị.`);
    } catch {
      Alert.alert("Không thể lưu media", "Vui lòng kiểm tra kết nối và thử lại.");
    }
  };
  const confirmDelete = () => Alert.alert("Xóa cuộc trò chuyện?", "Toàn bộ tin nhắn và tệp đính kèm trong cuộc trò chuyện này sẽ bị xóa vĩnh viễn và không còn xuất hiện trong danh sách.", [{ text: "Hủy", style: "cancel" }, { text: "Xóa vĩnh viễn", style: "destructive", onPress: () => removeConversation.mutate({ conversationId }) }]);
  const startCall = (mode: "voice" | "video") => {
    if (!directCallEnabled) {
      Alert.alert("Chưa thể gọi", "KINI hiện chỉ hỗ trợ gọi trong cuộc trò chuyện riêng tư với bạn bè.");
      return;
    }
    void call.startCall(conversationId, mode, {
      title: conversation?.title ?? "Bạn KINI",
      initials: conversation?.initials ?? "K",
      color: conversation?.avatarColor ?? kiniColors.blue,
      avatarUrl: conversation?.avatarUrl ?? null,
    });
  };

  if (!isAuthenticated || (messagesQuery.isLoading && !messagesQuery.data)) {
    return <View style={styles.loading}><ActivityIndicator color={kiniColors.blue} size="large" /><Text style={styles.loadingText}>Đang tải cuộc trò chuyện…</Text></View>;
  }
  if (messagesQuery.isError) {
    return <View style={styles.loading}><MaterialIcons name="cloud-off" size={34} color={kiniColors.coral} /><Text style={styles.loadingText}>Không thể tải cuộc trò chuyện.</Text><TouchableOpacity onPress={() => void messagesQuery.refetch()} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></TouchableOpacity></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={24} color={kiniColors.navy} /></TouchableOpacity>
          <Avatar initials={conversation?.initials ?? "K"} color={conversation?.avatarColor ?? kiniColors.blue} imageUri={conversation?.avatarUrl} size={38} />
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{conversation?.title ?? "Cuộc trò chuyện"}</Text>
            <Text style={[styles.headerStatus, { color: presenceQuery.data?.isOnline ? kiniColors.green : kiniColors.muted }]}>{headerPresence}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Gọi thoại" onPress={() => startCall("voice")} style={styles.headerAction}><MaterialIcons name="call" size={21} color={kiniColors.blue} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Gọi video" onPress={() => startCall("video")} style={styles.headerAction}><MaterialIcons name="videocam" size={22} color={kiniColors.blue} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Xóa cuộc trò chuyện" onPress={confirmDelete} style={styles.headerAction}><MaterialIcons name="delete-outline" size={22} color={kiniColors.coral} /></TouchableOpacity>
          </View>
        </View>
      </View>
      <FlatList
        ref={listRef}
        data={timeline}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => item.entryType === "message" ? <MessageBubble item={item.message} isMine={item.message.senderId === user?.id} onLongPress={(message) => message.uploadState ? dismissQueuedUpload(message) : setSelected(message)} onOpenMedia={setViewer} onRetryUpload={retryQueuedUpload} /> : <CallTimelineEntry call={item.call} />}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={scrollToLatest}
        ListHeaderComponent={<Text style={styles.today}>Tin nhắn được đồng bộ an toàn</Text>}
      />
      <View style={androidKeyboardOverlap > 0 ? { marginBottom: androidKeyboardOverlap } : undefined}>
        <ChatComposer onSendText={sendText} onSendAttachment={sendAttachment} onQueueAttachment={queueAttachment} pasteNonce={pasteNonce} replyingTo={replyTarget?.content ?? null} onClearReply={() => setReplyTarget(null)} bottomInset={insets.bottom} onInputFocus={scrollToLatest} sentFeedbackNonce={sentFeedbackNonce} />
      </View>
      <Modal visible={Boolean(viewer)} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewer}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng trình xem media" onPress={() => setViewer(null)} style={styles.viewerClose}><MaterialIcons name="close" size={28} color={kiniColors.white} /></TouchableOpacity>
          {viewer?.kind === "album" ? <AlbumGrid urls={albumUrls(viewer)} fullscreen /> : viewer?.kind === "video" && viewer.attachmentUrl ? <VideoPreview url={viewer.attachmentUrl} fullscreen /> : viewer?.attachmentUrl ? <Image source={{ uri: viewer.attachmentUrl }} contentFit="contain" style={styles.fullscreenImage} /> : null}
          <Text style={styles.viewerHint}>Nhấn giữ tin nhắn để lưu về máy</Text>
        </View>
      </Modal>
      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={[styles.actionSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]} onPress={(event) => event.stopPropagation()}>
            <Text numberOfLines={2} style={styles.selectedPreview}>{selected?.content}</Text>
            {selected?.attachmentUrl && !selected.uploadState && (selected.kind === "image" || selected.kind === "album" || selected.kind === "video") ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Lưu media về máy" onPress={() => void saveMedia()} style={styles.action}><MaterialIcons name="download" size={21} color={kiniColors.blue} /><Text style={styles.actionText}>Lưu về máy</Text></TouchableOpacity> : null}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Trả lời tin nhắn" onPress={selectReply} style={styles.action}><MaterialIcons name="reply" size={21} color={kiniColors.blue} /><Text style={styles.actionText}>Trả lời</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sao chép tin nhắn" onPress={() => void copyMessage()} style={styles.action}><MaterialIcons name="content-copy" size={20} color={kiniColors.blue} /><Text style={styles.actionText}>Sao chép</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Dán vào khung soạn thảo" onPress={pasteMessage} style={styles.action}><MaterialIcons name="content-paste" size={21} color={kiniColors.blue} /><Text style={styles.actionText}>Dán vào ô soạn thảo</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: kiniColors.cloud },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.cloud, gap: 12 },
  loadingText: { color: kiniColors.muted, fontSize: 14 },
  retry: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 11, backgroundColor: kiniColors.mist },
  retryText: { color: kiniColors.blue, fontSize: 14, fontWeight: "800" },
  header: { minHeight: 62, paddingHorizontal: 9, backgroundColor: kiniColors.white, alignItems: "center", flexDirection: "row", borderBottomColor: kiniColors.line, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 38, height: 44, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, marginLeft: 10, gap: 3 },
  headerTitle: { color: kiniColors.navy, fontSize: 19, lineHeight: 24, fontWeight: "900" },
  headerStatus: { fontSize: 13, lineHeight: 17, fontWeight: "700" },
  headerAction: { width: 40, height: 42, alignItems: "center", justifyContent: "center" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  thread: { flexGrow: 1, paddingHorizontal: 14, paddingBottom: 16, paddingTop: 10, gap: 7 },
  callHistory: { marginHorizontal: 4, marginBottom: 12, borderRadius: 14, backgroundColor: kiniColors.white, borderWidth: StyleSheet.hairlineWidth, borderColor: kiniColors.line, overflow: "hidden" },
  callTimeline: { alignSelf: "center", minWidth: 220, maxWidth: "86%", marginVertical: 4, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, backgroundColor: kiniColors.white, borderWidth: StyleSheet.hairlineWidth, borderColor: kiniColors.line },
  callLogRow: { minHeight: 52, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: kiniColors.line },
  callLogCopy: { flex: 1 },
  callLogTitle: { color: kiniColors.navy, fontSize: 13, fontWeight: "800" },
  callLogMissed: { color: kiniColors.coral },
  callLogDetail: { marginTop: 2, color: kiniColors.muted, fontSize: 12 },
  today: { alignSelf: "center", color: kiniColors.muted, fontSize: 12, marginVertical: 8 },
  messageRow: { flexDirection: "row", width: "100%" },
  mineRow: { justifyContent: "flex-end" },
  theirRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 7 },
  mineBubble: { backgroundColor: kiniColors.blue, borderBottomRightRadius: 5 },
  theirBubble: { backgroundColor: kiniColors.white, borderBottomLeftRadius: 5 },
  failedBubble: { opacity: 0.72 },
  messageText: { color: kiniColors.navy, fontSize: 17, lineHeight: 24 },
  mineText: { color: kiniColors.white },
  inlineLink: { color: kiniColors.blue, textDecorationLine: "underline", fontWeight: "800" },
  mineInlineLink: { color: kiniColors.white },
  linkCard: { minWidth: 210, maxWidth: 300, marginTop: 9, padding: 9, borderRadius: 12, backgroundColor: kiniColors.mist, flexDirection: "row", alignItems: "center", gap: 8 },
  mineLinkCard: { backgroundColor: "rgba(255,255,255,0.18)" },
  linkCardCopy: { flex: 1, gap: 2 },
  linkHost: { color: kiniColors.navy, fontSize: 13, fontWeight: "900" },
  linkUrl: { color: kiniColors.muted, fontSize: 11 },
  meta: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: 6, marginTop: 4 },
  time: { color: "#98A5B5", fontSize: 10 },
  mineSubtext: { color: "#D9E9FF" },
  fileRow: { minWidth: 215, flexDirection: "row", alignItems: "center", gap: 10 },
  fileIcon: { width: 39, height: 43, borderRadius: 12, backgroundColor: "#FFF2F3", alignItems: "center", justifyContent: "center" },
  mineFileIcon: { backgroundColor: kiniColors.white },
  fileCopy: { flex: 1, gap: 3 },
  fileName: { color: kiniColors.navy, fontSize: 14, fontWeight: "800" },
  fileMeta: { color: kiniColors.muted, fontSize: 11 },
  mediaBubble: { padding: 0, overflow: "hidden" },
  albumGrid: { width: 225, minHeight: 145, flexDirection: "row", flexWrap: "wrap", gap: 2, backgroundColor: "#DCE8F6" },
  albumItem: { width: 111.5, height: 71.5, position: "relative", overflow: "hidden" },
  albumMore: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  albumMoreText: { color: kiniColors.white, fontSize: 22, fontWeight: "900" },
  fullscreenAlbum: { width: "94%", maxWidth: 600, flexDirection: "row", flexWrap: "wrap", gap: 3, justifyContent: "center" },
  fullscreenAlbumItem: { width: "31.8%", aspectRatio: 1, position: "relative", overflow: "hidden" },
  mediaFrame: { width: 225, height: 145, position: "relative" },
  mediaImage: { width: 225, height: 145 },
  videoPreview: { width: 225, height: 145, backgroundColor: "#10243D" },
  playBadge: { position: "absolute", left: 94, top: 56, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.58)" },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "rgba(4, 17, 31, 0.42)" },
  uploadProgressRing: { width: 62, height: 62, alignItems: "center", justifyContent: "center", borderRadius: 31, borderWidth: 3, borderColor: "rgba(255,255,255,0.82)", backgroundColor: "rgba(6, 18, 33, 0.58)" },
  uploadProgressText: { position: "absolute", color: kiniColors.white, fontSize: 12, fontWeight: "900" },
  uploadOverlayLabel: { maxWidth: 180, color: kiniColors.white, fontSize: 12, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3 },
  mediaPlaceholder: { minWidth: 205, minHeight: 112, alignItems: "center", justifyContent: "center", gap: 8, padding: 18, backgroundColor: "#EAF3FF" },
  mediaLabel: { color: kiniColors.blue, fontSize: 13, fontWeight: "800" },
  stickerBubble: { padding: 0, backgroundColor: "transparent" },
  sticker: { fontSize: 52, lineHeight: 62 },
  viewer: { flex: 1, backgroundColor: "#06101D", alignItems: "center", justifyContent: "center" },
  viewerClose: { position: "absolute", zIndex: 2, top: 48, right: 18, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  fullscreenImage: { width: "100%", height: "78%" },
  fullscreenVideo: { width: "100%", height: "78%", backgroundColor: "#06101D" },
  viewerHint: { position: "absolute", bottom: 35, color: "#C5D7ED", fontSize: 12 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(18,38,63,0.32)" },
  actionSheet: { backgroundColor: kiniColors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 36 },
  selectedPreview: { color: kiniColors.muted, fontSize: 13, lineHeight: 18, backgroundColor: kiniColors.cloud, borderRadius: 12, padding: 12, marginBottom: 10 },
  action: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 14 },
  actionText: { color: kiniColors.navy, fontSize: 16, fontWeight: "700" },
});
```

## FILE: /home/ubuntu/kini-mobile/components/push-notification-manager.tsx
```tsx
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as ExpoLinking from "expo-linking";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState, Linking, Platform } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useKiniCall } from "@/features/webrtc-calling/call-provider";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) });
}

async function getPushToken() {
  if (Platform.OS === "web" || !Device.isDevice) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", { name: "Tin nhắn KINI", importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], sound: "default" });
    await Notifications.setNotificationChannelAsync("calls", { name: "Cuộc gọi KINI", importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 500, 250, 500], sound: "default", lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC });
    await Notifications.setNotificationCategoryAsync("incoming_call", [
      { identifier: "ANSWER_CALL", buttonTitle: "Trả lời", options: { opensAppToForeground: true } },
      { identifier: "DECLINE_CALL", buttonTitle: "Từ chối", options: { isDestructive: true, opensAppToForeground: true } },
    ]);
  }
  const permissions = await Notifications.getPermissionsAsync();
  const finalStatus = permissions.status === "granted" ? permissions.status : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== "granted") return null;
  // APK Android ưu tiên token FCM native để FirebaseMessagingService có thể mở incoming-call toàn màn hình.
  if (Platform.OS === "android") {
    try {
      const nativeToken = await Notifications.getDevicePushTokenAsync();
      if (typeof nativeToken.data === "string") return nativeToken.data;
    } catch {
      // Thiết bị cũ không có FCM native vẫn có thể nhận tin nhắn qua Expo khi cần.
    }
  }
  try {
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    const result = projectId ? await Notifications.getExpoPushTokenAsync({ projectId }) : await Notifications.getExpoPushTokenAsync();
    return result.data;
  } catch {
    // APK GitHub không dùng EAS project ID. Với google-services.json, Expo trả FCM token native.
    try {
      const nativeToken = await Notifications.getDevicePushTokenAsync();
      return typeof nativeToken.data === "string" ? nativeToken.data : null;
    } catch {
      console.warn("[Push] Chưa lấy được token Android; sẽ thử lại khi KINI được mở lần sau.");
      return null;
    }
  }
}

export function PushNotificationManager() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const call = useKiniCall();
  const registeredForUser = useRef<number | null>(null);
  const registrationInFlight = useRef(false);
  const register = trpc.push.register.useMutation();
  const registerPushToken = useCallback(async () => {
    if (!isAuthenticated || !user || registeredForUser.current === user.id || registrationInFlight.current) return;
    registrationInFlight.current = true;
    try {
      const token = await getPushToken();
      if (!token) return;
      await register.mutateAsync({ expoPushToken: token, platform: Platform.OS === "ios" ? "ios" : "android" });
      registeredForUser.current = user.id;
    } catch {
      console.warn("[Push] Chưa đăng ký token trên máy chủ; sẽ thử lại khi KINI được mở.");
    } finally {
      registrationInFlight.current = false;
    }
  }, [isAuthenticated, register, user]);
  useEffect(() => {
    void registerPushToken();
    if (Platform.OS === "web") return;
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void registerPushToken();
    });
    return () => appStateSubscription.remove();
  }, [registerPushToken]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const openConversation = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as { conversationId?: string | number; callId?: string; type?: string } | undefined;
      if (data?.type === "session_replaced") return;
      const rawId = data?.conversationId;
      const conversationId = typeof rawId === "string" ? rawId : typeof rawId === "number" ? String(rawId) : null;
      if (data?.type === "incoming_call") {
        if (response.actionIdentifier === "ANSWER_CALL" && data.callId) call.handleIncomingNotificationAction(data.callId, "answer");
        if (response.actionIdentifier === "DECLINE_CALL" && data.callId) call.handleIncomingNotificationAction(data.callId, "decline");
      }
      if (conversationId && response.actionIdentifier !== "ANSWER_CALL" && response.actionIdentifier !== "DECLINE_CALL") router.push(`/chat/${conversationId}` as never);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openConversation);
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response) openConversation(response); });
    return () => subscription.remove();
  }, [call, router]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { type?: string } | undefined;
      // Chính sách KINI cho phép tài khoản dùng trên nhiều thiết bị; bỏ qua security push giao muộn từ APK cũ.
      if (data?.type === "session_replaced") return;
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const handleIncomingCallUrl = (url: string | null) => {
      if (!url) return;
      const parsed = ExpoLinking.parse(url);
      if (parsed.hostname === "session-replaced") return;
      if (parsed.hostname !== "incoming-call") return;
      const callId = typeof parsed.queryParams?.callId === "string" ? parsed.queryParams.callId : null;
      const action = parsed.queryParams?.action;
      if (!callId || (action !== "answer" && action !== "decline")) return;
      call.handleIncomingNotificationAction(callId, action);
    };
    void Linking.getInitialURL().then(handleIncomingCallUrl);
    const linkSubscription = Linking.addEventListener("url", ({ url }) => handleIncomingCallUrl(url));
    return () => linkSubscription.remove();
  }, [call]);
  return null;
}
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/call-provider.tsx
```tsx
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { createContext, useContext, useEffect, useMemo, useRef, type PropsWithChildren } from "react";
import { Animated, AppState, Dimensions, PanResponder, StyleSheet, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { VideoCall } from "./components/VideoCall";
import { VoiceCall } from "./components/VoiceCall";
import { useWebRTC } from "./hooks/useWebRTC";
import { useCallSounds } from "./hooks/useCallSounds";
import { Avatar, kiniColors } from "@/components/kini-ui";

type CallController = ReturnType<typeof useWebRTC>;
const CallContext = createContext<CallController | null>(null);

function CallOverlay({ call }: { call: CallController }) {
  const peer = call.peer ?? { title: "Bạn KINI", initials: "K", color: "#1677FF" };
  const full = call.mode === "voice" ? <VoiceCall call={call} title={peer.title} initials={peer.initials} color={peer.color} avatarUrl={peer.avatarUrl} /> : call.mode === "video" ? <VideoCall call={call} title={peer.title} initials={peer.initials} color={peer.color} avatarUrl={peer.avatarUrl} /> : null;
  if (!call.minimized || call.status === "idle") return full;
  return <><MinimizedCall call={call} peer={peer} />{full}</>;
}

function MinimizedCall({ call, peer }: { call: CallController; peer: { title: string; initials: string; color: string; avatarUrl?: string | null } }) {
  const translation = useRef(new Animated.ValueXY()).current;
  const offset = useRef({ x: 0, y: 0 });
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => translation.setValue({ x: 0, y: 0 }),
    onPanResponderMove: (_event, gesture) => translation.setValue({ x: gesture.dx, y: gesture.dy }),
    onPanResponderRelease: (_event, gesture) => {
      const { width, height } = Dimensions.get("window");
      // Nút chỉ nằm trong vùng nhìn thấy, không che navigation bar hoặc rơi ra ngoài màn hình.
      offset.current = {
        x: Math.min(0, Math.max(-(width - 78), offset.current.x + gesture.dx)),
        y: Math.min(0, Math.max(-(height - 170), offset.current.y + gesture.dy)),
      };
      translation.setOffset(offset.current);
      translation.setValue({ x: 0, y: 0 });
    },
    onPanResponderTerminate: () => translation.setValue({ x: 0, y: 0 }),
  }), [translation]);
  const sharing = call.isScreenSharing || call.remoteScreenStream;
  return <Animated.View {...panResponder.panHandlers} style={[styles.minimized, { transform: translation.getTranslateTransform() }]}><TouchableOpacity onPress={call.restoreCall} style={styles.minimizedTap} accessibilityRole="button" accessibilityLabel={sharing ? "Quay lại chia sẻ màn hình" : "Quay lại cuộc gọi"}><Avatar initials={peer.initials} color={peer.color} imageUri={peer.avatarUrl} size={44} /><View style={styles.minimizedIndicator}><MaterialIcons name={sharing ? "screen-share" : "open-in-full"} size={13} color={kiniColors.white} /></View></TouchableOpacity></Animated.View>;
}

export function CallProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth();
  const call = useWebRTC(isAuthenticated);
  useCallSounds(call.status, call.direction, call.mode, call.isScreenSharing);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      // Sau khi bấm Home, không thể vẽ overlay trên launcher nếu không xin quyền SYSTEM_ALERT_WINDOW.
      // Thu nhỏ ngay giúp avatar quay lại call hiện sẵn khi người dùng mở lại KINI; incoming ringing vẫn không bị ẩn.
      if ((nextState === "inactive" || nextState === "background") && call.status !== "idle") call.minimizeCall();
    });
    return () => subscription.remove();
  }, [call.minimizeCall, call.status]);
  return <CallContext.Provider value={call}>{children}<CallOverlay call={call} /></CallContext.Provider>;
}

export function useKiniCall() {
  const call = useContext(CallContext);
  if (!call) throw new Error("CallProvider chưa được khởi tạo.");
  return call;
}

const styles = StyleSheet.create({
  minimized: { position: "absolute", zIndex: 30, right: 14, bottom: 88, width: 58, height: 58, borderRadius: 29, padding: 4, backgroundColor: "rgba(18, 38, 63, 0.68)", borderWidth: 1, borderColor: "rgba(255,255,255,0.58)", elevation: 10 }, minimizedTap: { flex: 1, alignItems: "center", justifyContent: "center" }, minimizedIndicator: { position: "absolute", right: -1, bottom: -1, width: 21, height: 21, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.blue, borderColor: kiniColors.white, borderWidth: 1.5 },
});
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/components/CallControls.tsx
```tsx
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { kiniColors } from "@/components/kini-ui";

type Props = {
  muted: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  video: boolean;
  onMute: () => void;
  onCamera?: () => void;
  onSwitchCamera?: () => void;
  onSpeaker: () => void;
  onEnd: () => void | Promise<void>;
};

function Control({ icon, label, active = false, danger = false, attention = false, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; active?: boolean; danger?: boolean; attention?: boolean; onPress: () => void | Promise<void> }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!attention) { scale.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([Animated.timing(scale, { toValue: 1.05, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true })]));
    animation.start();
    return () => animation.stop();
  }, [attention, scale]);
  return <Animated.View style={[styles.control, { transform: [{ scale }] }]}><TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={() => void onPress()} activeOpacity={0.75} style={styles.touch}>
    <View style={[styles.icon, active && styles.iconActive, danger && styles.iconDanger]}><MaterialIcons name={icon} size={25} color={danger || active ? kiniColors.white : "#0F2742"} /></View>
    <Text numberOfLines={1} style={styles.label}>{label}</Text>
  </TouchableOpacity></Animated.View>;
}

export function IncomingCallActions({ mode, onDecline, onAccept }: { mode: "voice" | "video"; onDecline: () => void | Promise<void>; onAccept: () => void | Promise<void> }) {
  return <View style={styles.incomingRow}>
    <Control icon="call-end" label="Từ chối" danger attention onPress={onDecline} />
    <Control icon={mode === "video" ? "videocam" : "call"} label="Nhận cuộc gọi" active attention onPress={onAccept} />
  </View>;
}

export function CallControls({ muted, cameraEnabled, speakerEnabled, video, onMute, onCamera, onSwitchCamera, onSpeaker, onEnd }: Props) {
  return <View style={styles.row}>
    <Control icon={muted ? "mic-off" : "mic"} label={muted ? "Bật mic" : "Tắt mic"} active={muted} onPress={onMute} />
    <Control icon={speakerEnabled ? "volume-up" : "hearing"} label="Loa ngoài" active={speakerEnabled} onPress={onSpeaker} />
    {video && onCamera ? <Control icon={cameraEnabled ? "videocam" : "videocam-off"} label={cameraEnabled ? "Tắt cam" : "Bật cam"} active={!cameraEnabled} onPress={onCamera} /> : null}
    {video && onSwitchCamera ? <Control icon="flip-camera-android" label="Đổi cam" onPress={onSwitchCamera} /> : null}
    <Control icon="call-end" label="Kết thúc" danger onPress={onEnd} />
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 4, width: "100%" },
  incomingRow: { flexDirection: "row", justifyContent: "space-between", width: 216 },
  control: { alignItems: "center", flex: 1, minWidth: 57 }, touch: { alignItems: "center", gap: 7 },
  icon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  iconActive: { backgroundColor: "#1677FF", borderColor: "#63A6FF" },
  iconDanger: { backgroundColor: "#EF5B63", borderColor: "#FF989D" },
  label: { color: kiniColors.white, fontSize: 11, fontWeight: "800", textAlign: "center", letterSpacing: 0.1 },
});
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/components/RtcVideo.native.tsx
```tsx
import { StyleSheet, View } from "react-native";
import { RTCView } from "react-native-webrtc";

export function RtcVideo({ stream, mirrored = false, objectFit = "cover", style, zOrder = 0 }: { stream: any; mirrored?: boolean; objectFit?: "cover" | "contain"; style?: object; zOrder?: number }) {
  try {
    if (!stream || typeof stream.toURL !== "function") return <View style={[styles.empty, style]} />;
    const tracks = typeof stream.getTracks === "function" ? stream.getTracks() : [];
    if (tracks.length > 0 && tracks.every((track: { readyState?: string }) => track?.readyState === "ended")) {
      return <View style={[styles.empty, style]} />;
    }
    const streamURL = stream.toURL();
    if (typeof streamURL !== "string" || !streamURL) return <View style={[styles.empty, style]} />;
    return <RTCView streamURL={streamURL} objectFit={objectFit} mirror={mirrored} zOrder={zOrder} style={[styles.video, style]} />;
  } catch {
    return <View style={[styles.empty, style]} />;
  }
}

const styles = StyleSheet.create({
  video: { backgroundColor: "#071729" },
  empty: { backgroundColor: "#102A43" },
});
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/components/RtcVideo.tsx
```tsx
// Metro ưu tiên RtcVideo.native.tsx hoặc RtcVideo.web.tsx khi bundle theo nền tảng.
export { RtcVideo } from "./RtcVideo.native";
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/components/RtcVideo.web.tsx
```tsx
import { StyleSheet, View } from "react-native";

/** Web preview dùng khung trung tính; APK Android dùng RTCView native để render stream thực. */
export function RtcVideo({ style }: { stream: any; mirrored?: boolean; style?: object }) {
  return <View style={[styles.preview, style]} />;
}

const styles = StyleSheet.create({ preview: { backgroundColor: "#102A43" } });
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/components/ScreenShare.tsx
```tsx
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { kiniColors } from "@/components/kini-ui";

export function ScreenShare({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={active ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"} accessibilityHint={active ? "Dừng chia sẻ để quay lại cuộc gọi video" : "Chia sẻ màn hình với người đang gọi"} onPress={onToggle} style={[styles.button, active && styles.active]}>
    <MaterialIcons name={active ? "stop-screen-share" : "screen-share"} size={18} color={kiniColors.white} />
    <Text style={styles.label}>{active ? "Dừng chia sẻ" : "Chia sẻ màn hình"}</Text>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  button: { minHeight: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", flexDirection: "row", gap: 7, alignItems: "center" },
  active: { backgroundColor: kiniColors.coral },
  label: { color: kiniColors.white, fontSize: 12, fontWeight: "800" },
});
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/components/VideoCall.tsx
```tsx
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, kiniColors } from "@/components/kini-ui";
import { formatCallDuration, formatCallPing } from "@/lib/kini-call-format";
import { CallControls, IncomingCallActions } from "./CallControls";
import { RtcVideo } from "./RtcVideo";
import { ScreenShare } from "./ScreenShare";

function callStatus(call: any, incoming: boolean) {
  if (incoming) return "Cuộc gọi video đến";
  if (call.status === "ringing") return "Đang gọi…";
  if (call.status === "connecting") return "Đang kết nối bảo mật…";
  if (call.status === "connected") return `Đang gọi · ${formatCallDuration(call.elapsedSeconds)}`;
  return call.error ?? "Cuộc gọi đã kết thúc";
}

export function VideoCall({ call, title, initials, color, avatarUrl }: { call: any; title: string; initials: string; color: string; avatarUrl?: string | null }) {
  useKeepAwake("kini-video-call");
  const insets = useSafeAreaInsets();
  const visible = call.mode === "video" && call.status !== "idle" && !call.minimized;
  const incoming = call.status === "ringing" && call.direction === "incoming";
  const isScreenActive = call.isScreenSharing || Boolean(call.remoteScreenStream);
  // Không render screenStream cục bộ: MediaProjection sẽ tự quay lại chính overlay và tạo ảnh đen/nhấp nháy trên Android.
  const primaryStream = call.remoteScreenStream ?? (call.remoteCameraEnabled ? call.remoteStream : null);
  const previewStream = isScreenActive ? null : (call.localStream && call.cameraEnabled ? call.localStream : null);
  const previewMirrored = true;
  return <Modal visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => incoming ? void call.declineIncomingCall() : call.minimizeCall()}>
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 14) }]}>
      <RtcVideo stream={primaryStream} objectFit={isScreenActive ? "contain" : "cover"} zOrder={0} style={styles.remote} />
      <View pointerEvents="none" style={styles.shade} />
      {!primaryStream && !incoming ? <View pointerEvents="none" style={styles.cameraOff}><View style={styles.avatarRing}><Avatar initials={initials} color={color} imageUri={avatarUrl} size={92} /></View><Text style={styles.cameraOffTitle}>{title}</Text><Text style={styles.cameraOffText}>Camera của đối phương đang tắt</Text></View> : null}
      {call.isScreenSharing ? <View pointerEvents="none" style={styles.localSharing}><MaterialIcons name="screen-share" size={25} color={kiniColors.white} /><Text style={styles.localSharingTitle}>Bạn đang chia sẻ màn hình</Text><Text style={styles.localSharingText}>KINI vẫn giữ màn hình điều khiển cuộc gọi. Nhấn Dừng chia sẻ hoặc phím Quay lại để trở về gọi video.</Text></View> : null}
      {previewStream ? <RtcVideo stream={previewStream} mirrored={previewMirrored} zOrder={1} style={styles.local} /> : null}
      {incoming ? <View style={styles.incomingIdentity}><View style={styles.avatarRing}><Avatar initials={initials} color={color} imageUri={avatarUrl} size={88} /></View><Text numberOfLines={1} style={styles.incomingName}>{title}</Text><Text style={styles.incomingState}>{callStatus(call, true)}</Text></View> : <View style={styles.top}><View style={styles.topIdentity}><Avatar initials={initials} color={color} imageUri={avatarUrl} size={40} /><View style={styles.topCopy}><Text numberOfLines={1} style={styles.name}>{title}</Text><Text style={styles.state}>{callStatus(call, false)}</Text></View></View><View style={styles.topTools}>{call.status === "connected" ? <View style={styles.ping}><MaterialIcons name="network-check" size={14} color="#D8EEFF" /><Text style={styles.pingText}>{formatCallPing(call.pingMs)}</Text></View> : null}<TouchableOpacity onPress={call.minimizeCall} style={styles.minimize} accessibilityLabel="Thu nhỏ cuộc gọi để nhắn tin"><MaterialIcons name="keyboard-arrow-down" size={22} color={kiniColors.white} /></TouchableOpacity></View></View>}
      <View style={styles.bottom}>
        {incoming ? <><Text style={styles.actionHint}>Trả lời bằng video hoặc từ chối</Text><IncomingCallActions mode="video" onDecline={call.declineIncomingCall} onAccept={call.acceptIncomingCall} /></> : <><ScreenShare active={call.isScreenSharing} onToggle={() => void call.toggleScreenShare()} /><CallControls muted={call.muted} cameraEnabled={call.cameraEnabled} speakerEnabled={call.speakerEnabled} video onMute={call.toggleMute} onCamera={call.toggleCamera} onSwitchCamera={call.switchCamera} onSpeaker={call.toggleSpeaker} onEnd={call.endCall} /></>}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: "#071729", paddingHorizontal: 16 },
  remote: { ...StyleSheet.absoluteFillObject },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 16, 32, 0.25)" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 10, borderRadius: 18, backgroundColor: "rgba(4, 20, 38, 0.54)" }, topTools: { flexDirection: "row", alignItems: "center", gap: 7 }, minimize: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: "rgba(255,255,255,0.14)" },
  topIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  topCopy: { flex: 1 },
  name: { color: kiniColors.white, fontSize: 17, fontWeight: "900" },
  state: { color: "#D0E1F1", fontSize: 12, fontWeight: "600", marginTop: 2 },
  ping: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: "rgba(52,139,211,0.70)" },
  pingText: { color: kiniColors.white, fontSize: 11, fontWeight: "800" },
  local: { position: "absolute", right: 18, top: 110, width: 108, height: 156, borderRadius: 16, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.94)", backgroundColor: "#163B5F", elevation: 6 },
  incomingIdentity: { alignItems: "center", marginTop: "auto", marginBottom: "auto" },
  cameraOff: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 8 },
  cameraOffTitle: { color: kiniColors.white, fontSize: 23, fontWeight: "900", marginTop: 10 },
  cameraOffText: { color: "#C7DBED", fontSize: 14, fontWeight: "600" },
  localSharing: { position: "absolute", left: 28, right: 28, top: "42%", alignItems: "center", gap: 7 }, localSharingTitle: { color: kiniColors.white, fontSize: 18, fontWeight: "900" }, localSharingText: { maxWidth: 280, color: "#C7DBED", fontSize: 13, lineHeight: 19, fontWeight: "600", textAlign: "center" },
  avatarRing: { padding: 7, borderRadius: 52, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  incomingName: { color: kiniColors.white, maxWidth: 300, fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 18 },
  incomingState: { color: "#D2E3F2", fontSize: 15, fontWeight: "600", marginTop: 7 },
  bottom: { alignItems: "center", marginTop: "auto", paddingTop: 18, paddingBottom: 3, gap: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "rgba(4, 21, 38, 0.62)" },
  actionHint: { color: "#C5D9EA", fontSize: 12, fontWeight: "700" },
});
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/components/VoiceCall.tsx
```tsx
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useKeepAwake } from "expo-keep-awake";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, kiniColors } from "@/components/kini-ui";
import { formatCallDuration, formatCallPing } from "@/lib/kini-call-format";
import { CallControls, IncomingCallActions } from "./CallControls";

function callStatus(call: any, incoming: boolean) {
  if (incoming) return "Cuộc gọi thoại đến";
  if (call.status === "ringing") return "Đang gọi…";
  if (call.status === "connecting") return "Đang kết nối bảo mật…";
  if (call.status === "connected") return `Đang gọi · ${formatCallDuration(call.elapsedSeconds)}`;
  return call.error ?? "Cuộc gọi đã kết thúc";
}

export function VoiceCall({ call, title, initials, color, avatarUrl }: { call: any; title: string; initials: string; color: string; avatarUrl?: string | null }) {
  useKeepAwake("kini-voice-call");
  const insets = useSafeAreaInsets();
  const visible = call.mode === "voice" && call.status !== "idle" && !call.minimized;
  const incoming = call.status === "ringing" && call.direction === "incoming";
  return <Modal visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => incoming ? void call.declineIncomingCall() : call.minimizeCall()}>
    <View style={[styles.screen, { paddingTop: insets.top + 30, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.orbOne} /><View style={styles.orbTwo} />
      <View style={styles.topRow}><View style={styles.topBadge}><MaterialIcons name="lock" size={14} color="#BFD8F3" /><Text style={styles.topBadgeText}>Kết nối riêng tư KINI</Text></View>{!incoming ? <TouchableOpacity onPress={call.minimizeCall} style={styles.minimize} accessibilityLabel="Thu nhỏ cuộc gọi để nhắn tin"><MaterialIcons name="keyboard-arrow-down" size={23} color={kiniColors.white} /></TouchableOpacity> : null}</View>
      <View style={styles.identity}>
        <View style={styles.avatarRing}><Avatar initials={initials} color={color} imageUri={avatarUrl} size={116} /></View>
        <Text numberOfLines={1} style={styles.name}>{title}</Text>
        <Text style={styles.state}>{callStatus(call, incoming)}</Text>
        {call.status === "connected" ? <View style={styles.ping}><MaterialIcons name="network-check" size={15} color="#85C9FF" /><Text style={styles.pingText}>{formatCallPing(call.pingMs)}</Text></View> : null}
      </View>
      <View style={styles.bottomPanel}>
        {incoming ? <><Text style={styles.actionHint}>Vuốt chạm để trả lời hoặc từ chối</Text><IncomingCallActions mode="voice" onDecline={call.declineIncomingCall} onAccept={call.acceptIncomingCall} /></> : <CallControls muted={call.muted} cameraEnabled={false} speakerEnabled={call.speakerEnabled} video={false} onMute={call.toggleMute} onSpeaker={call.toggleSpeaker} onEnd={call.endCall} />}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", alignItems: "center", backgroundColor: "#0D2745", paddingHorizontal: 24 },
  orbOne: { position: "absolute", width: 350, height: 350, borderRadius: 175, top: -160, left: -105, backgroundColor: "#155C9A", opacity: 0.48 },
  orbTwo: { position: "absolute", width: 290, height: 290, borderRadius: 145, bottom: 35, right: -135, backgroundColor: "#532F96", opacity: 0.42 },
  topRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, topBadge: { flexDirection: "row", gap: 6, alignItems: "center", borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.10)" }, minimize: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: "rgba(255,255,255,0.14)" },
  topBadgeText: { color: "#D7E9FA", fontSize: 11, fontWeight: "700" },
  identity: { alignItems: "center", marginTop: "auto", marginBottom: "auto" },
  avatarRing: { padding: 7, borderRadius: 67, backgroundColor: "rgba(255,255,255,0.13)", borderWidth: 1, borderColor: "rgba(255,255,255,0.30)" },
  name: { marginTop: 23, maxWidth: 290, color: kiniColors.white, fontSize: 27, lineHeight: 33, fontWeight: "900" },
  state: { marginTop: 8, color: "#CEE1F3", fontSize: 15, fontWeight: "600", textAlign: "center" },
  ping: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(0,0,0,0.16)" },
  pingText: { color: "#A9D7FF", fontSize: 12, fontWeight: "800" },
  bottomPanel: { width: "100%", alignItems: "center", minHeight: 116, justifyContent: "flex-end" },
  actionHint: { marginBottom: 17, color: "#BFD5E9", fontSize: 12, fontWeight: "600" },
});
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/config/iceServers.ts
```ts
/**
 * Danh sách ICE có STUN và TURN dự phòng. Các thông tin TURN công khai này chỉ
 * phù hợp để thử nghiệm; production nên thay bằng TURN có thông tin ngắn hạn.
 */
export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
] as const;
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/hooks/useCallSounds.ts
```ts
import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import InCallManager from "react-native-incall-manager";

import type { CallDirection, CallMode, CallStatus } from "../services/types";

const incomingSound = require("@/assets/audio/kini-incoming-ring.mp3");
const ringbackSound = require("@/assets/audio/kini-outgoing-ringback.mp3");

/** Phát nhạc chuông/nhạc chờ cục bộ; không bao giờ chặn luồng media WebRTC. */
export function useCallSounds(status: CallStatus, direction: CallDirection, mode: CallMode | null, isScreenSharing = false) {
  const incoming = useAudioPlayer(incomingSound);
  const ringback = useAudioPlayer(ringbackSound);
  const nativeVoiceRingback = useRef(false);

  useEffect(() => {
    incoming.loop = true;
    ringback.loop = true;
  }, [incoming, ringback]);

  useEffect(() => {
    const shouldRingIncoming = status === "ringing" && direction === "incoming";
    // Khi MediaProjection khởi động, chỉ giữ audio WebRTC; không để nhạc chờ tiếp tục chen vào.
    const shouldPlayVoiceRingback = !isScreenSharing && Platform.OS === "android" && mode === "voice" && status === "ringing" && direction === "outgoing";
    const shouldPlayRingback = !isScreenSharing && status === "ringing" && direction === "outgoing" && !shouldPlayVoiceRingback;
    const setPlaying = (player: typeof incoming, shouldPlay: boolean) => {
      try {
        if (shouldPlay) {
          player.seekTo(0);
          player.play();
        } else {
          player.pause();
          player.seekTo(0);
        }
      } catch {
        // Âm thanh là feedback phụ; cuộc gọi vẫn tiếp tục nếu thiết bị chặn phát audio.
      }
    };
    setPlaying(incoming, shouldRingIncoming);
    setPlaying(ringback, shouldPlayRingback);
    try {
      if (shouldPlayVoiceRingback && !nativeVoiceRingback.current) {
        InCallManager.startRingback("_DTMF_");
        nativeVoiceRingback.current = true;
      } else if (!shouldPlayVoiceRingback && nativeVoiceRingback.current) {
        InCallManager.stopRingback();
        nativeVoiceRingback.current = false;
      }
    } catch { /* Thiết bị vẫn có thể phát ringback Expo hoặc tiếp tục cuộc gọi nếu native tone bị chặn. */ }
  }, [direction, incoming, isScreenSharing, mode, ringback, status]);

  useEffect(() => () => {
    if (!nativeVoiceRingback.current) return;
    try { InCallManager.stopRingback(); } catch { /* Native audio đã được giải phóng. */ }
    nativeVoiceRingback.current = false;
  }, []);
}
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/hooks/useWebRTC.ts
```ts
import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { createKiniSignalClient, type KiniSignalClient } from "../services/signalingClient";
import {
  candidateToPayload,
  createDisplayMedia,
  createLocalMedia,
  createPeerConnection,
  keepCallAudioActive,
  setCameraEnabled as setCameraEnabledOnStream,
  setMuted as setMutedOnStream,
  setSpeakerEnabled as setSpeakerEnabledOnDevice,
  stopInCall,
  stopStream,
  stabilizeScreenShareSender,
  streamFromTrack,
  switchCamera as switchCameraOnStream,
  toCandidate,
  toDescription,
  type NativePeer,
  type NativeStream,
} from "../services/webrtcService";
import type { CallDirection, CallMode, CallPeer, CallSignal, CallStatus, IncomingCall, SessionDescriptionPayload } from "../services/types";

function newCallId() {
  return globalThis.crypto?.randomUUID?.() ?? `call-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function descriptionPayload(description: any, expected: "offer" | "answer"): SessionDescriptionPayload {
  const raw = typeof description?.toJSON === "function" ? description.toJSON() : description;
  if (raw?.type !== expected || typeof raw.sdp !== "string" || !raw.sdp) throw new Error("SDP cuộc gọi không hợp lệ.");
  return { type: expected, sdp: raw.sdp };
}

type WebRTCState = {
  status: CallStatus;
  mode: CallMode | null;
  direction: CallDirection;
  conversationId: number | null;
  peer: CallPeer | null;
  error: string | null;
  incoming: IncomingCall | null;
  localStream: NativeStream | null;
  screenStream: NativeStream | null;
  remoteStream: NativeStream | null;
  remoteScreenStream: NativeStream | null;
  remoteCameraEnabled: boolean;
  muted: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  isScreenSharing: boolean;
  elapsedSeconds: number;
  pingMs: number | null;
  minimized: boolean;
};

const initialState: WebRTCState = {
  status: "idle", mode: null, direction: null, conversationId: null, peer: null, error: null, incoming: null,
  localStream: null, screenStream: null, remoteStream: null, remoteScreenStream: null, remoteCameraEnabled: true, muted: false, cameraEnabled: true, speakerEnabled: false, isScreenSharing: false, elapsedSeconds: 0, pingMs: null, minimized: false,
};

/** Quản lý một cuộc gọi KINI toàn cục; mọi callback native cũ bị vô hiệu hóa khi cuộc gọi được dọn dẹp. */
export function useWebRTC(enabled = true) {
  const [state, setState] = useState<WebRTCState>(initialState);
  const peerRef = useRef<NativePeer | null>(null);
  const signalRef = useRef<KiniSignalClient | null>(null);
  const signalPromiseRef = useRef<Promise<KiniSignalClient> | null>(null);
  const callIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<number | null>(null);
  const pendingCandidatesRef = useRef<CallSignal[]>([]);
  const localStreamRef = useRef<NativeStream | null>(null);
  const screenStreamRef = useRef<NativeStream | null>(null);
  const screenSenderRef = useRef<any>(null);
  const cameraSenderRef = useRef<any>(null);
  const screenTrackRef = useRef<any>(null);
  const incomingRef = useRef<IncomingCall | null>(null);
  const pingRef = useRef<number | null>(null);
  const remoteScreenSharingRef = useRef(false);
  const endingRef = useRef(false);
  const cleanupTokenRef = useRef(0);
  const renegotiatingRef = useRef(false);
  const pendingScreenSharingRef = useRef<boolean | null>(null);
  const renegotiationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNotificationActionRef = useRef<{ callId: string; action: "answer" | "decline" } | null>(null);
  const connectedFeedbackRef = useRef(false);

  const notifyConnected = useCallback(() => {
    if (connectedFeedbackRef.current) return;
    connectedFeedbackRef.current = true;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);

  const cleanup = useCallback(() => {
    cleanupTokenRef.current += 1;
    const peer = peerRef.current;
    const localStream = localStreamRef.current;
    const screenStream = screenStreamRef.current;
    const screenTrack = screenTrackRef.current;
    peerRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    screenTrackRef.current = null;
    screenSenderRef.current = null;
    cameraSenderRef.current = null;
    remoteScreenSharingRef.current = false;
    pendingScreenSharingRef.current = null;
    pendingNotificationActionRef.current = null;
    if (renegotiationTimerRef.current) clearTimeout(renegotiationTimerRef.current);
    renegotiationTimerRef.current = null;
    try {
      const events = peer as any;
      if (events) {
        events.onicecandidate = null;
        events.ontrack = null;
        events.onconnectionstatechange = null;
        events.oniceconnectionstatechange = null;
      }
    } catch { /* Native peer có thể đã tự giải phóng. */ }
    try { if (screenTrack) screenTrack.onended = null; } catch { /* Không cần xử lý thêm. */ }
    stopStream(screenStream);
    stopStream(localStream);
    try { peer?.close(); } catch { /* Peer đã đóng hoặc native không còn hợp lệ. */ }
    stopInCall();
    callIdRef.current = null;
    conversationIdRef.current = null;
    pendingCandidatesRef.current = [];
    incomingRef.current = null;
    pingRef.current = null;
    connectedFeedbackRef.current = false;
    setState(initialState);
  }, []);

  const addQueuedCandidates = useCallback(async () => {
    const peer = peerRef.current;
    const callId = callIdRef.current;
    if (!peer || !callId) return;
    const queued = pendingCandidatesRef.current.splice(0);
    for (const signal of queued) {
      if (signal.callId !== callId || !signal.candidate || peer !== peerRef.current) continue;
      try { await peer.addIceCandidate(toCandidate(signal.candidate)); } catch { /* Candidate cũ có thể hết hiệu lực sau renegotiation. */ }
    }
  }, []);

  const buildPeer = useCallback(async (callId: string, conversationId: number) => {
    const peer = await createPeerConnection();
    peerRef.current = peer;
    const token = cleanupTokenRef.current;
    const isCurrent = () => peerRef.current === peer && callIdRef.current === callId && cleanupTokenRef.current === token;
    const peerEvents = peer as any;
    peerEvents.onicecandidate = (event: any) => {
      if (!event.candidate || !isCurrent()) return;
      try { signalRef.current?.emitCandidate({ callId, conversationId, candidate: candidateToPayload(event.candidate) }); } catch { /* Candidate lỗi không được làm dừng call. */ }
    };
    peerEvents.ontrack = (event: any) => {
      if (!isCurrent() || !event.track) return;
      const remote = event.streams?.[0] ?? streamFromTrack(event.track);
      const isScreenTrack = event.track.kind === "video" && remoteScreenSharingRef.current;
      setState((current) => isScreenTrack ? { ...current, remoteScreenStream: remote } : { ...current, remoteStream: current.remoteStream ?? remote });
      if (event.track.kind === "video") event.track.onended = () => {
        if (isCurrent()) setState((current) => current.remoteScreenStream?.id === remote.id ? { ...current, remoteScreenStream: null } : current);
      };
    };
    peerEvents.onconnectionstatechange = () => {
      if (!isCurrent()) return;
      if (peer.connectionState === "connected") {
        setState((current) => ({ ...current, status: "connected", error: null }));
        notifyConnected();
      }
      if (peer.connectionState === "failed") setState((current) => ({ ...current, status: "error", error: "Kết nối cuộc gọi bị gián đoạn. Hãy kết thúc và gọi lại." }));
    };
    peerEvents.oniceconnectionstatechange = () => {
      if (!isCurrent()) return;
      if (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed") {
        setState((current) => ({ ...current, status: "connected", error: null }));
        notifyConnected();
      }
      if (peer.iceConnectionState === "failed") setState((current) => ({ ...current, status: "error", error: "ICE không tạo được đường truyền media. Hãy thử lại trên mạng khác." }));
    };
    return peer;
  }, [notifyConnected]);

  const ensureSignal = useCallback(async () => {
    if (signalRef.current) return signalRef.current;
    if (!signalPromiseRef.current) signalPromiseRef.current = createKiniSignalClient({
      offer: (signal) => {
        const mode = signal.mode;
        const description = signal.description;
        if (signal.conversationId <= 0 || !description || !mode) return;
        if (signal.renegotiate && signal.callId === callIdRef.current && peerRef.current) {
          void (async () => {
            const peer = peerRef.current;
            if (!peer || signal.callId !== callIdRef.current || endingRef.current) return;
            try {
              remoteScreenSharingRef.current = signal.screenSharing === true;
              if (signal.screenSharing === false) setState((current) => ({ ...current, remoteScreenStream: null }));
              await peer.setRemoteDescription(toDescription(description));
              if (peer !== peerRef.current || signal.callId !== callIdRef.current) return;
              await addQueuedCandidates();
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              signalRef.current?.emitAnswer({ callId: signal.callId, conversationId: signal.conversationId, description: descriptionPayload(answer, "answer"), renegotiate: true });
            } catch (error) {
              if (peer === peerRef.current) setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể cập nhật media cuộc gọi." }));
            }
          })();
          return;
        }
        const incoming: IncomingCall = { callId: signal.callId, conversationId: signal.conversationId, mode, fromUserId: signal.fromUserId, description, caller: signal.caller };
        if (callIdRef.current || incomingRef.current) return;
        callIdRef.current = signal.callId;
        conversationIdRef.current = signal.conversationId;
        incomingRef.current = incoming;
        setState({ ...initialState, status: "ringing", direction: "incoming", mode, conversationId: signal.conversationId, peer: signal.caller ?? { title: "Bạn KINI", initials: "K", color: "#1677FF" }, incoming });
      },
      answer: async (signal) => {
        const peer = peerRef.current;
        if (!peer || signal.callId !== callIdRef.current || !signal.description || endingRef.current) return;
        try {
          await peer.setRemoteDescription(toDescription(signal.description));
          if (peer === peerRef.current) await addQueuedCandidates();
        } catch (error) {
          if (peer === peerRef.current) setState((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "Không thể hoàn tất kết nối cuộc gọi." }));
        }
      },
      candidate: async (signal) => {
        const peer = peerRef.current;
        if (signal.callId !== callIdRef.current || !signal.candidate || endingRef.current) return;
        if (!peer?.remoteDescription) {
          pendingCandidatesRef.current.push(signal);
          return;
        }
        try { await peer.addIceCandidate(toCandidate(signal.candidate)); } catch { /* Candidate lỗi không được phá signaling. */ }
      },
      media: (signal) => {
        if (signal.callId !== callIdRef.current || typeof signal.cameraEnabled !== "boolean") return;
        const remoteCameraEnabled = signal.cameraEnabled === true;
        setState((current) => ({ ...current, remoteCameraEnabled }));
      },
      end: (signal) => {
        if (signal.callId === callIdRef.current) cleanup();
      },
      error: (message) => setState((current) => current.status === "idle" ? current : { ...current, status: "error", error: message }),
    }).then((client) => {
      signalRef.current = client;
      return client;
    }).catch((error) => {
      signalPromiseRef.current = null;
      throw error;
    });
    return signalPromiseRef.current;
  }, [addQueuedCandidates, cleanup]);

  const renegotiate = useCallback((screenSharing: boolean) => {
    pendingScreenSharingRef.current = screenSharing;
    const run = async () => {
      const peer = peerRef.current;
      const callId = callIdRef.current;
      const conversationId = conversationIdRef.current;
      if (!peer || !callId || !conversationId || endingRef.current) return;
      if (peer.signalingState !== "stable" || renegotiatingRef.current) {
        if (!renegotiationTimerRef.current) renegotiationTimerRef.current = setTimeout(() => {
          renegotiationTimerRef.current = null;
          void run();
        }, 300);
        return;
      }
      const requested = pendingScreenSharingRef.current;
      if (requested === null) return;
      pendingScreenSharingRef.current = null;
      renegotiatingRef.current = true;
      try {
        const signal = await ensureSignal();
        if (peer !== peerRef.current || callId !== callIdRef.current || endingRef.current) return;
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        signal.emitOffer({ callId, conversationId, mode: "video", description: descriptionPayload(offer, "offer"), renegotiate: true, screenSharing: requested });
      } catch (error) {
        if (peer === peerRef.current) setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể cập nhật chia sẻ màn hình." }));
      } finally {
        renegotiatingRef.current = false;
        if (pendingScreenSharingRef.current !== null) void run();
      }
    };
    void run();
  }, [ensureSignal]);

  const startCall = useCallback(async (conversationId: number, mode: CallMode, peerInfo: CallPeer) => {
    try {
      cleanup();
      endingRef.current = false;
      const signal = await ensureSignal();
      const callId = newCallId();
      callIdRef.current = callId;
      conversationIdRef.current = conversationId;
      setState({ ...initialState, status: "ringing", direction: "outgoing", mode, conversationId, peer: peerInfo, speakerEnabled: true });
      const peer = await buildPeer(callId, conversationId);
      const localStream = await createLocalMedia(mode);
      localStream.getTracks().forEach((track: any) => {
        const sender = peer.addTrack(track, localStream);
        if (track.kind === "video") cameraSenderRef.current = sender;
      });
      localStreamRef.current = localStream;
      setState((current) => ({ ...current, localStream }));
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
      await peer.setLocalDescription(offer);
      signal.emitOffer({ callId, conversationId, mode, description: descriptionPayload(offer, "offer") });
    } catch (error) {
      cleanup();
      setState((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "Không thể bắt đầu cuộc gọi." }));
    }
  }, [buildPeer, cleanup, ensureSignal]);

  const acceptIncomingCall = useCallback(async () => {
    const incoming = incomingRef.current;
    if (!incoming || endingRef.current) return;
    try {
      const signal = await ensureSignal();
      setState((current) => ({ ...current, status: "connecting", error: null }));
      const peer = await buildPeer(incoming.callId, incoming.conversationId);
      const localStream = await createLocalMedia(incoming.mode);
      localStream.getTracks().forEach((track: any) => {
        const sender = peer.addTrack(track, localStream);
        if (track.kind === "video") cameraSenderRef.current = sender;
      });
      localStreamRef.current = localStream;
      await peer.setRemoteDescription(toDescription(incoming.description));
      await addQueuedCandidates();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      setState((current) => ({ ...current, localStream }));
      signal.emitAnswer({ callId: incoming.callId, conversationId: incoming.conversationId, description: descriptionPayload(answer, "answer") });
    } catch (error) {
      cleanup();
      setState((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "Không thể nhận cuộc gọi." }));
    }
  }, [addQueuedCandidates, buildPeer, cleanup, ensureSignal]);

  const endCall = useCallback(async (outcome: "declined" | "cancelled" | "ended" | "failed" = "ended") => {
    if (endingRef.current) return;
    endingRef.current = true;
    const callId = callIdRef.current;
    const conversationId = conversationIdRef.current;
    const signal = signalRef.current;
    // Dừng stream/audio/ringback cục bộ ngay. Signaling có thể chậm hoặc mất mạng, không được để nhạc chờ tiếp tục phát.
    cleanup();
    try {
      if (callId && conversationId) await signal?.emitEnd({ callId, conversationId, outcome, ...(pingRef.current !== null ? { pingMs: pingRef.current } : {}) });
    } finally {
      endingRef.current = false;
    }
  }, [cleanup]);

  const declineIncomingCall = useCallback(() => void endCall("declined"), [endCall]);
  const minimizeCall = useCallback(() => setState((current) => current.status !== "idle" && !(current.status === "ringing" && current.direction === "incoming") ? { ...current, minimized: true } : current), []);
  const restoreCall = useCallback(() => setState((current) => current.minimized ? { ...current, minimized: false } : current), []);
  const handleIncomingNotificationAction = useCallback((callId: string, action: "answer" | "decline") => {
    const incoming = incomingRef.current;
    if (incoming?.callId === callId) {
      if (action === "answer") void acceptIncomingCall();
      else void declineIncomingCall();
      return;
    }
    pendingNotificationActionRef.current = { callId, action };
    void ensureSignal().catch(() => undefined);
  }, [acceptIncomingCall, declineIncomingCall, ensureSignal]);
  const toggleMute = useCallback(() => setState((current) => { const muted = !current.muted; setMutedOnStream(current.localStream, muted); return { ...current, muted }; }), []);
  const toggleCamera = useCallback(async () => {
    const localStream = localStreamRef.current;
    const track = localStream?.getVideoTracks?.()[0];
    const nextEnabled = !state.cameraEnabled;
    if (!localStream || !track || state.mode !== "video") return;
    try {
      setCameraEnabledOnStream(localStream, nextEnabled);
      const sender = cameraSenderRef.current;
      if (sender) await sender.replaceTrack(nextEnabled ? track : null);
      if (callIdRef.current && conversationIdRef.current) signalRef.current?.emitMedia({ callId: callIdRef.current, conversationId: conversationIdRef.current, cameraEnabled: nextEnabled });
      setState((current) => ({ ...current, cameraEnabled: nextEnabled }));
    } catch (error) {
      setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể thay đổi camera." }));
    }
  }, [state.cameraEnabled, state.mode]);
  const toggleSpeaker = useCallback(() => setState((current) => { const speakerEnabled = !current.speakerEnabled; setSpeakerEnabledOnDevice(speakerEnabled, current.mode ?? "video"); return { ...current, speakerEnabled }; }), []);
  const switchCamera = useCallback(() => switchCameraOnStream(state.localStream), [state.localStream]);

  const stopScreenShare = useCallback(async () => {
    const sender = screenSenderRef.current;
    const peer = peerRef.current;
    const screen = screenStreamRef.current;
    const track = screenTrackRef.current;
    if (!sender && !screen) return;
    screenSenderRef.current = null;
    screenStreamRef.current = null;
    screenTrackRef.current = null;
    try {
      if (track) track.onended = null;
      if (sender && peer && peer.connectionState !== "closed") await sender.replaceTrack(null);
      stopStream(screen);
      setState((current) => ({ ...current, isScreenSharing: false, screenStream: null }));
      renegotiate(false);
    } catch (error) {
      setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể dừng chia sẻ màn hình an toàn." }));
    }
  }, [renegotiate]);

  const toggleScreenShare = useCallback(async () => {
    if (state.isScreenSharing) return stopScreenShare();
    const peer = peerRef.current;
    if (state.mode !== "video" || state.status !== "connected" || !peer || endingRef.current) {
      return setState((current) => ({ ...current, error: "Chia sẻ màn hình chỉ khả dụng trong cuộc gọi video đang kết nối." }));
    }
    try {
      const microphoneTrack = localStreamRef.current?.getAudioTracks?.()[0];
      if (!microphoneTrack || microphoneTrack.readyState === "ended") throw new Error("Microphone không còn hoạt động. Hãy dừng chia sẻ màn hình và gọi lại.");
      // MediaProjection trên một số ROM đổi audio focus; giữ mic riêng của call và route hiện tại trước/sau khi mở màn hình chia sẻ.
      if (!state.muted) microphoneTrack.enabled = true;
      keepCallAudioActive(state.speakerEnabled, "video");
      const screen = await createDisplayMedia();
      const screenTrack = screen.getVideoTracks()[0];
      if (!screenTrack || peer !== peerRef.current || endingRef.current) {
        stopStream(screen);
        throw new Error("Không tìm thấy luồng video để chia sẻ màn hình.");
      }
      const cameraTrack = localStreamRef.current?.getVideoTracks?.()[0];
      const cameraSender = cameraSenderRef.current;
      if (cameraTrack && cameraSender && state.cameraEnabled) {
        setCameraEnabledOnStream(localStreamRef.current, false);
        await cameraSender.replaceTrack(null);
        if (callIdRef.current && conversationIdRef.current) signalRef.current?.emitMedia({ callId: callIdRef.current, conversationId: conversationIdRef.current, cameraEnabled: false });
        setState((current) => ({ ...current, cameraEnabled: false }));
      }
      const transceiver = peer.addTransceiver("video", { direction: "sendonly" });
      await transceiver.sender.replaceTrack(screenTrack);
      if (peer !== peerRef.current || endingRef.current) {
        await transceiver.sender.replaceTrack(null);
        stopStream(screen);
        return;
      }
      screenSenderRef.current = transceiver.sender;
      screenStreamRef.current = screen;
      screenTrackRef.current = screenTrack;
      (screenTrack as any).onended = () => { if (screenTrackRef.current === screenTrack) void stopScreenShare(); };
      setState((current) => ({ ...current, isScreenSharing: true, screenStream: screen }));
      keepCallAudioActive(state.speakerEnabled, "video");
      renegotiate(true);
      // Không chặn offer bởi setParameters: người nhận nhận track sớm hơn, sau đó bitrate được tinh chỉnh nền.
      void stabilizeScreenShareSender(transceiver.sender);
    } catch (error) {
      setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể chia sẻ màn hình." }));
    }
  }, [renegotiate, state.cameraEnabled, state.isScreenSharing, state.mode, state.muted, state.speakerEnabled, state.status, stopScreenShare]);

  useEffect(() => {
    const pending = pendingNotificationActionRef.current;
    const incoming = incomingRef.current;
    if (!pending || !incoming || pending.callId !== incoming.callId || state.status !== "ringing" || state.direction !== "incoming") return;
    pendingNotificationActionRef.current = null;
    if (pending.action === "answer") void acceptIncomingCall();
    else void declineIncomingCall();
  }, [acceptIncomingCall, declineIncomingCall, state.direction, state.status]);

  useEffect(() => {
    if (state.status !== "connected") return;
    const connectedAt = Date.now();
    const updateDuration = () => setState((current) => current.status === "connected" ? { ...current, elapsedSeconds: Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)) } : current);
    const samplePing = async () => {
      const peer = peerRef.current;
      try {
        const stats = await (peer as any)?.getStats?.();
        if (peer !== peerRef.current) return;
        const reports: any[] = [];
        if (stats && typeof stats.forEach === "function") stats.forEach((value: any) => reports.push(value));
        const candidatePairs = reports.filter((report) => report?.type === "candidate-pair" && report.state === "succeeded");
        // Ưu tiên đường truyền đang được chọn/nominated, không lấy candidate cũ có RTT không còn đại diện call.
        const pair = candidatePairs.find((report) => report.selected === true || report.nominated === true) ?? candidatePairs[0];
        const rawRoundTripTime = typeof pair?.currentRoundTripTime === "number"
          ? pair.currentRoundTripTime
          : typeof pair?.totalRoundTripTime === "number" && typeof pair?.responsesReceived === "number" && pair.responsesReceived > 0
            ? pair.totalRoundTripTime / pair.responsesReceived
            : null;
        const ping = rawRoundTripTime !== null && Number.isFinite(rawRoundTripTime) ? Math.max(0, Math.min(60_000, Math.round(rawRoundTripTime * 1000))) : null;
        if (ping !== null) {
          pingRef.current = ping;
          setState((current) => current.status === "connected" ? { ...current, pingMs: ping } : current);
        }
      } catch { /* Một số Android WebRTC không có đủ getStats. */ }
    };
    updateDuration();
    void samplePing();
    const durationTimer = setInterval(updateDuration, 1000);
    const pingTimer = setInterval(() => { void samplePing(); }, 5000);
    return () => { clearInterval(durationTimer); clearInterval(pingTimer); };
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "ringing" || state.direction !== "outgoing") return;
    const timeout = setTimeout(() => { void endCall("cancelled"); }, 45_000);
    return () => clearTimeout(timeout);
  }, [endCall, state.direction, state.status]);

  useEffect(() => {
    if (!enabled) return;
    void ensureSignal().catch(() => undefined);
    return () => {
      const signal = signalRef.current;
      cleanup();
      signal?.disconnect();
      signalRef.current = null;
      signalPromiseRef.current = null;
    };
  }, [cleanup, enabled, ensureSignal]);

  return { ...state, startCall, acceptIncomingCall, declineIncomingCall, handleIncomingNotificationAction, endCall, minimizeCall, restoreCall, toggleMute, toggleCamera, toggleSpeaker, switchCamera, toggleScreenShare, stopScreenShare };
}
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/services/signalingClient.ts
```ts
import { io, type Socket } from "socket.io-client";

import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

import type { CallSignal } from "./types";

type SignalEvents = {
  offer: (signal: CallSignal) => void;
  answer: (signal: CallSignal) => void;
  candidate: (signal: CallSignal) => void;
  media: (signal: CallSignal) => void;
  end: (signal: CallSignal) => void;
  error: (message: string) => void;
};

export type KiniSignalClient = {
  emitOffer: (signal: Omit<CallSignal, "fromUserId">) => void;
  emitAnswer: (signal: Omit<CallSignal, "fromUserId">) => void;
  emitCandidate: (signal: Omit<CallSignal, "fromUserId">) => void;
  emitMedia: (signal: Pick<CallSignal, "callId" | "conversationId" | "cameraEnabled">) => void;
  emitEnd: (signal: Pick<CallSignal, "callId" | "conversationId"> & { outcome?: CallSignal["outcome"]; pingMs?: number }) => Promise<void>;
  disconnect: () => void;
};

/** Kết nối signaling dùng chính Bearer session của KINI; server vẫn kiểm tra quyền theo hội thoại. */
export async function createKiniSignalClient(events: SignalEvents): Promise<KiniSignalClient> {
  const token = await Auth.getSessionToken();
  if (!token) throw new Error("Cần đăng nhập KINI trước khi gọi.");
  const socket: Socket = io(getApiBaseUrl(), {
    path: "/socket.io",
    withCredentials: true,
    auth: token ? { token } : {},
    transports: ["websocket", "polling"],
    timeout: 12_000,
  });

  socket.on("connect_error", (error) => events.error(error.message || "Không thể kết nối signaling cuộc gọi."));
  socket.on("call:offer", events.offer);
  socket.on("call:answer", events.answer);
  socket.on("call:candidate", events.candidate);
  socket.on("call:media", events.media);
  socket.on("call:end", events.end);

  const client: KiniSignalClient = {
    emitOffer: (signal) => socket.emit("call:offer", signal),
    emitAnswer: (signal) => socket.emit("call:answer", signal),
    emitCandidate: (signal) => socket.emit("call:candidate", signal),
    emitMedia: (signal) => socket.emit("call:media", signal),
    emitEnd: async (signal) => {
      if (!socket.connected) return;
      await new Promise<void>((resolve) => {
        (socket as any).timeout(1_800).emit("call:end", signal, () => resolve());
      });
    },
    disconnect: () => {
      socket.removeAllListeners();
      socket.disconnect();
    },
  };

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("connect", connected);
      socket.disconnect();
      reject(new Error("Kết nối signaling quá thời gian chờ."));
    }, 12_000);
    const connected = () => {
      clearTimeout(timeout);
      socket.off("connect_error", failed);
      resolve();
    };
    const failed = (error: Error) => {
      clearTimeout(timeout);
      socket.off("connect", connected);
      reject(new Error(error.message || "Không thể kết nối signaling cuộc gọi."));
    };
    socket.once("connect", connected);
    socket.once("connect_error", failed);
  });
  return client;
}
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/services/types.ts
```ts
export type CallMode = "voice" | "video";
export type CallStatus = "idle" | "ringing" | "connecting" | "connected" | "ended" | "error";
export type SessionDescriptionPayload = { type: "offer" | "answer" | "pranswer" | "rollback"; sdp: string };
export type IceCandidatePayload = { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null; usernameFragment?: string | null };
export type CallPeer = { title: string; initials: string; color: string; avatarUrl?: string | null };
export type CallDirection = "outgoing" | "incoming" | null;

export type IncomingCall = {
  callId: string;
  conversationId: number;
  mode: CallMode;
  fromUserId: number;
  description: SessionDescriptionPayload;
  caller?: CallPeer;
};

export type CallSignal = {
  callId: string;
  conversationId: number;
  fromUserId: number;
  description?: SessionDescriptionPayload;
  candidate?: IceCandidatePayload;
  mode?: CallMode;
  caller?: CallPeer;
  outcome?: "declined" | "cancelled" | "ended" | "failed";
  pingMs?: number;
  renegotiate?: boolean;
  screenSharing?: boolean;
  cameraEnabled?: boolean;
};
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/services/webrtcService.native.ts
```ts
import { setAudioModeAsync } from "expo-audio";
import { PermissionsAndroid, Platform } from "react-native";
import InCallManager from "react-native-incall-manager";
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  type MediaStreamTrack,
} from "react-native-webrtc";

import { apiCall } from "@/lib/_core/api";
import type { CallMode, IceCandidatePayload, SessionDescriptionPayload } from "./types";

export type NativePeer = RTCPeerConnection;
export type NativeStream = MediaStream;

let androidVoiceAudioActive = false;

async function configureExpoAudio(speakerEnabled: boolean) {
  if (Platform.OS === "android") return;
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    interruptionMode: "doNotMix",
    shouldRouteThroughEarpiece: !speakerEnabled,
  });
}

async function configureCallAudio(speakerEnabled: boolean, mode: CallMode) {
  // Android dùng InCallManager cho cả thoại/video để WebRTC giữ audio focus và route loa ổn định.
  if (Platform.OS === "android") {
    try {
      InCallManager.start({ media: mode === "voice" ? "audio" : "video", auto: true });
      InCallManager.setForceSpeakerphoneOn(speakerEnabled);
      androidVoiceAudioActive = true;
    } catch {
      // Không để lỗi audio route native làm crash hoặc chặn signaling.
    }
    return;
  }
  await configureExpoAudio(speakerEnabled);
}

type IceServer = { urls: string | string[]; username?: string; credential?: string };

export async function createPeerConnection() {
  const result = await apiCall<{ iceServers: IceServer[] }>("/api/call/ice");
  if (!Array.isArray(result.iceServers) || result.iceServers.length === 0) throw new Error("Không có TURN relay cho cuộc gọi.");
  return new RTCPeerConnection({ iceServers: result.iceServers, bundlePolicy: "max-bundle", rtcpMuxPolicy: "require", iceTransportPolicy: "all" });
}

export async function createLocalMedia(mode: CallMode): Promise<NativeStream> {
  if (Platform.OS === "android") {
    const permissions = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ...(mode === "video" ? [PermissionsAndroid.PERMISSIONS.CAMERA] : []),
    ]);
    const denied = Object.values(permissions).some((result) => result !== PermissionsAndroid.RESULTS.GRANTED);
    if (denied) throw new Error(mode === "video" ? "KINI cần quyền micro và camera để gọi video." : "KINI cần quyền micro để gọi thoại.");
  }
  try { await configureCallAudio(true, mode); } catch { /* WebRTC vẫn tiếp tục nếu audio mode hệ thống bị chặn. */ }
  const stream = await mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    } as any,
    video: mode === "video" ? { facingMode: "user", frameRate: 24, width: 640, height: 480 } : false,
  });
  return stream;
}

/** Ưu tiên nét chữ/màn hình và giảm thay đổi bitrate khung hình khi chia sẻ trên mạng di động. */
export async function stabilizeScreenShareSender(sender: any) {
  try {
    const parameters = sender?.getParameters?.();
    if (!parameters || !Array.isArray(parameters.encodings)) return;
    parameters.degradationPreference = "maintain-resolution";
    parameters.encodings.forEach((encoding: any) => {
      encoding.active = true;
      encoding.maxBitrate = 2_500_000;
      encoding.maxFramerate = 12;
      encoding.scaleResolutionDownBy = 1;
    });
    await sender.setParameters(parameters);
  } catch {
    // Một số Android cũ không hỗ trợ sender parameters; share vẫn tiếp tục với mặc định WebRTC.
  }
}

export async function createDisplayMedia(): Promise<NativeStream> {
  // Screen stream chỉ mang video. Microphone của call được giữ trên local stream riêng để hai bên vẫn đàm thoại.
  return mediaDevices.getDisplayMedia();
}

/** Khôi phục audio focus sau khi MediaProjection trên Android khởi động mà không tạo stream micro thứ hai. */
export function keepCallAudioActive(speakerEnabled: boolean, mode: CallMode) {
  if (Platform.OS === "android") {
    try {
      if (!androidVoiceAudioActive) InCallManager.start({ media: mode === "voice" ? "audio" : "video", auto: true });
      InCallManager.setForceSpeakerphoneOn(speakerEnabled);
      androidVoiceAudioActive = true;
    } catch { /* Không để audio route làm gián đoạn screen share đang chạy. */ }
    return;
  }
  void configureCallAudio(speakerEnabled, mode).catch(() => undefined);
}

export function streamFromTrack(track: MediaStreamTrack): NativeStream {
  return new MediaStream([track]);
}

export function candidateToPayload(candidate: RTCIceCandidate): IceCandidatePayload {
  const payload = candidate.toJSON();
  if (!payload.candidate) throw new Error("ICE candidate không hợp lệ.");
  return { ...payload, candidate: payload.candidate };
}

export function toCandidate(candidate: IceCandidatePayload) {
  return new RTCIceCandidate(candidate);
}

export function toDescription(description: SessionDescriptionPayload) {
  return new RTCSessionDescription(description as any);
}

export function stopStream(stream: NativeStream | null | undefined) {
  try {
    stream?.getTracks?.().forEach((track) => {
      try { if (track.readyState !== "ended") track.stop(); } catch { /* Track đã được native release. */ }
    });
    try { stream?.release?.(false); } catch { /* Stream native đã được release. */ }
  } catch { /* Stream không còn hợp lệ sau khi peer đóng. */ }
}

export function setMuted(stream: NativeStream | null, muted: boolean) {
  try { stream?.getAudioTracks().forEach((track) => { track.enabled = !muted; }); } catch { /* Stream đã đóng. */ }
}

export function setCameraEnabled(stream: NativeStream | null, enabled: boolean) {
  try { stream?.getVideoTracks().forEach((track) => { track.enabled = enabled; }); } catch { /* Stream đã đóng. */ }
}

export function switchCamera(stream: NativeStream | null) {
  const track = stream?.getVideoTracks()[0] as (MediaStreamTrack & { _switchCamera?: () => void }) | undefined;
  track?._switchCamera?.();
}

export function setSpeakerEnabled(enabled: boolean, mode: CallMode = "video") {
  if (Platform.OS === "android") {
    // MediaProjection hoặc một cuộc gián đoạn ngắn có thể làm Android trả audio focus trước khi người dùng đổi loa.
    // Tái áp dụng session trước khi đổi route để thoại, video và screen share đều dùng được loa trong/ngoài.
    keepCallAudioActive(enabled, mode);
    return;
  }
  void configureCallAudio(enabled, mode).catch(() => {});
}

export function stopInCall() {
  if (Platform.OS === "android") {
    // Ringback có thể bắt đầu trước audio session WebRTC; luôn dừng riêng dù session chưa kịp được đánh dấu active.
    try { InCallManager.stopRingback(); } catch { /* Native ringback đã dừng hoặc chưa khởi tạo. */ }
    if (!androidVoiceAudioActive) return;
    try { InCallManager.stop(); } catch { /* Audio session đã được hệ điều hành giải phóng. */ }
    androidVoiceAudioActive = false;
    return;
  }
  void setAudioModeAsync({ allowsRecording: false, shouldRouteThroughEarpiece: false }).catch(() => {});
}
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/services/webrtcService.ts
```ts
// TypeScript cần một entry module chung; Metro sẽ ưu tiên file .native hoặc .web theo nền tảng.
export * from "./webrtcService.native";
```

## FILE: /home/ubuntu/kini-mobile/features/webrtc-calling/services/webrtcService.web.ts
```ts
import { ICE_SERVERS } from "../config/iceServers";
import type { CallMode, IceCandidatePayload, SessionDescriptionPayload } from "./types";

export type NativePeer = any;
export type NativeStream = any;

const browserMedia = () => {
  const mediaDevices = (globalThis as { navigator?: { mediaDevices?: MediaDevices } }).navigator?.mediaDevices;
  if (!mediaDevices) throw new Error("Trình duyệt này không hỗ trợ WebRTC.");
  return mediaDevices;
};

export function createPeerConnection() {
  const Peer = (globalThis as { RTCPeerConnection?: typeof RTCPeerConnection }).RTCPeerConnection;
  if (!Peer) throw new Error("Trình duyệt này không hỗ trợ WebRTC.");
  return new Peer({ iceServers: [...ICE_SERVERS] });
}

export async function createLocalMedia(mode: CallMode) {
  return browserMedia().getUserMedia({ audio: true, video: mode === "video" ? { facingMode: "user" } : false });
}

export async function createDisplayMedia() {
  return browserMedia().getDisplayMedia({ video: true, audio: true });
}

export function candidateToPayload(candidate: RTCIceCandidate): IceCandidatePayload {
  const payload = candidate.toJSON();
  if (!payload.candidate) throw new Error("ICE candidate không hợp lệ.");
  return { ...payload, candidate: payload.candidate };
}
export function toCandidate(candidate: IceCandidatePayload) { return new RTCIceCandidate(candidate); }
export function toDescription(description: SessionDescriptionPayload) { return new RTCSessionDescription(description); }
export function stopStream(stream: NativeStream | null | undefined) { stream?.getTracks().forEach((track: MediaStreamTrack) => track.stop()); }
export function setMuted(stream: NativeStream | null, muted: boolean) { stream?.getAudioTracks().forEach((track: MediaStreamTrack) => { track.enabled = !muted; }); }
export function setCameraEnabled(stream: NativeStream | null, enabled: boolean) { stream?.getVideoTracks().forEach((track: MediaStreamTrack) => { track.enabled = enabled; }); }
export function switchCamera() { /* Web dùng bộ chọn camera của trình duyệt. */ }
export function setSpeakerEnabled() { /* Web do hệ điều hành/trình duyệt quản lý audio route. */ }
export function stopInCall() { /* Không cần dọn native audio route trên web. */ }
```

## FILE: /home/ubuntu/kini-mobile/plugins/with-kini-incoming-call.js
```javascript
const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
} = require("@expo/config-plugins");

const PERMISSIONS = [
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.MANAGE_OWN_CALLS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
  "android.permission.WAKE_LOCK",
];

function addComponent(application, key, name, extra = {}) {
  const components = application[key] ?? [];
  if (!components.some((component) => component.$?.["android:name"] === name)) {
    components.push({ $: { "android:name": name, ...extra } });
  }
  application[key] = components;
}

function nativeSources(packageName, deepLinkScheme) {
  const packagePath = packageName.replace(/\./g, "/");
  const dir = path.join(packagePath, "kini", "incomingcall");

  const notifier = `package ${packageName}.kini.incomingcall

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner

object KiniCallNotifier {
  const val CHANNEL_ID = "calls"
  const val EXTRA_CALL_ID = "callId"
  const val EXTRA_CALLER_NAME = "callerName"
  const val EXTRA_CALLER_AVATAR = "callerAvatar"
  const val EXTRA_MODE = "mode"
  const val EXTRA_ACTION = "callAction"
  const val ACTION_OPEN = "${packageName}.OPEN_INCOMING_CALL"
  const val ACTION_ANSWER = "answer"
  const val ACTION_DECLINE = "decline"

  private fun ensureChannel(manager: NotificationManager) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "Cuộc gọi KINI", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Cuộc gọi KINI"
        enableVibration(true)
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      })
    }
  }

  /** Chỉ khởi tạo full-screen notification nếu UI KINI không ở foreground hoặc thiết bị đang khóa. */
  fun isAppInForeground(context: Context): Boolean = try {
    ProcessLifecycleOwner.get().lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)
  } catch (_: Exception) {
    false
  }

  fun isDeviceLocked(context: Context): Boolean = try {
    val keyguard = context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    keyguard.isKeyguardLocked
  } catch (_: Exception) {
    true
  }

  fun showIncomingCall(context: Context, callId: String, callerName: String, mode: String, callerAvatar: String = "") {
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannel(notificationManager)
    val contentIntent = activityIntent(context, callId, callerName, mode, callerAvatar, ACTION_OPEN, 101)
    // Đây chỉ là bootstrap im lặng cho Android mở Activity full-screen; tuyệt đối không dùng CallStyle
    // vì CallStyle hiển thị heads-up/banner chồng lên giao diện KINI có nút Nghe/Từ chối riêng.
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setSilent(true)
      .setOnlyAlertOnce(true)
      .setTimeoutAfter(1_500L)
      .setFullScreenIntent(contentIntent, true)
      .build()
    notificationManager.notify(callId.hashCode(), notification)
  }

  fun showMissedCall(context: Context, callId: String, callerName: String, mode: String) {
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannel(notificationManager)
    val modeText = if (mode == "video") "Cuộc gọi video nhỡ" else "Cuộc gọi thoại nhỡ"
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setCategory(NotificationCompat.CATEGORY_MISSED_CALL)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setAutoCancel(true)
      .setContentTitle(modeText)
      .setContentText("$callerName đã gọi cho bạn.")
      .build()
    notificationManager.notify(("missed:" + callId).hashCode(), notification)
  }

  fun cancelIncomingCall(context: Context, callId: String) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(callId.hashCode())
  }

  private fun activityIntent(context: Context, callId: String, callerName: String, mode: String, callerAvatar: String, action: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, KiniIncomingCallActivity::class.java).apply {
      this.action = ACTION_OPEN
      putExtra(EXTRA_CALL_ID, callId)
      putExtra(EXTRA_CALLER_NAME, callerName)
      putExtra(EXTRA_CALLER_AVATAR, callerAvatar)
      putExtra(EXTRA_MODE, mode)
      putExtra(EXTRA_ACTION, action)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    }
    return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
}
`;

  const messagingService = `package ${packageName}.kini.incomingcall

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class KiniFirebaseMessagingService : FirebaseMessagingService() {
  override fun onMessageReceived(message: RemoteMessage) {
    val data = message.data
    if (data["type"] == "call_ended" || data["type"] == "call_cancelled") {
      data["callId"]?.let { callId ->
        KiniCallNotifier.cancelIncomingCall(this, callId)
        KiniIncomingCallActivity.dismissIncomingCall(callId)
      }
      return
    }
    if (data["type"] == "missed_call") {
      val callId = data["callId"] ?: return
      KiniCallNotifier.showMissedCall(this, callId, data["callerName"] ?: "Bạn KINI", data["mode"] ?: "voice")
      return
    }
    if (data["type"] == "incoming_call") {
      val callId = data["callId"] ?: return
      val callerName = data["callerName"] ?: "Bạn KINI"
      val callerAvatar = data["callerAvatar"] ?: ""
      val mode = data["mode"] ?: "voice"
      val shouldUseFullScreen = !KiniCallNotifier.isAppInForeground(this) || KiniCallNotifier.isDeviceLocked(this)
      if (shouldUseFullScreen) {
        KiniCallNotifier.showIncomingCall(this, callId, callerName, mode, callerAvatar)
        KiniTelecomBridge.reportIncomingCall(this, callId, callerName, mode)
      } else {
        // App đang mở: tầng socket/React hiển thị overlay call KINI, không tạo notification hoặc fullScreenIntent.
        KiniIncomingCallActivity.openReactApp(this, callId, KiniCallNotifier.ACTION_OPEN)
      }
      return
    }
    super.onMessageReceived(message)
  }
}
`;

  const connectionService = `package ${packageName}.kini.incomingcall

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Bundle
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.DisconnectCause
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager

object KiniTelecomBridge {
  private const val ACCOUNT_ID = "kini_voip"
  private fun handle(context: Context) = PhoneAccountHandle(ComponentName(context, KiniConnectionService::class.java), ACCOUNT_ID)

  fun reportIncomingCall(context: Context, callId: String, callerName: String, mode: String) {
    try {
      val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
      val account = PhoneAccount.Builder(handle(context), "KINI").setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED).setSupportedUriSchemes(listOf("kini")).build()
      telecom.registerPhoneAccount(account)
      val extras = Bundle().apply {
        putString(KiniCallNotifier.EXTRA_CALL_ID, callId)
        putString(KiniCallNotifier.EXTRA_CALLER_NAME, callerName)
        putString(KiniCallNotifier.EXTRA_MODE, mode)
      }
      telecom.addNewIncomingCall(handle(context), extras)
    } catch (_: SecurityException) {
      // Notification full-screen vẫn hoạt động nếu thiết bị chặn Telecom self-managed.
    } catch (_: UnsupportedOperationException) {
      // Một số ROM hạn chế self-managed ConnectionService; giữ CallStyle fallback.
    }
  }
}

class KiniConnectionService : ConnectionService() {
  override fun onCreateIncomingConnection(phoneAccountHandle: PhoneAccountHandle, request: ConnectionRequest): Connection {
    val extras = request.extras
    return KiniConnection(applicationContext, extras.getString(KiniCallNotifier.EXTRA_CALL_ID) ?: "", extras.getString(KiniCallNotifier.EXTRA_CALLER_NAME) ?: "Bạn KINI").apply {
      connectionProperties = Connection.PROPERTY_SELF_MANAGED
      setAddress(Uri.parse("kini:" + callId), TelecomManager.PRESENTATION_ALLOWED)
      setCallerDisplayName(callerName, TelecomManager.PRESENTATION_ALLOWED)
      setAudioModeIsVoip(true)
      setRinging()
    }
  }
}

private class KiniConnection(private val context: Context, val callId: String, val callerName: String) : Connection() {
  override fun onAnswer() {
    setActive()
    KiniCallNotifier.cancelIncomingCall(context, callId)
    KiniIncomingCallActivity.openReactApp(context, callId, "answer")
  }
  override fun onReject() {
    setDisconnected(DisconnectCause(DisconnectCause.REJECTED))
    destroy()
    KiniCallNotifier.cancelIncomingCall(context, callId)
    KiniIncomingCallActivity.openReactApp(context, callId, "decline")
  }
  override fun onDisconnect() {
    setDisconnected(DisconnectCause(DisconnectCause.LOCAL))
    destroy()
    KiniCallNotifier.cancelIncomingCall(context, callId)
  }
}
`;

  const incomingActivity = `package ${packageName}.kini.incomingcall

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewOutlineProvider
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import java.net.HttpURLConnection
import java.net.URL
import java.lang.ref.WeakReference

class KiniIncomingCallActivity : Activity() {
  private var callId = ""

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setShowWhenLocked(true)
    setTurnScreenOn(true)
    window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    render(intent)
  }

  override fun onResume() {
    super.onResume()
    activeActivity = WeakReference(this)
    // Activity đã hiện: hủy lại bootstrap để notification không còn trong shade/status bar.
    if (!isFinishing && callId.isNotBlank()) KiniCallNotifier.cancelIncomingCall(this, callId)
  }

  override fun onDestroy() {
    if (activeActivity?.get() === this) activeActivity = null
    super.onDestroy()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    render(intent)
  }

  private fun render(intent: Intent) {
    callId = intent.getStringExtra(KiniCallNotifier.EXTRA_CALL_ID) ?: ""
    val callerName = intent.getStringExtra(KiniCallNotifier.EXTRA_CALLER_NAME) ?: "Bạn KINI"
    val callerAvatar = intent.getStringExtra(KiniCallNotifier.EXTRA_CALLER_AVATAR) ?: ""
    val mode = intent.getStringExtra(KiniCallNotifier.EXTRA_MODE) ?: "voice"
    val action = intent.getStringExtra(KiniCallNotifier.EXTRA_ACTION) ?: KiniCallNotifier.ACTION_OPEN
    if (action == KiniCallNotifier.ACTION_ANSWER || action == KiniCallNotifier.ACTION_DECLINE) {
      KiniCallNotifier.cancelIncomingCall(this, callId)
      openReactApp(this, callId, action)
      finish()
      return
    }
    // Full-screen UI đã xuất hiện: giữ màn gọi KINI, không để CallStyle nằm lại trên thanh thông báo.
    KiniCallNotifier.cancelIncomingCall(this, callId)
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dp(24), dp(36), dp(24), dp(28))
      setBackgroundColor(Color.rgb(13, 39, 69))
    }
    root.addView(TextView(this).apply {
      text = "Kết nối riêng tư KINI"
      textSize = 12f
      setTextColor(Color.rgb(215, 233, 250))
      gravity = Gravity.CENTER
      setPadding(dp(14), dp(8), dp(14), dp(8))
      background = rounded(Color.argb(28, 255, 255, 255), dp(18))
    })
    val spacerTop = View(this)
    root.addView(spacerTop, LinearLayout.LayoutParams(1, 0, 1.25f))
    val avatarRing = FrameLayout(this).apply {
      background = rounded(Color.argb(34, 255, 255, 255), dp(68), Color.argb(84, 255, 255, 255), dp(1))
      setPadding(dp(7), dp(7), dp(7), dp(7))
    }
    val initial = callerName.split(Regex("\\\\s+")).filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1) }.uppercase().ifBlank { "K" }
    avatarRing.addView(TextView(this).apply {
      text = initial
      textSize = 34f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      background = rounded(Color.rgb(83, 47, 150), dp(58))
    }, FrameLayout.LayoutParams(dp(116), dp(116)))
    val avatar = ImageView(this).apply {
      scaleType = ImageView.ScaleType.CENTER_CROP
      background = rounded(Color.TRANSPARENT, dp(58))
      clipToOutline = true
      outlineProvider = ViewOutlineProvider.BACKGROUND
      contentDescription = "Ảnh đại diện của $callerName"
    }
    avatarRing.addView(avatar, FrameLayout.LayoutParams(dp(116), dp(116)))
    root.addView(avatarRing, LinearLayout.LayoutParams(dp(130), dp(130)))
    if (callerAvatar.startsWith("https://")) loadAvatar(avatar, callerAvatar)
    root.addView(TextView(this).apply {
      text = callerName
      textSize = 28f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      setTypeface(typeface, android.graphics.Typeface.BOLD)
      setPadding(0, dp(24), 0, 0)
      maxLines = 1
    }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    root.addView(TextView(this).apply {
      text = if (mode == "video") "Cuộc gọi video đến" else "Cuộc gọi thoại đến"
      textSize = 16f
      setTextColor(Color.rgb(206, 225, 243))
      gravity = Gravity.CENTER
      setPadding(0, dp(9), 0, 0)
    }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    val spacerBottom = View(this)
    root.addView(spacerBottom, LinearLayout.LayoutParams(1, 0, 0.9f))
    root.addView(TextView(this).apply {
      text = "Chạm để trả lời hoặc từ chối"
      textSize = 13f
      setTextColor(Color.rgb(191, 213, 233))
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(18))
    })
    val actions = LinearLayout(this).apply { gravity = Gravity.CENTER; orientation = LinearLayout.HORIZONTAL }
    actions.addView(actionButton("✕", "Từ chối", Color.rgb(239, 91, 99)) { answer(false) }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { marginEnd = dp(18) })
    actions.addView(actionButton("☎", "Nhận cuộc gọi", Color.rgb(22, 119, 255)) { answer(true) }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(18) })
    root.addView(actions, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    setContentView(root)
  }

  private fun answer(accept: Boolean) {
    KiniCallNotifier.cancelIncomingCall(this, callId)
    openReactApp(this, callId, if (accept) "answer" else "decline")
    finish()
  }

  private fun actionButton(icon: String, label: String, color: Int, onTap: () -> Unit) = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    gravity = Gravity.CENTER
    isClickable = true
    isFocusable = true
    contentDescription = label
    val button = TextView(this@KiniIncomingCallActivity).apply {
      text = icon
      textSize = 29f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      background = rounded(color, dp(30), Color.argb(115, 255, 255, 255), dp(1))
    }
    addView(button, LinearLayout.LayoutParams(dp(60), dp(60)))
    addView(TextView(this@KiniIncomingCallActivity).apply {
      text = label
      textSize = 12f
      setTextColor(Color.WHITE)
      setTypeface(typeface, android.graphics.Typeface.BOLD)
      gravity = Gravity.CENTER
      setPadding(0, dp(8), 0, 0)
      maxLines = 1
    }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
    setOnClickListener { onTap() }
  }

  private fun loadAvatar(target: ImageView, url: String) {
    Thread {
      try {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 5000
        connection.readTimeout = 5000
        connection.instanceFollowRedirects = true
        val bitmap = connection.inputStream.use { BitmapFactory.decodeStream(it) }
        connection.disconnect()
        if (bitmap != null) target.post { if (!isFinishing) target.setImageBitmap(bitmap) }
      } catch (_: Exception) {
        // Giữ initials nếu ảnh đại diện chưa tải được hoặc URL không còn hiệu lực.
      }
    }.start()
  }

  private fun rounded(color: Int, radius: Int, strokeColor: Int? = null, strokeWidth: Int = 0) = GradientDrawable().apply {
    shape = GradientDrawable.RECTANGLE
    cornerRadius = radius.toFloat()
    setColor(color)
    if (strokeColor != null && strokeWidth > 0) setStroke(strokeWidth, strokeColor)
  }

  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

  companion object {
    private var activeActivity: WeakReference<KiniIncomingCallActivity>? = null

    fun dismissIncomingCall(callId: String) {
      val activity = activeActivity?.get() ?: return
      if (activity.callId == callId) activity.runOnUiThread { activity.finish() }
    }

    fun openReactApp(context: Context, callId: String, action: String) {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
      launch.data = Uri.parse("${deepLinkScheme}://incoming-call?callId=" + Uri.encode(callId) + "&action=" + action)
      launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      context.startActivity(launch)
    }
  }
}
`;

  return [
    [path.join(dir, "KiniCallNotifier.kt"), notifier],
    [path.join(dir, "KiniFirebaseMessagingService.kt"), messagingService],
    [path.join(dir, "KiniConnectionService.kt"), connectionService],
    [path.join(dir, "KiniIncomingCallActivity.kt"), incomingActivity],
  ];
}

module.exports = function withKiniIncomingCall(config) {
  const packageName = config.android?.package;
  if (!packageName) throw new Error("KINI incoming call cần android.package.");
  const deepLinkScheme = Array.isArray(config.scheme) ? config.scheme[0] : config.scheme;
  if (!deepLinkScheme) throw new Error("KINI incoming call cần Expo scheme.");

  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const permissions = manifest["uses-permission"] ?? [];
    const existingPermissions = new Set(permissions.map((item) => item.$?.["android:name"]));
    for (const permission of PERMISSIONS) if (!existingPermissions.has(permission)) permissions.push({ $: { "android:name": permission } });
    manifest["uses-permission"] = permissions;

    const application = manifest.application?.[0];
    if (!application) throw new Error("Không tìm thấy application Android cho KINI incoming call.");
    const namespace = `${packageName}.kini.incomingcall`;
    addComponent(application, "service", `${namespace}.KiniFirebaseMessagingService`, { "android:exported": "false" });
    const firebaseService = application.service.find((service) => service.$?.["android:name"] === `${namespace}.KiniFirebaseMessagingService`);
    firebaseService["intent-filter"] = firebaseService["intent-filter"] ?? [{ action: [{ $: { "android:name": "com.google.firebase.MESSAGING_EVENT" } }] }];
    addComponent(application, "service", `${namespace}.KiniConnectionService`, { "android:permission": "android.permission.BIND_TELECOM_CONNECTION_SERVICE", "android:exported": "true" });
    const connectionService = application.service.find((service) => service.$?.["android:name"] === `${namespace}.KiniConnectionService`);
    connectionService["intent-filter"] = connectionService["intent-filter"] ?? [{ action: [{ $: { "android:name": "android.telecom.ConnectionService" } }] }];
    addComponent(application, "activity", `${namespace}.KiniIncomingCallActivity`, { "android:exported": "false", "android:showWhenLocked": "true", "android:turnScreenOn": "true", "android:excludeFromRecents": "true" });
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;
    if (!contents.includes("firebase-messaging")) {
      contents = contents.replace(/dependencies\s*\{/, "dependencies {\n    implementation(\"com.google.firebase:firebase-messaging:24.1.2\")\n    implementation(\"androidx.core:core-ktx:1.13.1\")");
    }
    if (!contents.includes("lifecycle-process")) {
      contents = contents.replace(/dependencies\s*\{/, "dependencies {\n    implementation(\"androidx.lifecycle:lifecycle-process:2.8.4\")");
    }
    mod.modResults.contents = contents;
    return mod;
  });

  return withDangerousMod(config, ["android", async (mod) => {
    const sourceRoot = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "java");
    for (const [relativePath, contents] of nativeSources(packageName, deepLinkScheme)) {
      const target = path.join(sourceRoot, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, contents);
    }
    return mod;
  }]);
};
```

## FILE: /home/ubuntu/kini-mobile/plugins/with-kini-webrtc-screen-share.js
```javascript
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
```

## FILE: /home/ubuntu/kini-mobile/server/_core/index.ts
```ts
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { storagePresignPut, storagePut } from "../storage";
import { appRouter } from "../routers";
import * as db from "../db";
import { sdk } from "./sdk";
import crypto from "node:crypto";
import { createContext } from "./context";
import { getSigningPayloadFromGithubToken } from "../github-build-signing";
import { registerCallSignaling } from "../signaling/index";
import { getUserIceServers } from "../turn";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  registerCallSignaling(server);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "80mb" }));
  app.use(express.urlencoded({ limit: "80mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  async function authenticateKiniApi(req: express.Request, res: express.Response) {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Bạn cần đăng nhập để dùng Tìm Quanh Đây." });
        return null;
      }
      return user;
    } catch {
      res.status(401).json({ error: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại." });
      return null;
    }
  }

  app.get("/api/profile/me", async (req, res) => {
    const user = await authenticateKiniApi(req, res);
    if (!user) return;
    try {
      res.json(await db.getNearbyProfile(user.id, user.name));
    } catch (error) {
      res.status(503).json({ error: error instanceof Error ? error.message : "Không thể tải hồ sơ Tìm Quanh Đây." });
    }
  });

  app.post("/api/profile/save", async (req, res) => {
    const user = await authenticateKiniApi(req, res);
    if (!user) return;
    const allowedGender = ["male", "female", "other", "prefer_not"] as const;
    const allowedStatus = ["single", "dating", "married", "complicated", "prefer_not"] as const;
    const gender = allowedGender.includes(req.body?.gender) ? req.body.gender : null;
    const status = allowedStatus.includes(req.body?.status) ? req.body.status : null;
    const birthYear = req.body?.birthYear === null || req.body?.birthYear === undefined || req.body?.birthYear === "" ? null : Number(req.body.birthYear);
    if (birthYear !== null && (!Number.isInteger(birthYear))) {
      res.status(400).json({ error: "Năm sinh không hợp lệ." });
      return;
    }
    try {
      res.json(await db.saveNearbyProfile(user.id, user.name, { gender, status, birthYear, province: typeof req.body?.province === "string" ? req.body.province : null, bio: typeof req.body?.bio === "string" ? req.body.bio : null, job: typeof req.body?.job === "string" ? req.body.job : null }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể lưu hồ sơ." });
    }
  });

  app.post("/api/location/update", async (req, res) => {
    const user = await authenticateKiniApi(req, res);
    if (!user) return;
    try {
      res.json(await db.updateNearbyLocation(user.id, user.name, Number(req.body?.lat), Number(req.body?.lng)));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể cập nhật vị trí." });
    }
  });

  app.post("/api/discovery/toggle", async (req, res) => {
    const user = await authenticateKiniApi(req, res);
    if (!user) return;
    const duration = ["24h", "7d", "permanent"].includes(req.body?.duration) ? req.body.duration as "24h" | "7d" | "permanent" : undefined;
    if (typeof req.body?.is_discoverable !== "boolean") {
      res.status(400).json({ error: "Trạng thái hiển thị không hợp lệ." });
      return;
    }
    try {
      res.json(await db.toggleNearbyDiscovery(user.id, user.name, req.body.is_discoverable, duration));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể cập nhật quyền riêng tư." });
    }
  });

  app.get("/api/users/nearby", async (req, res) => {
    const user = await authenticateKiniApi(req, res);
    if (!user) return;
    const gender = ["male", "female", "other", "prefer_not"].includes(String(req.query.gender)) ? String(req.query.gender) as db.NearbyGender : undefined;
    const status = ["single", "dating", "married", "complicated", "prefer_not"].includes(String(req.query.status)) ? String(req.query.status) as db.NearbyStatus : undefined;
    try {
      res.json(await db.listNearbyUsers(user.id, {
        lat: Number(req.query.lat), lng: Number(req.query.lng), radius: Number(req.query.radius ?? 50), gender, status,
        province: typeof req.query.province === "string" ? req.query.province : undefined,
        ageFrom: req.query.age_from ? Number(req.query.age_from) : undefined,
        ageTo: req.query.age_to ? Number(req.query.age_to) : undefined,
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        sort: req.query.sort === "far" ? "far" : "near",
        page: req.query.page ? Number(req.query.page) : 1,
      }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể tìm người quanh đây." });
    }
  });

  app.get("/api/call/ice", async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại trước khi gọi." });
      return;
    }
    if (!user) {
      res.status(401).json({ error: "Bạn cần đăng nhập để thực hiện cuộc gọi." });
      return;
    }
    try {
      const iceServers = await getUserIceServers(user.id);
      res.setHeader("Cache-Control", "no-store");
      res.json({ iceServers });
    } catch (error) {
      console.warn("[CallIce]", error instanceof Error ? error.message : error);
      res.status(503).json({ error: "Không thể chuẩn bị đường truyền cuộc gọi. Hãy thử lại sau." });
    }
  });

  app.post("/api/media/presign", async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch (error) {
      console.warn("[MediaPresign] authentication failed:", error instanceof Error ? error.message : error);
      res.status(401).json({ error: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại trước khi tải media." });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "Bạn cần đăng nhập để tải media." });
      return;
    }

    const rawName = typeof req.body?.name === "string" ? req.body.name : "media";
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "media";
    const type = typeof req.body?.contentType === "string"
      ? req.body.contentType.split(";", 1)[0].slice(0, 120)
      : "application/octet-stream";
    const declaredSize = Number(req.body?.size);
    const isImage = type.startsWith("image/");
    const isVideo = type.startsWith("video/");
    const maxBytes = isImage ? 10 * 1024 * 1024 : isVideo ? 4 * 1024 * 1024 * 1024 : 2 * 1024 * 1024 * 1024;
    const limitLabel = isImage ? "10 MB" : isVideo ? "4 GB" : "2 GB";
    if (!Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > maxBytes) {
      res.status(400).json({ error: `Kích thước ${isImage ? "ảnh" : isVideo ? "video" : "tệp"} không hợp lệ hoặc vượt quá giới hạn ${limitLabel}.` });
      return;
    }

    try {
      const key = `kini/${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const presigned = await storagePresignPut(key);
      res.setHeader("Cache-Control", "no-store");
      res.json({
        url: presigned.url,
        uploadUrl: presigned.uploadUrl,
        name: safeName,
        contentType: type || "application/octet-stream",
        size: declaredSize,
      });
    } catch (error) {
      console.error("[MediaPresign] storage failed:", error instanceof Error ? error.message : error);
      res.status(502).json({ error: "Không thể chuẩn bị kho lưu media. Vui lòng thử lại sau." });
    }
  });

  app.post("/api/media/upload", express.raw({ type: "application/octet-stream", limit: "70mb" }), async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch (error) {
      console.warn("[MediaUpload] authentication failed:", error instanceof Error ? error.message : error);
      res.status(401).json({ error: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại trước khi tải media." });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "Bạn cần đăng nhập để tải media." });
      return;
    }

    try {
      const binaryBody = Buffer.isBuffer(req.body) ? req.body : null;
      const legacyBody = binaryBody ? null : req.body as { data?: string; name?: string; contentType?: string; size?: number | null };
      const data = binaryBody ?? (typeof legacyBody?.data === "string" ? Buffer.from(legacyBody.data, "base64") : null);
      if (!data || data.length === 0 || data.length > 70_000_000) {
        res.status(400).json({ error: "Dữ liệu media không hợp lệ hoặc vượt quá giới hạn." });
        return;
      }
      const safeName = String(req.header("x-kini-file-name") || legacyBody?.name || "media").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
      const type = String(req.header("x-kini-file-type") || legacyBody?.contentType || "application/octet-stream").split(";")[0].slice(0, 120);
      const declaredSize = Number(req.header("x-kini-file-size") || legacyBody?.size || data.length);
      const key = `kini/${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const uploaded = await storagePut(key, data, type);
      res.json({ url: uploaded.url, name: safeName, contentType: type, size: Number.isFinite(declaredSize) ? declaredSize : null });
    } catch (error) {
      console.error("[MediaUpload] failed:", error);
      res.status(500).json({ error: "Không thể tải media lên máy chủ." });
    }
  });

  // Chỉ workflow build KINI trên GitHub Actions được xác thực OIDC mới nhận khóa ký APK; không dùng GitHub Secret hay mã nguồn.
  app.post("/api/build/android-signing", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : req.header("x-kini-github-oidc") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      res.status(401).json({ error: "Thiếu token xác thực GitHub Actions." });
      return;
    }
    try {
      const payload = await getSigningPayloadFromGithubToken(token);
      res.setHeader("Cache-Control", "no-store");
      res.json(payload);
    } catch (error) {
      console.error("[AndroidSigning] authorization failed:", error instanceof Error ? error.message : error);
      res.status(403).json({ error: "Workflow build không được phép nhận khóa ký." });
    }
  });

  app.get("/api/health", async (_req, res) => {
    const database = await db.isDatabaseReady();
    res.status(database ? 200 : 503).json({ ok: database, database, timestamp: Date.now() });
  });

  // Feed công khai cho ứng dụng kiểm tra bản Android mới mà không nhúng token GitHub vào APK.
  app.get("/api/update/latest", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      releaseCode: "v1.31",
      appVersion: "1.8.34",
      buildNumber: 34,
      notes: "Bản incoming call foreground-aware: khi KINI foreground, cuộc gọi đến đi thẳng overlay trong app, không dùng fullScreenIntent. Khi app ở nền hoặc màn hình khóa, FCM data-only tạo notification bootstrap im lặng với full-screen intent và IncomingCallActivity KINI.",
      releaseUrl: "https://github.com/haitruongproqt1-a11y/KINI/releases/tag/v1.31",
      apkUrl: "https://github.com/haitruongproqt1-a11y/KINI/releases/download/v1.31/KINI-Release-v1.31.apk",
    });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
```

## FILE: /home/ubuntu/kini-mobile/server/push.ts
```ts
import { eq, inArray } from "drizzle-orm";
import { importPKCS8, SignJWT } from "jose";

import { pushDevices } from "../drizzle/schema";
import { getDb } from "./db";

type PushPayload = { recipientUserIds: number[]; title: string; body: string; conversationId: number };
type IncomingCallPayload = { recipientUserId: number; callerName: string; callerAvatar?: string | null; conversationId: number; callId: string; mode: "voice" | "video" };
type EndedCallPayload = { recipientUserId: number; callId: string };
type MissedCallPayload = { recipientUserId: number; callerName: string; conversationId: number; callId: string; mode: "voice" | "video" };
type FirebaseServiceAccount = { project_id: string; client_email: string; private_key: string; token_uri?: string };
type GenericNotification = { title: string; body: string; channelId: "messages" | "calls"; data: Record<string, string> };

let fcmAccessTokenCache: { token: string; expiresAt: number } | null = null;
const kiniPublicUrl = "https://kinimobile-cr7qe9vh.manus.space";

export const isExpoPushToken = (token: string) => /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token);
export const isFcmPushToken = (token: string) => !isExpoPushToken(token) && /^[A-Za-z0-9_:\-]{32,512}$/.test(token);

function readFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const credentials = JSON.parse(raw) as Partial<FirebaseServiceAccount>;
    if (!credentials.project_id || !credentials.client_email || !credentials.private_key) return null;
    return credentials as FirebaseServiceAccount;
  } catch {
    console.warn("[Push] Firebase service account JSON không hợp lệ.");
    return null;
  }
}

async function getFcmAccessToken() {
  if (fcmAccessTokenCache && fcmAccessTokenCache.expiresAt > Date.now() + 60_000) return fcmAccessTokenCache.token;
  const credentials = readFirebaseServiceAccount();
  if (!credentials) return null;
  try {
    const now = Math.floor(Date.now() / 1000);
    const key = await importPKCS8(credentials.private_key, "RS256");
    const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(credentials.client_email)
      .setSubject(credentials.client_email)
      .setAudience(credentials.token_uri ?? "https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3_500)
      .sign(key);
    const response = await fetch(credentials.token_uri ?? "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    });
    if (!response.ok) {
      console.warn("[Push] Firebase OAuth không trả access token.");
      return null;
    }
    const responseJson = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!responseJson.access_token) return null;
    fcmAccessTokenCache = { token: responseJson.access_token, expiresAt: Date.now() + Math.max(60, responseJson.expires_in ?? 3_500) * 1_000 };
    return fcmAccessTokenCache.token;
  } catch {
    console.warn("[Push] Không thể ký yêu cầu Firebase OAuth.");
    return null;
  }
}

async function sendFcmPushNotification(token: string, notification: GenericNotification) {
  const credentials = readFirebaseServiceAccount();
  const accessToken = await getFcmAccessToken();
  if (!credentials || !accessToken) return false;
  try {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(credentials.project_id)}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          data: notification.data,
          ...(notification.channelId === "messages" ? {
            notification: { title: notification.title, body: notification.body.slice(0, 160) },
          } : {}),
          android: {
            priority: "HIGH",
            ...(notification.channelId === "messages" ? {
              notification: {
                channel_id: notification.channelId,
                sound: "default",
                default_sound: true,
                default_vibrate_timings: true,
                notification_priority: "PRIORITY_MAX",
                visibility: "PRIVATE",
              },
            } : {}),
          },
        },
      }),
    });
    if (!response.ok) console.warn("[Push] FCM từ chối một notification Android.");
    return response.ok;
  } catch {
    console.warn("[Push] Không thể gửi FCM notification Android.");
    return false;
  }
}

async function sendExpoPushNotifications(tokens: string[], notification: GenericNotification) {
  if (!tokens.length) return 0;
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(tokens.map((to) => ({ to, sound: "default", title: notification.title, body: notification.body.slice(0, 160), priority: "high", channelId: notification.channelId, categoryId: notification.data.type === "incoming_call" ? "incoming_call" : undefined, data: notification.data }))),
    });
    if (!response.ok) console.warn("[Push] Expo gateway không nhận notification.");
    return response.ok ? tokens.length : 0;
  } catch {
    console.warn("[Push] Không thể gửi Expo notification.");
    return 0;
  }
}

async function sendToDevices(devices: Array<{ expoPushToken: string }>, notification: GenericNotification) {
  const expoTokens = devices.map((device) => device.expoPushToken).filter(isExpoPushToken);
  const fcmTokens = devices.map((device) => device.expoPushToken).filter(isFcmPushToken);
  const expoDelivered = await sendExpoPushNotifications(expoTokens, notification);
  const fcmDelivered = await Promise.all(fcmTokens.map((token) => sendFcmPushNotification(token, notification)));
  return expoDelivered + fcmDelivered.filter(Boolean).length;
}

export async function sendMessagePushNotification(payload: PushPayload) {
  if (!payload.recipientUserIds.length) return { delivered: 0 };
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(inArray(pushDevices.userId, payload.recipientUserIds));
  const delivered = await sendToDevices(devices, { title: payload.title, body: payload.body, channelId: "messages", data: { type: "chat_message", conversationId: String(payload.conversationId) } });
  return { delivered };
}

/** Gửi notification nền khi KINI không có socket đang kết nối hoặc đã bị Android đóng. */
export async function sendIncomingCallPush(payload: IncomingCallPayload) {
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(eq(pushDevices.userId, payload.recipientUserId));
  // Chỉ token FCM native nhận data-only: activity incoming-call tự mở, không tạo banner notification.
  const fcmTokens = devices.map((device) => device.expoPushToken).filter(isFcmPushToken);
  const delivered = await Promise.all(fcmTokens.map((token) => sendFcmPushNotification(token, {
    title: `Cuộc gọi ${payload.mode === "video" ? "video" : "thoại"} KINI`,
    body: `${payload.callerName} đang gọi cho bạn.`,
    channelId: "calls",
    data: {
      type: "incoming_call",
      conversationId: String(payload.conversationId),
      callId: payload.callId,
      mode: payload.mode,
      callerName: payload.callerName,
      callerAvatar: payload.callerAvatar?.startsWith("/") ? `${kiniPublicUrl}${payload.callerAvatar}` : (payload.callerAvatar ?? ""),
    },
  })));
  return { delivered: delivered.filter(Boolean).length };
}

/** Báo gọi nhỡ riêng biệt; native FCM chỉ hiển thị notification này khi người nhận đã không trả lời. */
export async function sendMissedCallPush(payload: MissedCallPayload) {
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(eq(pushDevices.userId, payload.recipientUserId));
  const delivered = await sendToDevices(devices, {
    title: "Cuộc gọi nhỡ",
    body: `${payload.callerName} đã gọi cho bạn.`,
    channelId: "calls",
    data: { type: "missed_call", conversationId: String(payload.conversationId), callId: payload.callId, mode: payload.mode, callerName: payload.callerName },
  });
  return { delivered };
}

/** Chỉ gửi data-only đến native FCM token để đóng CallStyle/full-screen cũ, không tạo thông báo mới. */
export async function sendCallEndedPush(payload: EndedCallPayload) {
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(eq(pushDevices.userId, payload.recipientUserId));
  const fcmTokens = devices.map((device) => device.expoPushToken).filter(isFcmPushToken);
  const delivered = await Promise.all(fcmTokens.map((token) => sendFcmPushNotification(token, {
    title: "",
    body: "",
    channelId: "calls",
    data: { type: "call_ended", callId: payload.callId },
  })));
  return { delivered: delivered.filter(Boolean).length };
}
```

## FILE: /home/ubuntu/kini-mobile/server/routers.ts
```ts
import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { isKiniUsernameValid } from "../shared/kini-chat";
import { isSecurityQuestionId, securityQuestions } from "../shared/security-questions";
import { sendMessagePushNotification } from "./push";

const usernameSchema = z.string().trim().min(3, "Tên người dùng cần ít nhất 3 ký tự.").max(64).refine(isKiniUsernameValid, "Tên người dùng chỉ gồm chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang.");
const messageKindSchema = z.enum(["text", "image", "album", "video", "file", "sticker"]);
const passwordSchema = z.string().min(8, "Mật khẩu cần có ít nhất 8 ký tự.").max(128);

async function createKiniSession(user: { id: number; openId: string; name: string | null; email: string | null; loginMethod: string | null; lastSignedIn: Date }, device: { deviceName?: string; platform?: string } = {}) {
  const session = await db.createUserSession(user.id, {
    deviceName: device.deviceName?.trim() || "Thiết bị KINI",
    platform: device.platform?.trim() || "unknown",
  });
  return {
    sessionToken: await sdk.createSessionToken(user.openId, { name: user.name ?? "Thành viên KINI", sessionId: session.id }),
    user: { id: user.id, openId: user.openId, name: user.name, email: user.email, loginMethod: user.loginMethod, lastSignedIn: user.lastSignedIn },
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    securityQuestions: publicProcedure.query(() => securityQuestions),
    register: publicProcedure.input(z.object({
      username: usernameSchema,
      password: passwordSchema,
      displayName: z.string().trim().min(1, "Tên tài khoản là bắt buộc.").max(128),
      securityQuestion: z.string().refine(isSecurityQuestionId, "Câu hỏi bảo mật không hợp lệ."),
      securityAnswer: z.string().trim().min(2, "Câu trả lời cần ít nhất 2 ký tự.").max(255),
      deviceName: z.string().trim().max(128).optional(),
      platform: z.string().trim().max(24).optional(),
    })).mutation(async ({ input }) => createKiniSession(await db.createKiniPasswordAccount(input), input)),
    login: publicProcedure.input(z.object({ username: usernameSchema, password: passwordSchema, deviceName: z.string().trim().max(128).optional(), platform: z.string().trim().max(24).optional() })).mutation(async ({ input }) => {
      const user = await db.authenticateKiniPassword(input.username, input.password);
      if (!user) throw new Error("Tên đăng nhập hoặc mật khẩu chưa đúng.");
      return createKiniSession(user, input);
    }),
    recoveryQuestion: publicProcedure.input(z.object({ username: usernameSchema })).query(({ input }) => db.getKiniRecoveryQuestion(input.username)),
    resetPassword: publicProcedure.input(z.object({ username: usernameSchema, answer: z.string().trim().min(2).max(255), nextPassword: passwordSchema })).mutation(async ({ input }) => {
      const success = await db.resetKiniPassword(input);
      if (!success) throw new Error("Câu trả lời bảo mật chưa đúng.");
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const sessionId = (ctx.user as (typeof ctx.user & { sessionId?: string }) | null)?.sessionId;
      if (ctx.user && sessionId) await db.revokeUserSession(ctx.user.id, sessionId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  sessions: router({
    list: protectedProcedure.query(({ ctx }) => db.listUserSessions(ctx.user.id)),
    revoke: protectedProcedure.input(z.object({ sessionId: z.string().uuid() })).mutation(({ ctx, input }) => db.revokeUserSession(ctx.user.id, input.sessionId)),
    identifyCurrent: protectedProcedure.input(z.object({ deviceName: z.string().trim().min(1).max(128), platform: z.enum(["android", "ios", "web"]) })).mutation(({ ctx, input }) => {
      const sessionId = (ctx.user as typeof ctx.user & { sessionId?: string }).sessionId;
      if (!sessionId) throw new Error("Không xác định được phiên đăng nhập hiện tại.");
      return db.updateActiveUserSessionDevice(ctx.user.id, sessionId, input);
    }),
  }),
  profile: router({
    me: protectedProcedure.query(({ ctx }) => db.getOrCreateProfile(ctx.user.id, ctx.user.name)),
    update: protectedProcedure.input(z.object({
      username: usernameSchema,
      displayName: z.string().trim().min(1).max(128),
      avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      avatarUrl: z.union([z.string().url().max(1024), z.null()]).optional(),
      securityQuestion: z.string().trim().max(255).optional(),
      securityAnswerHash: z.string().max(255).optional(),
    })).mutation(({ ctx, input }) => db.updateProfile(ctx.user.id, input)),
    updateSecurity: protectedProcedure.input(z.object({
      securityQuestion: z.string().refine(isSecurityQuestionId, "Câu hỏi bảo mật không hợp lệ."),
      securityAnswer: z.string().trim().min(2, "Câu trả lời cần ít nhất 2 ký tự.").max(255),
    })).mutation(({ ctx, input }) => db.updateSecurityQuestion(ctx.user.id, input)),
  }),
  friends: router({
    search: protectedProcedure.input(z.object({ query: z.string().trim().max(64) })).query(({ ctx, input }) => db.searchProfiles(ctx.user.id, input.query)),
    list: protectedProcedure.query(({ ctx }) => db.listFriends(ctx.user.id)),
    requests: protectedProcedure.query(({ ctx }) => db.listFriendRequests(ctx.user.id)),
    send: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ ctx, input }) => db.sendFriendRequest(ctx.user.id, input.userId)),
    respond: protectedProcedure.input(z.object({ fromUserId: z.number().int().positive(), accept: z.boolean() })).mutation(({ ctx, input }) => db.respondToFriendRequest(ctx.user.id, input.fromUserId, input.accept)),
  }),
  chat: router({
    list: protectedProcedure.input(z.object({ filter: z.enum(["all", "unread", "direct", "group"]).default("all") })).query(({ ctx, input }) => db.listConversations(ctx.user.id, input.filter)),
    openDirect: protectedProcedure.input(z.object({ friendUserId: z.number().int().positive() })).mutation(({ ctx, input }) => db.getOrCreateDirectConversation(ctx.user.id, input.friendUserId)),
    presence: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ ctx, input }) => db.getDirectConversationPresence(ctx.user.id, input.conversationId)),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ ctx, input }) => db.getConversationMessages(ctx.user.id, input.conversationId)),
    send: protectedProcedure.input(z.object({
      conversationId: z.number().int().positive(),
      kind: messageKindSchema,
      content: z.string().trim().min(1).max(4000),
      attachmentUrl: z.string().max(1024).optional(),
      attachmentUrls: z.string().max(20000).optional(),
      attachmentName: z.string().max(255).optional(),
      replyToMessageId: z.number().int().positive().optional(),
      clientMessageId: z.string().uuid().optional(),
    })).mutation(async ({ ctx, input }) => {
      const result = await db.sendMessage(ctx.user.id, input);
      const profile = await db.getOrCreateProfile(ctx.user.id, ctx.user.name);
      void sendMessagePushNotification({ recipientUserIds: result.recipientUserIds, title: profile.displayName, body: input.kind === "text" ? input.content : `Đã gửi ${input.kind === "sticker" ? "một sticker" : "tệp đính kèm"}`, conversationId: input.conversationId });
      return result;
    }),
    delete: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteConversationPermanently(ctx.user.id, input.conversationId)),
    markRead: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.markConversationRead(ctx.user.id, input.conversationId)),
    search: protectedProcedure.input(z.object({ query: z.string().trim().max(255) })).query(({ ctx, input }) => db.searchMessages(ctx.user.id, input.query)),
  }),
  ai: router({
    list: protectedProcedure.query(({ ctx }) => db.listAiConversations(ctx.user.id)),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ ctx, input }) => db.getAiMessages(ctx.user.id, input.conversationId)),
    create: protectedProcedure.input(z.object({ title: z.string().trim().max(120).optional() })).mutation(({ ctx, input }) => db.createAiConversation(ctx.user.id, input.title ?? "Cuộc trò chuyện mới")),
    delete: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteAiConversation(ctx.user.id, input.conversationId)),
    send: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), content: z.string().trim().min(1).max(4000) })).mutation(async ({ ctx, input }) => {
      await db.appendAiMessage(ctx.user.id, input.conversationId, "user", input.content);
      const history = await db.getAiMessages(ctx.user.id, input.conversationId);
      const result = await invokeLLM({
        model: "gpt-5-mini",
        maxTokens: 900,
        messages: [
          { role: "system", content: "Bạn là Trợ lý AI của KINI. Trả lời bằng tiếng Việt rõ ràng, chính xác, hữu ích và ngắn gọn. Nếu thông tin phụ thuộc thời điểm, hãy nêu rõ giới hạn kiến thức thay vì bịa đặt. Không yêu cầu hoặc lưu mật khẩu, mã OTP hay dữ liệu nhạy cảm." },
          ...history.slice(-16).map((message) => ({ role: message.role, content: message.content })),
        ],
      });
      const text = typeof result.choices[0]?.message.content === "string" ? result.choices[0].message.content.trim() : "";
      if (!text) throw new Error("Trợ lý AI chưa thể tạo phản hồi. Vui lòng thử lại.");
      return db.appendAiMessage(ctx.user.id, input.conversationId, "assistant", text.slice(0, 12_000));
    }),
  }),
  calls: router({
    list: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ ctx, input }) => db.listCallSessions(ctx.user.id, input.conversationId)),
  }),
  notifications: router({
    summary: protectedProcedure.query(({ ctx }) => db.getNotificationSummary(ctx.user.id)),
  }),
  push: router({
    register: protectedProcedure.input(z.object({ expoPushToken: z.string().min(32).max(512).regex(/^(?:(?:Expo|Exponent)PushToken\[[^\]]+\]|[A-Za-z0-9_:\-]+)$/, "Token thiết bị không hợp lệ."), platform: z.enum(["ios", "android"]) })).mutation(({ ctx, input }) => db.registerPushDevice(ctx.user.id, input.expoPushToken, input.platform)),
    unregister: protectedProcedure.input(z.object({ expoPushToken: z.string().min(1) })).mutation(({ ctx, input }) => db.removePushDevice(ctx.user.id, input.expoPushToken)),
  }),
});

export type AppRouter = typeof appRouter;
```

## FILE: /home/ubuntu/kini-mobile/server/signaling/index.ts
```ts
import type { Server as HttpServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import * as db from "../db";
import { sdk } from "../_core/sdk";
import { sendCallEndedPush, sendIncomingCallPush, sendMissedCallPush } from "../push";

type SignalPayload = {
  callId?: unknown;
  conversationId?: unknown;
  mode?: unknown;
  description?: unknown;
  candidate?: unknown;
  outcome?: unknown;
  pingMs?: unknown;
  renegotiate?: unknown;
  screenSharing?: unknown;
  cameraEnabled?: unknown;
};

type PendingOffer = { callId: string; conversationId: number; fromUserId: number; mode: "voice" | "video"; description: { type: "offer" | "answer"; sdp: string }; caller: unknown; expiresAt: number };
const pendingOffersByCallee = new Map<number, PendingOffer>();

function clearPendingOffer(callId: string) {
  for (const [calleeId, pending] of pendingOffersByCallee.entries()) {
    if (pending.callId === callId) pendingOffersByCallee.delete(calleeId);
  }
}

function findPendingOffer(callId: string) {
  for (const [calleeId, pending] of pendingOffersByCallee.entries()) {
    if (pending.callId === callId) return { calleeId, pending };
  }
  return null;
}

function readBaseSignal(payload: SignalPayload) {
  const callId = typeof payload.callId === "string" && payload.callId.length <= 128 ? payload.callId : null;
  const conversationId = Number(payload.conversationId);
  if (!callId || !Number.isInteger(conversationId) || conversationId <= 0) throw new Error("Dữ liệu signaling không hợp lệ.");
  return { callId, conversationId };
}

function requireDescription(payload: SignalPayload, expectedType: "offer" | "answer") {
  const description = payload.description as { type?: unknown; sdp?: unknown } | undefined;
  if (description?.type !== expectedType || typeof description.sdp !== "string" || description.sdp.length > 100_000) {
    throw new Error("SDP cuộc gọi không hợp lệ.");
  }
  return { type: expectedType, sdp: description.sdp };
}

function requireCandidate(payload: SignalPayload) {
  const candidate = payload.candidate as { candidate?: unknown; sdpMid?: unknown; sdpMLineIndex?: unknown; usernameFragment?: unknown } | undefined;
  if (!candidate || typeof candidate.candidate !== "string" || candidate.candidate.length > 10_000) throw new Error("ICE candidate không hợp lệ.");
  return {
    candidate: candidate.candidate,
    ...(typeof candidate.sdpMid === "string" || candidate.sdpMid === null ? { sdpMid: candidate.sdpMid } : {}),
    ...(typeof candidate.sdpMLineIndex === "number" || candidate.sdpMLineIndex === null ? { sdpMLineIndex: candidate.sdpMLineIndex } : {}),
    ...(typeof candidate.usernameFragment === "string" || candidate.usernameFragment === null ? { usernameFragment: candidate.usernameFragment } : {}),
  };
}

/**
 * Signaling chỉ relay SDP/ICE; media vẫn đi P2P qua WebRTC. Mỗi socket dùng token
 * phiên KINI và server kiểm tra lại thành viên hội thoại trước mọi relay.
 */
export function registerCallSignaling(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: { origin: true, credentials: true },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : "";
      const request = {
        headers: {
          ...socket.request.headers,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      } as any;
      const user = await sdk.authenticateRequest(request);
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error("Phiên KINI không hợp lệ cho signaling."));
    }
  });

  io.on("connection", (socket) => {
    const userId = Number(socket.data.userId);
    socket.join(`kini-user:${userId}`);
    const pendingOffer = pendingOffersByCallee.get(userId);
    if (pendingOffer) {
      if (pendingOffer.expiresAt > Date.now()) socket.emit("call:offer", pendingOffer);
      else pendingOffersByCallee.delete(userId);
    }

    const relay = async (event: "call:answer" | "call:candidate" | "call:media" | "call:end", payload: SignalPayload, extra: Record<string, unknown> = {}) => {
      try {
        const { callId, conversationId } = readBaseSignal(payload);
        const peers = await db.getDirectConversationPeerUserIds(userId, conversationId);
        for (const peerUserId of peers) {
          io.to(`kini-user:${peerUserId}`).emit(event, { callId, conversationId, fromUserId: userId, ...extra });
        }
      } catch (error) {
        socket.emit("call:error", error instanceof Error ? error.message : "Không thể relay signaling cuộc gọi.");
      }
    };

    socket.on("call:offer", (payload: SignalPayload) => {
      const mode = payload.mode === "voice" || payload.mode === "video" ? payload.mode : null;
      if (!mode) return socket.emit("call:error", "Loại cuộc gọi không hợp lệ.");
      void (async () => {
        try {
          const { callId, conversationId } = readBaseSignal(payload);
          const description = requireDescription(payload, "offer");
          if (payload.renegotiate === true) {
            const peers = await db.getDirectConversationPeerUserIds(userId, conversationId);
            for (const peerUserId of peers) {
              io.to(`kini-user:${peerUserId}`).emit("call:offer", { callId, conversationId, fromUserId: userId, mode, description, renegotiate: true, ...(typeof payload.screenSharing === "boolean" ? { screenSharing: payload.screenSharing } : {}) });
            }
            return;
          }
          const created = await db.createCallSession({ id: callId, callerId: userId, conversationId, mode });
          const offer: PendingOffer = { callId, conversationId, fromUserId: userId, mode, description, caller: created.caller, expiresAt: Date.now() + 50_000 };
          pendingOffersByCallee.set(created.calleeId, offer);
          io.to(`kini-user:${created.calleeId}`).emit("call:offer", offer);
          setTimeout(() => {
            const pending = pendingOffersByCallee.get(created.calleeId);
            if (pending?.callId !== callId) return;
            pendingOffersByCallee.delete(created.calleeId);
            // Người gọi có thể đã tắt ứng dụng trước khi tự timeout; vẫn đóng phiên trong DB.
            void db.finishCall(userId, callId, "cancelled").catch(() => undefined);
            void sendCallEndedPush({ recipientUserId: created.calleeId, callId });
            void sendMissedCallPush({ recipientUserId: created.calleeId, callerName: created.caller.title, conversationId, callId, mode });
          }, 55_000);
          void sendIncomingCallPush({ recipientUserId: created.calleeId, callerName: created.caller.title, callerAvatar: created.caller.avatarUrl, conversationId, callId, mode });
        } catch (error) {
          socket.emit("call:error", error instanceof Error ? error.message : "Không thể gửi lời mời gọi.");
        }
      })();
    });
    socket.on("call:answer", (payload: SignalPayload) => {
      void (async () => {
        try {
          const { callId } = readBaseSignal(payload);
          if (payload.renegotiate !== true) {
            const pending = pendingOffersByCallee.get(userId);
            await db.markCallAnswered(userId, callId);
            pendingOffersByCallee.delete(userId);
            if (pending?.callId === callId) void sendCallEndedPush({ recipientUserId: userId, callId });
          }
          await relay("call:answer", payload, { description: requireDescription(payload, "answer"), ...(payload.renegotiate === true ? { renegotiate: true } : {}) });
        } catch (error) {
          socket.emit("call:error", error instanceof Error ? error.message : "Không thể nhận kết nối cuộc gọi.");
        }
      })();
    });
    socket.on("call:candidate", (payload: SignalPayload) => {
      try {
        void relay("call:candidate", payload, { candidate: requireCandidate(payload) });
      } catch (error) {
        socket.emit("call:error", error instanceof Error ? error.message : "ICE candidate không hợp lệ.");
      }
    });
    socket.on("call:media", (payload: SignalPayload) => {
      if (typeof payload.cameraEnabled !== "boolean") return socket.emit("call:error", "Trạng thái camera không hợp lệ.");
      void relay("call:media", payload, { cameraEnabled: payload.cameraEnabled });
    });
    socket.on("call:end", (payload: SignalPayload, acknowledge?: (result: { ok: boolean }) => void) => {
      void (async () => {
        try {
          const { callId } = readBaseSignal(payload);
          const outcome = payload.outcome === "declined" || payload.outcome === "cancelled" || payload.outcome === "failed" ? payload.outcome : "ended";
          const pingMs = typeof payload.pingMs === "number" && Number.isFinite(payload.pingMs) ? payload.pingMs : undefined;
          const pending = findPendingOffer(callId);
          await db.finishCall(userId, callId, outcome, pingMs);
          clearPendingOffer(callId);
          if (pending) {
            void sendCallEndedPush({ recipientUserId: pending.calleeId, callId });
            if (pending.pending.fromUserId === userId && outcome !== "declined") {
              void sendMissedCallPush({ recipientUserId: pending.calleeId, callerName: pending.pending.caller && typeof pending.pending.caller === "object" && "title" in pending.pending.caller && typeof pending.pending.caller.title === "string" ? pending.pending.caller.title : "Bạn KINI", conversationId: pending.pending.conversationId, callId, mode: pending.pending.mode });
            }
          }
          await relay("call:end", payload, { outcome });
          acknowledge?.({ ok: true });
        } catch (error) {
          socket.emit("call:error", error instanceof Error ? error.message : "Không thể kết thúc cuộc gọi.");
          acknowledge?.({ ok: false });
        }
      })();
    });
    socket.on("disconnect", () => {
      for (const [calleeId, pending] of pendingOffersByCallee.entries()) {
        if (pending.fromUserId !== userId) continue;
        pendingOffersByCallee.delete(calleeId);
        void db.finishCall(userId, pending.callId, "cancelled").catch(() => undefined);
        void sendCallEndedPush({ recipientUserId: calleeId, callId: pending.callId });
        void sendMissedCallPush({ recipientUserId: calleeId, callerName: pending.caller && typeof pending.caller === "object" && "title" in pending.caller && typeof pending.caller.title === "string" ? pending.caller.title : "Bạn KINI", conversationId: pending.conversationId, callId: pending.callId, mode: pending.mode });
        io.to(`kini-user:${calleeId}`).emit("call:end", {
          callId: pending.callId,
          conversationId: pending.conversationId,
          fromUserId: userId,
          outcome: "cancelled",
        });
      }
    });
  });

  return io;
}
```

