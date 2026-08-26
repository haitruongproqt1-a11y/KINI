import { setAudioModeAsync } from "expo-audio";
import { PermissionsAndroid, Platform } from "react-native";
import InCallManager from "react-native-incall-manager";
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

let androidVoiceAudioActive = false;

async function configureExpoAudio(speakerEnabled: boolean) {
  if (Platform.OS === "android") return;
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    interruptionMode: "doNotMix",
    shouldRouteThroughEarpiece: !speakerEnabled,
  });
}

async function configureCallAudio(speakerEnabled: boolean, mode: CallMode) {
  // Android dùng InCallManager để WebRTC giữ audio focus và route ổn định.
  if (Platform.OS === "android") {
    if (mode !== "voice") return;
    try {
      InCallManager.start({ media: "audio", auto: true });
      InCallManager.setForceSpeakerphoneOn(speakerEnabled);
      androidVoiceAudioActive = true;
    } catch {
      // Không để lỗi audio route native làm crash hoặc chặn signaling.
    }
    return;
  }
  await configureExpoAudio(speakerEnabled);
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
  try { await configureCallAudio(true, mode); } catch { /* WebRTC vẫn tiếp tục nếu audio mode hệ thống bị chặn. */ }
  const stream = await mediaDevices.getUserMedia({
    audio: true,
    video: mode === "video" ? { facingMode: "user", frameRate: 24, width: 640, height: 480 } : false,
  });
  return stream;
}

/** Ưu tiên nét chữ/màn hình và giảm thay đổi bitrate khung hình khi chia sẻ trên mạng di động. */
export async function stabilizeScreenShareSender(sender: any) {
  try {
    const parameters = sender?.getParameters?.();
    if (!parameters || !Array.isArray(parameters.encodings)) return;
    parameters.degradationPreference = "maintain-resolution";
    parameters.encodings.forEach((encoding: any) => {
      encoding.active = true;
      encoding.maxBitrate = 2_500_000;
      encoding.maxFramerate = 12;
      encoding.scaleResolutionDownBy = 1;
    });
    await sender.setParameters(parameters);
  } catch {
    // Một số Android cũ không hỗ trợ sender parameters; share vẫn tiếp tục với mặc định WebRTC.
  }
}

export async function createDisplayMedia(): Promise<NativeStream> {
  return mediaDevices.getDisplayMedia();
}

export function streamFromTrack(track: MediaStreamTrack): NativeStream {
  return new MediaStream([track]);
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
    try { stream?.release?.(false); } catch { /* Stream native đã được release. */ }
  } catch { /* Stream không còn hợp lệ sau khi peer đóng. */ }
}

export function setMuted(stream: NativeStream | null, muted: boolean) {
  try { stream?.getAudioTracks().forEach((track) => { track.enabled = !muted; }); } catch { /* Stream đã đóng. */ }
}

export function setCameraEnabled(stream: NativeStream | null, enabled: boolean) {
  try { stream?.getVideoTracks().forEach((track) => { track.enabled = enabled; }); } catch { /* Stream đã đóng. */ }
}

export function switchCamera(stream: NativeStream | null) {
  const track = stream?.getVideoTracks()[0] as (MediaStreamTrack & { _switchCamera?: () => void }) | undefined;
  track?._switchCamera?.();
}

export function setSpeakerEnabled(enabled: boolean, mode: CallMode = "video") {
  if (Platform.OS === "android") {
    if (mode !== "voice" || !androidVoiceAudioActive) return;
    try { InCallManager.setForceSpeakerphoneOn(enabled); } catch { /* Route native không còn hợp lệ. */ }
    return;
  }
  void configureCallAudio(enabled, mode).catch(() => {});
}

export function stopInCall() {
  if (Platform.OS === "android") {
    if (!androidVoiceAudioActive) return;
    try { InCallManager.stop(); } catch { /* Audio session đã được hệ điều hành giải phóng. */ }
    androidVoiceAudioActive = false;
    return;
  }
  void setAudioModeAsync({ allowsRecording: false, shouldRouteThroughEarpiece: false }).catch(() => {});
}
