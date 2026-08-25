import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { isKiniUsernameValid } from "../shared/kini-chat";
import { isSecurityQuestionId, securityQuestions } from "../shared/security-questions";
import { sendMessagePushNotification, sendNewDeviceLoginPush } from "./push";

const usernameSchema = z.string().trim().min(3, "Tên người dùng cần ít nhất 3 ký tự.").max(64).refine(isKiniUsernameValid, "Tên người dùng chỉ gồm chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang.");
const messageKindSchema = z.enum(["text", "image", "album", "file", "sticker"]);
const passwordSchema = z.string().min(8, "Mật khẩu cần có ít nhất 8 ký tự.").max(128);

async function createKiniSession(user: { id: number; openId: string; name: string | null; email: string | null; loginMethod: string | null; lastSignedIn: Date }, device: { deviceName?: string; platform?: string } = {}) {
  const session = await db.createExclusiveUserSession(user.id, {
    deviceName: device.deviceName?.trim() || "Thiết bị KINI",
    platform: device.platform?.trim() || "unknown",
  });
  if (session.replacedSessions > 0) void sendNewDeviceLoginPush({ userId: user.id, deviceName: device.deviceName?.trim() || "Thiết bị KINI" });
  return {
    sessionToken: await sdk.createSessionToken(user.openId, { name: user.name ?? "Thành viên KINI", sessionId: session.id }),
    user: { id: user.id, openId: user.openId, name: user.name, email: user.email, loginMethod: user.loginMethod, lastSignedIn: user.lastSignedIn },
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    securityQuestions: publicProcedure.query(() => securityQuestions),
    register: publicProcedure.input(z.object({
      username: usernameSchema,
      password: passwordSchema,
      displayName: z.string().trim().min(1, "Tên tài khoản là bắt buộc.").max(128),
      securityQuestion: z.string().refine(isSecurityQuestionId, "Câu hỏi bảo mật không hợp lệ."),
      securityAnswer: z.string().trim().min(2, "Câu trả lời cần ít nhất 2 ký tự.").max(255),
      deviceName: z.string().trim().max(128).optional(),
      platform: z.string().trim().max(24).optional(),
    })).mutation(async ({ input }) => createKiniSession(await db.createKiniPasswordAccount(input), input)),
    login: publicProcedure.input(z.object({ username: usernameSchema, password: passwordSchema, deviceName: z.string().trim().max(128).optional(), platform: z.string().trim().max(24).optional() })).mutation(async ({ input }) => {
      const user = await db.authenticateKiniPassword(input.username, input.password);
      if (!user) throw new Error("Tên đăng nhập hoặc mật khẩu chưa đúng.");
      return createKiniSession(user, input);
    }),
    recoveryQuestion: publicProcedure.input(z.object({ username: usernameSchema })).query(({ input }) => db.getKiniRecoveryQuestion(input.username)),
    resetPassword: publicProcedure.input(z.object({ username: usernameSchema, answer: z.string().trim().min(2).max(255), nextPassword: passwordSchema })).mutation(async ({ input }) => {
      const success = await db.resetKiniPassword(input);
      if (!success) throw new Error("Câu trả lời bảo mật chưa đúng.");
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const sessionId = (ctx.user as (typeof ctx.user & { sessionId?: string }) | null)?.sessionId;
      if (ctx.user && sessionId) await db.revokeUserSession(ctx.user.id, sessionId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  sessions: router({
    list: protectedProcedure.query(({ ctx }) => db.listUserSessions(ctx.user.id)),
    revoke: protectedProcedure.input(z.object({ sessionId: z.string().uuid() })).mutation(({ ctx, input }) => db.revokeUserSession(ctx.user.id, input.sessionId)),
  }),
  profile: router({
    me: protectedProcedure.query(({ ctx }) => db.getOrCreateProfile(ctx.user.id, ctx.user.name)),
    update: protectedProcedure.input(z.object({
      username: usernameSchema,
      displayName: z.string().trim().min(1).max(128),
      avatarColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      securityQuestion: z.string().trim().max(255).optional(),
      securityAnswerHash: z.string().max(255).optional(),
    })).mutation(({ ctx, input }) => db.updateProfile(ctx.user.id, input)),
    updateSecurity: protectedProcedure.input(z.object({
      securityQuestion: z.string().refine(isSecurityQuestionId, "Câu hỏi bảo mật không hợp lệ."),
      securityAnswer: z.string().trim().min(2, "Câu trả lời cần ít nhất 2 ký tự.").max(255),
    })).mutation(({ ctx, input }) => db.updateSecurityQuestion(ctx.user.id, input)),
  }),
  friends: router({
    search: protectedProcedure.input(z.object({ query: z.string().trim().max(64) })).query(({ ctx, input }) => db.searchProfiles(ctx.user.id, input.query)),
    list: protectedProcedure.query(({ ctx }) => db.listFriends(ctx.user.id)),
    requests: protectedProcedure.query(({ ctx }) => db.listFriendRequests(ctx.user.id)),
    send: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ ctx, input }) => db.sendFriendRequest(ctx.user.id, input.userId)),
    respond: protectedProcedure.input(z.object({ fromUserId: z.number().int().positive(), accept: z.boolean() })).mutation(({ ctx, input }) => db.respondToFriendRequest(ctx.user.id, input.fromUserId, input.accept)),
  }),
  chat: router({
    list: protectedProcedure.input(z.object({ filter: z.enum(["all", "unread", "direct", "group"]).default("all") })).query(({ ctx, input }) => db.listConversations(ctx.user.id, input.filter)),
    openDirect: protectedProcedure.input(z.object({ friendUserId: z.number().int().positive() })).mutation(({ ctx, input }) => db.getOrCreateDirectConversation(ctx.user.id, input.friendUserId)),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ ctx, input }) => db.getConversationMessages(ctx.user.id, input.conversationId)),
    send: protectedProcedure.input(z.object({
      conversationId: z.number().int().positive(),
      kind: messageKindSchema,
      content: z.string().trim().min(1).max(4000),
      attachmentUrl: z.string().max(1024).optional(),
      attachmentName: z.string().max(255).optional(),
      replyToMessageId: z.number().int().positive().optional(),
    })).mutation(async ({ ctx, input }) => {
      const result = await db.sendMessage(ctx.user.id, input);
      const profile = await db.getOrCreateProfile(ctx.user.id, ctx.user.name);
      void sendMessagePushNotification({ recipientUserIds: result.recipientUserIds, title: profile.displayName, body: input.kind === "text" ? input.content : `Đã gửi ${input.kind === "sticker" ? "một sticker" : "tệp đính kèm"}`, conversationId: input.conversationId });
      return result;
    }),
    delete: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteConversationPermanently(ctx.user.id, input.conversationId)),
    markRead: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.markConversationRead(ctx.user.id, input.conversationId)),
    search: protectedProcedure.input(z.object({ query: z.string().trim().max(255) })).query(({ ctx, input }) => db.searchMessages(ctx.user.id, input.query)),
  }),
  notifications: router({
    summary: protectedProcedure.query(({ ctx }) => db.getNotificationSummary(ctx.user.id)),
  }),
  push: router({
    register: protectedProcedure.input(z.object({ expoPushToken: z.string().regex(/^(Expo|Exponent)PushToken\[[^\]]+\]$/, "Token thiết bị không hợp lệ."), platform: z.enum(["ios", "android"]) })).mutation(({ ctx, input }) => db.registerPushDevice(ctx.user.id, input.expoPushToken, input.platform)),
    unregister: protectedProcedure.input(z.object({ expoPushToken: z.string().min(1) })).mutation(({ ctx, input }) => db.removePushDevice(ctx.user.id, input.expoPushToken)),
  }),
});

export type AppRouter = typeof appRouter;
