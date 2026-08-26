import { describe, expect, it } from "vitest";

import { formatCallDuration, formatCallPing } from "../lib/kini-call-format";

describe("call display helpers", () => {
  it("formats call duration from seconds", () => {
    expect(formatCallDuration(0)).toBe("00:00");
    expect(formatCallDuration(65)).toBe("01:05");
    expect(formatCallDuration(3661)).toBe("01:01:01");
  });

  it("formats measured and unavailable ping", () => {
    expect(formatCallPing(27.6)).toBe("Ping 28 ms");
    expect(formatCallPing(null)).toBe("Đang đo ping…");
  });
});
