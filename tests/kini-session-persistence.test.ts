import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const api = readFileSync(resolve(import.meta.dirname, "../lib/_core/api.ts"), "utf8");
const auth = readFileSync(resolve(import.meta.dirname, "../hooks/use-auth.ts"), "utf8");
const push = readFileSync(resolve(import.meta.dirname, "../components/push-notification-manager.tsx"), "utf8");

describe("KINI session persistence and device replacement", () => {
  it("chỉ coi 401/403 là phiên bị thu hồi, không xóa phiên khi mạng tạm lỗi", () => {
    expect(api).toContain("error.status === 401 || error.status === 403");
    expect(api).toContain("throw error");
    expect(auth).toContain("const cachedUser = await Auth.getUserInfo()");
  });

  it("đồng bộ logout khi server xác nhận thiết bị khác đã đăng nhập", () => {
    expect(auth).toContain("subscribeKiniSessionInvalidated");
    expect(auth).toContain("AppState.currentState === \"active\"");
    expect(auth).toContain("Đăng nhập trên thiết bị khác");
    expect(push).toContain('data?.type === "session_replaced"');
    expect(push).toContain("invalidateKiniSession");
    expect(push).toContain("if (await Api.getMe()) return;");
    expect(push).toContain("Push có thể được giao muộn");
  });
});
