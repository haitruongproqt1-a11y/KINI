import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const hook = readFileSync(resolve(import.meta.dirname, "../features/webrtc-calling/hooks/useWebRTC.ts"), "utf8");
const provider = readFileSync(resolve(import.meta.dirname, "../features/webrtc-calling/call-provider.tsx"), "utf8");
const voice = readFileSync(resolve(import.meta.dirname, "../features/webrtc-calling/components/VoiceCall.tsx"), "utf8");
const video = readFileSync(resolve(import.meta.dirname, "../features/webrtc-calling/components/VideoCall.tsx"), "utf8");

describe("KINI minimized call", () => {
  it("keeps WebRTC state alive while the overlay is minimized and can restore it", () => {
    expect(hook).toContain("const minimizeCall");
    expect(hook).toContain("const restoreCall");
    expect(provider).toContain("MinimizedCall");
    expect(provider).toContain("Chạm để quay lại");
  });

  it("provides minimize controls for both voice and video without hiding incoming actions", () => {
    expect(voice).toContain("call.minimizeCall");
    expect(video).toContain("call.minimizeCall");
    expect(hook).toContain('current.status === "ringing" && current.direction === "incoming"');
  });
});
