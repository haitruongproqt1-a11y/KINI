import { eq, inArray } from "drizzle-orm";
import { importPKCS8, SignJWT } from "jose";

import { pushDevices } from "../drizzle/schema";
import { getDb } from "./db";

type PushPayload = { recipientUserIds: number[]; title: string; body: string; conversationId: number };
type SecurityPayload = { userId: number; deviceName: string };
type IncomingCallPayload = { recipientUserId: number; callerName: string; callerAvatar?: string | null; conversationId: number; callId: string; mode: "voice" | "video" };
type EndedCallPayload = { recipientUserId: number; callId: string };
type MissedCallPayload = { recipientUserId: number; callerName: string; conversationId: number; callId: string; mode: "voice" | "video" };
type FirebaseServiceAccount = { project_id: string; client_email: string; private_key: string; token_uri?: string };
type GenericNotification = { title: string; body: string; channelId: "messages" | "calls"; data: Record<string, string> };

let fcmAccessTokenCache: { token: string; expiresAt: number } | null = null;
const kiniPublicUrl = "https://kinimobile-cr7qe9vh.manus.space";

export const isExpoPushToken = (token: string) => /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token);
export const isFcmPushToken = (token: string) => !isExpoPushToken(token) && /^[A-Za-z0-9_:\-]{32,512}$/.test(token);

function readFirebaseServiceAccount(): FirebaseServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const credentials = JSON.parse(raw) as Partial<FirebaseServiceAccount>;
    if (!credentials.project_id || !credentials.client_email || !credentials.private_key) return null;
    return credentials as FirebaseServiceAccount;
  } catch {
    console.warn("[Push] Firebase service account JSON không hợp lệ.");
    return null;
  }
}

async function getFcmAccessToken() {
  if (fcmAccessTokenCache && fcmAccessTokenCache.expiresAt > Date.now() + 60_000) return fcmAccessTokenCache.token;
  const credentials = readFirebaseServiceAccount();
  if (!credentials) return null;
  try {
    const now = Math.floor(Date.now() / 1000);
    const key = await importPKCS8(credentials.private_key, "RS256");
    const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(credentials.client_email)
      .setSubject(credentials.client_email)
      .setAudience(credentials.token_uri ?? "https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3_500)
      .sign(key);
    const response = await fetch(credentials.token_uri ?? "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    });
    if (!response.ok) {
      console.warn("[Push] Firebase OAuth không trả access token.");
      return null;
    }
    const responseJson = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!responseJson.access_token) return null;
    fcmAccessTokenCache = { token: responseJson.access_token, expiresAt: Date.now() + Math.max(60, responseJson.expires_in ?? 3_500) * 1_000 };
    return fcmAccessTokenCache.token;
  } catch {
    console.warn("[Push] Không thể ký yêu cầu Firebase OAuth.");
    return null;
  }
}

async function sendFcmPushNotification(token: string, notification: GenericNotification) {
  const credentials = readFirebaseServiceAccount();
  const accessToken = await getFcmAccessToken();
  if (!credentials || !accessToken) return false;
  try {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(credentials.project_id)}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          data: notification.data,
          ...(notification.channelId === "messages" ? {
            notification: { title: notification.title, body: notification.body.slice(0, 160) },
          } : {}),
          android: {
            priority: "HIGH",
            ...(notification.channelId === "messages" ? {
              notification: {
                channel_id: notification.channelId,
                sound: "default",
                default_sound: true,
                default_vibrate_timings: true,
                notification_priority: "PRIORITY_MAX",
                visibility: "PRIVATE",
              },
            } : {}),
          },
        },
      }),
    });
    if (!response.ok) console.warn("[Push] FCM từ chối một notification Android.");
    return response.ok;
  } catch {
    console.warn("[Push] Không thể gửi FCM notification Android.");
    return false;
  }
}

async function sendExpoPushNotifications(tokens: string[], notification: GenericNotification) {
  if (!tokens.length) return 0;
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(tokens.map((to) => ({ to, sound: "default", title: notification.title, body: notification.body.slice(0, 160), priority: "high", channelId: notification.channelId, categoryId: notification.data.type === "incoming_call" ? "incoming_call" : undefined, data: notification.data }))),
    });
    if (!response.ok) console.warn("[Push] Expo gateway không nhận notification.");
    return response.ok ? tokens.length : 0;
  } catch {
    console.warn("[Push] Không thể gửi Expo notification.");
    return 0;
  }
}

async function sendToDevices(devices: Array<{ expoPushToken: string }>, notification: GenericNotification) {
  const expoTokens = devices.map((device) => device.expoPushToken).filter(isExpoPushToken);
  const fcmTokens = devices.map((device) => device.expoPushToken).filter(isFcmPushToken);
  const expoDelivered = await sendExpoPushNotifications(expoTokens, notification);
  const fcmDelivered = await Promise.all(fcmTokens.map((token) => sendFcmPushNotification(token, notification)));
  return expoDelivered + fcmDelivered.filter(Boolean).length;
}

export async function sendMessagePushNotification(payload: PushPayload) {
  if (!payload.recipientUserIds.length) return { delivered: 0 };
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(inArray(pushDevices.userId, payload.recipientUserIds));
  const delivered = await sendToDevices(devices, { title: payload.title, body: payload.body, channelId: "messages", data: { type: "chat_message", conversationId: String(payload.conversationId) } });
  return { delivered };
}

export async function sendNewDeviceLoginPush(payload: SecurityPayload) {
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(eq(pushDevices.userId, payload.userId));
  const notification: GenericNotification = { title: "Cảnh báo đăng nhập KINI", body: `${payload.deviceName} vừa đăng nhập vào tài khoản của bạn. Phiên cũ đã được đăng xuất.`, channelId: "messages", data: { type: "session_replaced", deviceName: payload.deviceName } };
  const expoDelivered = await sendExpoPushNotifications(devices.map((device) => device.expoPushToken).filter(isExpoPushToken), notification);
  // Native FCM dùng data-only để KiniFirebaseMessagingService tự xử lý logout/mở app, thay vì bị hệ thống giữ lại payload.
  const fcmDelivered = await Promise.all(devices.map((device) => device.expoPushToken).filter(isFcmPushToken).map((token) => sendFcmPushNotification(token, {
    ...notification,
    channelId: "calls",
  })));
  const delivered = expoDelivered + fcmDelivered.filter(Boolean).length;
  return { delivered };
}

/** Gửi notification nền khi KINI không có socket đang kết nối hoặc đã bị Android đóng. */
export async function sendIncomingCallPush(payload: IncomingCallPayload) {
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(eq(pushDevices.userId, payload.recipientUserId));
  const delivered = await sendToDevices(devices, {
    title: `Cuộc gọi ${payload.mode === "video" ? "video" : "thoại"} KINI`,
    body: `${payload.callerName} đang gọi cho bạn.`,
    channelId: "calls",
    data: {
      type: "incoming_call",
      conversationId: String(payload.conversationId),
      callId: payload.callId,
      mode: payload.mode,
      callerName: payload.callerName,
      callerAvatar: payload.callerAvatar?.startsWith("/") ? `${kiniPublicUrl}${payload.callerAvatar}` : (payload.callerAvatar ?? ""),
    },
  });
  return { delivered };
}

/** Báo gọi nhỡ riêng biệt; native FCM chỉ hiển thị notification này khi người nhận đã không trả lời. */
export async function sendMissedCallPush(payload: MissedCallPayload) {
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(eq(pushDevices.userId, payload.recipientUserId));
  const delivered = await sendToDevices(devices, {
    title: "Cuộc gọi nhỡ",
    body: `${payload.callerName} đã gọi cho bạn.`,
    channelId: "calls",
    data: { type: "missed_call", conversationId: String(payload.conversationId), callId: payload.callId, mode: payload.mode, callerName: payload.callerName },
  });
  return { delivered };
}

/** Chỉ gửi data-only đến native FCM token để đóng CallStyle/full-screen cũ, không tạo thông báo mới. */
export async function sendCallEndedPush(payload: EndedCallPayload) {
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(eq(pushDevices.userId, payload.recipientUserId));
  const fcmTokens = devices.map((device) => device.expoPushToken).filter(isFcmPushToken);
  const delivered = await Promise.all(fcmTokens.map((token) => sendFcmPushNotification(token, {
    title: "",
    body: "",
    channelId: "calls",
    data: { type: "call_ended", callId: payload.callId },
  })));
  return { delivered: delivered.filter(Boolean).length };
}
