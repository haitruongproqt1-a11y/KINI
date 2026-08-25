import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";

import { kiniColors } from "@/components/kini-ui";
import { deliveryLabel } from "@/shared/kini-chat";

export function KiniMessageStatus({ status }: { status?: "sent" | "delivered" | "read" }) {
  if (!status) return null;
  const label = deliveryLabel(status);
  const icon = status === "sent" ? "done" : "done-all";
  const color = status === "read" ? "#9DFFE8" : "#D9E9FF";
  return <View style={styles.status}><MaterialIcons name={icon} size={13} color={color} /><Text style={[styles.label, { color }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({ status: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 }, label: { fontSize: 10, fontWeight: "700" } });
