import type { Server as HttpServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import * as db from "../db";
import { sdk } from "../_core/sdk";
import { sendIncomingCallPush } from "../push";

type SignalPayload = {
  callId?: unknown;
  conversationId?: unknown;
  mode?: unknown;
  description?: unknown;
  candidate?: unknown;
  outcome?: unknown;
  pingMs?: unknown;
  renegotiate?: unknown;
  screenSharing?: unknown;
  cameraEnabled?: unknown;
};

type PendingOffer = { callId: string; conversationId: number; fromUserId: number; mode: "voice" | "video"; description: { type: "offer" | "answer"; sdp: string }; caller: unknown; expiresAt: number };
const pendingOffersByCallee = new Map<number, PendingOffer>();

function clearPendingOffer(callId: string) {
  for (const [calleeId, pending] of pendingOffersByCallee.entries()) {
    if (pending.callId === callId) pendingOffersByCallee.delete(calleeId);
  }
}

function readBaseSignal(payload: SignalPayload) {
  const callId = typeof payload.callId === "string" && payload.callId.length <= 128 ? payload.callId : null;
  const conversationId = Number(payload.conversationId);
  if (!callId || !Number.isInteger(conversationId) || conversationId <= 0) throw new Error("Dữ liệu signaling không hợp lệ.");
  return { callId, conversationId };
}

function requireDescription(payload: SignalPayload, expectedType: "offer" | "answer") {
  const description = payload.description as { type?: unknown; sdp?: unknown } | undefined;
  if (description?.type !== expectedType || typeof description.sdp !== "string" || description.sdp.length > 100_000) {
    throw new Error("SDP cuộc gọi không hợp lệ.");
  }
  return { type: expectedType, sdp: description.sdp };
}

function requireCandidate(payload: SignalPayload) {
  const candidate = payload.candidate as { candidate?: unknown; sdpMid?: unknown; sdpMLineIndex?: unknown; usernameFragment?: unknown } | undefined;
  if (!candidate || typeof candidate.candidate !== "string" || candidate.candidate.length > 10_000) throw new Error("ICE candidate không hợp lệ.");
  return {
    candidate: candidate.candidate,
    ...(typeof candidate.sdpMid === "string" || candidate.sdpMid === null ? { sdpMid: candidate.sdpMid } : {}),
    ...(typeof candidate.sdpMLineIndex === "number" || candidate.sdpMLineIndex === null ? { sdpMLineIndex: candidate.sdpMLineIndex } : {}),
    ...(typeof candidate.usernameFragment === "string" || candidate.usernameFragment === null ? { usernameFragment: candidate.usernameFragment } : {}),
  };
}

/**
 * Signaling chỉ relay SDP/ICE; media vẫn đi P2P qua WebRTC. Mỗi socket dùng token
 * phiên KINI và server kiểm tra lại thành viên hội thoại trước mọi relay.
 */
export function registerCallSignaling(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: { origin: true, credentials: true },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : "";
      const request = {
        headers: {
          ...socket.request.headers,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      } as any;
      const user = await sdk.authenticateRequest(request);
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error("Phiên KINI không hợp lệ cho signaling."));
    }
  });

  io.on("connection", (socket) => {
    const userId = Number(socket.data.userId);
    socket.join(`kini-user:${userId}`);
    const pendingOffer = pendingOffersByCallee.get(userId);
    if (pendingOffer) {
      if (pendingOffer.expiresAt > Date.now()) socket.emit("call:offer", pendingOffer);
      else pendingOffersByCallee.delete(userId);
    }

    const relay = async (event: "call:answer" | "call:candidate" | "call:media" | "call:end", payload: SignalPayload, extra: Record<string, unknown> = {}) => {
      try {
        const { callId, conversationId } = readBaseSignal(payload);
        const peers = await db.getDirectConversationPeerUserIds(userId, conversationId);
        for (const peerUserId of peers) {
          io.to(`kini-user:${peerUserId}`).emit(event, { callId, conversationId, fromUserId: userId, ...extra });
        }
      } catch (error) {
        socket.emit("call:error", error instanceof Error ? error.message : "Không thể relay signaling cuộc gọi.");
      }
    };

    socket.on("call:offer", (payload: SignalPayload) => {
      const mode = payload.mode === "voice" || payload.mode === "video" ? payload.mode : null;
      if (!mode) return socket.emit("call:error", "Loại cuộc gọi không hợp lệ.");
      void (async () => {
        try {
          const { callId, conversationId } = readBaseSignal(payload);
          const description = requireDescription(payload, "offer");
          if (payload.renegotiate === true) {
            const peers = await db.getDirectConversationPeerUserIds(userId, conversationId);
            for (const peerUserId of peers) {
              io.to(`kini-user:${peerUserId}`).emit("call:offer", { callId, conversationId, fromUserId: userId, mode, description, renegotiate: true, ...(typeof payload.screenSharing === "boolean" ? { screenSharing: payload.screenSharing } : {}) });
            }
            return;
          }
          const created = await db.createCallSession({ id: callId, callerId: userId, conversationId, mode });
          const offer: PendingOffer = { callId, conversationId, fromUserId: userId, mode, description, caller: created.caller, expiresAt: Date.now() + 50_000 };
          pendingOffersByCallee.set(created.calleeId, offer);
          io.to(`kini-user:${created.calleeId}`).emit("call:offer", offer);
          setTimeout(() => {
            const pending = pendingOffersByCallee.get(created.calleeId);
            if (pending?.callId !== callId) return;
            pendingOffersByCallee.delete(created.calleeId);
            // Người gọi có thể đã tắt ứng dụng trước khi tự timeout; vẫn đóng phiên trong DB.
            void db.finishCall(userId, callId, "cancelled").catch(() => undefined);
          }, 55_000);
          void sendIncomingCallPush({ recipientUserId: created.calleeId, callerName: created.caller.title, conversationId, callId, mode });
        } catch (error) {
          socket.emit("call:error", error instanceof Error ? error.message : "Không thể gửi lời mời gọi.");
        }
      })();
    });
    socket.on("call:answer", (payload: SignalPayload) => {
      void (async () => {
        try {
          const { callId } = readBaseSignal(payload);
          if (payload.renegotiate !== true) {
            await db.markCallAnswered(userId, callId);
            pendingOffersByCallee.delete(userId);
          }
          await relay("call:answer", payload, { description: requireDescription(payload, "answer"), ...(payload.renegotiate === true ? { renegotiate: true } : {}) });
        } catch (error) {
          socket.emit("call:error", error instanceof Error ? error.message : "Không thể nhận kết nối cuộc gọi.");
        }
      })();
    });
    socket.on("call:candidate", (payload: SignalPayload) => {
      try {
        void relay("call:candidate", payload, { candidate: requireCandidate(payload) });
      } catch (error) {
        socket.emit("call:error", error instanceof Error ? error.message : "ICE candidate không hợp lệ.");
      }
    });
    socket.on("call:media", (payload: SignalPayload) => {
      if (typeof payload.cameraEnabled !== "boolean") return socket.emit("call:error", "Trạng thái camera không hợp lệ.");
      void relay("call:media", payload, { cameraEnabled: payload.cameraEnabled });
    });
    socket.on("call:end", (payload: SignalPayload, acknowledge?: (result: { ok: boolean }) => void) => {
      void (async () => {
        try {
          const { callId } = readBaseSignal(payload);
          const outcome = payload.outcome === "declined" || payload.outcome === "cancelled" || payload.outcome === "failed" ? payload.outcome : "ended";
          const pingMs = typeof payload.pingMs === "number" && Number.isFinite(payload.pingMs) ? payload.pingMs : undefined;
          await db.finishCall(userId, callId, outcome, pingMs);
          clearPendingOffer(callId);
          await relay("call:end", payload, { outcome });
          acknowledge?.({ ok: true });
        } catch (error) {
          socket.emit("call:error", error instanceof Error ? error.message : "Không thể kết thúc cuộc gọi.");
          acknowledge?.({ ok: false });
        }
      })();
    });
    socket.on("disconnect", () => {
      for (const [calleeId, pending] of pendingOffersByCallee.entries()) {
        if (pending.fromUserId !== userId) continue;
        pendingOffersByCallee.delete(calleeId);
        void db.finishCall(userId, pending.callId, "cancelled").catch(() => undefined);
        io.to(`kini-user:${calleeId}`).emit("call:end", {
          callId: pending.callId,
          conversationId: pending.conversationId,
          fromUserId: userId,
          outcome: "cancelled",
        });
      }
    });
  });

  return io;
}
