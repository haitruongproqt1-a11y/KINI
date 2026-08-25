import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { KiniPasswordAuth } from "@/components/kini-password-auth";
import { Avatar, kiniColors } from "@/components/kini-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type Filter = "all" | "unread" | "direct" | "group";
const filters: Array<{ id: Filter; label: string }> = [{ id: "all", label: "Tất cả" }, { id: "unread", label: "Chưa đọc" }, { id: "direct", label: "Cá nhân" }, { id: "group", label: "Nhóm" }];

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const previousUnread = useRef<number | null>(null);
  const conversationsQuery = trpc.chat.list.useQuery({ filter }, { enabled: isAuthenticated, refetchInterval: 6000 });
  const notificationQuery = trpc.notifications.summary.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 8000 });
  const messageSearchQuery = trpc.chat.search.useQuery({ query }, { enabled: isAuthenticated && query.trim().length >= 2 });
  const conversations = useMemo(() => (conversationsQuery.data ?? []).filter((item) => `${item.title} ${item.preview}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [conversationsQuery.data, query]);
  useEffect(() => {
    const unread = notificationQuery.data?.unreadMessages;
    if (unread === undefined) return;
    const increased = previousUnread.current !== null && unread > previousUnread.current;
    previousUnread.current = unread;
    if (increased && Platform.OS !== "web") {
      void Notifications.scheduleNotificationAsync({ content: { title: "Tin nhắn mới trên KINI", body: `Bạn có ${unread} tin nhắn chưa đọc.`, sound: "default" }, trigger: null });
    }
  }, [notificationQuery.data?.unreadMessages]);
  if (loading || conversationsQuery.isLoading && isAuthenticated) return <ScreenContainer><View style={styles.loader}><ActivityIndicator color={kiniColors.blue} size="large" /><Text style={styles.loaderText}>Đang tải cuộc trò chuyện…</Text></View></ScreenContainer>;
  if (!isAuthenticated) return <KiniPasswordAuth />;
  return (
    <ScreenContainer>
      <View style={styles.header}><View><Text style={styles.title}>Tin nhắn</Text><Text style={styles.subtitle}>Đồng bộ từ tài khoản KINI của bạn</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="Lời mời và thông báo" onPress={() => router.push("/(tabs)/contacts" as never)} style={styles.bell} activeOpacity={0.7}><MaterialIcons name="notifications-none" size={23} color={kiniColors.navy} />{(notificationQuery.data?.pendingFriendRequests ?? 0) + (notificationQuery.data?.unreadMessages ?? 0) > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(99, (notificationQuery.data?.pendingFriendRequests ?? 0) + (notificationQuery.data?.unreadMessages ?? 0))}</Text></View> : null}</TouchableOpacity></View>
      <View style={styles.search}><MaterialIcons name="search" size={20} color={kiniColors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm tên hoặc nội dung tin nhắn" placeholderTextColor="#98A5B5" style={styles.searchInput} /></View>
      <View style={styles.filterRow}>{filters.map((item) => <TouchableOpacity key={item.id} onPress={() => setFilter(item.id)} activeOpacity={0.7} style={[styles.filter, filter === item.id && styles.filterActive]}><Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>
      {query.trim().length >= 2 && messageSearchQuery.data?.length ? <View style={styles.messageMatches}><Text style={styles.matchTitle}>Tin nhắn chứa “{query.trim()}”</Text>{messageSearchQuery.data.slice(0, 3).map((message) => <TouchableOpacity key={message.id} accessibilityRole="button" accessibilityLabel="Mở kết quả tin nhắn" onPress={() => router.push(`/chat/${message.conversationId}` as never)} style={styles.matchRow}><MaterialIcons name="search" size={16} color={kiniColors.blue} /><Text numberOfLines={1} style={styles.matchText}>{message.content}</Text><MaterialIcons name="chevron-right" size={18} color="#AAB5C3" /></TouchableOpacity>)}</View> : null}
      <FlatList data={conversations} keyExtractor={(item) => item.id.toString()} contentContainerStyle={styles.list} refreshing={conversationsQuery.isFetching} onRefresh={() => void conversationsQuery.refetch()} ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="forum" size={34} color="#AAB5C3" /><Text style={styles.emptyTitle}>{query ? "Không tìm thấy tin nhắn phù hợp" : "Chưa có cuộc trò chuyện"}</Text><Text style={styles.emptyCopy}>{query ? "Thử dùng từ khóa khác hoặc xoá bộ lọc." : "Vào Danh bạ để gửi lời mời kết bạn và bắt đầu trò chuyện."}</Text></View>} renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Mở trò chuyện ${item.title}`} onPress={() => router.push(`/chat/${item.id}` as never)} style={styles.row} activeOpacity={0.7}><Avatar initials={item.initials} color={item.avatarColor} size={54} /><View style={styles.copy}><View style={styles.nameLine}><Text numberOfLines={1} style={styles.name}>{item.title}</Text><Text style={styles.time}>{new Date(item.updatedAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</Text></View><View style={styles.previewLine}><Text numberOfLines={1} style={[styles.preview, item.unreadCount > 0 && styles.unreadPreview]}>{item.preview}</Text>{item.unreadCount > 0 ? <View style={styles.unread}><Text style={styles.unreadText}>{Math.min(item.unreadCount, 99)}</Text></View> : null}</View></View></TouchableOpacity>} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { color: kiniColors.navy, fontSize: 27, fontWeight: "900" }, subtitle: { color: kiniColors.muted, fontSize: 13, marginTop: 4 }, bell: { width: 42, height: 42, borderRadius: 14, backgroundColor: kiniColors.cloud, alignItems: "center", justifyContent: "center" }, badge: { position: "absolute", minWidth: 18, height: 18, borderRadius: 9, backgroundColor: kiniColors.coral, right: -5, top: -5, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }, badgeText: { color: kiniColors.white, fontSize: 10, fontWeight: "900" }, search: { height: 44, marginHorizontal: 20, paddingHorizontal: 13, borderRadius: 14, backgroundColor: kiniColors.cloud, flexDirection: "row", alignItems: "center", gap: 8 }, searchInput: { flex: 1, fontSize: 15, color: kiniColors.navy }, filterRow: { paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", gap: 8 }, filter: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, backgroundColor: kiniColors.cloud }, filterActive: { backgroundColor: kiniColors.mist }, filterText: { color: kiniColors.muted, fontSize: 13, fontWeight: "700" }, filterTextActive: { color: kiniColors.blue }, messageMatches: { marginHorizontal: 20, marginBottom: 4, padding: 12, borderRadius: 16, backgroundColor: kiniColors.mist, gap: 3 }, matchTitle: { color: kiniColors.blue, fontSize: 12, fontWeight: "900", marginBottom: 4 }, matchRow: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 8 }, matchText: { flex: 1, color: kiniColors.navy, fontSize: 13 }, list: { paddingBottom: 112 }, row: { minHeight: 76, paddingHorizontal: 20, paddingVertical: 11, flexDirection: "row", gap: 12, alignItems: "center" }, copy: { flex: 1, gap: 5 }, nameLine: { flexDirection: "row", alignItems: "center", gap: 8 }, name: { color: kiniColors.navy, fontSize: 16, fontWeight: "800", flex: 1 }, time: { color: kiniColors.muted, fontSize: 11 }, previewLine: { flexDirection: "row", gap: 10, alignItems: "center" }, preview: { color: kiniColors.muted, fontSize: 13, flex: 1 }, unreadPreview: { color: kiniColors.navy, fontWeight: "700" }, unread: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: kiniColors.coral, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, unreadText: { color: kiniColors.white, fontSize: 11, fontWeight: "800" }, empty: { alignItems: "center", paddingHorizontal: 40, paddingTop: 56, gap: 9 }, emptyTitle: { color: kiniColors.navy, fontSize: 16, fontWeight: "800", marginTop: 4 }, emptyCopy: { color: kiniColors.muted, fontSize: 13, lineHeight: 19, textAlign: "center" }, loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, loaderText: { color: kiniColors.muted, fontSize: 14 } });
