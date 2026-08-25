import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Avatar, kiniColors } from "@/components/kini-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useKini } from "@/lib/kini-context";

const contacts = [
  { id: "linh", name: "Linh Nguyễn", initials: "LN", accent: "#FF7A8A", status: "Đang hoạt động" },
  { id: "nam", name: "Nam Trần", initials: "NT", accent: "#00A889", status: "Đang hoạt động" },
  { id: "phuong", name: "Phương Anh", initials: "PA", accent: "#D86FCA", status: "Hoạt động 12 phút trước" },
  { id: "thanh", name: "Thanh Mai", initials: "TM", accent: "#3F8CFF", status: "Hoạt động hôm qua" },
];

export default function ContactsScreen() {
  const router = useRouter();
  const { markRead } = useKini();
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View><Text style={styles.title}>Danh bạ</Text><Text style={styles.subtitle}>Bạn bè và nhóm của bạn</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Thêm bạn" style={styles.addButton} activeOpacity={0.7}>
          <MaterialIcons name="person-add-alt-1" size={20} color={kiniColors.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.search}><MaterialIcons name="search" size={20} color={kiniColors.muted} /><TextInput placeholder="Tìm bạn bè" placeholderTextColor="#98A5B5" style={styles.searchInput} /></View>
      <View style={styles.shortcuts}>
        <TouchableOpacity style={styles.shortcut} activeOpacity={0.7}><View style={[styles.shortcutIcon, { backgroundColor: "#EAF3FF" }]}><MaterialIcons name="person-add-alt" size={23} color={kiniColors.blue} /></View><Text style={styles.shortcutText}>Lời mời kết bạn</Text></TouchableOpacity>
        <TouchableOpacity style={styles.shortcut} activeOpacity={0.7}><View style={[styles.shortcutIcon, { backgroundColor: "#F1EEFF" }]}><MaterialIcons name="groups" size={23} color="#6956E8" /></View><Text style={styles.shortcutText}>Nhóm</Text></TouchableOpacity>
      </View>
      <Text style={styles.section}>Bạn bè · {contacts.length}</Text>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Trò chuyện với ${item.name}`} onPress={() => { markRead(item.id); router.push(`/chat/${item.id}` as never); }} style={styles.row} activeOpacity={0.7}>
            <Avatar initials={item.initials} color={item.accent} />
            <View style={styles.copy}><Text style={styles.name}>{item.name}</Text><Text style={styles.status}>{item.status}</Text></View>
            <MaterialIcons name="chevron-right" size={22} color="#AAB5C3" />
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, title: { color: kiniColors.navy, fontSize: 27, fontWeight: "900" }, subtitle: { color: kiniColors.muted, fontSize: 13, marginTop: 4 }, addButton: { width: 42, height: 42, backgroundColor: kiniColors.blue, borderRadius: 14, alignItems: "center", justifyContent: "center" }, search: { marginHorizontal: 20, height: 44, borderRadius: 14, backgroundColor: kiniColors.cloud, alignItems: "center", flexDirection: "row", paddingHorizontal: 13, gap: 8 }, searchInput: { flex: 1, color: kiniColors.navy, fontSize: 15 }, shortcuts: { marginTop: 18, borderBottomWidth: 8, borderBottomColor: kiniColors.cloud }, shortcut: { paddingHorizontal: 20, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 13 }, shortcutIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, shortcutText: { color: kiniColors.navy, fontSize: 15, fontWeight: "700" }, section: { color: kiniColors.muted, fontSize: 13, fontWeight: "800", paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 }, list: { paddingBottom: 112 }, row: { minHeight: 70, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12 }, copy: { flex: 1, gap: 3 }, name: { color: kiniColors.navy, fontSize: 16, fontWeight: "800" }, status: { color: kiniColors.muted, fontSize: 13 } });
