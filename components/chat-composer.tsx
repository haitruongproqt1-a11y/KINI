import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Keyboard, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { kiniColors } from "@/components/kini-ui";

type Attachment = { id: string; kind: "image" | "video" | "file" | "sticker"; name: string; uri?: string; contentType?: string; size?: number | null };
type QueuedAttachment = { kind: "image" | "video" | "file"; name: string; uri: string; contentType: string; size?: number | null };
type AttachmentAction = { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; color: string; onPress: () => void };

const stickers = ["👍", "❤️", "😂", "🎉", "✨", "🥳", "👏", "😎"];

export function ChatComposer({ onSendText, onSendAttachment, onQueueAttachment, pasteNonce = 0, replyingTo, onClearReply, bottomInset = 0, onInputFocus, sentFeedbackNonce = 0 }: {
  onSendText: (value: string) => void;
  onSendAttachment: (attachment: Attachment) => void;
  onQueueAttachment: (attachment: QueuedAttachment) => void;
  pasteNonce?: number;
  replyingTo?: string | null;
  onClearReply?: () => void;
  bottomInset?: number;
  onInputFocus?: () => void;
  sentFeedbackNonce?: number;
}) {
  const [value, setValue] = useState("");
  const [showActions, setShowActions] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [inputHeight, setInputHeight] = useState(42);
  const inputRef = useRef<TextInput>(null);
  const sentPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!sentFeedbackNonce) return;
    sentPulse.stopAnimation();
    sentPulse.setValue(0);
    Animated.sequence([
      Animated.timing(sentPulse, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.delay(220),
      Animated.timing(sentPulse, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [sentFeedbackNonce, sentPulse]);

  useEffect(() => {
    if (!pasteNonce) return;
    Clipboard.getStringAsync()
      .then((text) => { if (text) setValue((current) => current ? `${current} ${text}` : text); })
      .catch(() => undefined);
  }, [pasteNonce]);

  useEffect(() => {
    const hideListener = Keyboard.addListener("keyboardDidHide", () => {
      setShowActions(false);
      setShowStickers(false);
      if (!value.trim()) setInputHeight(42);
    });
    return () => hideListener.remove();
  }, []);

  const send = () => {
    const content = value.trim();
    if (!content) return;
    onSendText(content);
    setValue("");
    setInputHeight(42);
    requestAnimationFrame(() => inputRef.current?.setNativeProps({ text: "" }));
  };

  const queueAsset = (asset: ImagePicker.ImagePickerAsset, kind: "image" | "video") => {
    const name = asset.fileName ?? `${kind}-${Date.now()}.${kind === "video" ? "mp4" : "jpg"}`;
    setShowActions(false);
    onQueueAttachment({ kind, name, uri: asset.uri, contentType: asset.mimeType ?? (kind === "video" ? "video/mp4" : "image/jpeg"), size: asset.fileSize });
  };

  const requestMediaAccess = async (message: string) => {
    if (Platform.OS === "web") return true;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted) return true;
    Alert.alert("Cần quyền truy cập", message);
    return false;
  };

  const selectImage = async () => {
    if (!await requestMediaAccess("KINI cần quyền thư viện ảnh để gửi hình ảnh.")) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 10, quality: 0.72 });
    if (!result.canceled && result.assets.length) result.assets.forEach((asset) => queueAsset(asset, "image"));
  };

  const selectVideo = async () => {
    if (!await requestMediaAccess("KINI cần quyền thư viện để chọn video.")) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], allowsMultipleSelection: false });
    if (!result.canceled && result.assets.length) queueAsset(result.assets[0], "video");
  };

  const selectDocument = async () => {
    setShowActions(false);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets.length) return;
    const file = result.assets[0];
    onQueueAttachment({ kind: "file", name: file.name, uri: file.uri, contentType: file.mimeType ?? "application/octet-stream", size: file.size });
  };

  const actions: AttachmentAction[] = [
    { icon: "image", label: "Ảnh", color: "#1677FF", onPress: () => void selectImage() },
    { icon: "videocam", label: "Video", color: "#14A77A", onPress: () => void selectVideo() },
    { icon: "insert-drive-file", label: "Tệp", color: "#F5A524", onPress: () => void selectDocument() },
  ];

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <Animated.View pointerEvents="none" style={[styles.sentPulse, { opacity: sentPulse, transform: [{ scale: sentPulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }] }]}>
        <MaterialIcons name="check-circle" size={19} color={kiniColors.green} />
        <Text style={styles.sentPulseText}>Đã gửi</Text>
      </Animated.View>
      {replyingTo ? <View style={styles.replying}><View style={styles.replyLine} /><View style={styles.replyCopy}><Text style={styles.replyLabel}>Đang trả lời</Text><Text numberOfLines={1} style={styles.replyText}>{replyingTo}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Bỏ trả lời" onPress={onClearReply} style={styles.replyClose}><MaterialIcons name="close" size={19} color={kiniColors.muted} /></TouchableOpacity></View> : null}
      <View style={styles.composer}>
        <TouchableOpacity onPress={() => setShowActions(true)} style={styles.control} accessibilityRole="button" accessibilityLabel="Gửi ảnh, video hoặc tệp"><MaterialIcons name="add-circle-outline" size={25} color={kiniColors.blue} /></TouchableOpacity>
        <TextInput ref={inputRef} editable value={value} onChangeText={setValue} onSubmitEditing={send} onFocus={onInputFocus} onContentSizeChange={(event) => setInputHeight(Math.max(42, Math.min(106, Math.ceil(event.nativeEvent.contentSize.height + 18))))} placeholder="Nhắn tin" placeholderTextColor="#97A4B5" returnKeyType="send" blurOnSubmit={false} style={[styles.input, { height: inputHeight }]} multiline />
        {value.trim() ? <TouchableOpacity onPress={send} style={styles.send} accessibilityRole="button" accessibilityLabel="Gửi tin nhắn"><MaterialIcons name="send" size={19} color={kiniColors.white} /></TouchableOpacity> : <TouchableOpacity onPress={() => setShowStickers(true)} style={styles.control} accessibilityRole="button" accessibilityLabel="Chọn sticker"><MaterialIcons name="sentiment-satisfied-alt" size={24} color={kiniColors.blue} /></TouchableOpacity>}
      </View>
      <Modal visible={showActions} transparent animationType="fade" onRequestClose={() => setShowActions(false)}><TouchableOpacity activeOpacity={1} onPress={() => setShowActions(false)} style={styles.modalBackdrop}><View style={[styles.actionSheet, { paddingBottom: Math.max(bottomInset, 26) }]}>{actions.map((action) => <TouchableOpacity key={action.label} onPress={action.onPress} style={styles.actionItem} accessibilityRole="button" accessibilityLabel={`Gửi ${action.label}`}><View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}><MaterialIcons name={action.icon} size={25} color={action.color} /></View><Text style={styles.actionLabel}>{action.label}</Text></TouchableOpacity>)}</View></TouchableOpacity></Modal>
      <Modal visible={showStickers} transparent animationType="slide" onRequestClose={() => setShowStickers(false)}><View style={styles.stickerBackdrop}><View style={[styles.stickerSheet, { paddingBottom: Math.max(bottomInset, 24) }]}><View style={styles.sheetHandle} /><View style={styles.stickerHeader}><Text style={styles.stickerTitle}>Sticker KINI</Text><TouchableOpacity onPress={() => setShowStickers(false)} accessibilityRole="button" accessibilityLabel="Đóng sticker"><MaterialIcons name="close" size={23} color={kiniColors.navy} /></TouchableOpacity></View><View style={styles.stickerGrid}>{stickers.map((sticker) => <TouchableOpacity key={sticker} onPress={() => { onSendAttachment({ id: `${Date.now()}-${sticker}`, kind: "sticker", name: sticker }); setShowStickers(false); }} style={styles.sticker} accessibilityRole="button" accessibilityLabel={`Gửi sticker ${sticker}`}><Text style={styles.stickerText}>{sticker}</Text></TouchableOpacity>)}</View></View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "relative", backgroundColor: kiniColors.white, borderTopColor: kiniColors.line, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingTop: 8 },
  sentPulse: { position: "absolute", right: 18, top: -35, minHeight: 28, borderRadius: 14, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F2FBF6", borderWidth: 1, borderColor: "#D7F1E2" },
  sentPulseText: { color: kiniColors.green, fontSize: 11, fontWeight: "900" },
  uploading: { marginHorizontal: 2, marginBottom: 8, borderRadius: 14, padding: 8, backgroundColor: kiniColors.cloud, flexDirection: "row", gap: 9, alignItems: "center" },
  previewFrame: { width: 58, height: 58, overflow: "hidden", borderRadius: 12, backgroundColor: kiniColors.navy },
  previewImage: { width: "100%", height: "100%" },
  previewFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.blue },
  previewVideo: { backgroundColor: "#176C58" },
  progressOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(5, 19, 36, 0.5)" },
  progressPercent: { marginTop: -2, color: kiniColors.white, fontSize: 10, fontWeight: "900" },
  uploadCopy: { flex: 1, gap: 3 },
  uploadingText: { color: kiniColors.navy, fontSize: 12, fontWeight: "800" },
  uploadingName: { color: kiniColors.muted, fontSize: 11 },
  progressTrack: { height: 5, marginTop: 2, borderRadius: 4, overflow: "hidden", backgroundColor: "#DCE8F6" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: kiniColors.blue },
  replying: { minHeight: 42, paddingHorizontal: 7, paddingBottom: 8, alignItems: "center", flexDirection: "row", gap: 9 },
  replyLine: { width: 3, height: 30, borderRadius: 2, backgroundColor: kiniColors.blue }, replyCopy: { flex: 1, gap: 2 }, replyLabel: { color: kiniColors.blue, fontSize: 11, fontWeight: "800" }, replyText: { color: kiniColors.muted, fontSize: 12 }, replyClose: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  composer: { alignItems: "flex-end", flexDirection: "row", gap: 5 }, control: { alignItems: "center", justifyContent: "center", width: 38, height: 42 }, controlDisabled: { opacity: 0.45 }, input: { flex: 1, minHeight: 42, maxHeight: 106, borderRadius: 21, backgroundColor: kiniColors.cloud, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, color: kiniColors.navy, fontSize: 15, lineHeight: 20 }, send: { width: 38, height: 38, borderRadius: 19, backgroundColor: kiniColors.blue, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(18,38,63,0.28)", justifyContent: "flex-end" }, actionSheet: { backgroundColor: kiniColors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 42, paddingTop: 24, paddingBottom: 36, flexDirection: "row", justifyContent: "space-between" }, actionItem: { alignItems: "center", gap: 8, minWidth: 66 }, actionIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" }, actionLabel: { color: kiniColors.navy, fontSize: 13, fontWeight: "700" },
  stickerBackdrop: { flex: 1, backgroundColor: "rgba(18,38,63,0.28)", justifyContent: "flex-end" }, stickerSheet: { backgroundColor: kiniColors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10 }, sheetHandle: { width: 38, height: 4, backgroundColor: "#D6DEE8", borderRadius: 2, alignSelf: "center" }, stickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18 }, stickerTitle: { color: kiniColors.navy, fontSize: 17, fontWeight: "900" }, stickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, sticker: { width: "23%", aspectRatio: 1, backgroundColor: kiniColors.cloud, borderRadius: 16, alignItems: "center", justifyContent: "center" }, stickerText: { fontSize: 31 },
});
