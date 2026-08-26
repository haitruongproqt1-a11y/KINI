import { io, type Socket } from "socket.io-client";

import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

import type { CallSignal } from "./types";

type SignalEvents = {
  offer: (signal: CallSignal) => void;
  answer: (signal: CallSignal) => void;
  candidate: (signal: CallSignal) => void;
  end: (signal: CallSignal) => void;
  error: (message: string) => void;
};

export type KiniSignalClient = {
  emitOffer: (signal: Omit<CallSignal, "fromUserId">) => void;
  emitAnswer: (signal: Omit<CallSignal, "fromUserId">) => void;
  emitCandidate: (signal: Omit<CallSignal, "fromUserId">) => void;
  emitEnd: (signal: Pick<CallSignal, "callId" | "conversationId"> & { outcome?: CallSignal["outcome"]; pingMs?: number }) => void;
  disconnect: () => void;
};

/** Kết nối signaling dùng chính Bearer session của KINI; server vẫn kiểm tra quyền theo hội thoại. */
export async function createKiniSignalClient(events: SignalEvents): Promise<KiniSignalClient> {
  const token = await Auth.getSessionToken();
  if (!token) throw new Error("Cần đăng nhập KINI trước khi gọi.");
  const socket: Socket = io(getApiBaseUrl(), {
    path: "/socket.io",
    withCredentials: true,
    auth: token ? { token } : {},
    transports: ["websocket", "polling"],
    timeout: 12_000,
  });

  socket.on("connect_error", (error) => events.error(error.message || "Không thể kết nối signaling cuộc gọi."));
  socket.on("call:offer", events.offer);
  socket.on("call:answer", events.answer);
  socket.on("call:candidate", events.candidate);
  socket.on("call:end", events.end);

  const client: KiniSignalClient = {
    emitOffer: (signal) => socket.emit("call:offer", signal),
    emitAnswer: (signal) => socket.emit("call:answer", signal),
    emitCandidate: (signal) => socket.emit("call:candidate", signal),
    emitEnd: (signal) => socket.emit("call:end", signal),
    disconnect: () => {
      socket.removeAllListeners();
      socket.disconnect();
    },
  };

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off("connect", connected);
      socket.disconnect();
      reject(new Error("Kết nối signaling quá thời gian chờ."));
    }, 12_000);
    const connected = () => {
      clearTimeout(timeout);
      socket.off("connect_error", failed);
      resolve();
    };
    const failed = (error: Error) => {
      clearTimeout(timeout);
      socket.off("connect", connected);
      reject(new Error(error.message || "Không thể kết nối signaling cuộc gọi."));
    };
    socket.once("connect", connected);
    socket.once("connect_error", failed);
  });
  return client;
}
