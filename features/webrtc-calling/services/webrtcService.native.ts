import { setAudioModeAsync } from "expo-audio";
import { NativeModules, PermissionsAndroid, Platform } from "react-native";
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

const KiniAudioSession = NativeModules.KiniAudioSession as {
  enterCall?: () => void;
  release?: () => void;
};

function enterKiniAudioSession() {
  try { KiniAudioSession.enterCall?.(); } catch { /* Native audio session không được chặn signaling. */ }
}

function releaseKiniAudioSession() {
  try { KiniAudioSession.release?.(); } catch { /* Cleanup phải an toàn cả khi React host đã đóng. */ }
}

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
  // Android dùng InCallManager cho cả thoại/video để WebRTC giữ audio focus và route loa ổn định.
  if (Platform.OS === "android") {
    if (!androidVoiceAudioActive) {
      enterKiniAudioSession();
      androidVoiceAudioActive = true;
    }
    try {
      InCallManager.start({ media: mode === "voice" ? "audio" : "video", auto: true });
      InCallManager.setForceSpeakerphoneOn(speakerEnabled);
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
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    } as any,
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
  // Screen stream chỉ mang video. Microphone của call được giữ trên local stream riêng để hai bên vẫn đàm thoại.
  return mediaDevices.getDisplayMedia();
}

/** Khôi phục audio focus sau khi MediaProjection trên Android khởi động mà không tạo stream micro thứ hai. */
export function keepCallAudioActive(speakerEnabled: boolean, mode: CallMode) {
  if (Platform.OS === "android") {
    try {
      // MediaProjection/Home có thể làm Android trả audio focus dù cờ local vẫn còn true; luôn tái chiếm session.
      InCallManager.start({ media: mode === "voice" ? "audio" : "video", auto: true });
      InCallManager.setForceSpeakerphoneOn(speakerEnabled);
      androidVoiceAudioActive = true;
    } catch { /* Không để audio route làm gián đoạn screen share đang chạy. */ }
    return;
  }
  void configureCallAudio(speakerEnabled, mode).catch(() => undefined);
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
    // MediaProjection hoặc một cuộc gián đoạn ngắn có thể làm Android trả audio focus trước khi người dùng đổi loa.
    // Tái áp dụng session trước khi đổi route để thoại, video và screen share đều dùng được loa trong/ngoài.
    keepCallAudioActive(enabled, mode);
    return;
  }
  void configureCallAudio(enabled, mode).catch(() => {});
}

export function stopInCall() {
  if (Platform.OS === "android") {
    // Ringback có thể bắt đầu trước audio session WebRTC; luôn dừng riêng dù session chưa kịp được đánh dấu active.
    try { InCallManager.stopRingback(); } catch { /* Native ringback đã dừng hoặc chưa khởi tạo. */ }
    if (androidVoiceAudioActive) {
      try { InCallManager.stop(); } catch { /* Audio session đã được hệ điều hành giải phóng. */ }
    }
    void InCallManager.abandonAudioFocus().catch(() => undefined);
    releaseKiniAudioSession();
    androidVoiceAudioActive = false;
    return;
  }
  void setAudioModeAsync({ allowsRecording: false, shouldRouteThroughEarpiece: false }).catch(() => {});
}
