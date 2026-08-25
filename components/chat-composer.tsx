import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { kiniColors } from "@/components/kini-ui";
import { type Attachment } from "@/lib/kini-domain";

type AttachmentAction = { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; color: string; onPress: () => void };

const stickers = ["👍", "❤️", "😂", "🎉", "✨", "🥳", "👏", "😎"];

export function ChatComposer({ onSendText, onSendAttachment }: { onSendText: (value: string) => void; onSendAttachment: (attachment: Attachment) => void }) {
  const [value, setValue] = useState("");
  const [showActions, setShowActions] = useState(false);
  const [showStickers, setShowStickers] = useState(false);

  const send = () => {
    if (!value.trim()) return;
    onSendText(value);
    setValue("");
  };

  const selectImages = async (album: boolean) => {
    setShowActions(false);
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Cần quyền truy cập", "KINI cần quyền thư viện ảnh để gửi hình ảnh trong cuộc trò chuyện.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: album,
      selectionLimit: album ? 12 : 1,
      quality: 0.82,
    });
    if (result.canceled || !result.assets.length) return;
    const first = result.assets[0];
    const attachment: Attachment = album
      ? { id: `${Date.now()}-album`, kind: "album", name: "Album ảnh", uri: first.uri, count: result.assets.length }
      : { id: `${Date.now()}-image`, kind: "image", name: first.fileName ?? "Ảnh KINI", uri: first.uri };
    onSendAttachment(attachment);
  };

  const selectDocument = async () => {
    setShowActions(false);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets.length) return;
    const file = result.assets[0];
    onSendAttachment({ id: `${Date.now()}-file`, kind: "file", name: file.name, uri: file.uri, size: file.size });
  };

  const actions: AttachmentAction[] = [
    { icon: "image", label: "Ảnh", color: "#1677FF", onPress: () => void selectImages(false) },
    { icon: "photo-library", label: "Album", color: "#6956E8", onPress: () => void selectImages(true) },
    { icon: "insert-drive-file", label: "Tệp", color: "#F5A524", onPress: () => void selectDocument() },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.composer}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Gửi ảnh, album hoặc tệp" onPress={() => setShowActions(true)} style={styles.control} activeOpacity={0.6}><MaterialIcons name="add-circle-outline" size={25} color={kiniColors.blue} /></TouchableOpacity>
        <TextInput value={value} onChangeText={setValue} onSubmitEditing={send} placeholder="Nhắn tin" placeholderTextColor="#97A4B5" returnKeyType="send" style={styles.input} multiline />
        {value.trim() ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Gửi tin nhắn" onPress={send} style={styles.send} activeOpacity={0.75}><MaterialIcons name="send" size={19} color={kiniColors.white} /></TouchableOpacity> : <TouchableOpacity accessibilityRole="button" accessibilityLabel="Chọn sticker" onPress={() => setShowStickers(true)} style={styles.control} activeOpacity={0.6}><MaterialIcons name="sentiment-satisfied-alt" size={24} color={kiniColors.blue} /></TouchableOpacity>}
      </View>
      <Modal visible={showActions} transparent animationType="fade" onRequestClose={() => setShowActions(false)}><TouchableOpacity activeOpacity={1} onPress={() => setShowActions(false)} style={styles.modalBackdrop}><View style={styles.actionSheet}>{actions.map((action) => <TouchableOpacity key={action.label} accessibilityRole="button" accessibilityLabel={`Gửi ${action.label}`} onPress={action.onPress} style={styles.actionItem} activeOpacity={0.7}><View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}><MaterialIcons name={action.icon} size={25} color={action.color} /></View><Text style={styles.actionLabel}>{action.label}</Text></TouchableOpacity>)}</View></TouchableOpacity></Modal>
      <Modal visible={showStickers} transparent animationType="slide" onRequestClose={() => setShowStickers(false)}><View style={styles.stickerBackdrop}><View style={styles.stickerSheet}><View style={styles.sheetHandle} /><View style={styles.stickerHeader}><Text style={styles.stickerTitle}>Sticker KINI</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng sticker" onPress={() => setShowStickers(false)}><MaterialIcons name="close" size={23} color={kiniColors.navy} /></TouchableOpacity></View><View style={styles.stickerGrid}>{stickers.map((sticker) => <TouchableOpacity key={sticker} accessibilityRole="button" accessibilityLabel={`Gửi sticker ${sticker}`} onPress={() => { onSendAttachment({ id: `${Date.now()}-${sticker}`, kind: "sticker", name: sticker }); setShowStickers(false); }} style={styles.sticker}><Text style={styles.stickerText}>{sticker}</Text></TouchableOpacity>)}</View></View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: kiniColors.white, borderTopColor: kiniColors.line, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 },
  composer: { alignItems: "flex-end", flexDirection: "row", gap: 5 },
  control: { alignItems: "center", justifyContent: "center", width: 38, height: 42 },
  input: { flex: 1, minHeight: 42, maxHeight: 106, borderRadius: 21, backgroundColor: kiniColors.cloud, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, color: kiniColors.navy, fontSize: 15, lineHeight: 20 },
  send: { width: 38, height: 38, borderRadius: 19, backgroundColor: kiniColors.blue, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(18,38,63,0.28)", justifyContent: "flex-end" },
  actionSheet: { backgroundColor: kiniColors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 36, flexDirection: "row", justifyContent: "space-between" },
  actionItem: { alignItems: "center", gap: 8, minWidth: 70 },
  actionIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: kiniColors.navy, fontSize: 13, fontWeight: "700" },
  stickerBackdrop: { flex: 1, backgroundColor: "rgba(18,38,63,0.28)", justifyContent: "flex-end" },
  stickerSheet: { backgroundColor: kiniColors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  sheetHandle: { width: 38, height: 4, backgroundColor: "#D6DEE8", borderRadius: 2, alignSelf: "center" },
  stickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18 },
  stickerTitle: { color: kiniColors.navy, fontSize: 17, fontWeight: "900" },
  stickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sticker: { width: "23%", aspectRatio: 1, backgroundColor: kiniColors.cloud, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stickerText: { fontSize: 31 },
});
