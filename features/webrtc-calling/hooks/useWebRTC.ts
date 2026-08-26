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
import type { CallMode, CallSignal, CallStatus, IncomingCall, SessionDescriptionPayload } from "../services/types";

function newCallId() {
  return globalThis.crypto?.randomUUID?.() ?? `call-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type WebRTCState = {
  status: CallStatus;
  mode: CallMode | null;
  error: string | null;
  incoming: IncomingCall | null;
  localStream: NativeStream | null;
  remoteStream: NativeStream | null;
  muted: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  isScreenSharing: boolean;
};

const initialState: WebRTCState = {
  status: "idle", mode: null, error: null, incoming: null, localStream: null, remoteStream: null,
  muted: false, cameraEnabled: true, speakerEnabled: false, isScreenSharing: false,
};

/** Một hook duy nhất quản lý voice, video và screen share; UI chỉ truyền callback điều khiển. */
export function useWebRTC(conversationId: number, enabled = true) {
  const [state, setState] = useState<WebRTCState>(initialState);
  const peerRef = useRef<NativePeer | null>(null);
  const signalRef = useRef<KiniSignalClient | null>(null);
  const callIdRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<CallSignal[]>([]);
  const screenStreamRef = useRef<NativeStream | null>(null);
  const incomingRef = useRef<IncomingCall | null>(null);

  const cleanup = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    stopStream(screenStreamRef.current);
    screenStreamRef.current = null;
    setState((current) => {
      stopStream(current.localStream);
      stopInCall();
      return initialState;
    });
    callIdRef.current = null;
    pendingCandidatesRef.current = [];
    incomingRef.current = null;
  }, []);

  const addQueuedCandidates = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer) return;
    const queued = pendingCandidatesRef.current.splice(0);
    for (const signal of queued) {
      if (signal.candidate) await peer.addIceCandidate(toCandidate(signal.candidate));
    }
  }, []);

  const buildPeer = useCallback((callId: string) => {
    const peer = createPeerConnection();
    peerRef.current = peer;
    const peerEvents = peer as any;
    peerEvents.onicecandidate = (event: any) => {
      if (event.candidate) signalRef.current?.emitCandidate({ callId, conversationId, candidate: candidateToPayload(event.candidate) });
    };
    peerEvents.ontrack = (event: any) => {
      const remote = event.streams[0];
      if (remote) setState((current) => ({ ...current, remoteStream: remote }));
    };
    peerEvents.onconnectionstatechange = () => {
      const connectionState = peer.connectionState;
      if (connectionState === "connected") setState((current) => ({ ...current, status: "connected" }));
      if (connectionState === "failed" || connectionState === "disconnected") setState((current) => ({ ...current, status: "error", error: "Kết nối cuộc gọi bị gián đoạn." }));
    };
    return peer;
  }, [conversationId]);

  const addLocalStream = useCallback((peer: NativePeer, stream: NativeStream) => {
    stream.getTracks().forEach((track: any) => peer.addTrack(track, stream));
  }, []);

  const startCall = useCallback(async (mode: CallMode) => {
    try {
      cleanup();
      const callId = newCallId();
      callIdRef.current = callId;
      setState({ ...initialState, status: "connecting", mode, speakerEnabled: mode === "video" });
      const localStream = await createLocalMedia(mode);
      const peer = buildPeer(callId);
      addLocalStream(peer, localStream);
      setState((current) => ({ ...current, localStream }));
      const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
      await peer.setLocalDescription(offer);
      signalRef.current?.emitOffer({ callId, conversationId, mode, description: offer.toJSON() as SessionDescriptionPayload });
    } catch (error) {
      setState((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "Không thể bắt đầu cuộc gọi." }));
    }
  }, [addLocalStream, buildPeer, cleanup, conversationId]);

  const acceptIncomingCall = useCallback(async () => {
    const incoming = state.incoming;
    if (!incoming) return;
    try {
      callIdRef.current = incoming.callId;
      setState({ ...initialState, status: "connecting", mode: incoming.mode, speakerEnabled: incoming.mode === "video" });
      const localStream = await createLocalMedia(incoming.mode);
      const peer = buildPeer(incoming.callId);
      addLocalStream(peer, localStream);
      await peer.setRemoteDescription(toDescription(incoming.description));
      await addQueuedCandidates();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      setState((current) => ({ ...current, localStream }));
      signalRef.current?.emitAnswer({ callId: incoming.callId, conversationId: incoming.conversationId, description: answer.toJSON() as SessionDescriptionPayload });
    } catch (error) {
      setState((current) => ({ ...current, status: "error", error: error instanceof Error ? error.message : "Không thể nhận cuộc gọi." }));
    }
  }, [addLocalStream, addQueuedCandidates, buildPeer, conversationId, state.incoming]);

  const declineIncomingCall = useCallback(() => {
    if (state.incoming) signalRef.current?.emitEnd({ callId: state.incoming.callId, conversationId: state.incoming.conversationId });
    cleanup();
  }, [cleanup, state.incoming]);

  const endCall = useCallback(() => {
    if (callIdRef.current) signalRef.current?.emitEnd({ callId: callIdRef.current, conversationId });
    cleanup();
  }, [cleanup, conversationId]);

  const toggleMute = useCallback(() => setState((current) => {
    const muted = !current.muted;
    setMutedOnStream(current.localStream, muted);
    return { ...current, muted };
  }), []);
  const toggleCamera = useCallback(() => setState((current) => {
    const cameraEnabled = !current.cameraEnabled;
    setCameraEnabledOnStream(current.localStream, cameraEnabled);
    return { ...current, cameraEnabled };
  }), []);
  const toggleSpeaker = useCallback(() => setState((current) => {
    const speakerEnabled = !current.speakerEnabled;
    setSpeakerEnabledOnDevice(speakerEnabled);
    return { ...current, speakerEnabled };
  }), []);
  const switchCamera = useCallback(() => switchCameraOnStream(state.localStream), [state.localStream]);

  const stopScreenShare = useCallback(async () => {
    const peer = peerRef.current;
    const local = state.localStream;
    const screen = screenStreamRef.current;
    const cameraTrack = local?.getVideoTracks()[0];
    const sender = peer?.getSenders().find((item: any) => item.track?.kind === "video");
    if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
    stopStream(screen);
    screenStreamRef.current = null;
    setState((current) => ({ ...current, isScreenSharing: false }));
  }, [state.localStream]);

  const toggleScreenShare = useCallback(async () => {
    if (state.isScreenSharing) return stopScreenShare();
    if (state.mode !== "video" || !peerRef.current) {
      setState((current) => ({ ...current, error: "Chia sẻ màn hình chỉ khả dụng trong cuộc gọi video đang kết nối." }));
      return;
    }
    try {
      const screen = await createDisplayMedia();
      const screenTrack = screen.getVideoTracks()[0];
      const sender = peerRef.current.getSenders().find((item: any) => item.track?.kind === "video");
      if (!screenTrack || !sender) throw new Error("Không tìm thấy luồng video để chia sẻ màn hình.");
      await sender.replaceTrack(screenTrack);
      (screenTrack as any).onended = () => { void stopScreenShare(); };
      screenStreamRef.current = screen;
      setState((current) => ({ ...current, isScreenSharing: true }));
    } catch (error) {
      setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể chia sẻ màn hình." }));
    }
  }, [state.isScreenSharing, state.mode, stopScreenShare]);

  useEffect(() => {
    if (!enabled || !Number.isFinite(conversationId)) return;
    let cancelled = false;
    void createKiniSignalClient({
      offer: (signal) => {
        const mode = signal.mode;
        const description = signal.description;
        if (cancelled || signal.conversationId !== conversationId || !description || !mode) return;
        const incoming: IncomingCall = { callId: signal.callId, conversationId: signal.conversationId, mode, fromUserId: signal.fromUserId, description };
        incomingRef.current = incoming;
        setState((current) => current.status === "idle" ? {
          ...initialState,
          status: "ringing",
          incoming,
        } : current);
      },
      answer: async (signal) => {
        const peer = peerRef.current;
        if (!peer || signal.callId !== callIdRef.current || !signal.description) return;
        await peer.setRemoteDescription(toDescription(signal.description));
        await addQueuedCandidates();
      },
      candidate: async (signal) => {
        const peer = peerRef.current;
        if (signal.callId !== callIdRef.current && signal.callId !== incomingRef.current?.callId) return;
        if (!peer || !signal.candidate || !peer.remoteDescription) {
          pendingCandidatesRef.current.push(signal);
          return;
        }
        await peer.addIceCandidate(toCandidate(signal.candidate));
      },
      end: (signal) => {
        if (signal.callId === callIdRef.current || signal.callId === incomingRef.current?.callId) cleanup();
      },
      error: (message) => setState((current) => current.status === "idle" ? current : { ...current, error: message }),
    }).then((client) => {
      if (cancelled) client.disconnect();
      else signalRef.current = client;
    }).catch((error) => setState((current) => ({ ...current, error: error instanceof Error ? error.message : "Không thể kết nối signaling." })));

    return () => {
      cancelled = true;
      signalRef.current?.disconnect();
      signalRef.current = null;
      cleanup();
    };
  }, [addQueuedCandidates, cleanup, conversationId, enabled]);

  return { ...state, startCall, acceptIncomingCall, declineIncomingCall, endCall, toggleMute, toggleCamera, toggleSpeaker, switchCamera, toggleScreenShare, stopScreenShare };
}
