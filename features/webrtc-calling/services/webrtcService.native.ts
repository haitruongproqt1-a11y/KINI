import { setAudioModeAsync } from "expo-audio";
import { PermissionsAndroid, Platform } from "react-native";
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  type MediaStreamTrack,
} from "react-native-webrtc";

import { apiCall } from "@/lib/_core/api";
import type { CallMode, IceCandidatePayload, SessionDescriptionPayload } from "./types";

export type NativePeer = RTCPeerConnection;
export type NativeStream = MediaStream;

function setSpeakerRoute(enabled: boolean) {
  void setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    shouldRouteThroughEarpiece: !enabled,
  }).catch(() => {
    // WebRTC giữ audio session riêng; route thất bại không được làm hỏng cuộc gọi.
  });
}

type IceServer = { urls: string | string[]; username?: string; credential?: string };

export async function createPeerConnection() {
  const result = await apiCall<{ iceServers: IceServer[] }>("/api/call/ice");
  if (!Array.isArray(result.iceServers) || result.iceServers.length === 0) throw new Error("Không có TURN relay cho cuộc gọi.");
  return new RTCPeerConnection({ iceServers: result.iceServers, bundlePolicy: "max-bundle", rtcpMuxPolicy: "require", iceTransportPolicy: "all" });
}

export async function createLocalMedia(mode: CallMode): Promise<NativeStream> {
  if (Platform.OS === "android") {
    const permissions = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ...(mode === "video" ? [PermissionsAndroid.PERMISSIONS.CAMERA] : []),
    ]);
    const denied = Object.values(permissions).some((result) => result !== PermissionsAndroid.RESULTS.GRANTED);
    if (denied) throw new Error(mode === "video" ? "KINI cần quyền micro và camera để gọi video." : "KINI cần quyền micro để gọi thoại.");
  }
  const stream = await mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video" ? { facingMode: "user", frameRate: 24, width: 640, height: 480 } : false,
  });
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
  try {
    stream?.getTracks?.().forEach((track) => {
      try { if (track.readyState !== "ended") track.stop(); } catch { /* Track đã được native release. */ }
    });
  } catch { /* Stream không còn hợp lệ sau khi peer đóng. */ }
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
  void setAudioModeAsync({ allowsRecording: false, shouldRouteThroughEarpiece: false }).catch(() => {});
}
