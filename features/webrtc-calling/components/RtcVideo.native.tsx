import { StyleSheet, View } from "react-native";
import { RTCView } from "react-native-webrtc";

export function RtcVideo({ stream, mirrored = false, objectFit = "cover", muted = false, style, zOrder = 0 }: { stream: any; mirrored?: boolean; objectFit?: "cover" | "contain"; muted?: boolean; style?: object; zOrder?: number }) {
  try {
    if (!stream || typeof stream.toURL !== "function") return <View style={[styles.empty, style]} />;
    const tracks = typeof stream.getTracks === "function" ? stream.getTracks() : [];
    if (tracks.length > 0 && tracks.every((track: { readyState?: string }) => track?.readyState === "ended")) {
      return <View style={[styles.empty, style]} />;
    }
    const streamURL = stream.toURL();
    if (typeof streamURL !== "string" || !streamURL) return <View style={[styles.empty, style]} />;
    return <RTCView streamURL={streamURL} objectFit={objectFit} mirror={mirrored} zOrder={zOrder} style={[styles.video, style]} {...(muted ? { muted: true } : {})} />;
  } catch {
    return <View style={[styles.empty, style]} />;
  }
}

const styles = StyleSheet.create({
  video: { backgroundColor: "#071729" },
  empty: { backgroundColor: "#102A43" },
});
