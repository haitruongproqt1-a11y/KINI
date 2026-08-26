import { StyleSheet, View } from "react-native";
import { RTCView } from "react-native-webrtc";

export function RtcVideo({ stream, mirrored = false, style }: { stream: any; mirrored?: boolean; style?: object }) {
  try {
    if (!stream || typeof stream.toURL !== "function") return <View style={[styles.empty, style]} />;
    const tracks = typeof stream.getTracks === "function" ? stream.getTracks() : [];
    if (tracks.length > 0 && tracks.every((track: { readyState?: string }) => track?.readyState === "ended")) {
      return <View style={[styles.empty, style]} />;
    }
    const streamURL = stream.toURL();
    if (typeof streamURL !== "string" || !streamURL) return <View style={[styles.empty, style]} />;
    return <RTCView streamURL={streamURL} objectFit="cover" mirror={mirrored} style={[styles.video, style]} />;
  } catch {
    return <View style={[styles.empty, style]} />;
  }
}

const styles = StyleSheet.create({
  video: { backgroundColor: "#071729" },
  empty: { backgroundColor: "#102A43" },
});
