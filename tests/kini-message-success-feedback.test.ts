import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(import.meta.dirname, "..");
const chat = readFileSync(resolve(project, "app/chat/[id].tsx"), "utf8");
const composer = readFileSync(resolve(project, "components/chat-composer.tsx"), "utf8");

describe("KINI phản hồi gửi tin", () => {
  it("chỉ báo thành công sau khi mutation chat được server xác nhận", () => {
    expect(chat).toContain("onSuccess: (result) =>");
    expect(chat).toContain("confirmMessageSent();");
    expect(chat).toContain("kini-message-sent.mp3");
    expect(chat).toContain("Haptics.NotificationFeedbackType.Success");
  });

  it("hiển thị một pulse tinh tế ở composer sau xác nhận gửi", () => {
    expect(composer).toContain("sentFeedbackNonce");
    expect(composer).toContain("Animated.sequence");
    expect(composer).toContain("Đã gửi");
  });
});
