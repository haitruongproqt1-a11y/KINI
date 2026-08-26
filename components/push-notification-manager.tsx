import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
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
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  const result = projectId ? await Notifications.getExpoPushTokenAsync({ projectId }) : await Notifications.getExpoPushTokenAsync();
  return result.data;
}

export function PushNotificationManager() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const call = useKiniCall();
  const registeredForUser = useRef<number | null>(null);
  const register = trpc.push.register.useMutation();
  useEffect(() => {
    if (!isAuthenticated || !user || registeredForUser.current === user.id) return;
    void getPushToken().then((token) => {
      if (!token) return;
      registeredForUser.current = user.id;
      register.mutate({ expoPushToken: token, platform: Platform.OS === "ios" ? "ios" : "android" });
    });
  }, [isAuthenticated, register, user]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const openConversation = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as { conversationId?: string | number; callId?: string; type?: string } | undefined;
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
  }, [call, router]);
  return null;
}
