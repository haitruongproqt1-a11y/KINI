import { and, desc, eq, inArray, isNull, like, ne, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import {
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
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.username, input.username)).limit(1);
  if (existing[0]) throw new Error("Tên đăng nhập KINI đã được sử dụng.");
  const openId = `kini_${randomUUID()}`;
  const insertedUser = await db.insert(users).values({ openId, name: input.displayName, loginMethod: "kini_password", lastSignedIn: new Date() });
  const userId = Number(insertedUser[0].insertId);
  await db.insert(userProfiles).values({ userId, username: input.username, displayName: input.displayName, avatarColor: profileColors[userId % profileColors.length], passwordHash: hashSecret(input.password), securityQuestion: input.securityQuestion, securityAnswerHash: hashSecret(input.securityAnswer), authKind: "kini_password", passwordUpdatedAt: new Date() });
  const user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!user) throw new Error("Không thể tạo tài khoản KINI.");
  return user;
}

export async function authenticateKiniPassword(username: string, password: string) {
  const db = await requireDb();
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.username, username)).limit(1))[0];
  if (!profile || profile.authKind !== "kini_password" || !verifySecret(password, profile.passwordHash)) return null;
  const user = (await db.select().from(users).where(eq(users.id, profile.userId)).limit(1))[0];
  if (!user) return null;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return user;
}

export async function getKiniRecoveryQuestion(username: string) {
  const db = await requireDb();
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.username, username)).limit(1))[0];
  if (!profile || profile.authKind !== "kini_password" || !profile.securityQuestion) return null;
  return { username: profile.username, securityQuestion: profile.securityQuestion };
}

export async function resetKiniPassword(input: { username: string; answer: string; nextPassword: string }) {
  const db = await requireDb();
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.username, input.username)).limit(1))[0];
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
  await db.update(userSessions).set({ revokedAt: now }).where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
  const id = randomUUID();
  await db.insert(userSessions).values({ id, userId, deviceName: device.deviceName.slice(0, 128), platform: device.platform.slice(0, 24) });
  return id;
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
  const summaries = await Promise.all(memberships.map(async (membership) => {
    const conversation = (await db.select().from(conversations).where(eq(conversations.id, membership.conversationId)).limit(1))[0];
    if (!conversation) return null;
    const participantRows = await db.select().from(conversationParticipants).where(eq(conversationParticipants.conversationId, conversation.id));
    const other = participantRows.find((participant) => participant.userId !== userId);
    const otherProfile = other ? await getOrCreateProfile(other.userId) : null;
    const recent = await db.select().from(messages).where(eq(messages.conversationId, conversation.id)).orderBy(desc(messages.createdAt)).limit(1);
    const allMessages = await db.select().from(messages).where(and(eq(messages.conversationId, conversation.id), ne(messages.senderId, userId)));
    let unreadCount = 0;
    for (const message of allMessages) {
      const receipt = await db.select().from(messageReceipts).where(and(eq(messageReceipts.messageId, message.id), eq(messageReceipts.userId, userId))).limit(1);
      if (receipt[0]?.status !== "read") unreadCount += 1;
    }
    return {
      id: conversation.id,
      kind: conversation.kind,
      title: conversation.kind === "direct" ? otherProfile?.displayName ?? "Bạn KINI" : conversation.title ?? "Nhóm KINI",
      username: otherProfile?.username ?? null,
      avatarColor: otherProfile?.avatarColor ?? "#1677FF",
      initials: (otherProfile?.displayName ?? conversation.title ?? "K").slice(0, 2).toUpperCase(),
      preview: recent[0]?.content ?? "Bắt đầu cuộc trò chuyện",
      updatedAt: recent[0]?.createdAt ?? conversation.lastMessageAt,
      unreadCount,
    };
  }));
  return summaries.filter((item): item is NonNullable<typeof item> => Boolean(item)).filter((item) =>
    filter === "all" ? true : filter === "unread" ? item.unreadCount > 0 : item.kind === filter,
  ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getConversationMessages(userId: number, conversationId: number) {
  const db = await requireDb();
  await assertParticipant(userId, conversationId);
  const thread = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt).limit(200);
  for (const message of thread.filter((item) => item.senderId !== userId)) {
    await db.update(messageReceipts).set({ status: "delivered" }).where(and(eq(messageReceipts.messageId, message.id), eq(messageReceipts.userId, userId), eq(messageReceipts.status, "sent")));
  }
  const ownMessageIds = thread.filter((item) => item.senderId === userId).map((item) => item.id);
  const receipts = ownMessageIds.length ? await db.select().from(messageReceipts).where(inArray(messageReceipts.messageId, ownMessageIds)) : [];
  return thread.map((message) => {
    const related = receipts.filter((receipt) => receipt.messageId === message.id);
    const status = related.reduce<"sent" | "delivered" | "read">((current, receipt) => receiptRank[receipt.status] > receiptRank[current] ? receipt.status : current, "sent");
    return { ...message, status: message.senderId === userId ? status : undefined };
  });
}

export async function sendMessage(userId: number, input: { conversationId: number; kind: "text" | "image" | "album" | "file" | "sticker"; content: string; attachmentUrl?: string; attachmentName?: string; replyToMessageId?: number }) {
  const db = await requireDb();
  await assertParticipant(userId, input.conversationId);
  const inserted = await db.insert(messages).values({ ...input, senderId: userId });
  const messageId = Number(inserted[0].insertId);
  const recipients = await db.select().from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, input.conversationId), ne(conversationParticipants.userId, userId)));
  if (recipients.length) await db.insert(messageReceipts).values(recipients.map((recipient) => ({ messageId, userId: recipient.userId, status: "sent" as const })));
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, input.conversationId));
  return { id: messageId, status: "sent" as const, recipientUserIds: recipients.map((recipient) => recipient.userId) };
}

export async function markConversationRead(userId: number, conversationId: number) {
  const db = await requireDb();
  await assertParticipant(userId, conversationId);
  const unread = await db.select().from(messages).where(and(eq(messages.conversationId, conversationId), ne(messages.senderId, userId)));
  for (const message of unread) {
    await db.update(messageReceipts).set({ status: "read" }).where(and(eq(messageReceipts.messageId, message.id), eq(messageReceipts.userId, userId)));
  }
  const latest = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.id)).limit(1);
  await db.update(conversationParticipants).set({ lastReadMessageId: latest[0]?.id ?? null }).where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));
  return { marked: unread.length };
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
  const [requests, conversations] = await Promise.all([listFriendRequests(userId), listConversations(userId)]);
  return { pendingFriendRequests: requests.length, unreadMessages: conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0) };
}
