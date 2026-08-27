import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { createContext, useContext, useEffect, useMemo, useRef, type PropsWithChildren } from "react";
import { Alert, Animated, AppState, Dimensions, NativeModules, PanResponder, StyleSheet, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { VideoCall } from "./components/VideoCall";
import { VoiceCall } from "./components/VoiceCall";
import { useWebRTC } from "./hooks/useWebRTC";
import { useCallSounds } from "./hooks/useCallSounds";
import { Avatar, kiniColors } from "@/components/kini-ui";

type CallController = ReturnType<typeof useWebRTC>;
const CallContext = createContext<CallController | null>(null);
const screenShareOverlay = NativeModules.KiniScreenShareOverlay as {
  hasPermission?: () => Promise<boolean>;
  requestPermission?: () => Promise<boolean>;
  show?: (initials: string) => Promise<boolean>;
  hide?: () => Promise<boolean>;
} | undefined;

function CallOverlay({ call }: { call: CallController }) {
  const peer = call.peer ?? { title: "Bạn KINI", initials: "K", color: "#1677FF" };
  const full = call.mode === "voice" ? <VoiceCall call={call} title={peer.title} initials={peer.initials} color={peer.color} avatarUrl={peer.avatarUrl} /> : call.mode === "video" ? <VideoCall call={call} title={peer.title} initials={peer.initials} color={peer.color} avatarUrl={peer.avatarUrl} /> : null;
  if (!call.minimized || call.status === "idle") return full;
  return <><MinimizedCall call={call} peer={peer} />{full}</>;
}

function MinimizedCall({ call, peer }: { call: CallController; peer: { title: string; initials: string; color: string; avatarUrl?: string | null } }) {
  const translation = useRef(new Animated.ValueXY()).current;
  const offset = useRef({ x: 0, y: 0 });
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => translation.setValue({ x: 0, y: 0 }),
    onPanResponderMove: (_event, gesture) => translation.setValue({ x: gesture.dx, y: gesture.dy }),
    onPanResponderRelease: (_event, gesture) => {
      const { width, height } = Dimensions.get("window");
      // Nút chỉ nằm trong vùng nhìn thấy, không che navigation bar hoặc rơi ra ngoài màn hình.
      offset.current = {
        x: Math.min(0, Math.max(-(width - 78), offset.current.x + gesture.dx)),
        y: Math.min(0, Math.max(-(height - 170), offset.current.y + gesture.dy)),
      };
      translation.setOffset(offset.current);
      translation.setValue({ x: 0, y: 0 });
    },
    onPanResponderTerminate: () => translation.setValue({ x: 0, y: 0 }),
  }), [translation]);
  const sharing = call.isScreenSharing || call.remoteScreenStream;
  return <Animated.View {...panResponder.panHandlers} style={[styles.minimized, { transform: translation.getTranslateTransform() }]}><TouchableOpacity onPress={call.restoreCall} style={styles.minimizedTap} accessibilityRole="button" accessibilityLabel={sharing ? "Quay lại chia sẻ màn hình" : "Quay lại cuộc gọi"}><Avatar initials={peer.initials} color={peer.color} imageUri={peer.avatarUrl} size={44} /><View style={styles.minimizedIndicator}><MaterialIcons name={sharing ? "screen-share" : "open-in-full"} size={13} color={kiniColors.white} /></View></TouchableOpacity></Animated.View>;
}

export function CallProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth();
  const call = useWebRTC(isAuthenticated);
  const overlayPermissionPrompted = useRef(false);
  useCallSounds(call.status, call.direction, call.mode, call.isScreenSharing);
  useEffect(() => {
    if (call.isScreenSharing) {
      void screenShareOverlay?.hasPermission?.().then((granted) => {
        if (granted || overlayPermissionPrompted.current) return;
        overlayPermissionPrompted.current = true;
        Alert.alert(
          "Nút quay lại khi đang chia sẻ",
          "Cho phép KINI hiển thị nút tròn trên màn hình chính để quay lại cuộc gọi nhanh khi đang chia sẻ màn hình.",
          [
            { text: "Để sau", style: "cancel" },
            { text: "Cho phép", onPress: () => { void screenShareOverlay?.requestPermission?.().catch(() => undefined); } },
          ],
        );
      }).catch(() => undefined);
      return;
    }
    overlayPermissionPrompted.current = false;
    void screenShareOverlay?.hide?.().catch(() => undefined);
  }, [call.isScreenSharing]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      // Khi MediaProjection vừa xin quyền, Android chuyển inactive tạm thời; không được thu nhỏ sớm.
      // Chỉ background thật sự mới đưa call về bubble và mở overlay hệ thống nếu người dùng đã cấp quyền.
      if (nextState === "background" && call.status !== "idle") {
        call.minimizeCall();
        if (call.isScreenSharing) {
          call.keepAudioActive();
          void screenShareOverlay?.show?.(call.peer?.initials ?? "K").catch(() => undefined);
        }
      }
      if (nextState === "active") void screenShareOverlay?.hide?.().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [call.isScreenSharing, call.keepAudioActive, call.minimizeCall, call.peer?.initials, call.status]);
  return <CallContext.Provider value={call}>{children}<CallOverlay call={call} /></CallContext.Provider>;
}

export function useKiniCall() {
  const call = useContext(CallContext);
  if (!call) throw new Error("CallProvider chưa được khởi tạo.");
  return call;
}

const styles = StyleSheet.create({
  minimized: { position: "absolute", zIndex: 30, right: 14, bottom: 88, width: 58, height: 58, borderRadius: 29, padding: 4, backgroundColor: "rgba(18, 38, 63, 0.68)", borderWidth: 1, borderColor: "rgba(255,255,255,0.58)", elevation: 10 }, minimizedTap: { flex: 1, alignItems: "center", justifyContent: "center" }, minimizedIndicator: { position: "absolute", right: -1, bottom: -1, width: 21, height: 21, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.blue, borderColor: kiniColors.white, borderWidth: 1.5 },
});
