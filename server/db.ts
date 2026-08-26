import { and, desc, eq, inArray, isNull, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import {
  androidReleaseSigning,
  conversationParticipants,
  conversations,
  friendRequests,
  type InsertUser,
  messageReceipts,
  messages,
  pushDevices,
  userSessions,
  userProfiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

const profileColors = ["#1677FF", "#6956E8", "#00A889", "#FF7A8A", "#D86FCA", "#F5A524"];
const receiptRank = { sent: 1, delivered: 2, read: 3 } as const;
const transientDatabaseCodes = new Set(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "PROTOCOL_CONNECTION_LOST", "ER_CON_COUNT_ERROR"]);

function normalizeSecret(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function hashSecret(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(normalizeSecret(value), salt, 64).toString("hex")}`;
}

function verifySecret(value: string, stored: string | null) {
  if (!stored) return false;
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, "hex");
  const actual = scryptSync(normalizeSecret(value), salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function normalizeUsername(username: string) {
  return username.trim().toLocaleLowerCase("en-US");
}

function databaseErrorCode(error: unknown) {
  return String((error as { code?: unknown } | null)?.code ?? "");
}

async function retryTransientDatabaseOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!transientDatabaseCodes.has(databaseErrorCode(error))) throw error;
    await new Promise((resolve) => setTimeout(resolve, 180));
    return operation();
  }
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Cơ sở dữ liệu KINI hiện chưa sẵn sàng.");
  return db;
}

export async function upsertAndroidReleaseSigning(input: { keyId: string; keystoreBase64: string; storePassword: string; keyAlias: string; keyPassword: string }) {
  const db = await requireDb();
  await db.insert(androidReleaseSigning).values(input).onDuplicateKeyUpdate({
    set: {
      keystoreBase64: input.keystoreBase64,
      storePassword: input.storePassword,
      keyAlias: input.keyAlias,
      keyPassword: input.keyPassword,
      updatedAt: new Date(),
    },
  });
}

export async function getAndroidReleaseSigning(keyId = "default") {
  const db = await requireDb();
  return (await db.select().from(androidReleaseSigning).where(eq(androidReleaseSigning.keyId, keyId)).limit(1))[0] ?? null;
}

export async function isDatabaseReady() {
  try {
    const db = await requireDb();
    await db.select({ id: users.id }).from(users).limit(1);
    return true;
  } catch (error) {
    console.warn("[Database] Health check failed:", error);
    return false;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createKiniPasswordAccount(input: { username: string; password: string; displayName: string; securityQuestion: string; securityAnswer: string }) {
  const db = await requireDb();
  const username = normalizeUsername(input.username);
  return retryTransientDatabaseOperation(async () => {
    const existing = await db.select().from(userProfiles).where(eq(userProfiles.username, username)).limit(1);
    if (existing[0]) throw new Error("Tên đăng nhập KINI đã được sử dụng.");

    const openId = `kini_${randomUUID()}`;
    let userId: number | null = null;
    try {
      const insertedUser = await db.insert(users).values({ openId, name: input.displayName, loginMethod: "kini_password", lastSignedIn: new Date() });
      userId = Number(insertedUser[0].insertId);
      await db.insert(userProfiles).values({ userId, username, displayName: input.displayName, avatarColor: profileColors[userId % profileColors.length], passwordHash: hashSecret(input.password), securityQuestion: input.securityQuestion, securityAnswerHash: hashSecret(input.securityAnswer), authKind: "kini_password", passwordUpdatedAt: new Date() });
      const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
      if (!user) throw new Error("Không thể hoàn tất tạo tài khoản KINI.");
      return user;
    } catch (error) {
      if (userId !== null) await db.delete(users).where(eq(users.id, userId)).catch(() => undefined);
      if (databaseErrorCode(error) === "ER_DUP_ENTRY") throw new Error("Tên đăng nhập KINI đã được sử dụng.");
      throw error;
    }
  });
}

export async function authenticateKiniPassword(username: string, password: string) {
  const db = await requireDb();
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.username, normalizeUsername(username))).limit(1))[0];
  if (!profile || profile.authKind !== "kini_password" || !verifySecret(password, profile.passwordHash)) return null;
  const user = (await db.select().from(users).where(eq(users.id, profile.userId)).limit(1))[0];
  if (!user) return null;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return user;
}

export async function getKiniRecoveryQuestion(username: string) {
  const db = await requireDb();
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.username, normalizeUsername(username))).limit(1))[0];
  if (!profile || profile.authKind !== "kini_password" || !profile.securityQuestion) return null;
  return { username: profile.username, securityQuestion: profile.securityQuestion };
}

export async function resetKiniPassword(input: { username: string; answer: string; nextPassword: string }) {
  const db = await requireDb();
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.username, normalizeUsername(input.username))).limit(1))[0];
  if (!profile || profile.authKind !== "kini_password" || !verifySecret(input.answer, profile.securityAnswerHash)) return false;
  await db.update(userProfiles).set({ passwordHash: hashSecret(input.nextPassword), passwordUpdatedAt: new Date() }).where(eq(userProfiles.id, profile.id));
  return true;
}

export async function registerPushDevice(userId: number, expoPushToken: string, platform: string) {
  const db = await requireDb();
  const existing = await db.select().from(pushDevices).where(eq(pushDevices.expoPushToken, expoPushToken)).limit(1);
  if (existing[0]) await db.update(pushDevices).set({ userId, platform, lastActiveAt: new Date() }).where(eq(pushDevices.id, existing[0].id));
  else await db.insert(pushDevices).values({ userId, expoPushToken, platform, lastActiveAt: new Date() });
  return { registered: true };
}

export async function removePushDevice(userId: number, expoPushToken: string) {
  const db = await requireDb();
  await db.delete(pushDevices).where(and(eq(pushDevices.userId, userId), eq(pushDevices.expoPushToken, expoPushToken)));
  return { removed: true };
}

export async function createExclusiveUserSession(userId: number, device: { deviceName: string; platform: string }) {
  const db = await requireDb();
  const now = new Date();
  const activeSessions = await db.select({ id: userSessions.id }).from(userSessions).where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
  await db.update(userSessions).set({ revokedAt: now }).where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
  const id = randomUUID();
  await db.insert(userSessions).values({ id, userId, deviceName: device.deviceName.slice(0, 128), platform: device.platform.slice(0, 24) });
  return { id, replacedSessions: activeSessions.length };
}

export async function validateUserSession(userId: number, sessionId: string) {
  const db = await requireDb();
  const session = await db.select().from(userSessions).where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId), isNull(userSessions.revokedAt))).limit(1);
  if (!session[0]) return false;
  await db.update(userSessions).set({ lastActiveAt: new Date() }).where(eq(userSessions.id, sessionId));
  return true;
}

export async function listUserSessions(userId: number) {
  const db = await requireDb();
  return db.select().from(userSessions).where(eq(userSessions.userId, userId)).orderBy(desc(userSessions.lastActiveAt)).limit(30);
}

export async function updateActiveUserSessionDevice(userId: number, sessionId: string, device: { deviceName: string; platform: string }) {
  const db = await requireDb();
  await db.update(userSessions).set({
    deviceName: device.deviceName.slice(0, 128),
    platform: device.platform.slice(0, 24),
    lastActiveAt: new Date(),
  }).where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
  return { updated: true } as const;
}

export async function revokeUserSession(userId: number, sessionId: string) {
  const db = await requireDb();
  await db.update(userSessions).set({ revokedAt: new Date() }).where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
  return { revoked: true } as const;
}

export async function getOrCreateProfile(userId: number, fallbackName?: string | null) {
  const db = await requireDb();
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];

  const generatedUsername = `kini${userId}`;
  await db.insert(userProfiles).values({
    userId,
    username: generatedUsername,
    displayName: fallbackName?.trim().slice(0, 128) || "Thành viên KINI",
    avatarColor: profileColors[userId % profileColors.length],
  });
  const created = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (!created[0]) throw new Error("Không thể tạo hồ sơ KINI.");
  return created[0];
}

export async function updateProfile(userId: number, input: { username: string; displayName: string; avatarColor?: string; securityQuestion?: string; securityAnswerHash?: string }) {
  const db = await requireDb();
  const duplicate = await db.select().from(userProfiles).where(eq(userProfiles.username, input.username)).limit(1);
  if (duplicate[0] && duplicate[0].userId !== userId) throw new Error("Tên người dùng KINI đã được sử dụng.");
  await getOrCreateProfile(userId, input.displayName);
  await db.update(userProfiles).set({
    username: input.username,
    displayName: input.displayName,
    ...(input.avatarColor ? { avatarColor: input.avatarColor } : {}),
    ...(input.securityQuestion !== undefined ? { securityQuestion: input.securityQuestion } : {}),
    ...(input.securityAnswerHash !== undefined ? { securityAnswerHash: input.securityAnswerHash } : {}),
  }).where(eq(userProfiles.userId, userId));
  return getOrCreateProfile(userId);
}

export async function updateSecurityQuestion(userId: number, input: { securityQuestion: string; securityAnswer: string }) {
  const db = await requireDb();
  const profile = await getOrCreateProfile(userId);
  await db.update(userProfiles).set({
    securityQuestion: input.securityQuestion,
    securityAnswerHash: hashSecret(input.securityAnswer),
  }).where(eq(userProfiles.id, profile.id));
  return { updated: true } as const;
}

export async function searchProfiles(currentUserId: number, query: string) {
  const db = await requireDb();
  const clean = query.trim();
  if (clean.length < 2) return [];
  const candidates = await db.select().from(userProfiles).where(and(
    ne(userProfiles.userId, currentUserId),
    or(like(userProfiles.username, `%${clean}%`), like(userProfiles.displayName, `%${clean}%`)),
  )).limit(30);
  return Promise.all(candidates.map(async (profile) => ({
    ...profile,
    relation: await getRelation(currentUserId, profile.userId),
  })));
}

export async function getRelation(userId: number, otherUserId: number) {
  const db = await requireDb();
  const records = await db.select().from(friendRequests).where(or(
    and(eq(friendRequests.fromUserId, userId), eq(friendRequests.toUserId, otherUserId)),
    and(eq(friendRequests.fromUserId, otherUserId), eq(friendRequests.toUserId, userId)),
  )).limit(2);
  const accepted = records.find((record) => record.status === "accepted");
  if (accepted) return "friends" as const;
  const incoming = records.find((record) => record.fromUserId === otherUserId && record.status === "pending");
  if (incoming) return "incoming" as const;
  const outgoing = records.find((record) => record.fromUserId === userId && record.status === "pending");
  if (outgoing) return "outgoing" as const;
  return "none" as const;
}

export async function sendFriendRequest(fromUserId: number, toUserId: number) {
  const db = await requireDb();
  if (fromUserId === toUserId) throw new Error("Bạn không thể tự kết bạn với chính mình.");
  const relation = await getRelation(fromUserId, toUserId);
  if (relation === "friends") throw new Error("Hai tài khoản đã là bạn bè.");
  if (relation === "outgoing") throw new Error("Lời mời kết bạn đang chờ phản hồi.");
  if (relation === "incoming") {
    await respondToFriendRequest(fromUserId, toUserId, true);
    return { accepted: true };
  }
  const existing = await db.select().from(friendRequests).where(and(eq(friendRequests.fromUserId, fromUserId), eq(friendRequests.toUserId, toUserId))).limit(1);
  if (existing[0]) {
    await db.update(friendRequests).set({ status: "pending", respondedAt: null }).where(eq(friendRequests.id, existing[0].id));
  } else {
    await db.insert(friendRequests).values({ fromUserId, toUserId, status: "pending" });
  }
  return { accepted: false };
}

export async function respondToFriendRequest(currentUserId: number, fromUserId: number, accept: boolean) {
  const db = await requireDb();
  const request = await db.select().from(friendRequests).where(and(
    eq(friendRequests.fromUserId, fromUserId),
    eq(friendRequests.toUserId, currentUserId),
    eq(friendRequests.status, "pending"),
  )).limit(1);
  if (!request[0]) throw new Error("Không tìm thấy lời mời kết bạn đang chờ.");
  await db.update(friendRequests).set({ status: accept ? "accepted" : "declined", respondedAt: new Date() }).where(eq(friendRequests.id, request[0].id));
  return { accepted: accept };
}

export async function listFriendRequests(userId: number) {
  const db = await requireDb();
  const requests = await db.select().from(friendRequests).where(and(eq(friendRequests.toUserId, userId), eq(friendRequests.status, "pending"))).orderBy(desc(friendRequests.createdAt));
  return Promise.all(requests.map(async (request) => {
    const profile = await getOrCreateProfile(request.fromUserId);
    return { ...request, fromProfile: profile };
  }));
}

export async function listFriends(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(friendRequests).where(and(eq(friendRequests.status, "accepted"), or(eq(friendRequests.fromUserId, userId), eq(friendRequests.toUserId, userId))));
  return Promise.all(rows.map(async (row) => {
    const friendUserId = row.fromUserId === userId ? row.toUserId : row.fromUserId;
    return { friendshipId: row.id, profile: await getOrCreateProfile(friendUserId) };
  }));
}

async function assertParticipant(userId: number, conversationId: number) {
  const db = await requireDb();
  const membership = await db.select().from(conversationParticipants).where(and(eq(conversationParticipants.userId, userId), eq(conversationParticipants.conversationId, conversationId))).limit(1);
  if (!membership[0]) throw new Error("Bạn không có quyền truy cập cuộc trò chuyện này.");
  return membership[0];
}

export async function getOrCreateDirectConversation(userId: number, friendUserId: number) {
  const db = await requireDb();
  if (await getRelation(userId, friendUserId) !== "friends") throw new Error("Bạn cần kết bạn trước khi nhắn tin.");
  const ownMemberships = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, userId));
  for (const ownMembership of ownMemberships) {
    const participants = await db.select().from(conversationParticipants).where(eq(conversationParticipants.conversationId, ownMembership.conversationId));
    if (participants.length === 2 && participants.some((participant) => participant.userId === friendUserId)) return ownMembership.conversationId;
  }
  const inserted = await db.insert(conversations).values({ kind: "direct" });
  const conversationId = Number(inserted[0].insertId);
  await db.insert(conversationParticipants).values([{ conversationId, userId }, { conversationId, userId: friendUserId }]);
  return conversationId;
}

export async function listConversations(userId: number, filter: "all" | "unread" | "direct" | "group" = "all") {
  const db = await requireDb();
  const memberships = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, userId));
  const ids = memberships.map((membership) => membership.conversationId);
  if (!ids.length) return [];
  const [conversationRows, participantRows] = await Promise.all([
    db.select().from(conversations).where(inArray(conversations.id, ids)),
    db.select().from(conversationParticipants).where(inArray(conversationParticipants.conversationId, ids)),
  ]);
  const otherUserIds = [...new Set(participantRows.filter((participant) => participant.userId !== userId).map((participant) => participant.userId))];
  const profiles = otherUserIds.length ? await db.select().from(userProfiles).where(inArray(userProfiles.userId, otherUserIds)) : [];
  const membershipByConversation = new Map(memberships.map((membership) => [membership.conversationId, membership]));
  const participantsByConversation = new Map<number, number[]>();
  participantRows.forEach((participant) => participantsByConversation.set(participant.conversationId, [...(participantsByConversation.get(participant.conversationId) ?? []), participant.userId]));
  const profilesByUser = new Map(profiles.map((profile) => [profile.userId, profile]));
  const summaries = conversationRows.map((conversation) => {
    const otherUserId = participantsByConversation.get(conversation.id)?.find((participantId) => participantId !== userId);
    const otherProfile = otherUserId ? profilesByUser.get(otherUserId) : undefined;
    const membership = membershipByConversation.get(conversation.id);
    return {
      id: conversation.id,
      kind: conversation.kind,
      title: conversation.kind === "direct" ? otherProfile?.displayName ?? "Bạn KINI" : conversation.title ?? "Nhóm KINI",
      username: otherProfile?.username ?? null,
      avatarColor: otherProfile?.avatarColor ?? "#1677FF",
      initials: (otherProfile?.displayName ?? conversation.title ?? "K").slice(0, 2).toUpperCase(),
      preview: conversation.lastMessagePreview ?? "Bắt đầu cuộc trò chuyện",
      updatedAt: conversation.lastMessageAt,
      unreadCount: membership?.unreadCount ?? 0,
    };
  });
  return summaries.filter((item) =>
    filter === "all" ? true : filter === "unread" ? item.unreadCount > 0 : item.kind === filter,
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getConversationMessages(userId: number, conversationId: number) {
  const db = await requireDb();
  await assertParticipant(userId, conversationId);
  const thread = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt).limit(200);
  const incomingIds = thread.filter((item) => item.senderId !== userId).map((item) => item.id);
  if (incomingIds.length) await db.update(messageReceipts).set({ status: "delivered" }).where(and(inArray(messageReceipts.messageId, incomingIds), eq(messageReceipts.userId, userId), eq(messageReceipts.status, "sent")));
  const ownMessageIds = thread.filter((item) => item.senderId === userId).map((item) => item.id);
  const receipts = ownMessageIds.length ? await db.select().from(messageReceipts).where(inArray(messageReceipts.messageId, ownMessageIds)) : [];
  const receiptsByMessage = new Map<number, typeof receipts>();
  receipts.forEach((receipt) => receiptsByMessage.set(receipt.messageId, [...(receiptsByMessage.get(receipt.messageId) ?? []), receipt]));
  return thread.map((message) => {
    const related = receiptsByMessage.get(message.id) ?? [];
    const status = related.reduce<"sent" | "delivered" | "read">((current, receipt) => receiptRank[receipt.status] > receiptRank[current] ? receipt.status : current, "sent");
    return { ...message, status: message.senderId === userId ? status : undefined };
  });
}

export async function sendMessage(userId: number, input: { conversationId: number; kind: "text" | "image" | "album" | "video" | "file" | "sticker"; content: string; attachmentUrl?: string; attachmentUrls?: string; attachmentName?: string; replyToMessageId?: number; clientMessageId?: string }) {
  const db = await requireDb();
  await assertParticipant(userId, input.conversationId);
  const findExisting = async () => input.clientMessageId
    ? (await db.select({ id: messages.id }).from(messages).where(and(eq(messages.senderId, userId), eq(messages.clientMessageId, input.clientMessageId))).limit(1))[0]
    : undefined;
  const existing = await findExisting();
  if (existing) return { id: existing.id, status: "sent" as const, recipientUserIds: [], duplicate: true };
  let messageId: number;
  try {
    const inserted = await db.insert(messages).values({ ...input, senderId: userId });
    messageId = Number(inserted[0].insertId);
  } catch (error) {
    const concurrent = await findExisting();
    if (concurrent) return { id: concurrent.id, status: "sent" as const, recipientUserIds: [], duplicate: true };
    throw error;
  }
  const recipients = await db.select().from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, input.conversationId), ne(conversationParticipants.userId, userId)));
  if (recipients.length) await db.insert(messageReceipts).values(recipients.map((recipient) => ({ messageId, userId: recipient.userId, status: "sent" as const })));
  await Promise.all([
    db.update(conversations).set({ lastMessageAt: new Date(), lastMessagePreview: input.content.slice(0, 255) }).where(eq(conversations.id, input.conversationId)),
    recipients.length ? db.update(conversationParticipants).set({ unreadCount: sql`${conversationParticipants.unreadCount} + 1` }).where(and(eq(conversationParticipants.conversationId, input.conversationId), ne(conversationParticipants.userId, userId))) : Promise.resolve(),
  ]);
  return { id: messageId, status: "sent" as const, recipientUserIds: recipients.map((recipient) => recipient.userId), duplicate: false };
}

export async function markConversationRead(userId: number, conversationId: number) {
  const db = await requireDb();
  await assertParticipant(userId, conversationId);
  const unread = await db.select({ id: messages.id }).from(messages).where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, userId)));
  if (unread.length) await db.update(messageReceipts).set({ status: "read" }).where(and(inArray(messageReceipts.messageId, unread.map((message) => message.id)), eq(messageReceipts.userId, userId)));
  const latest = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.id)).limit(1);
  await db.update(conversationParticipants).set({ lastReadMessageId: latest[0]?.id ?? null, unreadCount: 0 }).where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));
  return { marked: unread.length };
}

export async function deleteConversationPermanently(userId: number, conversationId: number) {
  const db = await requireDb();
  await assertParticipant(userId, conversationId);
  const messageRows = await db.select({ id: messages.id }).from(messages).where(eq(messages.conversationId, conversationId));
  const ids = messageRows.map((message) => message.id);
  if (ids.length) await db.delete(messageReceipts).where(inArray(messageReceipts.messageId, ids));
  await db.delete(messages).where(eq(messages.conversationId, conversationId));
  await db.delete(conversationParticipants).where(eq(conversationParticipants.conversationId, conversationId));
  await db.delete(conversations).where(eq(conversations.id, conversationId));
  return { deleted: true } as const;
}

export async function searchMessages(userId: number, query: string) {
  const db = await requireDb();
  const clean = query.trim();
  if (clean.length < 2) return [];
  const memberships = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, userId));
  const ids = memberships.map((membership) => membership.conversationId);
  if (!ids.length) return [];
  const matches = await db.select().from(messages).where(and(inArray(messages.conversationId, ids), like(messages.content, `%${clean}%`))).orderBy(desc(messages.createdAt)).limit(50);
  return matches;
}

export async function getNotificationSummary(userId: number) {
  const [requests, memberships] = await Promise.all([listFriendRequests(userId), (await requireDb()).select({ unreadCount: conversationParticipants.unreadCount }).from(conversationParticipants).where(eq(conversationParticipants.userId, userId))]);
  return { pendingFriendRequests: requests.length, unreadMessages: memberships.reduce((sum, membership) => sum + membership.unreadCount, 0) };
}
