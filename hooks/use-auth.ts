import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { invalidateKiniSession, subscribeKiniSessionInvalidated } from "@/lib/kini-session-events";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchUser = useCallback(async () => {
    const showInitialLoader = !hasLoadedOnce.current;
    try {
      if (showInitialLoader) setLoading(true);
      setError(null);

      const sessionToken = await Auth.getSessionToken();
      if (!sessionToken) {
        setUser(null);
        await Auth.clearUserInfo();
        return;
      }
      const cachedUser = await Auth.getUserInfo();
      // Hiển thị user cache ngay cả khi backend đang tạm thời không phản hồi, ví dụ sau khi cập nhật APK.
      if (cachedUser) setUser(cachedUser);
      let apiUser;
      try {
        apiUser = await Api.getMe();
      } catch (error) {
        setError(error instanceof Error ? error : new Error("Không thể kiểm tra phiên KINI."));
        return;
      }
      if (!apiUser) {
        if (Platform.OS !== "web") Alert.alert("Đăng nhập trên thiết bị khác", "Tài khoản KINI này vừa đăng nhập trên thiết bị khác. Phiên trên điện thoại này đã được đăng xuất để bảo vệ tài khoản.");
        setUser(null);
        await invalidateKiniSession();
        return;
      }
      const userInfo: Auth.User = { id: apiUser.id, openId: apiUser.openId, name: apiUser.name, email: apiUser.email, loginMethod: apiUser.loginMethod, lastSignedIn: new Date(apiUser.lastSignedIn) };
      setUser(userInfo);
      await Auth.setUserInfo(userInfo);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      setError(error);
      setUser(null);
    } finally {
      if (showInitialLoader) {
        hasLoadedOnce.current = true;
        setLoading(false);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
      // Continue with logout even if API call fails
    } finally {
      await invalidateKiniSession();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    if (autoFetch) {
      fetchUser();
      // Kiểm tra nhanh khi app đang dùng để phiên cũ bị thu hồi trên máy khác quay về đăng nhập.
      const timer = setInterval(() => { if (AppState.currentState === "active") void fetchUser(); }, 12_000);
      const appState = AppState.addEventListener("change", (state) => { if (state === "active") void fetchUser(); });
      return () => { clearInterval(timer); appState.remove(); };
    } else {
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  useEffect(() => subscribeKiniSessionInvalidated(() => {
    setUser(null);
    setError(null);
  }), []);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
