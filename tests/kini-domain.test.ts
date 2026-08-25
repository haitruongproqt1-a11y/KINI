import { describe, expect, it } from "vitest";

import { deliveryLabel, highestDeliveryStatus, isKiniUsernameValid } from "../shared/kini-chat";

describe("Hợp đồng hội thoại KINI", () => {
  it("ưu tiên trạng thái đã xem khi người nhận đã đọc tin nhắn", () => {
    expect(highestDeliveryStatus(["sent", "delivered", "read"])).toBe("read");
    expect(deliveryLabel("delivered")).toBe("Đã nhận");
  });

  it("chấp nhận KINI ID hợp lệ và từ chối ký tự không an toàn", () => {
    expect(isKiniUsernameValid("minh.nguyen_2026")).toBe(true);
    expect(isKiniUsernameValid("minh nguyen")).toBe(false);
    expect(isKiniUsernameValid("ab")).toBe(false);
  });
});
