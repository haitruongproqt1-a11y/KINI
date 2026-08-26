import { StyleSheet, View } from "react-native";

/** Web preview dùng khung trung tính; APK Android dùng RTCView native để render stream thực. */
export function RtcVideo({ style }: { stream: any; mirrored?: boolean; style?: object }) {
  return <View style={[styles.preview, style]} />;
}

const styles = StyleSheet.create({ preview: { backgroundColor: "#102A43" } });
