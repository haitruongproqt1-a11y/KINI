import { eq, inArray } from "drizzle-orm";

import { pushDevices } from "../drizzle/schema";
import { getDb } from "./db";

type PushPayload = { recipientUserIds: number[]; title: string; body: string; conversationId: number };
type SecurityPayload = { userId: number; deviceName: string };
type IncomingCallPayload = { recipientUserId: number; callerName: string; conversationId: number; callId: string; mode: "voice" | "video" };

export const isExpoPushToken = (token: string) => /^(Expo|Exponent)PushToken\[[^\]]+\]$/.test(token);

export async function sendMessagePushNotification(payload: PushPayload) {
  if (!payload.recipientUserIds.length) return { delivered: 0 };
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(inArray(pushDevices.userId, payload.recipientUserIds));
  const messages = devices.filter((device) => isExpoPushToken(device.expoPushToken)).map((device) => ({
    to: device.expoPushToken,
    sound: "default",
    title: payload.title,
    body: payload.body.slice(0, 160),
    priority: "high",
    channelId: "messages",
    data: { type: "chat_message", conversationId: String(payload.conversationId) },
  }));
  if (!messages.length) return { delivered: 0 };
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(messages) });
    if (!response.ok) console.warn("[Push] Expo gateway returned", response.status);
    return { delivered: messages.length };
  } catch (error) {
    console.warn("[Push] Unable to deliver notification", error);
    return { delivered: 0 };
  }
}

export async function sendNewDeviceLoginPush(payload: SecurityPayload) {
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(eq(pushDevices.userId, payload.userId));
  const messages = devices.filter((device) => isExpoPushToken(device.expoPushToken)).map((device) => ({
    to: device.expoPushToken,
    sound: "default",
    title: "Cảnh báo đăng nhập KINI",
    body: `${payload.deviceName} vừa đăng nhập vào tài khoản của bạn. Phiên cũ đã được đăng xuất.`,
    priority: "high",
    channelId: "messages",
    data: { type: "new_device_login" },
  }));
  if (!messages.length) return { delivered: 0 };
  try {
    await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(messages) });
    return { delivered: messages.length };
  } catch (error) {
    console.warn("[Push] Unable to deliver device-login alert", error);
    return { delivered: 0 };
  }
}

/** Báo hệ điều hành cho người nhận khi app KINI không đang mở đúng cuộc trò chuyện. */
export async function sendIncomingCallPush(payload: IncomingCallPayload) {
  const db = await getDb();
  if (!db) return { delivered: 0 };
  const devices = await db.select().from(pushDevices).where(eq(pushDevices.userId, payload.recipientUserId));
  const messages = devices.filter((device) => isExpoPushToken(device.expoPushToken)).map((device) => ({
    to: device.expoPushToken,
    sound: "default",
    title: `Cuộc gọi ${payload.mode === "video" ? "video" : "thoại"} KINI`,
    body: `${payload.callerName} đang gọi cho bạn.`,
    priority: "high",
    channelId: "calls",
    categoryId: "incoming_call",
    data: { type: "incoming_call", conversationId: String(payload.conversationId), callId: payload.callId, mode: payload.mode, callerName: payload.callerName },
  }));
  if (!messages.length) return { delivered: 0 };
  try {
    await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(messages) });
    return { delivered: messages.length };
  } catch (error) {
    console.warn("[Push] Unable to deliver incoming call notification", error);
    return { delivered: 0 };
  }
}
