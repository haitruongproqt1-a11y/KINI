import { ICE_SERVERS } from "../config/iceServers";
import type { CallMode, IceCandidatePayload, SessionDescriptionPayload } from "./types";

export type NativePeer = any;
export type NativeStream = any;

const browserMedia = () => {
  const mediaDevices = (globalThis as { navigator?: { mediaDevices?: MediaDevices } }).navigator?.mediaDevices;
  if (!mediaDevices) throw new Error("Trình duyệt này không hỗ trợ WebRTC.");
  return mediaDevices;
};

export function createPeerConnection() {
  const Peer = (globalThis as { RTCPeerConnection?: typeof RTCPeerConnection }).RTCPeerConnection;
  if (!Peer) throw new Error("Trình duyệt này không hỗ trợ WebRTC.");
  return new Peer({ iceServers: [...ICE_SERVERS] });
}

export async function createLocalMedia(mode: CallMode) {
  return browserMedia().getUserMedia({ audio: true, video: mode === "video" ? { facingMode: "user" } : false });
}

export async function createDisplayMedia() {
  return browserMedia().getDisplayMedia({ video: true, audio: true });
}

export function candidateToPayload(candidate: RTCIceCandidate): IceCandidatePayload {
  const payload = candidate.toJSON();
  if (!payload.candidate) throw new Error("ICE candidate không hợp lệ.");
  return { ...payload, candidate: payload.candidate };
}
export function toCandidate(candidate: IceCandidatePayload) { return new RTCIceCandidate(candidate); }
export function toDescription(description: SessionDescriptionPayload) { return new RTCSessionDescription(description); }
export function stopStream(stream: NativeStream | null | undefined) { stream?.getTracks().forEach((track: MediaStreamTrack) => track.stop()); }
export function setMuted(stream: NativeStream | null, muted: boolean) { stream?.getAudioTracks().forEach((track: MediaStreamTrack) => { track.enabled = !muted; }); }
export function setCameraEnabled(stream: NativeStream | null, enabled: boolean) { stream?.getVideoTracks().forEach((track: MediaStreamTrack) => { track.enabled = enabled; }); }
export function switchCamera() { /* Web dùng bộ chọn camera của trình duyệt. */ }
export function setSpeakerEnabled() { /* Web do hệ điều hành/trình duyệt quản lý audio route. */ }
export function stopInCall() { /* Không cần dọn native audio route trên web. */ }
