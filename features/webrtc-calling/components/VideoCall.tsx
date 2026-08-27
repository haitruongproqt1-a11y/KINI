import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, kiniColors } from "@/components/kini-ui";
import { formatCallDuration, formatCallPing } from "@/lib/kini-call-format";
import { CallControls, IncomingCallActions } from "./CallControls";
import { RtcVideo } from "./RtcVideo";
import { ScreenShare } from "./ScreenShare";

function callStatus(call: any, incoming: boolean) {
  if (incoming) return "Cuộc gọi video đến";
  if (call.status === "ringing") return "Đang gọi…";
  if (call.status === "connecting") return "Đang kết nối bảo mật…";
  if (call.status === "connected") return `Đang gọi · ${formatCallDuration(call.elapsedSeconds)}`;
  return call.error ?? "Cuộc gọi đã kết thúc";
}

export function VideoCall({ call, title, initials, color, avatarUrl }: { call: any; title: string; initials: string; color: string; avatarUrl?: string | null }) {
  useKeepAwake("kini-video-call");
  const insets = useSafeAreaInsets();
  const visible = call.mode === "video" && call.status !== "idle";
  const incoming = call.status === "ringing" && call.direction === "incoming";
  const isScreenActive = call.isScreenSharing || Boolean(call.remoteScreenStream);
  // Không render screenStream cục bộ: MediaProjection sẽ tự quay lại chính overlay và tạo ảnh đen/nhấp nháy trên Android.
  const primaryStream = call.remoteScreenStream ?? (call.remoteCameraEnabled ? call.remoteStream : null);
  const previewStream = isScreenActive ? null : (call.localStream && call.cameraEnabled ? call.localStream : null);
  const previewMirrored = true;
  return <Modal visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => call.isScreenSharing ? void call.toggleScreenShare() : void call.endCall()}>
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 14) }]}>
      <RtcVideo stream={primaryStream} objectFit={isScreenActive ? "contain" : "cover"} zOrder={0} style={styles.remote} />
      <View pointerEvents="none" style={styles.shade} />
      {!primaryStream && !incoming ? <View pointerEvents="none" style={styles.cameraOff}><View style={styles.avatarRing}><Avatar initials={initials} color={color} imageUri={avatarUrl} size={92} /></View><Text style={styles.cameraOffTitle}>{title}</Text><Text style={styles.cameraOffText}>Camera của đối phương đang tắt</Text></View> : null}
      {call.isScreenSharing ? <View pointerEvents="none" style={styles.localSharing}><MaterialIcons name="screen-share" size={25} color={kiniColors.white} /><Text style={styles.localSharingTitle}>Bạn đang chia sẻ màn hình</Text><Text style={styles.localSharingText}>KINI vẫn giữ màn hình điều khiển cuộc gọi. Nhấn Dừng chia sẻ hoặc phím Quay lại để trở về gọi video.</Text></View> : null}
      {previewStream ? <RtcVideo stream={previewStream} mirrored={previewMirrored} zOrder={1} style={styles.local} /> : null}
      {incoming ? <View style={styles.incomingIdentity}><View style={styles.avatarRing}><Avatar initials={initials} color={color} imageUri={avatarUrl} size={88} /></View><Text numberOfLines={1} style={styles.incomingName}>{title}</Text><Text style={styles.incomingState}>{callStatus(call, true)}</Text></View> : <View style={styles.top}><View style={styles.topIdentity}><Avatar initials={initials} color={color} imageUri={avatarUrl} size={40} /><View style={styles.topCopy}><Text numberOfLines={1} style={styles.name}>{title}</Text><Text style={styles.state}>{callStatus(call, false)}</Text></View></View>{call.status === "connected" ? <View style={styles.ping}><MaterialIcons name="network-check" size={14} color="#D8EEFF" /><Text style={styles.pingText}>{formatCallPing(call.pingMs)}</Text></View> : null}</View>}
      <View style={styles.bottom}>
        {incoming ? <><Text style={styles.actionHint}>Trả lời bằng video hoặc từ chối</Text><IncomingCallActions mode="video" onDecline={call.declineIncomingCall} onAccept={call.acceptIncomingCall} /></> : <><ScreenShare active={call.isScreenSharing} onToggle={() => void call.toggleScreenShare()} /><CallControls muted={call.muted} cameraEnabled={call.cameraEnabled} speakerEnabled={call.speakerEnabled} video onMute={call.toggleMute} onCamera={call.toggleCamera} onSwitchCamera={call.switchCamera} onSpeaker={call.toggleSpeaker} onEnd={call.endCall} /></>}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: "#071729", paddingHorizontal: 16 },
  remote: { ...StyleSheet.absoluteFillObject },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 16, 32, 0.25)" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 10, borderRadius: 18, backgroundColor: "rgba(4, 20, 38, 0.54)" },
  topIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  topCopy: { flex: 1 },
  name: { color: kiniColors.white, fontSize: 17, fontWeight: "900" },
  state: { color: "#D0E1F1", fontSize: 12, fontWeight: "600", marginTop: 2 },
  ping: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: "rgba(52,139,211,0.70)" },
  pingText: { color: kiniColors.white, fontSize: 11, fontWeight: "800" },
  local: { position: "absolute", right: 18, top: 110, width: 108, height: 156, borderRadius: 16, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.94)", backgroundColor: "#163B5F", elevation: 6 },
  incomingIdentity: { alignItems: "center", marginTop: "auto", marginBottom: "auto" },
  cameraOff: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 8 },
  cameraOffTitle: { color: kiniColors.white, fontSize: 23, fontWeight: "900", marginTop: 10 },
  cameraOffText: { color: "#C7DBED", fontSize: 14, fontWeight: "600" },
  localSharing: { position: "absolute", left: 28, right: 28, top: "42%", alignItems: "center", gap: 7 }, localSharingTitle: { color: kiniColors.white, fontSize: 18, fontWeight: "900" }, localSharingText: { maxWidth: 280, color: "#C7DBED", fontSize: 13, lineHeight: 19, fontWeight: "600", textAlign: "center" },
  avatarRing: { padding: 7, borderRadius: 52, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  incomingName: { color: kiniColors.white, maxWidth: 300, fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 18 },
  incomingState: { color: "#D2E3F2", fontSize: 15, fontWeight: "600", marginTop: 7 },
  bottom: { alignItems: "center", marginTop: "auto", paddingTop: 18, paddingBottom: 3, gap: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "rgba(4, 21, 38, 0.62)" },
  actionHint: { color: "#C5D9EA", fontSize: 12, fontWeight: "700" },
});
