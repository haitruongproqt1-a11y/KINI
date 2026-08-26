import { StyleSheet, View } from "react-native";
import { RTCView } from "react-native-webrtc";

export function RtcVideo({ stream, mirrored = false, style }: { stream: any; mirrored?: boolean; style?: object }) {
  if (!stream) return <View style={[styles.empty, style]} />;
  return <RTCView streamURL={stream.toURL()} objectFit="cover" mirror={mirrored} style={[styles.video, style]} />;
}

const styles = StyleSheet.create({
  video: { backgroundColor: "#071729" },
  empty: { backgroundColor: "#102A43" },
});
