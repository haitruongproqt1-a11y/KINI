import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Avatar, kiniColors } from "@/components/kini-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useKini } from "@/lib/kini-context";

const settings = [{ icon: "lock-outline", title: "Bảo mật tài khoản", subtitle: "Mật khẩu và câu hỏi bảo mật" }, { icon: "notifications-none", title: "Thông báo", subtitle: "Âm thanh và tin nhắn mới" }, { icon: "palette-outlined", title: "Giao diện", subtitle: "Sáng, tối và phông chữ" }];

export default function ProfileScreen() {
  const { account, signOut } = useKini();
  if (!account) return null;
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Cá nhân</Text>
        <View style={styles.profileCard}><Avatar initials={account.displayName.slice(0, 2).toUpperCase()} color={kiniColors.blue} size={64} /><View style={styles.profileCopy}><Text style={styles.name}>{account.displayName}</Text><Text style={styles.handle}>@{account.username}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Chỉnh sửa hồ sơ" onPress={() => Alert.alert("Hồ sơ KINI", "Tính năng chỉnh sửa hồ sơ sẽ được bổ sung trong phiên bản tiếp theo.")} style={styles.edit}><MaterialIcons name="edit" size={18} color={kiniColors.blue} /></TouchableOpacity></View>
        <Text style={styles.section}>Cài đặt</Text>
        <View style={styles.list}>{settings.map((item) => <TouchableOpacity key={item.title} onPress={() => Alert.alert(item.title, "Tùy chọn này đã sẵn sàng để kết nối với phần cài đặt chi tiết.")} style={styles.row} activeOpacity={0.7}><View style={styles.rowIcon}><MaterialIcons name={item.icon as never} size={22} color={kiniColors.blue} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowSub}>{item.subtitle}</Text></View><MaterialIcons name="chevron-right" size={22} color="#AAB5C3" /></TouchableOpacity>)}</View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đăng xuất" onPress={signOut} style={styles.signOut} activeOpacity={0.7}><MaterialIcons name="logout" size={20} color={kiniColors.coral} /><Text style={styles.signOutText}>Đăng xuất</Text></TouchableOpacity>
        <Text style={styles.version}>KINI 1.0 · Bản trải nghiệm</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 116 }, title: { color: kiniColors.navy, fontSize: 27, fontWeight: "900", marginTop: 2 }, profileCard: { marginTop: 22, padding: 18, borderRadius: 22, backgroundColor: kiniColors.mist, alignItems: "center", flexDirection: "row", gap: 13 }, profileCopy: { flex: 1, gap: 4 }, name: { color: kiniColors.navy, fontSize: 17, fontWeight: "900" }, handle: { color: kiniColors.muted, fontSize: 13 }, edit: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.white }, section: { color: kiniColors.muted, fontSize: 13, fontWeight: "800", marginTop: 27, marginBottom: 9 }, list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: kiniColors.line }, row: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: kiniColors.line }, rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.cloud }, rowCopy: { flex: 1, gap: 4 }, rowTitle: { color: kiniColors.navy, fontSize: 15, fontWeight: "800" }, rowSub: { color: kiniColors.muted, fontSize: 12 }, signOut: { marginTop: 26, height: 50, borderRadius: 15, backgroundColor: "#FFF2F3", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, signOutText: { color: kiniColors.coral, fontSize: 15, fontWeight: "800" }, version: { color: "#A3AFBE", textAlign: "center", fontSize: 12, marginTop: 20 } });
