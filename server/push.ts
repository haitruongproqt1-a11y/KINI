import { eq, inArray } from "drizzle-orm";

import { pushDevices } from "../drizzle/schema";
import { getDb } from "./db";

type PushPayload = { recipientUserIds: number[]; title: string; body: string; conversationId: number };

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
