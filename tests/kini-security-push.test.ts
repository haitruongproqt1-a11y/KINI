import { describe, expect, it } from "vitest";

import { isExpoPushToken, isFcmPushToken } from "../server/push";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isSecurityQuestionId, securityQuestionLabel, securityQuestions } from "../shared/security-questions";

describe("Bảo mật và thông báo đẩy KINI", () => {
  it("chấp nhận các câu hỏi bảo mật thuộc danh mục được phép", () => {
    expect(isSecurityQuestionId("first_pet")).toBe(true);
    expect(securityQuestionLabel("first_pet")).toContain("thú cưng");
    expect(isSecurityQuestionId("childhood_friend")).toBe(true);
    expect(securityQuestions.length).toBeGreaterThanOrEqual(12);
    expect(isSecurityQuestionId("custom_question")).toBe(false);
  });

  it("chấp nhận token Expo và native FCM hợp lệ cho push nền Android", () => {
    expect(isExpoPushToken("ExponentPushToken[abc123]" )).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abc123]" )).toBe(true);
    expect(isExpoPushToken("not-a-push-token")).toBe(false);
    expect(isFcmPushToken("dD0A8Y2L4K0:APA91bFcm_token_1234567890-abcdefghijk")).toBe(true);
    expect(isFcmPushToken("short-token")).toBe(false);
  });

  it("gửi tên và nội dung tin nhắn thật trong FCM, nhưng call dùng data-only cho native full-screen", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../server/push.ts"), "utf8");
    expect(source).toContain("notification: { title: notification.title, body: notification.body.slice(0, 160) }");
    expect(source).toContain('notification.channelId === "messages"');
    expect(source).toContain("data: notification.data");
    expect(source).toContain("session_replaced");
    expect(source).toContain("sendMissedCallPush");
    expect(source).toContain("callerAvatar");
  });
});
