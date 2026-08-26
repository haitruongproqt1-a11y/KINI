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
  onEnd: () => void;
};

function Control({ icon, label, active = false, danger = false, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; active?: boolean; danger?: boolean; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.control}>
    <View style={[styles.icon, active && styles.iconActive, danger && styles.iconDanger]}><MaterialIcons name={icon} size={22} color={danger || active ? kiniColors.white : kiniColors.navy} /></View>
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>;
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
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 5 },
  control: { alignItems: "center", minWidth: 52, gap: 5 },
  icon: { width: 45, height: 45, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.white },
  iconActive: { backgroundColor: kiniColors.blue },
  iconDanger: { backgroundColor: kiniColors.coral },
  label: { color: kiniColors.white, fontSize: 10, fontWeight: "700", textAlign: "center" },
});
