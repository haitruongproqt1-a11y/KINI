import { describe, expect, it } from "vitest";

import { isExpoPushToken } from "../server/push";
import { isSecurityQuestionId, securityQuestionLabel, securityQuestions } from "../shared/security-questions";

describe("Bảo mật và thông báo đẩy KINI", () => {
  it("chấp nhận các câu hỏi bảo mật thuộc danh mục được phép", () => {
    expect(isSecurityQuestionId("first_pet")).toBe(true);
    expect(securityQuestionLabel("first_pet")).toContain("thú cưng");
    expect(isSecurityQuestionId("childhood_friend")).toBe(true);
    expect(securityQuestions.length).toBeGreaterThanOrEqual(12);
    expect(isSecurityQuestionId("custom_question")).toBe(false);
  });

  it("chỉ đăng ký token Expo Push có định dạng hợp lệ", () => {
    expect(isExpoPushToken("ExponentPushToken[abc123]" )).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abc123]" )).toBe(true);
    expect(isExpoPushToken("not-a-push-token")).toBe(false);
  });
});
