import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { kiniColors } from "@/components/kini-ui";
import { formatCallDuration, formatCallPing } from "@/lib/kini-call-format";
import { CallControls } from "./CallControls";
import { RtcVideo } from "./RtcVideo";
import { ScreenShare } from "./ScreenShare";

export function VideoCall({ call, title }: { call: any; title: string }) {
  const insets = useSafeAreaInsets();
  const visible = call.mode === "video" && call.status !== "idle";
  const incoming = call.status === "ringing" && call.direction === "incoming";
  const primaryStream = call.isScreenSharing ? call.screenStream : call.remoteScreenStream ?? call.remoteStream;
  const previewStream = call.isScreenSharing
    ? (call.cameraEnabled ? call.localStream : null)
    : call.remoteScreenStream && call.remoteStream
      ? call.remoteStream
      : (call.localStream && call.cameraEnabled ? call.localStream : null);
  const previewMirrored = call.isScreenSharing || !call.remoteScreenStream;
  return <Modal visible={visible} animationType="slide" onRequestClose={call.endCall}>
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <RtcVideo stream={primaryStream} style={styles.remote} />
      {previewStream ? <RtcVideo stream={previewStream} mirrored={previewMirrored} style={styles.local} /> : null}
      <View style={styles.top}><Text style={styles.name}>{title}</Text><Text style={styles.state}>{incoming ? "Cuộc gọi video đến" : call.status === "ringing" ? "Đang đổ chuông…" : call.status === "connecting" ? "Đang kết nối…" : call.status === "connected" ? `Đang gọi · ${formatCallDuration(call.elapsedSeconds)}` : call.error ?? "Đã kết thúc"}</Text>{call.status === "connected" ? <Text style={styles.quality}>{formatCallPing(call.pingMs)}</Text> : null}</View>
      {incoming ? <View style={styles.incomingRow}>
        <TouchableOpacity onPress={call.declineIncomingCall} style={[styles.answer, styles.decline]}><MaterialIcons name="call-end" color={kiniColors.white} size={26} /><Text style={styles.answerText}>Từ chối</Text></TouchableOpacity>
        <TouchableOpacity onPress={call.acceptIncomingCall} style={[styles.answer, styles.accept]}><MaterialIcons name="videocam" color={kiniColors.white} size={26} /><Text style={styles.answerText}>Nhận</Text></TouchableOpacity>
      </View> : <View style={styles.bottom}><ScreenShare active={call.isScreenSharing} onToggle={() => void call.toggleScreenShare()} /><CallControls muted={call.muted} cameraEnabled={call.cameraEnabled} speakerEnabled={call.speakerEnabled} video onMute={call.toggleMute} onCamera={call.toggleCamera} onSwitchCamera={call.switchCamera} onSpeaker={call.toggleSpeaker} onEnd={call.endCall} /></View>}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#071729" },
  remote: { ...StyleSheet.absoluteFillObject },
  local: { position: "absolute", right: 16, top: 90, width: 108, height: 156, borderRadius: 14, overflow: "hidden", borderWidth: 2, borderColor: kiniColors.white },
  top: { paddingHorizontal: 18, paddingTop: 10 },
  name: { color: kiniColors.white, fontSize: 18, fontWeight: "900" },
  state: { color: "#C5D8EC", fontSize: 12, marginTop: 4 },
  quality: { color: "#91C9FF", fontSize: 12, marginTop: 4, fontWeight: "800" },
  bottom: { marginTop: "auto", alignItems: "center", gap: 18, paddingHorizontal: 18 },
  incomingRow: { marginTop: "auto", paddingHorizontal: 36, flexDirection: "row", justifyContent: "space-between" },
  answer: { width: 86, alignItems: "center", gap: 8 },
  accept: {},
  decline: {},
  answerText: { color: kiniColors.white, fontSize: 12, fontWeight: "800" },
});
