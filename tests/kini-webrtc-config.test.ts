import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(import.meta.dirname, "..");
const nativeService = readFileSync(resolve(project, "features/webrtc-calling/services/webrtcService.native.ts"), "utf8");
const hook = readFileSync(resolve(project, "features/webrtc-calling/hooks/useWebRTC.ts"), "utf8");

describe("KINI WebRTC Android safety", () => {
  it("lấy TURN credential động thay vì nhúng relay công khai trong APK", () => {
    expect(nativeService).toContain('apiCall<{ iceServers: IceServer[] }>("/api/call/ice")');
    expect(nativeService).not.toContain("openrelay");
  });

  it("dùng sender cố định cho screen share và không removeTrack khi kết thúc", () => {
    expect(hook).toContain('peer.addTransceiver("video", { direction: "sendonly" })');
    expect(hook).toContain("await sender.replaceTrack(null)");
    expect(hook).not.toContain("removeTrack(");
  });

  it("vô hiệu callback native cũ trước khi close peer và chờ ACK call:end", () => {
    expect(hook).toContain("cleanupTokenRef.current += 1");
    expect(hook).toContain("events.ontrack = null");
    expect(hook).toContain("await signal?.emitEnd");
    expect(nativeService).toContain("interruptionMode: \"doNotMix\"");
  });
});
