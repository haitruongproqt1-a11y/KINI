import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(import.meta.dirname, "..");
const video = readFileSync(resolve(project, "features/webrtc-calling/components/VideoCall.tsx"), "utf8");
const voice = readFileSync(resolve(project, "features/webrtc-calling/components/VoiceCall.tsx"), "utf8");
const provider = readFileSync(resolve(project, "features/webrtc-calling/call-provider.tsx"), "utf8");
const sounds = readFileSync(resolve(project, "features/webrtc-calling/hooks/useCallSounds.ts"), "utf8");
const controls = readFileSync(resolve(project, "features/webrtc-calling/components/CallControls.tsx"), "utf8");
const nativeVideo = readFileSync(resolve(project, "features/webrtc-calling/components/RtcVideo.native.tsx"), "utf8");
const nativeService = readFileSync(resolve(project, "features/webrtc-calling/services/webrtcService.native.ts"), "utf8");
const webRtc = readFileSync(resolve(project, "features/webrtc-calling/hooks/useWebRTC.ts"), "utf8");

describe("KINI call UI", () => {
  it("hiển thị avatar và action nhận/từ chối rõ ràng cho cuộc gọi đến", () => {
    expect(video).toContain("<Avatar initials={initials}");
    expect(voice).toContain("<Avatar initials={initials}");
    expect(video).toContain('<IncomingCallActions mode="video"');
    expect(voice).toContain('<IncomingCallActions mode="voice"');
  });

  it("chỉ mount overlay đúng mode để tránh chuyển modal native chồng lấp", () => {
    expect(provider).toContain('call.mode === "voice" ? <VoiceCall');
    expect(provider).toContain('call.mode === "video" ? <VideoCall');
    expect(provider).toContain("MinimizedCall");
  });

  it("phát nhạc chờ native cho gọi thoại Android và tạo phản hồi nhẹ cho cuộc gọi đến", () => {
    expect(sounds).toContain('mode === "voice"');
    expect(sounds).toContain('InCallManager.startRingback("_DTMF_")');
    expect(sounds).toContain("isScreenSharing = false");
    expect(sounds).toContain("!isScreenSharing");
    expect(controls).toContain("attention onPress={onDecline}");
    expect(controls).toContain("attention onPress={onAccept}");
    expect(nativeService).toContain("InCallManager.stopRingback()");
    expect(webRtc).toContain("Dừng stream/audio/ringback cục bộ ngay");
  });

  it("đưa preview camera local lên trên RTC video và không render màn hình tự chia sẻ", () => {
    expect(nativeVideo).toContain("zOrder={zOrder}");
    expect(video).toContain("zOrder={1}");
    expect(video).toContain("const primaryStream = call.remoteScreenStream");
    expect(video).toContain("Bạn đang chia sẻ màn hình");
  });
});
