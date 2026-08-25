import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatComposer } from "@/components/chat-composer";
import { Avatar, kiniColors } from "@/components/kini-ui";
import { type Message } from "@/lib/kini-domain";
import { useKini } from "@/lib/kini-context";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return "Tệp đính kèm";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function MessageBubble({ item }: { item: Message }) {
  const mine = item.sender === "me";
  const imageMessage = item.kind === "image" || item.kind === "album";
  const fileMessage = item.kind === "file";
  const stickerMessage = item.kind === "sticker";
  return <View style={[styles.messageRow, mine ? styles.mineRow : styles.theirRow]}><View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble, imageMessage && styles.mediaBubble, stickerMessage && styles.stickerBubble]}>{stickerMessage ? <Text style={styles.sticker}>{item.attachment?.name}</Text> : imageMessage ? <View><Image source={{ uri: item.attachment?.uri }} style={styles.image} /><View style={styles.mediaCaption}><MaterialIcons name={item.kind === "album" ? "collections" : "image"} size={16} color={mine ? kiniColors.white : kiniColors.blue} /><Text style={[styles.mediaText, mine && styles.mineText]}>{item.kind === "album" ? `Album · ${item.attachment?.count ?? 1} ảnh` : "Ảnh"}</Text></View></View> : fileMessage ? <View style={styles.fileRow}><View style={[styles.fileIcon, mine && styles.mineFileIcon]}><MaterialIcons name="insert-drive-file" size={24} color={mine ? kiniColors.blue : kiniColors.coral} /></View><View style={styles.fileCopy}><Text numberOfLines={1} style={[styles.fileName, mine && styles.mineText]}>{item.attachment?.name}</Text><Text style={[styles.fileSize, mine && styles.mineSubtext]}>{formatBytes(item.attachment?.size)}</Text></View></View> : <Text style={[styles.messageText, mine && styles.mineText]}>{item.content}</Text>}<Text style={[styles.time, mine && styles.mineSubtext]}>{formatTime(item.createdAt)}</Text></View></View>;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);
  const { conversations, messages, markRead, sendAttachment, sendText } = useKini();
  const conversation = conversations.find((item) => item.id === id) ?? conversations[0];
  const thread = useMemo(() => messages.filter((message) => message.conversationId === conversation.id), [messages, conversation.id]);
  useEffect(() => { markRead(conversation.id); }, [conversation.id, markRead]);
  return <View style={[styles.screen, { paddingTop: Platform.OS === "web" ? 12 : insets.top }]}><View style={styles.header}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.back} activeOpacity={0.6}><MaterialIcons name="arrow-back" size={24} color={kiniColors.navy} /></TouchableOpacity><Avatar initials={conversation.initials} color={conversation.accent} size={38} /><View style={styles.headerCopy}><Text style={styles.headerTitle}>{conversation.title}</Text><View style={styles.onlineRow}><View style={[styles.online, !conversation.online && styles.offline]} /><Text style={styles.headerStatus}>{conversation.online ? "Đang hoạt động" : "Truy cập gần đây"}</Text></View></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Gọi điện" style={styles.headerAction}><MaterialIcons name="call" size={22} color={kiniColors.blue} /></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Thông tin cuộc trò chuyện" style={styles.headerAction}><MaterialIcons name="more-horiz" size={23} color={kiniColors.blue} /></TouchableOpacity></View><FlatList ref={listRef} data={thread} keyExtractor={(item) => item.id} renderItem={({ item }) => <MessageBubble item={item} />} contentContainerStyle={styles.thread} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })} ListHeaderComponent={<Text style={styles.today}>Hôm nay</Text>} /><ChatComposer onSendText={(value) => sendText(conversation.id, value)} onSendAttachment={(attachment) => sendAttachment(conversation.id, attachment)} /></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: kiniColors.cloud }, header: { minHeight: 62, paddingHorizontal: 9, backgroundColor: kiniColors.white, alignItems: "center", flexDirection: "row", borderBottomColor: kiniColors.line, borderBottomWidth: StyleSheet.hairlineWidth }, back: { width: 38, height: 44, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, marginLeft: 10, gap: 3 }, headerTitle: { color: kiniColors.navy, fontSize: 16, fontWeight: "900" }, onlineRow: { flexDirection: "row", alignItems: "center", gap: 5 }, online: { width: 7, height: 7, borderRadius: 4, backgroundColor: kiniColors.green }, offline: { backgroundColor: "#B0BBC7" }, headerStatus: { color: kiniColors.muted, fontSize: 11 }, headerAction: { width: 38, height: 42, alignItems: "center", justifyContent: "center" }, thread: { paddingHorizontal: 14, paddingBottom: 16, paddingTop: 10, gap: 7 }, today: { alignSelf: "center", color: kiniColors.muted, fontSize: 12, marginVertical: 8 }, messageRow: { flexDirection: "row", width: "100%" }, mineRow: { justifyContent: "flex-end" }, theirRow: { justifyContent: "flex-start" }, bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 7 }, mineBubble: { backgroundColor: kiniColors.blue, borderBottomRightRadius: 5 }, theirBubble: { backgroundColor: kiniColors.white, borderBottomLeftRadius: 5 }, mediaBubble: { paddingHorizontal: 0, paddingTop: 0, overflow: "hidden" }, stickerBubble: { padding: 0, backgroundColor: "transparent" }, messageText: { color: kiniColors.navy, fontSize: 15, lineHeight: 21 }, mineText: { color: kiniColors.white }, time: { color: "#98A5B5", fontSize: 10, marginTop: 4, alignSelf: "flex-end" }, mineSubtext: { color: "#D9E9FF" }, image: { width: 215, height: 170, backgroundColor: "#DCE8F7" }, mediaCaption: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 11, paddingTop: 8 }, mediaText: { color: kiniColors.blue, fontSize: 13, fontWeight: "800" }, fileRow: { minWidth: 215, flexDirection: "row", alignItems: "center", gap: 10 }, fileIcon: { width: 38, height: 42, borderRadius: 12, backgroundColor: "#FFF2F3", alignItems: "center", justifyContent: "center" }, mineFileIcon: { backgroundColor: kiniColors.white }, fileCopy: { flex: 1, gap: 3 }, fileName: { color: kiniColors.navy, fontSize: 14, fontWeight: "800" }, fileSize: { color: kiniColors.muted, fontSize: 11 }, sticker: { fontSize: 52, lineHeight: 62 } });
