import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, KiniCard, kiniColors } from "@/components/kini-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type AiMessage = { id: number; role: "user" | "assistant"; content: string; createdAt: string | Date };

export default function AssistantScreen() {
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const utils = trpc.useUtils();
  const listRef = useRef<FlatList<AiMessage>>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [value, setValue] = useState("");
  const conversations = trpc.ai.list.useQuery(undefined, { enabled: isAuthenticated, staleTime: 5_000 });
  const messages = trpc.ai.messages.useQuery({ conversationId: conversationId ?? 0 }, { enabled: isAuthenticated && conversationId !== null, staleTime: 1_000 });
  const create = trpc.ai.create.useMutation();
  const remove = trpc.ai.delete.useMutation();
  const send = trpc.ai.send.useMutation({
    onSuccess: async () => {
      if (conversationId) await utils.ai.messages.invalidate({ conversationId });
      await utils.ai.list.invalidate();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    },
    onError: (error) => Alert.alert("Trợ lý AI chưa phản hồi", error.message || "Vui lòng thử lại sau."),
  });
  const activeConversation = useMemo(() => conversations.data?.find((item) => item.id === conversationId), [conversationId, conversations.data]);

  useEffect(() => {
    if (conversationId === null && conversations.data?.[0]) setConversationId(conversations.data[0].id);
  }, [conversationId, conversations.data]);

  const newConversation = async () => {
    try {
      const next = await create.mutateAsync({ title: "Cuộc trò chuyện mới" });
      await utils.ai.list.invalidate();
      setConversationId(next.id);
    } catch (error) { Alert.alert("Không thể tạo hội thoại", error instanceof Error ? error.message : "Vui lòng thử lại."); }
  };
  const ask = async () => {
    const content = value.trim();
    if (!content || send.isPending) return;
    setValue("");
    try {
      let currentId = conversationId;
      if (!currentId) {
        const created = await create.mutateAsync({ title: content.slice(0, 72) });
        currentId = created.id;
        setConversationId(currentId);
      }
      await send.mutateAsync({ conversationId: currentId, content });
    } catch { /* onError mutation đã hiển thị; text được phục hồi để không mất câu hỏi. */ setValue(content); }
  };
  const deleteConversation = () => {
    if (!conversationId) return;
    Alert.alert("Xóa cuộc trao đổi?", "Nội dung này chỉ thuộc tài khoản của bạn và sẽ bị xóa vĩnh viễn.", [{ text: "Hủy", style: "cancel" }, { text: "Xóa", style: "destructive", onPress: () => remove.mutate({ conversationId }, { onSuccess: async () => { setConversationId(null); await utils.ai.list.invalidate(); } }) }]);
  };

  if (conversations.isLoading) return <ScreenContainer><View style={styles.center}><ActivityIndicator size="large" color={kiniColors.blue} /><Text style={styles.loading}>Đang chuẩn bị Trợ lý AI…</Text></View></ScreenContainer>;
  return <ScreenContainer>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={styles.header}><View style={styles.brand}><View style={styles.brandIcon}><MaterialIcons name="auto-awesome" size={24} color={kiniColors.white} /></View><View style={styles.flex}><Text style={styles.title}>Trợ lý AI</Text><Text style={styles.subtitle}>Hỏi nhanh, đáp riêng tư cho {user?.name ?? "bạn"}</Text></View></View><TouchableOpacity onPress={() => void newConversation()} style={styles.headerAction} accessibilityLabel="Cuộc trao đổi mới"><MaterialIcons name="add" size={25} color={kiniColors.blue} /></TouchableOpacity></View>
      <View style={styles.privacy}><MaterialIcons name="lock-outline" size={16} color={kiniColors.blue} /><Text style={styles.privacyText}>Chỉ bạn có thể xem và xóa lịch sử Trợ lý AI này.</Text></View>
      <FlatList horizontal data={conversations.data ?? []} keyExtractor={(item) => String(item.id)} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.history} renderItem={({ item }) => <TouchableOpacity onPress={() => setConversationId(item.id)} style={[styles.historyItem, item.id === conversationId && styles.historyActive]}><Text numberOfLines={1} style={[styles.historyTitle, item.id === conversationId && styles.historyTitleActive]}>{item.title}</Text></TouchableOpacity>} ListEmptyComponent={<TouchableOpacity onPress={() => void newConversation()} style={styles.emptyHistory}><Text style={styles.emptyHistoryText}>Tạo cuộc trao đổi đầu tiên</Text></TouchableOpacity>} />
      {activeConversation ? <View style={styles.conversationTop}><Text numberOfLines={1} style={styles.conversationTitle}>{activeConversation.title}</Text><TouchableOpacity onPress={deleteConversation} style={styles.delete} accessibilityLabel="Xóa cuộc trao đổi"><MaterialIcons name="delete-outline" size={22} color={kiniColors.coral} /></TouchableOpacity></View> : null}
      <FlatList ref={listRef} data={(messages.data ?? []) as AiMessage[]} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.messages} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })} renderItem={({ item }) => <View style={[styles.messageRow, item.role === "user" ? styles.myRow : styles.aiRow]}>{item.role === "assistant" ? <Avatar initials="AI" color={kiniColors.blue} size={30} /> : null}<View style={[styles.bubble, item.role === "user" ? styles.myBubble : styles.aiBubble]}><Text style={[styles.messageText, item.role === "user" && styles.myText]}>{item.content}</Text></View></View>} ListEmptyComponent={<View style={styles.welcome}><KiniCard style={styles.welcomeCard}><View style={styles.welcomeIcon}><MaterialIcons name="psychology" size={34} color={kiniColors.blue} /></View><Text style={styles.welcomeTitle}>Chào {user?.name ?? "bạn"}</Text><Text style={styles.welcomeText}>Bạn có thể hỏi về viết nội dung, học tập, công việc hoặc lên kế hoạch. Hãy không gửi mật khẩu hay mã OTP.</Text></KiniCard></View>} ListFooterComponent={send.isPending ? <View style={styles.typing}><ActivityIndicator color={kiniColors.blue} /><Text style={styles.typingText}>Trợ lý AI đang trả lời…</Text></View> : null} />
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}><TextInput value={value} onChangeText={setValue} onSubmitEditing={() => void ask()} placeholder="Hỏi Trợ lý AI…" placeholderTextColor={kiniColors.muted} multiline style={styles.input} accessibilityLabel="Nội dung hỏi Trợ lý AI" /><TouchableOpacity disabled={!value.trim() || send.isPending} onPress={() => void ask()} style={[styles.send, (!value.trim() || send.isPending) && styles.sendDisabled]} accessibilityLabel="Gửi câu hỏi"><MaterialIcons name="arrow-upward" size={22} color={kiniColors.white} /></TouchableOpacity></View>
    </KeyboardAvoidingView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: kiniColors.cloud }, center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, loading: { color: kiniColors.muted, fontSize: 15, fontWeight: "700" }, flex: { flex: 1 }, header: { minHeight: 72, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: kiniColors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: kiniColors.line }, brand: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }, brandIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.blue }, title: { color: kiniColors.navy, fontSize: 21, lineHeight: 26, fontWeight: "900" }, subtitle: { marginTop: 1, color: kiniColors.muted, fontSize: 13, lineHeight: 18 }, headerAction: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: kiniColors.mist }, privacy: { marginHorizontal: 14, marginTop: 10, paddingHorizontal: 11, paddingVertical: 9, gap: 7, borderRadius: 12, backgroundColor: kiniColors.mist, flexDirection: "row", alignItems: "center" }, privacyText: { flex: 1, color: kiniColors.navy, fontSize: 12, lineHeight: 17, fontWeight: "600" }, history: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 }, historyItem: { maxWidth: 175, minHeight: 36, paddingHorizontal: 12, justifyContent: "center", borderRadius: 11, backgroundColor: kiniColors.white, borderWidth: StyleSheet.hairlineWidth, borderColor: kiniColors.line }, historyActive: { backgroundColor: kiniColors.blue, borderColor: kiniColors.blue }, historyTitle: { color: kiniColors.navy, fontSize: 13, fontWeight: "800" }, historyTitleActive: { color: kiniColors.white }, emptyHistory: { paddingVertical: 8 }, emptyHistoryText: { color: kiniColors.blue, fontSize: 14, fontWeight: "800" }, conversationTop: { minHeight: 42, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" }, conversationTitle: { flex: 1, color: kiniColors.navy, fontSize: 15, fontWeight: "900" }, delete: { width: 38, height: 38, alignItems: "center", justifyContent: "center" }, messages: { flexGrow: 1, paddingHorizontal: 14, paddingBottom: 16, gap: 10 }, welcome: { flex: 1, justifyContent: "center", paddingVertical: 38 }, welcomeCard: { alignItems: "center", gap: 10, padding: 24 }, welcomeIcon: { width: 68, height: 68, alignItems: "center", justifyContent: "center", borderRadius: 23, backgroundColor: kiniColors.mist }, welcomeTitle: { color: kiniColors.navy, fontSize: 22, fontWeight: "900" }, welcomeText: { color: kiniColors.muted, fontSize: 15, lineHeight: 22, textAlign: "center" }, messageRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" }, aiRow: { justifyContent: "flex-start" }, myRow: { justifyContent: "flex-end" }, bubble: { maxWidth: "83%", paddingHorizontal: 13, paddingVertical: 10, borderRadius: 17 }, aiBubble: { backgroundColor: kiniColors.white, borderBottomLeftRadius: 5 }, myBubble: { backgroundColor: kiniColors.blue, borderBottomRightRadius: 5 }, messageText: { color: kiniColors.navy, fontSize: 16, lineHeight: 23 }, myText: { color: kiniColors.white }, typing: { paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 8 }, typingText: { color: kiniColors.muted, fontSize: 13, fontWeight: "700" }, composer: { paddingTop: 9, paddingHorizontal: 12, flexDirection: "row", alignItems: "flex-end", gap: 8, backgroundColor: kiniColors.white, borderTopWidth: StyleSheet.hairlineWidth, borderColor: kiniColors.line }, input: { flex: 1, minHeight: 44, maxHeight: 112, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, color: kiniColors.navy, fontSize: 16, lineHeight: 21, backgroundColor: kiniColors.cloud }, send: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.blue }, sendDisabled: { opacity: 0.42 },
});
