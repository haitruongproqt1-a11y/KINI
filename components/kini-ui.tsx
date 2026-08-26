import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { type ReactNode, useEffect, useState } from "react";
import { Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";

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

export function Avatar({ initials, color, size = 48, imageUri }: { initials: string; color: string; size?: number; imageUri?: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUri]);
  const showImage = Boolean(imageUri) && !imageFailed;
  return (
    <View style={[styles.avatar, { backgroundColor: color, width: size, height: size, borderRadius: size / 2 }]}> 
      {showImage ? <Image source={{ uri: imageUri! }} recyclingKey={imageUri!} cachePolicy="memory-disk" contentFit="cover" style={StyleSheet.absoluteFillObject} onError={() => setImageFailed(true)} /> : null}
      <Text style={[styles.avatarText, { fontSize: size * 0.33, opacity: showImage ? 0 : 1 }]}>{initials}</Text>
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

/** Khối bề mặt dùng chung cho các màn KINI mới. */
export function KiniCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Nút KINI chuẩn; mọi biến thể vẫn dùng bảng màu KINI thống nhất. */
export function KiniButton({ label, onPress, disabled = false, variant = "primary" }: { label: string; onPress: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "danger" }) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} activeOpacity={0.82} style={[styles.kiniButton, isPrimary && styles.kiniButtonPrimary, isDanger && styles.kiniButtonDanger, variant === "secondary" && styles.kiniButtonSecondary, disabled && styles.primaryButtonDisabled]}>
    <Text style={[styles.kiniButtonText, !isPrimary && !isDanger && styles.kiniButtonSecondaryText]}>{label}</Text>
  </TouchableOpacity>;
}

/** Bottom sheet KINI tái sử dụng cho quyền, bộ lọc và quyền riêng tư. */
export function KiniBottomSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableWithoutFeedback onPress={onClose}><View style={styles.sheetBackdrop} /></TouchableWithoutFeedback>
    <View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetTitleRow}><Text style={styles.sheetTitle}>{title}</Text><IconButton icon="close" label="Đóng" onPress={onClose} /></View>{children}</View>
  </Modal>;
}

/** Switch KINI dùng cho các lựa chọn quyền riêng tư. */
export function KiniSwitch({ label, description, value, onValueChange }: { label: string; description?: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.switchRow}><View style={styles.switchCopy}><Text style={styles.switchLabel}>{label}</Text>{description ? <Text style={styles.switchDescription}>{description}</Text> : null}</View><Switch value={value} onValueChange={onValueChange} trackColor={{ false: kiniColors.line, true: kiniColors.blue }} thumbColor={kiniColors.white} /></View>;
}

export function AuthLink({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} activeOpacity={0.65}><Text style={styles.authLink}>{children}</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarText: { color: kiniColors.white, fontWeight: "800", letterSpacing: 0.2 },
  iconButton: { alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 21 },
  fieldGroup: { gap: 7 },
  fieldLabel: { color: kiniColors.navy, fontSize: 14, fontWeight: "700" },
  fieldInput: { height: 52, borderColor: kiniColors.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, color: kiniColors.navy, backgroundColor: kiniColors.white, fontSize: 16 },
  primaryButton: { height: 54, borderRadius: 16, backgroundColor: kiniColors.blue, alignItems: "center", justifyContent: "center", shadowColor: kiniColors.blue, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  primaryButtonDisabled: { backgroundColor: "#91BFFF", shadowOpacity: 0 },
  primaryButtonText: { color: kiniColors.white, fontSize: 16, fontWeight: "800" },
  authLink: { color: kiniColors.blue, fontSize: 14, fontWeight: "700", textAlign: "center", paddingVertical: 4 },
  card: { backgroundColor: kiniColors.white, borderRadius: 18, borderColor: kiniColors.line, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  kiniButton: { minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  kiniButtonPrimary: { backgroundColor: kiniColors.blue },
  kiniButtonSecondary: { backgroundColor: kiniColors.mist },
  kiniButtonDanger: { backgroundColor: kiniColors.coral },
  kiniButtonText: { color: kiniColors.white, fontSize: 14, fontWeight: "800" },
  kiniButtonSecondaryText: { color: kiniColors.blue },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(18,38,63,0.35)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: kiniColors.white, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 26, gap: 14 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", backgroundColor: kiniColors.line },
  sheetTitleRow: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { color: kiniColors.navy, fontSize: 18, fontWeight: "900" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  switchCopy: { flex: 1, gap: 4 },
  switchLabel: { color: kiniColors.navy, fontSize: 15, fontWeight: "800" },
  switchDescription: { color: kiniColors.muted, fontSize: 12, lineHeight: 17 },
});
