import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView as NativeKeyboardAvoidingView, Linking, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatComposer } from "@/components/chat-composer";
import { KiniMessageStatus } from "@/components/kini-message-status";
import { Avatar, kiniColors } from "@/components/kini-ui";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type ReplyTarget = { id: number; content: string };
type Message = { id: number | string; conversationId: number; senderId: number; clientMessageId?: string | null; kind: "text" | "image" | "album" | "video" | "file" | "sticker"; content: string; attachmentUrl?: string | null; attachmentUrls?: string | null; attachmentName?: string | null; createdAt: string | Date; status?: "sent" | "delivered" | "read"; failed?: boolean; replyToMessageId?: number };

function KeyboardAvoidingView({ behavior: _ignoredBehavior, keyboardVerticalOffset: _ignoredOffset, ...props }: ComponentProps<typeof NativeKeyboardAvoidingView>) {
  return <NativeKeyboardAvoidingView {...props} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0} />;
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
  const player = useVideoPlayer(url, (instance) => { instance.loop = false; });
  return <VideoView player={player} contentFit="contain" allowsFullscreen allowsPictureInPicture style={fullscreen ? styles.fullscreenVideo : styles.videoPreview} />;
}

function albumUrls(item: Message) {
  try {
    const parsed = item.attachmentUrls ? JSON.parse(item.attachmentUrls) : [];
    return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string") : [];
  } catch { return item.attachmentUrl ? [item.attachmentUrl] : []; }
}

function AlbumGrid({ urls, fullscreen = false }: { urls: string[]; fullscreen?: boolean }) {
  const visible = urls.slice(0, fullscreen ? 12 : 4);
  return <View style={fullscreen ? styles.fullscreenAlbum : styles.albumGrid}>{visible.map((url, index) => <View key={`${url}-${index}`} style={fullscreen ? styles.fullscreenAlbumItem : styles.albumItem}><Image source={{ uri: url }} contentFit="cover" cachePolicy="disk" style={StyleSheet.absoluteFill} />{!fullscreen && index === 3 && urls.length > 4 ? <View style={styles.albumMore}><Text style={styles.albumMoreText}>+{urls.length - 4}</Text></View> : null}</View>)}</View>;
}

function MessageBubble({ item, isMine, onLongPress, onOpenMedia }: { item: Message; isMine: boolean; onLongPress: (message: Message) => void; onOpenMedia: (message: Message) => void }) {
  const time = new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const file = item.kind === "file";
  const media = item.kind === "image" || item.kind === "album" || item.kind === "video";
  const sticker = item.kind === "sticker";
  const mediaUrls = albumUrls(item);
  const mediaUrl = item.attachmentUrl || mediaUrls[0] || undefined;
  return <View style={[styles.messageRow, isMine ? styles.mineRow : styles.theirRow]}><Pressable accessibilityRole="button" accessibilityLabel={media ? "Media, chạm để xem, nhấn giữ để lưu" : "Tin nhắn, nhấn giữ để chọn thao tác"} onPress={media && mediaUrl ? () => onOpenMedia(item) : undefined} onLongPress={() => onLongPress(item)} delayLongPress={350} style={[styles.bubble, isMine ? styles.mineBubble : styles.theirBubble, media && styles.mediaBubble, media && { backgroundColor: "transparent" }, sticker && styles.stickerBubble, item.failed && styles.failedBubble]}>{sticker ? <Text style={styles.sticker}>{item.content}</Text> : file ? <View style={styles.fileRow}><View style={[styles.fileIcon, isMine && styles.mineFileIcon]}><MaterialIcons name="insert-drive-file" size={25} color={isMine ? kiniColors.blue : kiniColors.coral} /></View><View style={styles.fileCopy}><Text numberOfLines={1} style={[styles.fileName, isMine && styles.mineText]}>{item.attachmentName ?? item.content}</Text><Text style={[styles.fileMeta, isMine && styles.mineSubtext]}>Tệp đính kèm</Text></View></View> : media ? mediaUrl ? item.kind === "album" ? <AlbumGrid urls={mediaUrls} /> : item.kind === "video" ? <View style={styles.mediaFrame}><VideoPreview url={mediaUrl} /><View style={styles.playBadge}><MaterialIcons name="play-arrow" size={22} color={kiniColors.white} /></View></View> : <Image source={{ uri: mediaUrl }} contentFit="cover" cachePolicy="disk" style={styles.mediaImage} /> : <View style={styles.mediaPlaceholder}><MaterialIcons name={item.kind === "video" ? "videocam" : item.kind === "album" ? "collections" : "image"} size={31} color={isMine ? kiniColors.white : kiniColors.blue} /><Text style={[styles.mediaLabel, isMine && styles.mineText]}>Đang tải media…</Text></View> : <Text style={[styles.messageText, isMine && styles.mineText]}>{item.content}</Text>}<View style={styles.meta}><Text style={[styles.time, isMine && styles.mineSubtext]}>{item.failed ? "Chưa gửi" : time}</Text>{isMine && !item.failed ? <KiniMessageStatus status={item.status} /> : null}</View></Pressable></View>;
}

export default function ChatScreen() {
  const parsed = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(parsed.id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<Message | null>(null);
  const [viewer, setViewer] = useState<Message | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [pasteNonce, setPasteNonce] = useState(0);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const summaryQuery = trpc.chat.list.useQuery({ filter: "all" }, { enabled: isAuthenticated, refetchInterval: 3500, staleTime: 750 });
  const conversation = useMemo(() => summaryQuery.data?.find((item) => item.id === conversationId), [conversationId, summaryQuery.data]);
  const messagesQuery = trpc.chat.messages.useQuery({ conversationId }, { enabled: isAuthenticated && Number.isFinite(conversationId), refetchInterval: 2500, staleTime: 750 });
  const markRead = trpc.chat.markRead.useMutation({ onSuccess: () => { void utils.chat.list.invalidate(); void utils.notifications.summary.invalidate(); } });
  const send = trpc.chat.send.useMutation();
  const removeConversation = trpc.chat.delete.useMutation({ onSuccess: () => { void utils.chat.list.invalidate(); void utils.notifications.summary.invalidate(); router.replace("/(tabs)" as never); }, onError: () => Alert.alert("Không thể xóa cuộc trò chuyện", "Vui lòng thử lại sau.") });

  const scrollToLatest = () => requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  useEffect(() => { if (messagesQuery.data?.length) markRead.mutate({ conversationId }); }, [conversationId, messagesQuery.data?.length]);
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
  const selectReply = () => { if (selected) setReplyTarget({ id: Number(selected.id), content: selected.content }); setSelected(null); };
  const copyMessage = async () => { if (selected) await Clipboard.setStringAsync(selected.content); setSelected(null); };
  const pasteMessage = () => { setPasteNonce((value) => value + 1); setSelected(null); };
  const thread = useMemo<Message[]>(() => {
    const serverMessages = (messagesQuery.data ?? []) as Message[];
    const serverClientIds = new Set(serverMessages.map((message) => message.clientMessageId).filter(Boolean));
    return [...serverMessages, ...optimisticMessages.filter((message) => !message.clientMessageId || !serverClientIds.has(message.clientMessageId))].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messagesQuery.data, optimisticMessages]);
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
    } catch { Alert.alert("Không thể lưu media", "Vui lòng kiểm tra kết nối và thử lại."); }
  };
  const confirmDelete = () => Alert.alert("Xóa cuộc trò chuyện?", "Toàn bộ tin nhắn và tệp đính kèm trong cuộc trò chuyện này sẽ bị xóa vĩnh viễn và không còn xuất hiện trong danh sách.", [{ text: "Hủy", style: "cancel" }, { text: "Xóa vĩnh viễn", style: "destructive", onPress: () => removeConversation.mutate({ conversationId }) }]);
  if (!isAuthenticated || (messagesQuery.isLoading && !messagesQuery.data)) return <View style={styles.loading}><ActivityIndicator color={kiniColors.blue} size="large" /><Text style={styles.loadingText}>Đang tải cuộc trò chuyện…</Text></View>;
  if (messagesQuery.isError) return <View style={styles.loading}><MaterialIcons name="cloud-off" size={34} color={kiniColors.coral} /><Text style={styles.loadingText}>Không thể tải cuộc trò chuyện.</Text><TouchableOpacity onPress={() => void messagesQuery.refetch()} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></TouchableOpacity></View>;
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}><View style={{ paddingTop: insets.top }}><View style={styles.header}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={24} color={kiniColors.navy} /></TouchableOpacity><Avatar initials={conversation?.initials ?? "K"} color={conversation?.avatarColor ?? kiniColors.blue} size={38} /><View style={styles.headerCopy}><Text style={styles.headerTitle}>{conversation?.title ?? "Cuộc trò chuyện"}</Text><Text style={styles.headerStatus}>Tài khoản KINI đã xác thực</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Xóa cuộc trò chuyện" onPress={confirmDelete} style={styles.headerAction}><MaterialIcons name="delete-outline" size={22} color={kiniColors.coral} /></TouchableOpacity></View></View><FlatList ref={listRef} data={thread} keyExtractor={(item) => item.id.toString()} renderItem={({ item }) => <MessageBubble item={item} isMine={item.senderId === user?.id} onLongPress={setSelected} onOpenMedia={setViewer} />} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" onContentSizeChange={scrollToLatest} ListHeaderComponent={<Text style={styles.today}>Tin nhắn được đồng bộ an toàn</Text>} /><ChatComposer onSendText={sendText} onSendAttachment={sendAttachment} pasteNonce={pasteNonce} replyingTo={replyTarget?.content ?? null} onClearReply={() => setReplyTarget(null)} bottomInset={insets.bottom} onInputFocus={scrollToLatest} /><Modal visible={Boolean(viewer)} transparent animationType="fade" onRequestClose={() => setViewer(null)}><View style={styles.viewer}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng trình xem media" onPress={() => setViewer(null)} style={styles.viewerClose}><MaterialIcons name="close" size={28} color={kiniColors.white} /></TouchableOpacity>{viewer?.kind === "album" ? <AlbumGrid urls={albumUrls(viewer)} fullscreen /> : viewer?.kind === "video" && viewer.attachmentUrl ? <VideoPreview url={viewer.attachmentUrl} fullscreen /> : viewer?.attachmentUrl ? <Image source={{ uri: viewer.attachmentUrl }} contentFit="contain" style={styles.fullscreenImage} /> : null}<Text style={styles.viewerHint}>Nhấn giữ tin nhắn để lưu về máy</Text></View></Modal><Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}><Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}><Pressable style={styles.actionSheet} onPress={(event) => event.stopPropagation()}><Text numberOfLines={2} style={styles.selectedPreview}>{selected?.content}</Text>{selected?.attachmentUrl && (selected.kind === "image" || selected.kind === "album" || selected.kind === "video") ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Lưu media về máy" onPress={() => void saveMedia()} style={styles.action}><MaterialIcons name="download" size={21} color={kiniColors.blue} /><Text style={styles.actionText}>Lưu về máy</Text></TouchableOpacity> : null}<TouchableOpacity accessibilityRole="button" accessibilityLabel="Trả lời tin nhắn" onPress={selectReply} style={styles.action}><MaterialIcons name="reply" size={21} color={kiniColors.blue} /><Text style={styles.actionText}>Trả lời</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Sao chép tin nhắn" onPress={() => void copyMessage()} style={styles.action}><MaterialIcons name="content-copy" size={20} color={kiniColors.blue} /><Text style={styles.actionText}>Sao chép</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Dán vào khung soạn thảo" onPress={pasteMessage} style={styles.action}><MaterialIcons name="content-paste" size={21} color={kiniColors.blue} /><Text style={styles.actionText}>Dán vào ô soạn thảo</Text></TouchableOpacity></Pressable></Pressable></Modal></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: kiniColors.cloud }, loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.cloud, gap: 12 }, loadingText: { color: kiniColors.muted, fontSize: 14 }, retry: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 11, backgroundColor: kiniColors.mist }, retryText: { color: kiniColors.blue, fontSize: 14, fontWeight: "800" }, header: { minHeight: 62, paddingHorizontal: 9, backgroundColor: kiniColors.white, alignItems: "center", flexDirection: "row", borderBottomColor: kiniColors.line, borderBottomWidth: StyleSheet.hairlineWidth }, back: { width: 38, height: 44, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, marginLeft: 10, gap: 3 }, headerTitle: { color: kiniColors.navy, fontSize: 16, fontWeight: "900" }, headerStatus: { color: kiniColors.green, fontSize: 11, fontWeight: "700" }, headerAction: { width: 40, height: 42, alignItems: "center", justifyContent: "center" }, thread: { flexGrow: 1, paddingHorizontal: 14, paddingBottom: 16, paddingTop: 10, gap: 7 }, today: { alignSelf: "center", color: kiniColors.muted, fontSize: 12, marginVertical: 8 }, messageRow: { flexDirection: "row", width: "100%" }, mineRow: { justifyContent: "flex-end" }, theirRow: { justifyContent: "flex-start" }, bubble: { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 7 }, mineBubble: { backgroundColor: kiniColors.blue, borderBottomRightRadius: 5 }, theirBubble: { backgroundColor: kiniColors.white, borderBottomLeftRadius: 5 }, failedBubble: { opacity: 0.72 }, messageText: { color: kiniColors.navy, fontSize: 15, lineHeight: 21 }, mineText: { color: kiniColors.white }, meta: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: 6, marginTop: 4 }, time: { color: "#98A5B5", fontSize: 10 }, mineSubtext: { color: "#D9E9FF" }, fileRow: { minWidth: 215, flexDirection: "row", alignItems: "center", gap: 10 }, fileIcon: { width: 39, height: 43, borderRadius: 12, backgroundColor: "#FFF2F3", alignItems: "center", justifyContent: "center" }, mineFileIcon: { backgroundColor: kiniColors.white }, fileCopy: { flex: 1, gap: 3 }, fileName: { color: kiniColors.navy, fontSize: 14, fontWeight: "800" }, fileMeta: { color: kiniColors.muted, fontSize: 11 }, mediaBubble: { padding: 0, overflow: "hidden" }, albumGrid: { width: 225, minHeight: 145, flexDirection: "row", flexWrap: "wrap", gap: 2, backgroundColor: "#DCE8F6" }, albumItem: { width: 111.5, height: 71.5, position: "relative", overflow: "hidden" }, albumMore: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }, albumMoreText: { color: kiniColors.white, fontSize: 22, fontWeight: "900" }, fullscreenAlbum: { width: "94%", maxWidth: 600, flexDirection: "row", flexWrap: "wrap", gap: 3, justifyContent: "center" }, fullscreenAlbumItem: { width: "31.8%", aspectRatio: 1, position: "relative", overflow: "hidden" }, mediaFrame: { width: 225, height: 145, position: "relative" }, mediaImage: { width: 225, height: 145 }, videoPreview: { width: 225, height: 145, backgroundColor: "#10243D" }, playBadge: { position: "absolute", left: 94, top: 56, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.58)" }, mediaPlaceholder: { minWidth: 205, minHeight: 112, alignItems: "center", justifyContent: "center", gap: 8, padding: 18, backgroundColor: "#EAF3FF" }, mediaLabel: { color: kiniColors.blue, fontSize: 13, fontWeight: "800" }, stickerBubble: { padding: 0, backgroundColor: "transparent" }, sticker: { fontSize: 52, lineHeight: 62 }, viewer: { flex: 1, backgroundColor: "#06101D", alignItems: "center", justifyContent: "center" }, viewerClose: { position: "absolute", zIndex: 2, top: 48, right: 18, width: 44, height: 44, alignItems: "center", justifyContent: "center" }, fullscreenImage: { width: "100%", height: "78%" }, fullscreenVideo: { width: "100%", height: "78%", backgroundColor: "#06101D" }, viewerHint: { position: "absolute", bottom: 35, color: "#C5D7ED", fontSize: 12 }, modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(18,38,63,0.32)" }, actionSheet: { backgroundColor: kiniColors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 36 }, selectedPreview: { color: kiniColors.muted, fontSize: 13, lineHeight: 18, backgroundColor: kiniColors.cloud, borderRadius: 12, padding: 12, marginBottom: 10 }, action: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 14 }, actionText: { color: kiniColors.navy, fontSize: 16, fontWeight: "700" },
});
