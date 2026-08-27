import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(import.meta.dirname, "..");
const updater = readFileSync(resolve(project, "lib/app-update.ts"), "utf8");
const profileCard = readFileSync(resolve(project, "components/release-update-card.tsx"), "utf8");

describe("KINI Android update installer", () => {
  it("mở trình cài đặt qua Android VIEW intent sau tải APK", () => {
    expect(updater).toContain('IntentLauncher.startActivityAsync("android.intent.action.VIEW"');
    expect(updater).toContain('type: "application/vnd.android.package-archive"');
    expect(updater).toContain("getContentUriAsync(downloadedUri)");
  });

  it("giữ APK đã hoàn tất và chuyển CTA sang Cài đặt thay vì tải lại", () => {
    expect(updater).toContain("isDownloaded: () => Boolean(downloadedUri)");
    expect(profileCard).toContain("setInstallReady(ready)");
    expect(profileCard).toContain('installReady ? "Cài đặt" : "Cập nhật"');
  });
});
