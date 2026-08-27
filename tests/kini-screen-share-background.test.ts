import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(import.meta.dirname, "..");
const screenSharePlugin = readFileSync(resolve(project, "plugins/with-kini-webrtc-screen-share.js"), "utf8");
const provider = readFileSync(resolve(project, "features/webrtc-calling/call-provider.tsx"), "utf8");

describe("KINI screen share khi vào nền", () => {
  it("giữ microphone MediaProjection và có native overlay chỉ sau quyền hiển thị trên ứng dụng khác", () => {
    expect(screenSharePlugin).toContain("android.permission.FOREGROUND_SERVICE_MICROPHONE");
    expect(screenSharePlugin).toContain("android.permission.SYSTEM_ALERT_WINDOW");
    expect(screenSharePlugin).toContain('"android:foregroundServiceType": "mediaProjection|microphone"');
    expect(screenSharePlugin).toContain("KiniScreenShareOverlayModule");
    expect(screenSharePlugin).toContain("import com.facebook.react.ReactPackage");
    expect(screenSharePlugin).toContain("Settings.ACTION_MANAGE_OVERLAY_PERMISSION");
    expect(screenSharePlugin).toContain("TYPE_APPLICATION_OVERLAY");
  });

  it("chỉ hiện overlay khi screen share đi vào background, giữ audio và ẩn khi quay lại KINI", () => {
    expect(provider).toContain('nextState === "background"');
    expect(provider).toContain("call.isScreenSharing");
    expect(provider).toContain("call.keepAudioActive()");
    expect(provider).toContain("screenShareOverlay?.show");
    expect(provider).toContain('nextState === "active"');
    expect(provider).toContain("screenShareOverlay?.hide");
  });
});
