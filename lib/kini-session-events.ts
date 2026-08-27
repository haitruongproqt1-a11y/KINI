import * as Auth from "@/lib/_core/auth";

type SessionInvalidatedListener = () => void;
const listeners = new Set<SessionInvalidatedListener>();

/** Xóa phiên chỉ khi người dùng tự đăng xuất hoặc server đã xác nhận phiên bị thu hồi. */
export async function invalidateKiniSession() {
  await Promise.all([Auth.removeSessionToken(), Auth.clearUserInfo()]);
  for (const listener of listeners) listener();
}

export function subscribeKiniSessionInvalidated(listener: SessionInvalidatedListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
