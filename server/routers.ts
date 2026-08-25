import { z } from "zod";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { isKiniUsernameValid } from "../shared/kini-chat";

const usernameSchema = z.string().trim().min(3, "Tên người dùng cần ít nhất 3 ký tự.").max(64).refine(isKiniUsernameValid, "Tên người dùng chỉ gồm chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang.");
const messageKindSchema = z.enum(["text", "image", "album", "file", "sticker"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
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
    })).mutation(({ ctx, input }) => db.sendMessage(ctx.user.id, input)),
    markRead: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.markConversationRead(ctx.user.id, input.conversationId)),
    search: protectedProcedure.input(z.object({ query: z.string().trim().max(255) })).query(({ ctx, input }) => db.searchMessages(ctx.user.id, input.query)),
  }),
  notifications: router({
    summary: protectedProcedure.query(({ ctx }) => db.getNotificationSummary(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
