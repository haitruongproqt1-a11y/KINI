import { useCallback, useEffect, useRef, useState } from "react";

import { createKiniSignalClient, type KiniSignalClient } from "../services/signalingClient";
import {
  candidateToPayload,
  createDisplayMedia,
  createLocalMedia,
  createPeerConnection,
  setCameraEnabled as setCameraEnabledOnStream,
  setMuted as setMutedOnStream,
  setSpeakerEnabled as setSpeakerEnabledOnDevice,
  stopInCall,
  stopStream,
  switchCamera as switchCameraOnStream,
  toCandidate,
  toDescription,
  type NativePeer,
  type NativeStream,
} from "../services/webrtcService";
import type { CallDirection, CallMode, CallPeer, CallSignal, CallStatus, IncomingCall, SessionDescriptionPayload } from "../services/types";

function newCallId() {
  return globalThis.crypto?.randomUUID?.() ?? `call-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function descriptionPayload(description: any, expected: "offer" | "answer"): SessionDescriptionPayload {
  const raw = typeof description?.toJSON === "function" ? description.toJSON() : description;
  if (raw?.type !== expected || typeof raw.sdp !== "string" || !raw.sdp) throw new Error("SDP cuộc gọi không hợp lệ.");
  return { type: expected, sdp: raw.sdp };
}

type WebRTCState = {
  status: CallStatus;
  mode: CallMode | null;
  direction: CallDirection;
  conversationId: number | null;
  peer: CallPeer | null;
  error: string | null;
  incoming: IncomingCall | null;
  localStream: NativeStream | null;
  screenStream: NativeStream | null;
  remoteStream: NativeStream | null;
  remoteScreenStream: NativeStream | null;
  muted: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  isScreenSharing: boolean;
  elapsedSeconds: number;
  pingMs: number | null;
};

const initialState: WebRTCState = {
  status: "idle", mode: null, direction: null, conversationId: null, peer: null, error: null, incoming: null,
  localStream: null, screenStream: null, remoteStream: null, remoteScreenStream: null, muted: false, cameraEnabled: true, speakerEnabled: false, isScreenSharing: false, elapsedSeconds: 0, pingMs: null,
};

/** Quản lý một cuộc gọi KINI toàn cục để cuộc gọi đến hiện trên mọi màn hình khi ứng dụng đang mở. */
export function useWebRTC(enabled = true) {
  const [state, setState] = useState<WebRTCState>(initialState);
  const peerRef = useRef<NativePeer | null>(null);
  const signalRef = useRef<KiniSignalClient | null>(null);
  const signalPromiseRef = useRef<Promise<KiniSignalClient> | null>(null);
  const callIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<number | null>(null);
  const pendingCandidatesRef = useRef<CallSignal[]>([]);
  const screenStreamRef = useRef<NativeStream | null>(null);
  const screenSenderRef = useRef<any>(null);
  const incomingRef = useRef<IncomingCall | null>(null);
  const pingRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    stopStream(screenStreamRef.current);
    screenStreamRef.current = null;
    screenSenderRef.current = null;
    setState((current) => {
      stopStream(current.localStream);
      stopInCall();
      return initialState;
    });
    callIdRef.current = null;
    conversationIdRef.current = null;
    pendingCandidatesRef.current = [];
    incomingRef.current = null;
    pingRef.current = null;
  }, []);

  const addQueuedCandidates = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer) return;
    const queued = pendingCandidatesRef.current.splice(0);
    for (const signal of queued) if (signal.candidate) await peer.addIceCandidate(toCandidate(signal.candidate));
  }, []);

  const buildPeer = useCallback((callId: string, conversationId: number) => {
    const peer = createPeerConnection();
    peerRef.current = peer;
    const peerEvents = peer as any;
    peerEvents.onicecandidate = (event: any) => {
      if (event.candidate) signalRef.current?.emitCandidate({ callId, conversationId, candidate: candidateToPayload(event.candidate) });
    };
    peerEvents.ontrack = (event: any) => {
      const remote = event.streams?.[0];
      if (!remote) return;
      setState((current) => {
        const secondVideoStream = event.track?.kind === "video" && current.remoteStream && current.remoteStream.id !== remote.id;
        return secondVideoStream ? { ...current, remoteScreenStream: remote } : { ...current, remoteStream: current.remoteStream ?? remote };
      });
      if (event.track?.kind === "video") event.track.onended = () => setState((current) => current.remoteScreenStream?.id === remote.id ? { ...current, remoteScreenStream: null } : current);
    };
    peerEvents.onconnectionstatechange = () => {
      const connectionState = peer.connectionState;
      if (connectionState === "connected") setState((current) => ({ ...current, status: "connected", error: null }));
      if (connectionState === "failed" || connectionState === "disconnected") setState((current) => ({ ...current, status: "error", error: "Kết nối cuộc gọi bị gián đoạn." }));
    };
    peerEvents.oniceconnectionstatechange = () => {
      const iceState = peer.iceConnectionState;
      if (iceState === "connected" || iceState === "completed") setState((current) => ({ ...current, status: "connected", error: null }));
      if (iceState === "failed") setState((current) => ({ ...current, status: "error", error: "ICE không tạo được đường truyền media. Hãy thử lại trên mạng khác." }));
    };
    return peer;
  }, []);

  const ensureSignal = useCallback(async () => {
    if (signalRef.current) return signalRef.current;
    if (!signalPromiseRef.current) signalPromiseRef.current = createKiniSignalClient({
      offer: (signal) => {
        const mode = signal.mode;
        const description = signal.description;
        if (signal.conversationId <= 0 || !description || !mode) return;
        if (signal.renegotiate && signal.callId === callIdRef.current && peerRef.current) {
          void (async () => {
            try {
              const peer = peerRef.current;
              if (!peer) return;
              await peer.setRemoteDescription(toDescription(description));
              await addQueuedCandidates();
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              signalRef.current?.emitAnswer({ callId: signal.callId, conversationId: signal.conversationId, description: descriptionPayload(answer, "answer"), renegotiate: true });
              if (signal.screenSharing === false) setState((current) => ({ ...current, remoteScreenStream: null }));
            } catch (error) {
              setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể cập nhật media cuộc gọi." }));
            }
          })();
          return;
        }
        const incoming: IncomingCall = { callId: signal.callId, conversationId: signal.conversationId, mode, fromUserId: signal.fromUserId, description, caller: signal.caller };
        if (callIdRef.current || incomingRef.current) return;
        callIdRef.current = signal.callId;
        conversationIdRef.current = signal.conversationId;
        incomingRef.current = incoming;
        setState({ ...initialState, status: "ringing", direction: "incoming", mode, conversationId: signal.conversationId, peer: signal.caller ?? { title: "Bạn KINI", initials: "K", color: "#1677FF" }, incoming });
      },
      answer: async (signal) => {
        const peer = peerRef.current;
        if (!peer || signal.callId !== callIdRef.current || !signal.description) return;
        await peer.setRemoteDescription(toDescription(signal.description));
        await addQueuedCandidates();
      },
      candidate: async (signal) => {
        const peer = peerRef.current;
        if (signal.callId !== callIdRef.current || !signal.candidate || !peer?.remoteDescription) {
          pendingCandidatesRef.current.push(signal);
          return;
        }
        await peer.addIceCandidate(toCandidate(signal.candidate));
      },
      end: (signal) => {
        if (signal.callId === callIdRef.current) cleanup();
      },
      error: (message) => setState((current) => current.status === "idle" ? current : { ...current, status: "error", error: message }),
    }).then((client) => {
      signalRef.current = client;
      return client;
    }).catch((error) => {
      signalPromiseRef.current = null;
      throw error;
    });
    return signalPromiseRef.current;
  }, [addQueuedCandidates, cleanup]);

  const renegotiate = useCallback(async (screenSharing: boolean) => {
    const peer = peerRef.current;
    const callId = callIdRef.current;
    const conversationId = conversationIdRef.current;
    if (!peer || !callId || !conversationId || peer.signalingState !== "stable") return;
    const signal = await ensureSignal();
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    signal.emitOffer({ callId, conversationId, mode: state.mode ?? "video", description: descriptionPayload(offer, "offer"), renegotiate: true, screenSharing });
  }, [ensureSignal, state.mode]);

  const startCall = useCallback(async (conversationId: number, mode: CallMode, peerInfo: CallPeer) => {
    try {
      const signal = await ensureSignal();
      cleanup();
      const callId = newCallId();
      callIdRef.current = callId;
      conversationIdRef.current = conversationId;
      setState({ ...initialState, status: "ringing", direction: "outgoing", mode, conversationId, peer: peerInfo, speakerEnabled: mode === "video" });
      const localStream = await createLocalMedia(mode);
      const peer = buildPeer(callId, conversationId);
      localStream.getTracks().forEach((track: any) => peer.addTrack(track, localStream));
      setState((current) => ({ ...current, localStream }));
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
      await peer.setLocalDescription(offer);
      signal.emitOffer({ callId, conversationId, mode, description: descriptionPayload(offer, "offer") });
    } catch (error) {
      cleanup();
      setState((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "Không thể bắt đầu cuộc gọi." }));
    }
  }, [buildPeer, cleanup, ensureSignal]);

  const acceptIncomingCall = useCallback(async () => {
    const incoming = incomingRef.current;
    if (!incoming) return;
    try {
      const signal = await ensureSignal();
      setState((current) => ({ ...current, status: "connecting", error: null }));
      const localStream = await createLocalMedia(incoming.mode);
      const peer = buildPeer(incoming.callId, incoming.conversationId);
      localStream.getTracks().forEach((track: any) => peer.addTrack(track, localStream));
      await peer.setRemoteDescription(toDescription(incoming.description));
      await addQueuedCandidates();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      setState((current) => ({ ...current, localStream }));
      signal.emitAnswer({ callId: incoming.callId, conversationId: incoming.conversationId, description: descriptionPayload(answer, "answer") });
    } catch (error) {
      cleanup();
      setState((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "Không thể nhận cuộc gọi." }));
    }
  }, [addQueuedCandidates, buildPeer, cleanup, ensureSignal]);

  const endCall = useCallback((outcome: "declined" | "cancelled" | "ended" | "failed" = "ended") => {
    if (callIdRef.current && conversationIdRef.current) signalRef.current?.emitEnd({ callId: callIdRef.current, conversationId: conversationIdRef.current, outcome, ...(pingRef.current !== null ? { pingMs: pingRef.current } : {}) });
    cleanup();
  }, [cleanup]);
  const declineIncomingCall = useCallback(() => endCall("declined"), [endCall]);
  const toggleMute = useCallback(() => setState((current) => { const muted = !current.muted; setMutedOnStream(current.localStream, muted); return { ...current, muted }; }), []);
  const toggleCamera = useCallback(() => setState((current) => { const cameraEnabled = !current.cameraEnabled; setCameraEnabledOnStream(current.localStream, cameraEnabled); return { ...current, cameraEnabled }; }), []);
  const toggleSpeaker = useCallback(() => setState((current) => { const speakerEnabled = !current.speakerEnabled; setSpeakerEnabledOnDevice(speakerEnabled); return { ...current, speakerEnabled }; }), []);
  const switchCamera = useCallback(() => switchCameraOnStream(state.localStream), [state.localStream]);
  const stopScreenShare = useCallback(async () => {
    if (screenSenderRef.current && peerRef.current) peerRef.current.removeTrack(screenSenderRef.current);
    screenSenderRef.current = null;
    stopStream(screenStreamRef.current);
    screenStreamRef.current = null;
    setState((current) => ({ ...current, isScreenSharing: false, screenStream: null }));
    await renegotiate(false);
  }, [renegotiate]);
  const toggleScreenShare = useCallback(async () => {
    if (state.isScreenSharing) return stopScreenShare();
    if (state.mode !== "video" || !peerRef.current) return setState((current) => ({ ...current, error: "Chia sẻ màn hình chỉ khả dụng trong cuộc gọi video đang kết nối." }));
    try {
      const screen = await createDisplayMedia();
      const screenTrack = screen.getVideoTracks()[0];
      if (!screenTrack) throw new Error("Không tìm thấy luồng video để chia sẻ màn hình.");
      screenSenderRef.current = peerRef.current.addTrack(screenTrack, screen);
      (screenTrack as any).onended = () => { void stopScreenShare(); };
      screenStreamRef.current = screen;
      setState((current) => ({ ...current, isScreenSharing: true, screenStream: screen }));
      await renegotiate(true);
    } catch (error) {
      setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể chia sẻ màn hình." }));
    }
  }, [renegotiate, state.isScreenSharing, state.mode, stopScreenShare]);

  useEffect(() => {
    if (state.status !== "connected") return;
    const connectedAt = Date.now();
    const updateDuration = () => setState((current) => current.status === "connected" ? { ...current, elapsedSeconds: Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)) } : current);
    const samplePing = async () => {
      try {
        const stats = await (peerRef.current as any)?.getStats?.();
        const reports: any[] = [];
        if (stats && typeof stats.forEach === "function") stats.forEach((value: any) => reports.push(value));
        const pair = reports.find((report) => report?.type === "candidate-pair" && (report.state === "succeeded" || report.nominated));
        const ping = typeof pair?.currentRoundTripTime === "number" ? Math.round(pair.currentRoundTripTime * 1000) : null;
        if (ping !== null) {
          pingRef.current = ping;
          setState((current) => current.status === "connected" ? { ...current, pingMs: ping } : current);
        }
      } catch {
        // Một số Android WebRTC không cung cấp getStats đầy đủ; UI giữ trạng thái đang đo.
      }
    };
    updateDuration();
    void samplePing();
    const durationTimer = setInterval(updateDuration, 1000);
    const pingTimer = setInterval(() => { void samplePing(); }, 5000);
    return () => { clearInterval(durationTimer); clearInterval(pingTimer); };
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "ringing" || state.direction !== "outgoing") return;
    const timeout = setTimeout(() => endCall("cancelled"), 45_000);
    return () => clearTimeout(timeout);
  }, [endCall, state.direction, state.status]);

  useEffect(() => {
    if (!enabled) return;
    void ensureSignal().catch(() => undefined);
    return () => {
      signalRef.current?.disconnect();
      signalRef.current = null;
      signalPromiseRef.current = null;
      cleanup();
    };
  }, [cleanup, enabled, ensureSignal]);

  return { ...state, startCall, acceptIncomingCall, declineIncomingCall, endCall, toggleMute, toggleCamera, toggleSpeaker, switchCamera, toggleScreenShare, stopScreenShare };
}
