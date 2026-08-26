import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { kiniColors } from "@/components/kini-ui";

type Props = {
  muted: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  video: boolean;
  onMute: () => void;
  onCamera?: () => void;
  onSwitchCamera?: () => void;
  onSpeaker: () => void;
  onEnd: () => void | Promise<void>;
};

function Control({ icon, label, active = false, danger = false, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; active?: boolean; danger?: boolean; onPress: () => void | Promise<void> }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={() => void onPress()} activeOpacity={0.75} style={styles.control}>
    <View style={[styles.icon, active && styles.iconActive, danger && styles.iconDanger]}><MaterialIcons name={icon} size={25} color={danger || active ? kiniColors.white : "#0F2742"} /></View>
    <Text numberOfLines={1} style={styles.label}>{label}</Text>
  </TouchableOpacity>;
}

export function IncomingCallActions({ mode, onDecline, onAccept }: { mode: "voice" | "video"; onDecline: () => void | Promise<void>; onAccept: () => void | Promise<void> }) {
  return <View style={styles.incomingRow}>
    <Control icon="call-end" label="Từ chối" danger onPress={onDecline} />
    <Control icon={mode === "video" ? "videocam" : "call"} label="Nhận cuộc gọi" active onPress={onAccept} />
  </View>;
}

export function CallControls({ muted, cameraEnabled, speakerEnabled, video, onMute, onCamera, onSwitchCamera, onSpeaker, onEnd }: Props) {
  return <View style={styles.row}>
    <Control icon={muted ? "mic-off" : "mic"} label={muted ? "Bật mic" : "Tắt mic"} active={muted} onPress={onMute} />
    <Control icon={speakerEnabled ? "volume-up" : "hearing"} label="Loa ngoài" active={speakerEnabled} onPress={onSpeaker} />
    {video && onCamera ? <Control icon={cameraEnabled ? "videocam" : "videocam-off"} label={cameraEnabled ? "Tắt cam" : "Bật cam"} active={!cameraEnabled} onPress={onCamera} /> : null}
    {video && onSwitchCamera ? <Control icon="flip-camera-android" label="Đổi cam" onPress={onSwitchCamera} /> : null}
    <Control icon="call-end" label="Kết thúc" danger onPress={onEnd} />
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 4, width: "100%" },
  incomingRow: { flexDirection: "row", justifyContent: "space-between", width: 216 },
  control: { alignItems: "center", flex: 1, minWidth: 57, gap: 7 },
  icon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  iconActive: { backgroundColor: "#1677FF", borderColor: "#63A6FF" },
  iconDanger: { backgroundColor: "#EF5B63", borderColor: "#FF989D" },
  label: { color: kiniColors.white, fontSize: 11, fontWeight: "800", textAlign: "center", letterSpacing: 0.1 },
});
