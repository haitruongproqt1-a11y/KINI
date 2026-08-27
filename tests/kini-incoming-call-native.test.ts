import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const plugin = readFileSync(resolve(import.meta.dirname, "../plugins/with-kini-incoming-call.js"), "utf8");
const pushServer = readFileSync(resolve(import.meta.dirname, "../server/push.ts"), "utf8");

describe("KINI Android full-screen incoming call", () => {
  it("khai báo Firebase Messaging, ConnectionService và quyền full-screen call", () => {
    expect(plugin).toContain("android.permission.USE_FULL_SCREEN_INTENT");
    expect(plugin).toContain("android.permission.MANAGE_OWN_CALLS");
    expect(plugin).toContain("KiniFirebaseMessagingService");
    expect(plugin).toContain("KiniConnectionService");
    expect(plugin).toContain("android.telecom.ConnectionService");
  });

  it("dùng CallStyle/fullScreenIntent với thao tác Nghe và Từ chối", () => {
    expect(plugin).toContain("NotificationCompat.CallStyle.forIncomingCall");
    expect(plugin).toContain("setFullScreenIntent(contentIntent, true)");
    expect(plugin).toContain("ACTION_ANSWER");
    expect(plugin).toContain("ACTION_DECLINE");
    expect(pushServer).toContain("notification.channelId === \"messages\"");
    expect(pushServer).toContain("sendCallEndedPush");
    expect(plugin).toContain('data["type"] == "call_ended"');
    expect(plugin).toContain("KiniCallNotifier.cancelIncomingCall(this, callId)");
  });
});
