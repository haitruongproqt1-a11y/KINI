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

export function createPeerConnection() {
  return new RTCPeerConnection({ iceServers: [...ICE_SERVERS] });
}

export async function createLocalMedia(mode: CallMode): Promise<NativeStream> {
  const stream = await mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video" ? { facingMode: "user", frameRate: 24, width: 640, height: 480 } : false,
  });
  InCallManager.start();
  InCallManager.setForceSpeakerphoneOn(mode === "video");
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
  InCallManager.setForceSpeakerphoneOn(enabled);
}

export function stopInCall() {
  InCallManager.stop();
}
