import { describe, expect, it } from "vitest";

import { MAX_FREE_DISCOVERY_RADIUS_KM, calculateHaversineKm, resolveHiddenUntil } from "../server/db";
import { vietnamProvinces } from "../constants/vietnam-provinces";

describe("KINI Tìm Quanh Đây", () => {
  it("tính khoảng cách Haversine theo km", () => {
    expect(calculateHaversineKm(0, 0, 0, 1)).toBeCloseTo(111.2, 0);
    expect(calculateHaversineKm(10.77, 106.7, 10.77, 106.7)).toBe(0);
  });

  it("cho phép bán kính 50 km và 100 km miễn phí, không có nhánh VIP", () => {
    expect(MAX_FREE_DISCOVERY_RADIUS_KM).toBe(100);
    expect(50).toBeLessThanOrEqual(MAX_FREE_DISCOVERY_RADIUS_KM);
    expect(100).toBeLessThanOrEqual(MAX_FREE_DISCOVERY_RADIUS_KM);
  });

  it("tính đúng thời hạn ẩn 24 giờ, 7 ngày và vĩnh viễn", () => {
    const now = Date.UTC(2026, 7, 26, 12, 0, 0);
    expect(resolveHiddenUntil(false, "24h", now)?.getTime()).toBe(now + 24 * 60 * 60 * 1000);
    expect(resolveHiddenUntil(false, "7d", now)?.getTime()).toBe(now + 7 * 24 * 60 * 60 * 1000);
    expect(resolveHiddenUntil(false, "permanent", now)).toBeNull();
    expect(resolveHiddenUntil(true, "24h", now)).toBeNull();
  });

  it("cung cấp đủ 34 tỉnh, thành phố theo danh sách sau sắp xếp", () => {
    expect(vietnamProvinces).toHaveLength(34);
    expect(vietnamProvinces).toContain("Quảng Trị");
    expect(vietnamProvinces).toContain("Thành phố Hồ Chí Minh");
  });
});
