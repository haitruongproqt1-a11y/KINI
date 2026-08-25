import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type ReactNode } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from "react-native";

export const kiniColors = {
  blue: "#1677FF",
  navy: "#12263F",
  mist: "#EAF3FF",
  cloud: "#F6F8FC",
  line: "#E7ECF4",
  muted: "#718096",
  green: "#24B47E",
  coral: "#F05B61",
  white: "#FFFFFF",
};

export function Avatar({ initials, color, size = 48 }: { initials: string; color: string; size?: number }) {
  return (
    <View style={[styles.avatar, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33 }]}>{initials}</Text>
    </View>
  );
}

export function IconButton({ icon, label, onPress, tint = kiniColors.navy, size = 23 }: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  onPress: () => void;
  tint?: string;
  size?: number;
}) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} activeOpacity={0.6} style={styles.iconButton}>
      <MaterialIcons name={icon} size={size} color={tint} />
    </TouchableOpacity>
  );
}

export function FormField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor="#98A5B5" style={styles.fieldInput} {...props} />
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} activeOpacity={0.84} style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function AuthLink({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} activeOpacity={0.65}><Text style={styles.authLink}>{children}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: kiniColors.white, fontWeight: "800", letterSpacing: 0.2 },
  iconButton: { alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 21 },
  fieldGroup: { gap: 7 },
  fieldLabel: { color: kiniColors.navy, fontSize: 14, fontWeight: "700" },
  fieldInput: { height: 52, borderColor: kiniColors.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, color: kiniColors.navy, backgroundColor: kiniColors.white, fontSize: 16 },
  primaryButton: { height: 54, borderRadius: 16, backgroundColor: kiniColors.blue, alignItems: "center", justifyContent: "center", shadowColor: kiniColors.blue, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  primaryButtonDisabled: { backgroundColor: "#91BFFF", shadowOpacity: 0 },
  primaryButtonText: { color: kiniColors.white, fontSize: 16, fontWeight: "800" },
  authLink: { color: kiniColors.blue, fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: 4 },
});
