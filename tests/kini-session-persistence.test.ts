import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const api = readFileSync(resolve(import.meta.dirname, "../lib/_core/api.ts"), "utf8");
const auth = readFileSync(resolve(import.meta.dirname, "../hooks/use-auth.ts"), "utf8");
const push = readFileSync(resolve(import.meta.dirname, "../components/push-notification-manager.tsx"), "utf8");
const routers = readFileSync(resolve(import.meta.dirname, "../server/routers.ts"), "utf8");
const db = readFileSync(resolve(import.meta.dirname, "../server/db.ts"), "utf8");

describe("KINI session persistence and device replacement", () => {
  it("chỉ coi 401/403 là phiên bị thu hồi, không xóa phiên khi mạng tạm lỗi", () => {
    expect(api).toContain("error.status === 401 || error.status === 403");
    expect(api).toContain("throw error");
    expect(auth).toContain("const cachedUser = await Auth.getUserInfo()");
  });

  it("giữ phiên hiện hành khi có đăng nhập trên thiết bị khác, chỉ logout khi người dùng chủ động chọn", () => {
    expect(auth).toContain("subscribeKiniSessionInvalidated");
    expect(auth).toContain("AppState.currentState === \"active\"");
    expect(auth).toContain("Không tự xóa thông tin đăng nhập cục bộ");
    expect(push).toContain('if (data?.type === "session_replaced") return;');
    expect(routers).toContain("db.createUserSession");
    expect(routers).not.toContain("createExclusiveUserSession");
    expect(db).toContain("export async function createUserSession");
    expect(db).not.toContain("await db.update(userSessions).set({ revokedAt: now })");
  });
});
