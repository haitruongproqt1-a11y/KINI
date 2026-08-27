import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
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
    const listener = Keyboard.addListener("keyboardDidShow", scrollToLatest);
    return () => listener.remove();
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
      <ChatComposer onSendText={sendText} onSendAttachment={sendAttachment} onQueueAttachment={queueAttachment} pasteNonce={pasteNonce} replyingTo={replyTarget?.content ?? null} onClearReply={() => setReplyTarget(null)} bottomInset={insets.bottom} onInputFocus={scrollToLatest} />
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
