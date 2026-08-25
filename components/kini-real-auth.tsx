import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { kiniColors, PrimaryButton } from "@/components/kini-ui";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";

export function KiniRealAuth() {
  const { loading, error } = useAuth();
  if (loading) {
    return <View style={styles.screen}><ActivityIndicator color={kiniColors.blue} size="large" /><Text style={styles.loading}>Đang xác minh phiên đăng nhập…</Text></View>;
  }
  return (
    <View style={styles.screen}>
      <View style={styles.brandMark}><Text style={styles.brandK}>K</Text><View style={styles.dot} /></View>
      <Text style={styles.brand}>KINI</Text>
      <Text style={styles.title}>Trò chuyện bằng tài khoản thật</Text>
      <Text style={styles.subtitle}>Đăng nhập an toàn để tạo hồ sơ KINI, kết bạn và đồng bộ cuộc trò chuyện trên các thiết bị.</Text>
      <View style={styles.security}><MaterialIcons name="verified-user" size={20} color={kiniColors.green} /><Text style={styles.securityText}>KINI không lưu mật khẩu của bạn trong ứng dụng.</Text></View>
      {error ? <Text style={styles.error}>Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.</Text> : null}
      <View style={styles.actions}><PrimaryButton label="Đăng nhập hoặc tạo tài khoản" onPress={() => void startOAuthLogin()} /></View>
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, padding: 28, justifyContent: "center", backgroundColor: kiniColors.cloud }, brandMark: { width: 78, height: 78, borderRadius: 25, alignSelf: "center", alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.blue, shadowColor: kiniColors.blue, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 }, brandK: { color: kiniColors.white, fontSize: 44, fontWeight: "900", fontStyle: "italic" }, dot: { position: "absolute", width: 14, height: 14, right: 12, bottom: 12, borderRadius: 8, backgroundColor: "#55E3D0", borderWidth: 2, borderColor: kiniColors.white }, brand: { color: kiniColors.navy, fontSize: 31, fontWeight: "900", letterSpacing: 4, textAlign: "center", marginTop: 16 }, title: { color: kiniColors.navy, fontSize: 25, lineHeight: 31, fontWeight: "900", textAlign: "center", marginTop: 45 }, subtitle: { color: kiniColors.muted, fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 12 }, security: { flexDirection: "row", gap: 9, marginTop: 25, padding: 13, borderRadius: 14, backgroundColor: "#EDFBF5", alignItems: "center" }, securityText: { flex: 1, color: "#247354", fontSize: 13, lineHeight: 18, fontWeight: "600" }, actions: { marginTop: 28 }, error: { color: kiniColors.coral, fontSize: 13, textAlign: "center", marginTop: 14 }, loading: { color: kiniColors.muted, fontSize: 15, marginTop: 14 } });
