import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const nativeService = readFileSync(resolve(import.meta.dirname, "../features/webrtc-calling/services/webrtcService.native.ts"), "utf8");
const callHook = readFileSync(resolve(import.meta.dirname, "../features/webrtc-calling/hooks/useWebRTC.ts"), "utf8");

describe("KINI WebRTC call quality", () => {
  it("keeps Android audio focus for both voice and video with echo controls", () => {
    expect(nativeService).toContain('media: mode === "voice" ? "audio" : "video"');
    expect(nativeService).toContain("echoCancellation: true");
    expect(nativeService).toContain("noiseSuppression: true");
    expect(nativeService).toContain("autoGainControl: true");
  });

  it("samples selected/nominated candidate pairs before displaying round-trip ping", () => {
    expect(callHook).toContain("report.selected === true || report.nominated === true");
    expect(callHook).toContain("totalRoundTripTime / pair.responsesReceived");
    expect(callHook).toContain("Math.min(60_000");
  });
});
