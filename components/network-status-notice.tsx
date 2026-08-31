import { useNetworkState } from "expo-network";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { kiniColors } from "@/components/kini-ui";

export function NetworkStatusNotice() {
  const network = useNetworkState();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const offline = network.isInternetReachable === false || network.isConnected === false;

  useEffect(() => {
    if (offline) {
      setVisible(true);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [offline, opacity]);

  if (!visible) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.wrapper, { opacity }]}>
      <View style={styles.notice}>
        <View style={styles.dot} />
        <Text style={styles.text}>Mất kết nối mạng</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: "absolute", top: 54, right: 14, zIndex: 1000 },
  notice: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: kiniColors.navy, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: kiniColors.coral },
  text: { color: kiniColors.white, fontSize: 12, fontWeight: "600" },
});

export default NetworkStatusNotice;

export function ChatSkeleton() {
  return (
    <View style={skeletonStyles.container} accessibilityLabel="Đang tải cuộc trò chuyện">
      <View style={skeletonStyles.header}>
        <View style={skeletonStyles.avatar} />
        <View style={skeletonStyles.headerCopy}>
          <View style={[skeletonStyles.line, skeletonStyles.titleLine]} />
          <View style={[skeletonStyles.line, skeletonStyles.subtitleLine]} />
        </View>
      </View>
      <View style={skeletonStyles.thread}>
        <View style={[skeletonStyles.bubble, skeletonStyles.leftBubble]} />
        <View style={[skeletonStyles.bubble, skeletonStyles.rightBubble]} />
        <View style={[skeletonStyles.bubble, skeletonStyles.leftBubble, skeletonStyles.shortBubble]} />
        <View style={[skeletonStyles.bubble, skeletonStyles.rightBubble, skeletonStyles.tallBubble]} />
      </View>
      <View style={skeletonStyles.composer}>
        <View style={[skeletonStyles.line, skeletonStyles.composerLine]} />
        <View style={skeletonStyles.sendButton} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: kiniColors.cloud, paddingTop: 18 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: kiniColors.line },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: kiniColors.line },
  headerCopy: { marginLeft: 12, gap: 8 },
  line: { backgroundColor: kiniColors.line, borderRadius: 6 },
  titleLine: { width: 142, height: 14 },
  subtitleLine: { width: 92, height: 10 },
  thread: { flex: 1, justifyContent: "flex-end", gap: 12, paddingHorizontal: 18, paddingVertical: 24 },
  bubble: { height: 46, borderRadius: 18, backgroundColor: kiniColors.line },
  leftBubble: { width: "62%", alignSelf: "flex-start" },
  rightBubble: { width: "70%", alignSelf: "flex-end" },
  shortBubble: { width: "42%" },
  tallBubble: { height: 62 },
  composer: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: kiniColors.white, borderTopWidth: 1, borderTopColor: kiniColors.line },
  composerLine: { flex: 1, height: 40, borderRadius: 20 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: kiniColors.line },
});

