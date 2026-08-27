import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(import.meta.dirname, "..");
const service = readFileSync(resolve(project, "features/webrtc-calling/services/webrtcService.native.ts"), "utf8");
const voice = readFileSync(resolve(project, "features/webrtc-calling/components/VoiceCall.tsx"), "utf8");
const video = readFileSync(resolve(project, "features/webrtc-calling/components/VideoCall.tsx"), "utf8");

describe("KINI chuyển loa cuộc gọi", () => {
  it("khởi lại audio route Android trước khi chuyển loa trong/ngoài", () => {
    expect(service).toContain("keepCallAudioActive(enabled, mode)");
    expect(service).toContain("InCallManager.setForceSpeakerphoneOn(speakerEnabled)");
  });

  it("cung cấp điều khiển loa cho thoại và video, kể cả khi đang chia sẻ", () => {
    expect(voice).toContain("speakerEnabled={call.speakerEnabled}");
    expect(voice).toContain("onSpeaker={call.toggleSpeaker}");
    expect(video).toContain("speakerEnabled={call.speakerEnabled}");
    expect(video).toContain("onSpeaker={call.toggleSpeaker}");
    expect(video).toContain("call.isScreenSharing");
  });
});
