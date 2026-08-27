import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { createContext, useContext, type PropsWithChildren } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { VideoCall } from "./components/VideoCall";
import { VoiceCall } from "./components/VoiceCall";
import { useWebRTC } from "./hooks/useWebRTC";
import { useCallSounds } from "./hooks/useCallSounds";
import { Avatar, kiniColors } from "@/components/kini-ui";
import { formatCallDuration } from "@/lib/kini-call-format";

type CallController = ReturnType<typeof useWebRTC>;
const CallContext = createContext<CallController | null>(null);

function CallOverlay({ call }: { call: CallController }) {
  const peer = call.peer ?? { title: "Bạn KINI", initials: "K", color: "#1677FF" };
  const full = call.mode === "voice" ? <VoiceCall call={call} title={peer.title} initials={peer.initials} color={peer.color} avatarUrl={peer.avatarUrl} /> : call.mode === "video" ? <VideoCall call={call} title={peer.title} initials={peer.initials} color={peer.color} avatarUrl={peer.avatarUrl} /> : null;
  if (!call.minimized || call.status === "idle") return full;
  return <><MinimizedCall call={call} peer={peer} />{full}</>;
}

function MinimizedCall({ call, peer }: { call: CallController; peer: { title: string; initials: string; color: string; avatarUrl?: string | null } }) {
  const subtitle = call.isScreenSharing || call.remoteScreenStream ? "Chia sẻ màn hình · Chạm để quay lại" : call.status === "connected" ? `Đang gọi · ${formatCallDuration(call.elapsedSeconds)}` : "Đang kết nối…";
  return <TouchableOpacity onPress={call.restoreCall} style={styles.minimized} accessibilityRole="button" accessibilityLabel="Phóng to cuộc gọi"><Avatar initials={peer.initials} color={peer.color} imageUri={peer.avatarUrl} size={34} /><View style={styles.minimizedCopy}><Text numberOfLines={1} style={styles.minimizedName}>{peer.title}</Text><Text numberOfLines={1} style={styles.minimizedState}>{subtitle}</Text></View><MaterialIcons name={call.isScreenSharing || call.remoteScreenStream ? "screen-share" : "open-in-full"} size={20} color={kiniColors.white} /></TouchableOpacity>;
}

export function CallProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth();
  const call = useWebRTC(isAuthenticated);
  useCallSounds(call.status, call.direction, call.mode);
  return <CallContext.Provider value={call}>{children}<CallOverlay call={call} /></CallContext.Provider>;
}

export function useKiniCall() {
  const call = useContext(CallContext);
  if (!call) throw new Error("CallProvider chưa được khởi tạo.");
  return call;
}

const styles = StyleSheet.create({
  minimized: { position: "absolute", zIndex: 30, right: 14, bottom: 88, minWidth: 225, maxWidth: "78%", minHeight: 62, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center", flexDirection: "row", gap: 9, borderRadius: 18, backgroundColor: kiniColors.navy, elevation: 10 }, minimizedCopy: { flex: 1 }, minimizedName: { color: kiniColors.white, fontSize: 15, fontWeight: "900" }, minimizedState: { marginTop: 2, color: "#C9DCEC", fontSize: 11, fontWeight: "700" },
});
