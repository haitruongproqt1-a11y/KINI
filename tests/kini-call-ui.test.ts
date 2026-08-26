import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(import.meta.dirname, "..");
const video = readFileSync(resolve(project, "features/webrtc-calling/components/VideoCall.tsx"), "utf8");
const voice = readFileSync(resolve(project, "features/webrtc-calling/components/VoiceCall.tsx"), "utf8");
const provider = readFileSync(resolve(project, "features/webrtc-calling/call-provider.tsx"), "utf8");

describe("KINI call UI", () => {
  it("hiển thị avatar và action nhận/từ chối rõ ràng cho cuộc gọi đến", () => {
    expect(video).toContain("<Avatar initials={initials}");
    expect(voice).toContain("<Avatar initials={initials}");
    expect(video).toContain('<IncomingCallActions mode="video"');
    expect(voice).toContain('<IncomingCallActions mode="voice"');
  });

  it("chỉ mount overlay đúng mode để tránh chuyển modal native chồng lấp", () => {
    expect(provider).toContain('if (call.mode === "voice") return <VoiceCall');
    expect(provider).toContain('if (call.mode === "video") return <VideoCall');
  });
});
