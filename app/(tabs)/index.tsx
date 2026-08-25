import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { KiniAuth } from "@/components/kini-auth";
import { Avatar, kiniColors } from "@/components/kini-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useKini } from "@/lib/kini-context";

export default function HomeScreen() {
  const router = useRouter();
  const { account, conversations, markRead } = useKini();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => conversations.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase())), [conversations, query]);
  if (!account) return <KiniAuth />;
  return (
    <ScreenContainer>
      <View style={styles.header}><View><Text style={styles.title}>Tin nhắn</Text><Text style={styles.subtitle}>Xin chào, {account.displayName}</Text></View><View style={styles.headerActions}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Tìm kiếm tin nhắn" style={styles.headerAction} activeOpacity={0.7}><MaterialIcons name="search" size={23} color={kiniColors.navy} /></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Tạo cuộc trò chuyện mới" style={[styles.headerAction, styles.addAction]} activeOpacity={0.7}><MaterialIcons name="edit" size={20} color={kiniColors.white} /></TouchableOpacity></View></View>
      <View style={styles.search}><MaterialIcons name="search" size={20} color={kiniColors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm kiếm cuộc trò chuyện" placeholderTextColor="#98A5B5" style={styles.searchInput} /></View>
      <View style={styles.note}><MaterialIcons name="lock-outline" size={16} color={kiniColors.green} /><Text style={styles.noteText}>Tin nhắn của bạn được bảo vệ trong KINI.</Text></View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="chat-bubble-outline" size={32} color="#AAB5C3" /><Text style={styles.emptyText}>Không tìm thấy cuộc trò chuyện</Text></View>}
        renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mở trò chuyện ${item.title}`} onPress={() => { markRead(item.id); router.push(`/chat/${item.id}` as never); }} style={styles.row} activeOpacity={0.7}><View><Avatar initials={item.initials} color={item.accent} size={54} />{item.online && <View style={styles.online} />}</View><View style={styles.copy}><View style={styles.nameLine}><Text numberOfLines={1} style={styles.name}>{item.title}</Text><Text style={styles.time}>{item.updatedAt}</Text></View><View style={styles.previewLine}><Text numberOfLines={1} style={[styles.preview, item.unread > 0 && styles.unreadPreview]}>{item.preview}</Text>{item.unread > 0 && <View style={styles.unread}><Text style={styles.unreadText}>{item.unread}</Text></View>}</View></View></TouchableOpacity>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { color: kiniColors.navy, fontSize: 27, fontWeight: "900" }, subtitle: { color: kiniColors.muted, fontSize: 13, marginTop: 4 }, headerActions: { flexDirection: "row", gap: 4 }, headerAction: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: kiniColors.cloud }, addAction: { backgroundColor: kiniColors.blue }, search: { height: 44, marginHorizontal: 20, paddingHorizontal: 13, borderRadius: 14, backgroundColor: kiniColors.cloud, flexDirection: "row", alignItems: "center", gap: 8 }, searchInput: { flex: 1, fontSize: 15, color: kiniColors.navy }, note: { marginHorizontal: 20, marginTop: 14, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 11, backgroundColor: "#EDFBF5", flexDirection: "row", alignItems: "center", gap: 7 }, noteText: { color: "#247354", fontSize: 12, fontWeight: "600" }, list: { paddingTop: 10, paddingBottom: 112 }, row: { minHeight: 76, paddingHorizontal: 20, paddingVertical: 11, flexDirection: "row", gap: 12, alignItems: "center" }, online: { position: "absolute", width: 13, height: 13, borderRadius: 8, backgroundColor: kiniColors.green, borderWidth: 2, borderColor: kiniColors.white, right: -1, bottom: -1 }, copy: { flex: 1, gap: 5 }, nameLine: { flexDirection: "row", alignItems: "center", gap: 8 }, name: { color: kiniColors.navy, fontSize: 16, fontWeight: "800", flex: 1 }, time: { color: kiniColors.muted, fontSize: 11 }, previewLine: { flexDirection: "row", gap: 10, alignItems: "center" }, preview: { color: kiniColors.muted, fontSize: 13, flex: 1 }, unreadPreview: { color: kiniColors.navy, fontWeight: "700" }, unread: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: kiniColors.coral, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, unreadText: { color: kiniColors.white, fontSize: 11, fontWeight: "800" }, empty: { alignItems: "center", paddingTop: 50, gap: 10 }, emptyText: { color: kiniColors.muted, fontSize: 14 } });
