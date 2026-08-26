import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, kiniColors } from "@/components/kini-ui";
import { formatCallDuration, formatCallPing } from "@/lib/kini-call-format";
import { CallControls } from "./CallControls";

export function VoiceCall({ call, title, initials, color }: { call: any; title: string; initials: string; color: string }) {
  const insets = useSafeAreaInsets();
  const visible = call.mode === "voice" && call.status !== "idle";
  const incoming = call.status === "ringing" && call.direction === "incoming";
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={call.endCall}>
    <View style={[styles.screen, { paddingTop: insets.top + 32, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <Avatar initials={initials} color={color} size={94} />
      <Text style={styles.name}>{title}</Text>
      <Text style={styles.state}>{incoming ? "Cuộc gọi thoại đến" : call.status === "ringing" ? "Đang đổ chuông…" : call.status === "connecting" ? "Đang kết nối…" : call.status === "connected" ? `Đang gọi · ${formatCallDuration(call.elapsedSeconds)}` : call.error ?? "Cuộc gọi đã kết thúc"}</Text>
      {call.status === "connected" ? <Text style={styles.quality}>{formatCallPing(call.pingMs)}</Text> : null}
      {incoming ? <View style={styles.incomingRow}>
        <TouchableOpacity onPress={call.declineIncomingCall} style={[styles.answer, styles.decline]}><MaterialIcons name="call-end" color={kiniColors.white} size={26} /><Text style={styles.answerText}>Từ chối</Text></TouchableOpacity>
        <TouchableOpacity onPress={call.acceptIncomingCall} style={[styles.answer, styles.accept]}><MaterialIcons name="call" color={kiniColors.white} size={26} /><Text style={styles.answerText}>Nhận</Text></TouchableOpacity>
      </View> : <View style={styles.controls}><CallControls muted={call.muted} cameraEnabled={false} speakerEnabled={call.speakerEnabled} video={false} onMute={call.toggleMute} onSpeaker={call.toggleSpeaker} onEnd={call.endCall} /></View>}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", backgroundColor: "#123354", paddingHorizontal: 28 },
  name: { marginTop: 24, color: kiniColors.white, fontSize: 25, fontWeight: "900" },
  state: { marginTop: 8, color: "#C5D8EC", fontSize: 14 },
  quality: { marginTop: 5, color: "#91C9FF", fontSize: 13, fontWeight: "700" },
  controls: { width: "100%", marginTop: "auto" },
  incomingRow: { width: "100%", marginTop: "auto", flexDirection: "row", justifyContent: "space-around" },
  answer: { width: 86, alignItems: "center", gap: 8 },
  accept: {},
  decline: {},
  answerText: { color: kiniColors.white, fontSize: 12, fontWeight: "800" },
});
