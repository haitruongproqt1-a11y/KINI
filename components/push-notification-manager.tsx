import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as ExpoLinking from "expo-linking";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Alert, AppState, Linking, Platform } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import * as Api from "@/lib/_core/api";
import { trpc } from "@/lib/trpc";
import { invalidateKiniSession } from "@/lib/kini-session-events";
import { useKiniCall } from "@/features/webrtc-calling/call-provider";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }) });
}

async function getPushToken() {
  if (Platform.OS === "web" || !Device.isDevice) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", { name: "Tin nhắn KINI", importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], sound: "default" });
    await Notifications.setNotificationChannelAsync("calls", { name: "Cuộc gọi KINI", importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 500, 250, 500], sound: "default", lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC });
    await Notifications.setNotificationCategoryAsync("incoming_call", [
      { identifier: "ANSWER_CALL", buttonTitle: "Trả lời", options: { opensAppToForeground: true } },
      { identifier: "DECLINE_CALL", buttonTitle: "Từ chối", options: { isDestructive: true, opensAppToForeground: true } },
    ]);
  }
  const permissions = await Notifications.getPermissionsAsync();
  const finalStatus = permissions.status === "granted" ? permissions.status : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== "granted") return null;
  try {
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    const result = projectId ? await Notifications.getExpoPushTokenAsync({ projectId }) : await Notifications.getExpoPushTokenAsync();
    return result.data;
  } catch {
    // APK GitHub không dùng EAS project ID. Với google-services.json, Expo trả FCM token native.
    try {
      const nativeToken = await Notifications.getDevicePushTokenAsync();
      return typeof nativeToken.data === "string" ? nativeToken.data : null;
    } catch {
      console.warn("[Push] Chưa lấy được token Android; sẽ thử lại khi KINI được mở lần sau.");
      return null;
    }
  }
}

export function PushNotificationManager() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const call = useKiniCall();
  const registeredForUser = useRef<number | null>(null);
  const registrationInFlight = useRef(false);
  const register = trpc.push.register.useMutation();
  const confirmSessionWasReplaced = useCallback(async () => {
    try {
      // Push có thể được giao muộn. Chỉ xóa phiên khi backend xác nhận token hiện tại đã bị thu hồi.
      if (await Api.getMe()) return;
      if (Platform.OS !== "web") Alert.alert("Đăng nhập trên thiết bị khác", "Tài khoản KINI này vừa được đăng nhập ở thiết bị khác. Phiên trên điện thoại này đã được đăng xuất để bảo vệ tài khoản.");
      await invalidateKiniSession();
    } catch {
      // Mất mạng/5xx không phải bằng chứng session bị thay thế; giữ nguyên phiên đang dùng.
    }
  }, []);
  const registerPushToken = useCallback(async () => {
    if (!isAuthenticated || !user || registeredForUser.current === user.id || registrationInFlight.current) return;
    registrationInFlight.current = true;
    try {
      const token = await getPushToken();
      if (!token) return;
      await register.mutateAsync({ expoPushToken: token, platform: Platform.OS === "ios" ? "ios" : "android" });
      registeredForUser.current = user.id;
    } catch {
      console.warn("[Push] Chưa đăng ký token trên máy chủ; sẽ thử lại khi KINI được mở.");
    } finally {
      registrationInFlight.current = false;
    }
  }, [isAuthenticated, register, user]);
  useEffect(() => {
    void registerPushToken();
    if (Platform.OS === "web") return;
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void registerPushToken();
    });
    return () => appStateSubscription.remove();
  }, [registerPushToken]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const openConversation = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as { conversationId?: string | number; callId?: string; type?: string } | undefined;
      if (data?.type === "session_replaced") {
        void confirmSessionWasReplaced();
        return;
      }
      const rawId = data?.conversationId;
      const conversationId = typeof rawId === "string" ? rawId : typeof rawId === "number" ? String(rawId) : null;
      if (data?.type === "incoming_call") {
        if (response.actionIdentifier === "ANSWER_CALL" && data.callId) call.handleIncomingNotificationAction(data.callId, "answer");
        if (response.actionIdentifier === "DECLINE_CALL" && data.callId) call.handleIncomingNotificationAction(data.callId, "decline");
      }
      if (conversationId && response.actionIdentifier !== "ANSWER_CALL" && response.actionIdentifier !== "DECLINE_CALL") router.push(`/chat/${conversationId}` as never);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(openConversation);
    void Notifications.getLastNotificationResponseAsync().then((response) => { if (response) openConversation(response); });
    return () => subscription.remove();
  }, [call, confirmSessionWasReplaced, router]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { type?: string } | undefined;
      // App đang mở: phiên cũ bị thu hồi ngay khi server báo đăng nhập từ thiết bị mới.
      if (data?.type === "session_replaced") {
        void confirmSessionWasReplaced();
      }
    });
    return () => subscription.remove();
  }, [confirmSessionWasReplaced]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const handleIncomingCallUrl = (url: string | null) => {
      if (!url) return;
      const parsed = ExpoLinking.parse(url);
      if (parsed.hostname === "session-replaced") {
        void confirmSessionWasReplaced();
        return;
      }
      if (parsed.hostname !== "incoming-call") return;
      const callId = typeof parsed.queryParams?.callId === "string" ? parsed.queryParams.callId : null;
      const action = parsed.queryParams?.action;
      if (!callId || (action !== "answer" && action !== "decline")) return;
      call.handleIncomingNotificationAction(callId, action);
    };
    void Linking.getInitialURL().then(handleIncomingCallUrl);
    const linkSubscription = Linking.addEventListener("url", ({ url }) => handleIncomingCallUrl(url));
    return () => linkSubscription.remove();
  }, [call, confirmSessionWasReplaced]);
  return null;
}
