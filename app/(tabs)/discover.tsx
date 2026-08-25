import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { kiniColors } from "@/components/kini-ui";
import { ScreenContainer } from "@/components/screen-container";

const tools = [{ icon: "photo-library", title: "Album chung", subtitle: "Kỷ niệm của bạn bè", color: "#6956E8" }, { icon: "calendar-month", title: "Lịch hẹn", subtitle: "Sắp xếp gặp gỡ", color: "#24B47E" }, { icon: "cake", title: "Sinh nhật", subtitle: "Gửi lời chúc thân tình", color: "#F05B61" }];

export default function DiscoverScreen() {
  const [notice, setNotice] = useState<string | null>(null);
  const openUtility = (title: string) => setNotice(`${title} đã được mở. Hãy chọn một cuộc trò chuyện để bắt đầu sử dụng tiện ích.`);
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><Text style={styles.title}>Khám phá</Text><Text style={styles.subtitle}>Thêm những khoảnh khắc vui vào cuộc trò chuyện.</Text></View>
        <View style={styles.storyCard}><View style={styles.storyBadge}><MaterialIcons name="auto-awesome" size={17} color={kiniColors.white} /></View><Text style={styles.storyTitle}>Khoảnh khắc KINI</Text><Text style={styles.storyText}>Chia sẻ ảnh, cảm xúc và cập nhật ngắn với những người thân quen.</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Tạo khoảnh khắc" onPress={() => openUtility("Khoảnh khắc KINI")} style={styles.storyAction} activeOpacity={0.7}><Text style={styles.storyActionText}>Tạo khoảnh khắc</Text><MaterialIcons name="arrow-forward" size={17} color={kiniColors.blue} /></TouchableOpacity></View>
        {notice ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng thông báo tiện ích" onPress={() => setNotice(null)} style={styles.notice}><MaterialIcons name="info-outline" size={18} color={kiniColors.blue} /><Text style={styles.noticeText}>{notice}</Text><MaterialIcons name="close" size={16} color={kiniColors.muted} /></TouchableOpacity> : null}
        <Text style={styles.section}>Tiện ích trò chuyện</Text>
        <View style={styles.toolList}>{tools.map((tool) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mở ${tool.title}`} key={tool.title} onPress={() => openUtility(tool.title)} style={styles.tool} activeOpacity={0.7}><View style={[styles.toolIcon, { backgroundColor: `${tool.color}17` }]}><MaterialIcons name={tool.icon as never} size={24} color={tool.color} /></View><View style={styles.toolCopy}><Text style={styles.toolTitle}>{tool.title}</Text><Text style={styles.toolSub}>{tool.subtitle}</Text></View><MaterialIcons name="chevron-right" size={22} color="#AAB5C3" /></TouchableOpacity>)}</View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ content: { paddingBottom: 110 }, header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }, title: { color: kiniColors.navy, fontSize: 27, fontWeight: "900" }, subtitle: { color: kiniColors.muted, fontSize: 14, lineHeight: 20, marginTop: 6, maxWidth: 280 }, storyCard: { marginHorizontal: 20, padding: 20, borderRadius: 24, backgroundColor: kiniColors.mist, overflow: "hidden" }, storyBadge: { width: 34, height: 34, borderRadius: 11, backgroundColor: kiniColors.blue, alignItems: "center", justifyContent: "center", marginBottom: 14 }, storyTitle: { color: kiniColors.navy, fontSize: 19, fontWeight: "900" }, storyText: { color: kiniColors.muted, fontSize: 14, lineHeight: 20, marginTop: 7, maxWidth: 260 }, storyAction: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 16 }, storyActionText: { color: kiniColors.blue, fontSize: 14, fontWeight: "800" }, notice: { marginHorizontal: 20, marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: kiniColors.mist, flexDirection: "row", alignItems: "center", gap: 8 }, noticeText: { flex: 1, color: kiniColors.navy, fontSize: 12, lineHeight: 18 }, section: { color: kiniColors.muted, fontSize: 13, fontWeight: "800", marginHorizontal: 20, marginTop: 26, marginBottom: 9 }, toolList: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: kiniColors.line }, tool: { paddingHorizontal: 20, minHeight: 74, flexDirection: "row", alignItems: "center", gap: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: kiniColors.line }, toolIcon: { width: 45, height: 45, borderRadius: 15, alignItems: "center", justifyContent: "center" }, toolCopy: { flex: 1, gap: 4 }, toolTitle: { color: kiniColors.navy, fontSize: 16, fontWeight: "800" }, toolSub: { color: kiniColors.muted, fontSize: 13 } });
