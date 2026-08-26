import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Tài khoản xác thực do OAuth quản lý. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Hồ sơ KINI công khai gắn một-một với tài khoản xác thực. */
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  displayName: varchar("displayName", { length: 128 }).notNull(),
  avatarColor: varchar("avatarColor", { length: 16 }).default("#1677FF").notNull(),
  securityQuestion: varchar("securityQuestion", { length: 255 }),
  securityAnswerHash: varchar("securityAnswerHash", { length: 255 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  authKind: mysqlEnum("authKind", ["kini_password", "oauth"]).default("kini_password").notNull(),
  passwordUpdatedAt: timestamp("passwordUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("user_profiles_user_id_unique").on(table.userId),
  uniqueIndex("user_profiles_username_unique").on(table.username),
]);

/** Quan hệ lời mời bạn bè; chỉ trạng thái accepted cho phép nhắn tin trực tiếp. */
export const friendRequests = mysqlTable("friend_requests", {
  id: int("id").autoincrement().primaryKey(),
  fromUserId: int("fromUserId").notNull(),
  toUserId: int("toUserId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "declined", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  respondedAt: timestamp("respondedAt"),
}, (table) => [
  uniqueIndex("friend_requests_direction_unique").on(table.fromUserId, table.toUserId),
  index("friend_requests_recipient_status_idx").on(table.toUserId, table.status),
]);

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["direct", "group"]).default("direct").notNull(),
  title: varchar("title", { length: 255 }),
  lastMessagePreview: varchar("lastMessagePreview", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastMessageAt: timestamp("lastMessageAt").defaultNow().notNull(),
});

export const conversationParticipants = mysqlTable("conversation_participants", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
  lastReadMessageId: int("lastReadMessageId"),
  unreadCount: int("unreadCount").default(0).notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("conversation_participants_unique").on(table.conversationId, table.userId),
  index("conversation_participants_user_idx").on(table.userId),
]);

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  /** UUID do thiết bị tạo; cùng người gửi chỉ được lưu một lần để chống gửi trùng khi mạng chập chờn. */
  clientMessageId: varchar("clientMessageId", { length: 64 }),
  kind: mysqlEnum("kind", ["text", "image", "album", "video", "file", "sticker"]).default("text").notNull(),
  content: text("content").notNull(),
  attachmentUrl: varchar("attachmentUrl", { length: 1024 }),
  attachmentUrls: text("attachmentUrls"),
  attachmentName: varchar("attachmentName", { length: 255 }),
  replyToMessageId: int("replyToMessageId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  editedAt: timestamp("editedAt"),
}, (table) => [
  index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
  index("messages_sender_idx").on(table.senderId),
  uniqueIndex("messages_sender_client_unique").on(table.senderId, table.clientMessageId),
]);

/** Trạng thái trên thiết bị người nhận: sent → delivered → read. */
export const messageReceipts = mysqlTable("message_receipts", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["sent", "delivered", "read"]).default("sent").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("message_receipts_message_user_unique").on(table.messageId, table.userId),
  index("message_receipts_user_status_idx").on(table.userId, table.status),
]);

/** Token thiết bị Expo để gửi thông báo khi ứng dụng KINI chạy nền. */
export const pushDevices = mysqlTable("push_devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  expoPushToken: varchar("expoPushToken", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 24 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("push_devices_token_unique").on(table.expoPushToken),
  index("push_devices_user_idx").on(table.userId),
]);

/** Phiên đăng nhập theo thiết bị; chỉ một phiên hoạt động được giữ cho mỗi tài khoản. */
export const userSessions = mysqlTable("user_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  deviceName: varchar("deviceName", { length: 128 }).notNull(),
  platform: varchar("platform", { length: 24 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
}, (table) => [
  index("user_sessions_user_active_idx").on(table.userId, table.revokedAt),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type ChatMessage = typeof messages.$inferSelect;
