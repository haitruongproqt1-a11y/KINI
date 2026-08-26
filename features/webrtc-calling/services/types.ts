export type CallMode = "voice" | "video";
export type CallStatus = "idle" | "ringing" | "connecting" | "connected" | "ended" | "error";
export type SessionDescriptionPayload = { type: "offer" | "answer" | "pranswer" | "rollback"; sdp: string };
export type IceCandidatePayload = { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null; usernameFragment?: string | null };
export type CallPeer = { title: string; initials: string; color: string; avatarUrl?: string | null };
export type CallDirection = "outgoing" | "incoming" | null;

export type IncomingCall = {
  callId: string;
  conversationId: number;
  mode: CallMode;
  fromUserId: number;
  description: SessionDescriptionPayload;
  caller?: CallPeer;
};

export type CallSignal = {
  callId: string;
  conversationId: number;
  fromUserId: number;
  description?: SessionDescriptionPayload;
  candidate?: IceCandidatePayload;
  mode?: CallMode;
  caller?: CallPeer;
  outcome?: "declined" | "cancelled" | "ended" | "failed";
  pingMs?: number;
  renegotiate?: boolean;
  screenSharing?: boolean;
  cameraEnabled?: boolean;
};
