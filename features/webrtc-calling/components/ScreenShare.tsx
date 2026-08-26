import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { kiniColors } from "@/components/kini-ui";

export function ScreenShare({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={active ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"} onPress={onToggle} style={[styles.button, active && styles.active]}>
    <MaterialIcons name={active ? "stop-screen-share" : "screen-share"} size={18} color={kiniColors.white} />
    <Text style={styles.label}>{active ? "Dừng chia sẻ" : "Chia sẻ màn hình"}</Text>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  button: { minHeight: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", flexDirection: "row", gap: 7, alignItems: "center" },
  active: { backgroundColor: kiniColors.coral },
  label: { color: kiniColors.white, fontSize: 12, fontWeight: "800" },
});
