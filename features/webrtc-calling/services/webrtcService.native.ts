import InCallManager from "react-native-incall-manager";
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  type MediaStreamTrack,
} from "react-native-webrtc";

import { ICE_SERVERS } from "../config/iceServers";
import type { CallMode, IceCandidatePayload, SessionDescriptionPayload } from "./types";

export type NativePeer = RTCPeerConnection;
export type NativeStream = MediaStream;

type InCallApi = {
  start?: (options?: { media?: "audio" | "video"; auto?: boolean }) => void;
  stop?: () => void;
  setForceSpeakerphoneOn?: (enabled: boolean) => void;
  setSpeakerphoneOn?: (enabled: boolean) => void;
};

function inCallApi() {
  return InCallManager as unknown as InCallApi;
}

function setSpeakerRoute(enabled: boolean) {
  const manager = inCallApi();
  if (typeof manager.setForceSpeakerphoneOn === "function") manager.setForceSpeakerphoneOn(enabled);
  else if (typeof manager.setSpeakerphoneOn === "function") manager.setSpeakerphoneOn(enabled);
}

export function createPeerConnection() {
  return new RTCPeerConnection({ iceServers: [...ICE_SERVERS], bundlePolicy: "max-bundle", rtcpMuxPolicy: "require", iceTransportPolicy: "all" });
}

export async function createLocalMedia(mode: CallMode): Promise<NativeStream> {
  const stream = await mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video" ? { facingMode: "user", frameRate: 24, width: 640, height: 480 } : false,
  });
  const manager = inCallApi();
  if (typeof manager.start === "function") manager.start({ media: "audio", auto: true });
  setSpeakerRoute(mode === "video");
  return stream;
}

export async function createDisplayMedia(): Promise<NativeStream> {
  return mediaDevices.getDisplayMedia();
}

export function candidateToPayload(candidate: RTCIceCandidate): IceCandidatePayload {
  const payload = candidate.toJSON();
  if (!payload.candidate) throw new Error("ICE candidate không hợp lệ.");
  return { ...payload, candidate: payload.candidate };
}

export function toCandidate(candidate: IceCandidatePayload) {
  return new RTCIceCandidate(candidate);
}

export function toDescription(description: SessionDescriptionPayload) {
  return new RTCSessionDescription(description as any);
}

export function stopStream(stream: NativeStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function setMuted(stream: NativeStream | null, muted: boolean) {
  stream?.getAudioTracks().forEach((track) => { track.enabled = !muted; });
}

export function setCameraEnabled(stream: NativeStream | null, enabled: boolean) {
  stream?.getVideoTracks().forEach((track) => { track.enabled = enabled; });
}

export function switchCamera(stream: NativeStream | null) {
  const track = stream?.getVideoTracks()[0] as (MediaStreamTrack & { _switchCamera?: () => void }) | undefined;
  track?._switchCamera?.();
}

export function setSpeakerEnabled(enabled: boolean) {
  setSpeakerRoute(enabled);
}

export function stopInCall() {
  const manager = inCallApi();
  if (typeof manager.stop === "function") manager.stop();
}
