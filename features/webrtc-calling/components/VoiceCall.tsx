import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useKeepAwake } from "expo-keep-awake";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, kiniColors } from "@/components/kini-ui";
import { formatCallDuration, formatCallPing } from "@/lib/kini-call-format";
import { CallControls, IncomingCallActions } from "./CallControls";

function callStatus(call: any, incoming: boolean) {
  if (incoming) return "Cuộc gọi thoại đến";
  if (call.status === "ringing") return "Đang gọi…";
  if (call.status === "connecting") return "Đang kết nối bảo mật…";
  if (call.status === "connected") return `Đang gọi · ${formatCallDuration(call.elapsedSeconds)}`;
  return call.error ?? "Cuộc gọi đã kết thúc";
}

export function VoiceCall({ call, title, initials, color, avatarUrl }: { call: any; title: string; initials: string; color: string; avatarUrl?: string | null }) {
  useKeepAwake("kini-voice-call");
  const insets = useSafeAreaInsets();
  const visible = call.mode === "voice" && call.status !== "idle";
  const incoming = call.status === "ringing" && call.direction === "incoming";
  return <Modal visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => void call.endCall()}>
    <View style={[styles.screen, { paddingTop: insets.top + 30, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.orbOne} /><View style={styles.orbTwo} />
      <View style={styles.topBadge}><MaterialIcons name="lock" size={14} color="#BFD8F3" /><Text style={styles.topBadgeText}>Kết nối riêng tư KINI</Text></View>
      <View style={styles.identity}>
        <View style={styles.avatarRing}><Avatar initials={initials} color={color} imageUri={avatarUrl} size={116} /></View>
        <Text numberOfLines={1} style={styles.name}>{title}</Text>
        <Text style={styles.state}>{callStatus(call, incoming)}</Text>
        {call.status === "connected" ? <View style={styles.ping}><MaterialIcons name="network-check" size={15} color="#85C9FF" /><Text style={styles.pingText}>{formatCallPing(call.pingMs)}</Text></View> : null}
      </View>
      <View style={styles.bottomPanel}>
        {incoming ? <><Text style={styles.actionHint}>Vuốt chạm để trả lời hoặc từ chối</Text><IncomingCallActions mode="voice" onDecline={call.declineIncomingCall} onAccept={call.acceptIncomingCall} /></> : <CallControls muted={call.muted} cameraEnabled={false} speakerEnabled={call.speakerEnabled} video={false} onMute={call.toggleMute} onSpeaker={call.toggleSpeaker} onEnd={call.endCall} />}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", alignItems: "center", backgroundColor: "#0D2745", paddingHorizontal: 24 },
  orbOne: { position: "absolute", width: 350, height: 350, borderRadius: 175, top: -160, left: -105, backgroundColor: "#155C9A", opacity: 0.48 },
  orbTwo: { position: "absolute", width: 290, height: 290, borderRadius: 145, bottom: 35, right: -135, backgroundColor: "#532F96", opacity: 0.42 },
  topBadge: { flexDirection: "row", gap: 6, alignItems: "center", borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.10)" },
  topBadgeText: { color: "#D7E9FA", fontSize: 11, fontWeight: "700" },
  identity: { alignItems: "center", marginTop: "auto", marginBottom: "auto" },
  avatarRing: { padding: 7, borderRadius: 67, backgroundColor: "rgba(255,255,255,0.13)", borderWidth: 1, borderColor: "rgba(255,255,255,0.30)" },
  name: { marginTop: 23, maxWidth: 290, color: kiniColors.white, fontSize: 27, lineHeight: 33, fontWeight: "900" },
  state: { marginTop: 8, color: "#CEE1F3", fontSize: 15, fontWeight: "600", textAlign: "center" },
  ping: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 12, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(0,0,0,0.16)" },
  pingText: { color: "#A9D7FF", fontSize: 12, fontWeight: "800" },
  bottomPanel: { width: "100%", alignItems: "center", minHeight: 116, justifyContent: "flex-end" },
  actionHint: { marginBottom: 17, color: "#BFD5E9", fontSize: 12, fontWeight: "600" },
});
