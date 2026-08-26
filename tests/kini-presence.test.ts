import { describe, expect, it } from "vitest";

import { formatKiniPresence } from "../lib/kini-presence";

describe("formatKiniPresence", () => {
  const now = new Date("2026-08-26T10:00:00.000Z");

  it("hiển thị online khi server xác nhận phiên đang hoạt động", () => {
    expect(formatKiniPresence({ isOnline: true, lastActiveAt: new Date("2026-08-26T09:59:45.000Z") }, now)).toBe("Đang online");
  });

  it("hiển thị phút, giờ và ngày cho người offline", () => {
    expect(formatKiniPresence({ isOnline: false, lastActiveAt: new Date("2026-08-26T09:52:00.000Z") }, now)).toBe("Offline • 8 phút trước");
    expect(formatKiniPresence({ isOnline: false, lastActiveAt: new Date("2026-08-26T07:00:00.000Z") }, now)).toBe("Offline • 3 giờ trước");
    expect(formatKiniPresence({ isOnline: false, lastActiveAt: new Date("2026-08-24T16:24:00.000Z") }, now)).toMatch(/^Offline • \d{2}\/\d{2}\/\d{4} lúc \d{2}:\d{2}$/);
  });
});
