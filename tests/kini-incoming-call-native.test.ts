import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const plugin = readFileSync(resolve(import.meta.dirname, "../plugins/with-kini-incoming-call.js"), "utf8");
const pushServer = readFileSync(resolve(import.meta.dirname, "../server/push.ts"), "utf8");

describe("KINI Android full-screen incoming call", () => {
  it("khai báo Firebase Messaging, ConnectionService và quyền full-screen call", () => {
    expect(plugin).toContain("android.permission.POST_NOTIFICATIONS");
    expect(plugin).toContain("android.permission.USE_FULL_SCREEN_INTENT");
    expect(plugin).toContain("android.permission.MANAGE_OWN_CALLS");
    expect(plugin).toContain("KiniFirebaseMessagingService");
    expect(plugin).toContain("KiniConnectionService");
    expect(plugin).toContain("android.telecom.ConnectionService");
    expect(plugin).toContain("setShowWhenLocked(true)");
    expect(plugin).toContain("setTurnScreenOn(true)");
    expect(plugin).toContain('data["type"] == "incoming_call"');
    expect(plugin).toContain("KiniCallNotifier.showIncomingCall");
    expect(plugin).toContain("isAppInForeground");
    expect(plugin).toContain("isDeviceLocked");
  });

  it("dùng full-screen intent im lặng cho Android nền và không tạo CallStyle banner", () => {
    expect(plugin).toContain("setFullScreenIntent(contentIntent, true)");
    expect(plugin).toContain("setSilent(true)");
    expect(plugin).toContain("setTimeoutAfter(30_000L)");
    expect(plugin).toContain("bootstrap im lặng");
    expect(plugin).not.toContain("NotificationCompat.CallStyle.forIncomingCall");
    expect(plugin).toContain("ACTION_ANSWER");
    expect(plugin).toContain("ACTION_DECLINE");
    expect(pushServer).toContain("notification.channelId === \"messages\"");
    expect(pushServer).toContain("Chỉ token FCM native nhận data-only");
    expect(pushServer).toContain("sendCallEndedPush");
    expect(pushServer).toContain("sendMissedCallPush");
    expect(plugin).toContain('data["type"] == "call_ended"');
    expect(plugin).toContain("KiniCallNotifier.cancelIncomingCall(this, callId)");
    expect(plugin).toContain("callerAvatar");
    expect(plugin).toContain("showMissedCall");
    expect(plugin).toContain("dismissIncomingCall");
    expect(plugin).toContain("KiniTelecomBridge.dismissIncomingCall(callId)");
    expect(plugin).toContain("activeConnections");
    expect(plugin).toContain("Nhận cuộc gọi");
    expect(plugin).toContain("actionButton(\"☎\"");
    expect(plugin).not.toContain("override fun onShowIncomingCallUi()");
  });

  it("chỉ dùng full-screen bootstrap khi app ở nền hoặc thiết bị đang khóa", () => {
    expect(plugin).toContain("val shouldUseFullScreen = !KiniCallNotifier.isAppInForeground(this) || KiniCallNotifier.isDeviceLocked(this)");
    expect(plugin).toContain("if (shouldUseFullScreen)");
    expect(plugin).toContain("KiniIncomingCallActivity.openReactApp(this, callId, KiniCallNotifier.ACTION_OPEN)");
    expect(plugin).toContain("lifecycle-process:2.8.4");
  });

  it("gửi end push cho peer cả sau khi cuộc gọi đã được nhận", () => {
    expect(pushServer).toContain('data: { type: "call_ended", callId: payload.callId }');
    expect(readFileSync(resolve(import.meta.dirname, "../server/signaling/index.ts"), "utf8")).toContain("for (const peerUserId of peerUserIds) void sendCallEndedPush");
  });
});
