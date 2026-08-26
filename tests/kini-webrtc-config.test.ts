import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(import.meta.dirname, "..");
const nativeService = readFileSync(resolve(project, "features/webrtc-calling/services/webrtcService.native.ts"), "utf8");
const hook = readFileSync(resolve(project, "features/webrtc-calling/hooks/useWebRTC.ts"), "utf8");
const signaling = readFileSync(resolve(project, "server/signaling/index.ts"), "utf8");
const pushManager = readFileSync(resolve(project, "components/push-notification-manager.tsx"), "utf8");

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

  it("không để audio mode Expo ghi đè WebRTC Android và thay camera sender khi tắt/bật", () => {
    expect(nativeService).toContain('if (Platform.OS === "android") return;');
    expect(hook).toContain("cameraSenderRef.current");
    expect(hook).toContain("emitMedia({ callId: callIdRef.current");
    expect(hook).toContain("await sender.replaceTrack(nextEnabled ? track : null)");
  });

  it("tune sender screen share để ưu tiên ổn định và độ phân giải", () => {
    expect(nativeService).toContain("degradationPreference = \"maintain-resolution\"");
    expect(nativeService).toContain("encoding.maxBitrate = 2_500_000");
    expect(hook).toContain("await stabilizeScreenShareSender(transceiver.sender)");
  });

  it("replay offer và trì hoãn action notification cho tới khi call incoming đã sẵn sàng", () => {
    expect(signaling).toContain("pendingOffersByCallee");
    expect(signaling).toContain("socket.emit(\"call:offer\", pendingOffer)");
    expect(hook).toContain("pendingNotificationActionRef");
    expect(hook).toContain("handleIncomingNotificationAction");
    expect(pushManager).toContain("call.handleIncomingNotificationAction");
  });

  it("khởi tạo route voice với speaker rõ ràng và cho phép người dùng đổi route sau đó", () => {
    expect(nativeService).toContain("await configureCallAudio(true, mode)");
    expect(nativeService).toContain("InCallManager.setForceSpeakerphoneOn(speakerEnabled)");
  });
});
