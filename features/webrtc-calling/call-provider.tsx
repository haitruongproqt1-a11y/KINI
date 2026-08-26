import { createContext, useContext, type PropsWithChildren } from "react";

import { useAuth } from "@/hooks/use-auth";
import { VideoCall } from "./components/VideoCall";
import { VoiceCall } from "./components/VoiceCall";
import { useWebRTC } from "./hooks/useWebRTC";
import { useCallSounds } from "./hooks/useCallSounds";

type CallController = ReturnType<typeof useWebRTC>;
const CallContext = createContext<CallController | null>(null);

function CallOverlay({ call }: { call: CallController }) {
  const peer = call.peer ?? { title: "Bạn KINI", initials: "K", color: "#1677FF" };
  if (call.mode === "voice") return <VoiceCall call={call} title={peer.title} initials={peer.initials} color={peer.color} avatarUrl={peer.avatarUrl} />;
  if (call.mode === "video") return <VideoCall call={call} title={peer.title} initials={peer.initials} color={peer.color} avatarUrl={peer.avatarUrl} />;
  return null;
}

export function CallProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useAuth();
  const call = useWebRTC(isAuthenticated);
  useCallSounds(call.status, call.direction);
  return <CallContext.Provider value={call}>{children}<CallOverlay call={call} /></CallContext.Provider>;
}

export function useKiniCall() {
  const call = useContext(CallContext);
  if (!call) throw new Error("CallProvider chưa được khởi tạo.");
  return call;
}
