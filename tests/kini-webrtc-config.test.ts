import { describe, expect, it } from "vitest";

import { ICE_SERVERS } from "../features/webrtc-calling/config/iceServers";

describe("KINI WebRTC ICE configuration", () => {
  it("có nhiều STUN và TURN dự phòng cho kết nối P2P", () => {
    const urls = ICE_SERVERS.flatMap((server) => Array.isArray(server.urls) ? server.urls : [server.urls]);
    expect(urls.filter((url) => url.startsWith("stun:")).length).toBeGreaterThanOrEqual(4);
    expect(urls.filter((url) => url.startsWith("turn:")).length).toBeGreaterThanOrEqual(3);
  });
});
