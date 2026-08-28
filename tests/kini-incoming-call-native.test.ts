import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const plugin = readFileSync(resolve(import.meta.dirname, "../plugins/with-kini-incoming-call.js"), "utf8");
const pushServer = readFileSync(resolve(import.meta.dirname, "../server/push.ts"), "utf8");
const audioServicePlugin = readFileSync(resolve(import.meta.dirname, "../plugins/with-kini-webrtc-screen-share.js"), "utf8");
const nativeAudioClient = readFileSync(resolve(import.meta.dirname, "../features/webrtc-calling/services/webrtcService.native.ts"), "utf8");

describe("KINI Android full-screen incoming call", () => {
  it("khai báo Firebase Messaging và Activity full-screen KINI, không đăng ký Telecom UI riêng", () => {
    expect(plugin).toContain("android.permission.POST_NOTIFICATIONS");
    expect(plugin).toContain("android.permission.USE_FULL_SCREEN_INTENT");
    expect(plugin).not.toContain("android.permission.MANAGE_OWN_CALLS");
    expect(plugin).toContain("KiniFirebaseMessagingService");
    expect(plugin).toContain("KiniIncomingCallActivity");
    expect(plugin).not.toContain("Kết nối riêng tư KINI");
    expect(plugin).not.toContain('addComponent(application, "service", `${namespace}.KiniConnectionService`');
    expect(plugin).toContain("setShowWhenLocked(true)");
    expect(plugin).toContain("setTurnScreenOn(true)");
    expect(plugin).toContain('data["type"] == "incoming_call"');
    expect(plugin).toContain("KiniCallNotifier.showIncomingCall");
    expect(plugin).toContain("isAppInForeground");
    expect(plugin).toContain("Lifecycle.State.RESUMED");
    expect(plugin).toContain("isDeviceLocked");
  });

  it("dùng bootstrap full-screen im lặng và ringtone đóng gói của KINI, không dùng âm thanh mặc định", () => {
    expect(plugin).toContain("setFullScreenIntent(contentIntent, true)");
    expect(plugin).toContain("setSilent(true)");
    expect(plugin).toContain("MediaPlayer");
    expect(plugin).toContain("kini_incoming_ring");
    expect(plugin).toContain('assets", "audio", "kini-incoming-ring.mp3');
    expect(plugin).toContain("setSound(null, null)");
    expect(plugin).not.toContain("RingtoneManager.getDefaultUri");
    expect(plugin).toContain("setTimeoutAfter(55_000L)");
    expect(plugin).toContain("bootstrap im lặng");
    expect(plugin).toContain("object KiniCallRinger");
    expect(plugin).toContain("KiniCallRinger.start(context, callId)");
    expect(plugin).toContain("KiniCallRinger.stop(callId)");
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
    expect(plugin).not.toContain("KiniTelecomBridge.dismissIncomingCall(callId)");
    expect(plugin).not.toContain("KiniTelecomBridge.reportIncomingCall(this, callId");
    expect(plugin).toContain("Nhận cuộc gọi");
    expect(plugin).toContain("actionButton(\"☎\"");
    expect(plugin).not.toContain("override fun onShowIncomingCallUi()");
  });

  it("chỉ dùng full-screen bootstrap khi app ở nền hoặc thiết bị đang khóa", () => {
    expect(plugin).toContain("val shouldUseFullScreen = !KiniCallNotifier.isAppInForeground(this) || KiniCallNotifier.isDeviceLocked(this)");
    expect(plugin).toContain("if (shouldUseFullScreen)");
    expect(plugin).toContain("KiniIncomingCallActivity.openReactApp(this, callId, KiniCallNotifier.ACTION_OPEN)");
    expect(plugin).toContain("lifecycle-process:2.8.4");
    expect(plugin).toContain("KiniIncomingCallSettingsModule");
    expect(plugin).toContain("ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT");
    expect(plugin).toContain("canUseFullScreenIntent()");
  });

  it("không chặn volume key, không set volume hệ thống và có lifecycle audio rõ ràng", () => {
    expect(plugin).toContain("withMainActivity");
    expect(plugin).toContain("setVolumeControlStream(AudioManager.STREAM_MUSIC)");
    expect(plugin).toContain("setVolumeControlStream(AudioManager.STREAM_VOICE_CALL)");
    expect(plugin).toContain("manager.mode = AudioManager.MODE_IN_COMMUNICATION");
    expect(plugin).toContain("manager.mode = AudioManager.MODE_NORMAL");
    expect(plugin).toContain("manager.isSpeakerphoneOn = false");
    expect(plugin).toContain("onActivityPause");
    expect(plugin).toContain("onActivityStop");
    expect(plugin).toContain("onActivityDestroy");
    expect(plugin).not.toContain("KEYCODE_VOLUME_UP");
    expect(plugin).not.toContain("KEYCODE_VOLUME_DOWN");
    expect(plugin).not.toContain("setStreamVolume");
    expect(plugin).not.toContain("SharedPreferences");
    expect(audioServicePlugin).toContain("override fun onTaskRemoved");
    expect(audioServicePlugin).toContain("KiniAudioSession.release(applicationContext)");
    expect(nativeAudioClient).toContain("KiniAudioSession.enterCall");
    expect(nativeAudioClient).toContain("KiniAudioSession.release");
    expect(nativeAudioClient).toContain("InCallManager.stop()");
    expect(nativeAudioClient).toContain("InCallManager.abandonAudioFocus()");
  });

  it("gửi end push cho peer cả sau khi cuộc gọi đã được nhận", () => {
    expect(pushServer).toContain('data: { type: "call_ended", callId: payload.callId }');
    expect(pushServer).toContain('ttl: "55s"');
    expect(pushServer).toContain("direct_boot_ok: true");
    expect(readFileSync(resolve(import.meta.dirname, "../server/signaling/index.ts"), "utf8")).toContain("for (const peerUserId of peerUserIds) void sendCallEndedPush");
    expect(readFileSync(resolve(import.meta.dirname, "../server/_core/index.ts"), "utf8")).toContain('app.post("/api/call/end"');
  });
});
