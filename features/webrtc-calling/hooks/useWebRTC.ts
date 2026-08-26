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
  stabilizeScreenShareSender,
  streamFromTrack,
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
  remoteCameraEnabled: boolean;
  muted: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  isScreenSharing: boolean;
  elapsedSeconds: number;
  pingMs: number | null;
};

const initialState: WebRTCState = {
  status: "idle", mode: null, direction: null, conversationId: null, peer: null, error: null, incoming: null,
  localStream: null, screenStream: null, remoteStream: null, remoteScreenStream: null, remoteCameraEnabled: true, muted: false, cameraEnabled: true, speakerEnabled: false, isScreenSharing: false, elapsedSeconds: 0, pingMs: null,
};

/** Quản lý một cuộc gọi KINI toàn cục; mọi callback native cũ bị vô hiệu hóa khi cuộc gọi được dọn dẹp. */
export function useWebRTC(enabled = true) {
  const [state, setState] = useState<WebRTCState>(initialState);
  const peerRef = useRef<NativePeer | null>(null);
  const signalRef = useRef<KiniSignalClient | null>(null);
  const signalPromiseRef = useRef<Promise<KiniSignalClient> | null>(null);
  const callIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<number | null>(null);
  const pendingCandidatesRef = useRef<CallSignal[]>([]);
  const localStreamRef = useRef<NativeStream | null>(null);
  const screenStreamRef = useRef<NativeStream | null>(null);
  const screenSenderRef = useRef<any>(null);
  const cameraSenderRef = useRef<any>(null);
  const screenTrackRef = useRef<any>(null);
  const incomingRef = useRef<IncomingCall | null>(null);
  const pingRef = useRef<number | null>(null);
  const remoteScreenSharingRef = useRef(false);
  const endingRef = useRef(false);
  const cleanupTokenRef = useRef(0);
  const renegotiatingRef = useRef(false);
  const pendingScreenSharingRef = useRef<boolean | null>(null);
  const renegotiationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    cleanupTokenRef.current += 1;
    const peer = peerRef.current;
    const localStream = localStreamRef.current;
    const screenStream = screenStreamRef.current;
    const screenTrack = screenTrackRef.current;
    peerRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    screenTrackRef.current = null;
    screenSenderRef.current = null;
    cameraSenderRef.current = null;
    remoteScreenSharingRef.current = false;
    pendingScreenSharingRef.current = null;
    if (renegotiationTimerRef.current) clearTimeout(renegotiationTimerRef.current);
    renegotiationTimerRef.current = null;
    try {
      const events = peer as any;
      if (events) {
        events.onicecandidate = null;
        events.ontrack = null;
        events.onconnectionstatechange = null;
        events.oniceconnectionstatechange = null;
      }
    } catch { /* Native peer có thể đã tự giải phóng. */ }
    try { if (screenTrack) screenTrack.onended = null; } catch { /* Không cần xử lý thêm. */ }
    stopStream(screenStream);
    stopStream(localStream);
    try { peer?.close(); } catch { /* Peer đã đóng hoặc native không còn hợp lệ. */ }
    stopInCall();
    callIdRef.current = null;
    conversationIdRef.current = null;
    pendingCandidatesRef.current = [];
    incomingRef.current = null;
    pingRef.current = null;
    setState(initialState);
  }, []);

  const addQueuedCandidates = useCallback(async () => {
    const peer = peerRef.current;
    const callId = callIdRef.current;
    if (!peer || !callId) return;
    const queued = pendingCandidatesRef.current.splice(0);
    for (const signal of queued) {
      if (signal.callId !== callId || !signal.candidate || peer !== peerRef.current) continue;
      try { await peer.addIceCandidate(toCandidate(signal.candidate)); } catch { /* Candidate cũ có thể hết hiệu lực sau renegotiation. */ }
    }
  }, []);

  const buildPeer = useCallback(async (callId: string, conversationId: number) => {
    const peer = await createPeerConnection();
    peerRef.current = peer;
    const token = cleanupTokenRef.current;
    const isCurrent = () => peerRef.current === peer && callIdRef.current === callId && cleanupTokenRef.current === token;
    const peerEvents = peer as any;
    peerEvents.onicecandidate = (event: any) => {
      if (!event.candidate || !isCurrent()) return;
      try { signalRef.current?.emitCandidate({ callId, conversationId, candidate: candidateToPayload(event.candidate) }); } catch { /* Candidate lỗi không được làm dừng call. */ }
    };
    peerEvents.ontrack = (event: any) => {
      if (!isCurrent() || !event.track) return;
      const remote = event.streams?.[0] ?? streamFromTrack(event.track);
      const isScreenTrack = event.track.kind === "video" && remoteScreenSharingRef.current;
      setState((current) => isScreenTrack ? { ...current, remoteScreenStream: remote } : { ...current, remoteStream: current.remoteStream ?? remote });
      if (event.track.kind === "video") event.track.onended = () => {
        if (isCurrent()) setState((current) => current.remoteScreenStream?.id === remote.id ? { ...current, remoteScreenStream: null } : current);
      };
    };
    peerEvents.onconnectionstatechange = () => {
      if (!isCurrent()) return;
      if (peer.connectionState === "connected") setState((current) => ({ ...current, status: "connected", error: null }));
      if (peer.connectionState === "failed") setState((current) => ({ ...current, status: "error", error: "Kết nối cuộc gọi bị gián đoạn. Hãy kết thúc và gọi lại." }));
    };
    peerEvents.oniceconnectionstatechange = () => {
      if (!isCurrent()) return;
      if (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed") setState((current) => ({ ...current, status: "connected", error: null }));
      if (peer.iceConnectionState === "failed") setState((current) => ({ ...current, status: "error", error: "ICE không tạo được đường truyền media. Hãy thử lại trên mạng khác." }));
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
            const peer = peerRef.current;
            if (!peer || signal.callId !== callIdRef.current || endingRef.current) return;
            try {
              remoteScreenSharingRef.current = signal.screenSharing === true;
              if (signal.screenSharing === false) setState((current) => ({ ...current, remoteScreenStream: null }));
              await peer.setRemoteDescription(toDescription(description));
              if (peer !== peerRef.current || signal.callId !== callIdRef.current) return;
              await addQueuedCandidates();
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              signalRef.current?.emitAnswer({ callId: signal.callId, conversationId: signal.conversationId, description: descriptionPayload(answer, "answer"), renegotiate: true });
            } catch (error) {
              if (peer === peerRef.current) setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể cập nhật media cuộc gọi." }));
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
        if (!peer || signal.callId !== callIdRef.current || !signal.description || endingRef.current) return;
        try {
          await peer.setRemoteDescription(toDescription(signal.description));
          if (peer === peerRef.current) await addQueuedCandidates();
        } catch (error) {
          if (peer === peerRef.current) setState((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "Không thể hoàn tất kết nối cuộc gọi." }));
        }
      },
      candidate: async (signal) => {
        const peer = peerRef.current;
        if (signal.callId !== callIdRef.current || !signal.candidate || endingRef.current) return;
        if (!peer?.remoteDescription) {
          pendingCandidatesRef.current.push(signal);
          return;
        }
        try { await peer.addIceCandidate(toCandidate(signal.candidate)); } catch { /* Candidate lỗi không được phá signaling. */ }
      },
      media: (signal) => {
        if (signal.callId !== callIdRef.current || typeof signal.cameraEnabled !== "boolean") return;
        const remoteCameraEnabled = signal.cameraEnabled === true;
        setState((current) => ({ ...current, remoteCameraEnabled }));
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

  const renegotiate = useCallback((screenSharing: boolean) => {
    pendingScreenSharingRef.current = screenSharing;
    const run = async () => {
      const peer = peerRef.current;
      const callId = callIdRef.current;
      const conversationId = conversationIdRef.current;
      if (!peer || !callId || !conversationId || endingRef.current) return;
      if (peer.signalingState !== "stable" || renegotiatingRef.current) {
        if (!renegotiationTimerRef.current) renegotiationTimerRef.current = setTimeout(() => {
          renegotiationTimerRef.current = null;
          void run();
        }, 300);
        return;
      }
      const requested = pendingScreenSharingRef.current;
      if (requested === null) return;
      pendingScreenSharingRef.current = null;
      renegotiatingRef.current = true;
      try {
        const signal = await ensureSignal();
        if (peer !== peerRef.current || callId !== callIdRef.current || endingRef.current) return;
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        signal.emitOffer({ callId, conversationId, mode: "video", description: descriptionPayload(offer, "offer"), renegotiate: true, screenSharing: requested });
      } catch (error) {
        if (peer === peerRef.current) setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể cập nhật chia sẻ màn hình." }));
      } finally {
        renegotiatingRef.current = false;
        if (pendingScreenSharingRef.current !== null) void run();
      }
    };
    void run();
  }, [ensureSignal]);

  const startCall = useCallback(async (conversationId: number, mode: CallMode, peerInfo: CallPeer) => {
    try {
      cleanup();
      endingRef.current = false;
      const signal = await ensureSignal();
      const callId = newCallId();
      callIdRef.current = callId;
      conversationIdRef.current = conversationId;
      setState({ ...initialState, status: "ringing", direction: "outgoing", mode, conversationId, peer: peerInfo, speakerEnabled: mode === "video" });
      const peer = await buildPeer(callId, conversationId);
      const localStream = await createLocalMedia(mode);
      localStream.getTracks().forEach((track: any) => {
        const sender = peer.addTrack(track, localStream);
        if (track.kind === "video") cameraSenderRef.current = sender;
      });
      localStreamRef.current = localStream;
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
    if (!incoming || endingRef.current) return;
    try {
      const signal = await ensureSignal();
      setState((current) => ({ ...current, status: "connecting", error: null }));
      const peer = await buildPeer(incoming.callId, incoming.conversationId);
      const localStream = await createLocalMedia(incoming.mode);
      localStream.getTracks().forEach((track: any) => {
        const sender = peer.addTrack(track, localStream);
        if (track.kind === "video") cameraSenderRef.current = sender;
      });
      localStreamRef.current = localStream;
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

  const endCall = useCallback(async (outcome: "declined" | "cancelled" | "ended" | "failed" = "ended") => {
    if (endingRef.current) return;
    endingRef.current = true;
    const callId = callIdRef.current;
    const conversationId = conversationIdRef.current;
    const signal = signalRef.current;
    try {
      if (callId && conversationId) await signal?.emitEnd({ callId, conversationId, outcome, ...(pingRef.current !== null ? { pingMs: pingRef.current } : {}) });
    } finally {
      cleanup();
      endingRef.current = false;
    }
  }, [cleanup]);

  const declineIncomingCall = useCallback(() => void endCall("declined"), [endCall]);
  const toggleMute = useCallback(() => setState((current) => { const muted = !current.muted; setMutedOnStream(current.localStream, muted); return { ...current, muted }; }), []);
  const toggleCamera = useCallback(async () => {
    const localStream = localStreamRef.current;
    const track = localStream?.getVideoTracks?.()[0];
    const nextEnabled = !state.cameraEnabled;
    if (!localStream || !track || state.mode !== "video") return;
    try {
      setCameraEnabledOnStream(localStream, nextEnabled);
      const sender = cameraSenderRef.current;
      if (sender) await sender.replaceTrack(nextEnabled ? track : null);
      if (callIdRef.current && conversationIdRef.current) signalRef.current?.emitMedia({ callId: callIdRef.current, conversationId: conversationIdRef.current, cameraEnabled: nextEnabled });
      setState((current) => ({ ...current, cameraEnabled: nextEnabled }));
    } catch (error) {
      setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể thay đổi camera." }));
    }
  }, [state.cameraEnabled, state.mode]);
  const toggleSpeaker = useCallback(() => setState((current) => { const speakerEnabled = !current.speakerEnabled; setSpeakerEnabledOnDevice(speakerEnabled, current.mode ?? "video"); return { ...current, speakerEnabled }; }), []);
  const switchCamera = useCallback(() => switchCameraOnStream(state.localStream), [state.localStream]);

  const stopScreenShare = useCallback(async () => {
    const sender = screenSenderRef.current;
    const peer = peerRef.current;
    const screen = screenStreamRef.current;
    const track = screenTrackRef.current;
    if (!sender && !screen) return;
    screenSenderRef.current = null;
    screenStreamRef.current = null;
    screenTrackRef.current = null;
    try {
      if (track) track.onended = null;
      if (sender && peer && peer.connectionState !== "closed") await sender.replaceTrack(null);
      stopStream(screen);
      setState((current) => ({ ...current, isScreenSharing: false, screenStream: null }));
      renegotiate(false);
    } catch (error) {
      setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể dừng chia sẻ màn hình an toàn." }));
    }
  }, [renegotiate]);

  const toggleScreenShare = useCallback(async () => {
    if (state.isScreenSharing) return stopScreenShare();
    const peer = peerRef.current;
    if (state.mode !== "video" || state.status !== "connected" || !peer || endingRef.current) {
      return setState((current) => ({ ...current, error: "Chia sẻ màn hình chỉ khả dụng trong cuộc gọi video đang kết nối." }));
    }
    try {
      const screen = await createDisplayMedia();
      const screenTrack = screen.getVideoTracks()[0];
      if (!screenTrack || peer !== peerRef.current || endingRef.current) {
        stopStream(screen);
        throw new Error("Không tìm thấy luồng video để chia sẻ màn hình.");
      }
      const cameraTrack = localStreamRef.current?.getVideoTracks?.()[0];
      const cameraSender = cameraSenderRef.current;
      if (cameraTrack && cameraSender && state.cameraEnabled) {
        setCameraEnabledOnStream(localStreamRef.current, false);
        await cameraSender.replaceTrack(null);
        if (callIdRef.current && conversationIdRef.current) signalRef.current?.emitMedia({ callId: callIdRef.current, conversationId: conversationIdRef.current, cameraEnabled: false });
        setState((current) => ({ ...current, cameraEnabled: false }));
      }
      const transceiver = peer.addTransceiver("video", { direction: "sendonly" });
      await transceiver.sender.replaceTrack(screenTrack);
      if (peer !== peerRef.current || endingRef.current) {
        await transceiver.sender.replaceTrack(null);
        stopStream(screen);
        return;
      }
      screenSenderRef.current = transceiver.sender;
      screenStreamRef.current = screen;
      screenTrackRef.current = screenTrack;
      (screenTrack as any).onended = () => { if (screenTrackRef.current === screenTrack) void stopScreenShare(); };
      setState((current) => ({ ...current, isScreenSharing: true, screenStream: screen }));
      await stabilizeScreenShareSender(transceiver.sender);
      renegotiate(true);
    } catch (error) {
      setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể chia sẻ màn hình." }));
    }
  }, [renegotiate, state.cameraEnabled, state.isScreenSharing, state.mode, state.status, stopScreenShare]);

  useEffect(() => {
    if (state.status !== "connected") return;
    const connectedAt = Date.now();
    const updateDuration = () => setState((current) => current.status === "connected" ? { ...current, elapsedSeconds: Math.max(0, Math.floor((Date.now() - connectedAt) / 1000)) } : current);
    const samplePing = async () => {
      const peer = peerRef.current;
      try {
        const stats = await (peer as any)?.getStats?.();
        if (peer !== peerRef.current) return;
        const reports: any[] = [];
        if (stats && typeof stats.forEach === "function") stats.forEach((value: any) => reports.push(value));
        const pair = reports.find((report) => report?.type === "candidate-pair" && (report.state === "succeeded" || report.nominated));
        const ping = typeof pair?.currentRoundTripTime === "number" ? Math.round(pair.currentRoundTripTime * 1000) : null;
        if (ping !== null) {
          pingRef.current = ping;
          setState((current) => current.status === "connected" ? { ...current, pingMs: ping } : current);
        }
      } catch { /* Một số Android WebRTC không có đủ getStats. */ }
    };
    updateDuration();
    void samplePing();
    const durationTimer = setInterval(updateDuration, 1000);
    const pingTimer = setInterval(() => { void samplePing(); }, 5000);
    return () => { clearInterval(durationTimer); clearInterval(pingTimer); };
  }, [state.status]);

  useEffect(() => {
    if (state.status !== "ringing" || state.direction !== "outgoing") return;
    const timeout = setTimeout(() => { void endCall("cancelled"); }, 45_000);
    return () => clearTimeout(timeout);
  }, [endCall, state.direction, state.status]);

  useEffect(() => {
    if (!enabled) return;
    void ensureSignal().catch(() => undefined);
    return () => {
      const signal = signalRef.current;
      cleanup();
      signal?.disconnect();
      signalRef.current = null;
      signalPromiseRef.current = null;
    };
  }, [cleanup, enabled, ensureSignal]);

  return { ...state, startCall, acceptIncomingCall, declineIncomingCall, endCall, toggleMute, toggleCamera, toggleSpeaker, switchCamera, toggleScreenShare, stopScreenShare };
}
