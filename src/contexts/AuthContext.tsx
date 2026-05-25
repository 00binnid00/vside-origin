"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authClient } from "@/lib/auth/authClient";
import {
  clearAuth,
  getAccessToken,
  getAuthUser,
  normalizeUser,
  setAuthSnapshot,
} from "@/lib/auth/tokenStore";

type AuthUser = {
  id: string | null;
  userId: number | null;
  email: string;
  nickname: string;
  name: string;
  username?: string;
  profileImageUrl?: string | null;
};

type LegacyLoginPayload = {
  id?: string | number;
  userId?: string | number;
  name?: string;
  nickname?: string;
  username?: string;
  email?: string;
  token?: string;
  accessToken?: string;
  profileImageUrl?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;

  /**
   * 새 이름
   */
  isAuthenticated: boolean;

  /**
   * 기존 코드 호환용 이름.
   * TopNav, IDE 기존 코드에서 isLoggedIn을 쓰고 있을 수 있어서 같이 제공합니다.
   */
  isLoggedIn: boolean;

  loading: boolean;

  login: (
    emailOrPayload: string | LegacyLoginPayload,
    password?: string,
  ) => Promise<void>;

  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  setAuthFromResponse: (data: any) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeAuthUser = (user: any): AuthUser | null => {
  const normalized = normalizeUser(user);

  if (!normalized) return null;

  return {
    id: normalized.id,
    userId: normalized.userId,
    email: normalized.email,
    nickname: normalized.nickname,
    name: normalized.name,
    username: normalized.username,
    profileImageUrl: normalized.profileImageUrl,
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    normalizeAuthUser(getAuthUser()),
  );

  const [accessToken, setAccessTokenState] = useState<string | null>(() =>
    getAccessToken(),
  );

  const [loading, setLoading] = useState(true);

  const setAuthFromResponse = useCallback((data: any) => {
    const token = data?.accessToken || data?.token || null;

    const nextUser =
      data?.user ||
      (data?.userId
        ? {
            id: data.userId,
            userId: data.userId,
            email: data.email,
            nickname: data.nickname,
            profileImageUrl: data.profileImageUrl,
          }
        : null);

    setAuthSnapshot({
      accessToken: token,
      token,
      user: nextUser,
      userId: data?.userId,
    });

    setAccessTokenState(token);
    setUser(normalizeAuthUser(nextUser));
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const result = await authClient.refresh();

      setAuthSnapshot(result);
      setAccessTokenState(result.accessToken);
      setUser(normalizeAuthUser(result.user));

      return true;
    } catch {
      clearAuth();
      setAccessTokenState(null);
      setUser(null);

      return false;
    }
  }, []);

  const login = useCallback(
    async (
      emailOrPayload: string | LegacyLoginPayload,
      password?: string,
    ) => {
      /**
       * 기존 코드 호환:
       * login({ id, email, token }) 형태로 호출하는 코드도 유지합니다.
       */
      if (typeof emailOrPayload === "object") {
        const payload = emailOrPayload;

        setAuthFromResponse({
          accessToken: payload.accessToken || payload.token,
          token: payload.token || payload.accessToken,
          userId: payload.userId ?? payload.id,
          user: {
            id: payload.id ?? payload.userId,
            userId: payload.userId ?? payload.id,
            email: payload.email,
            nickname: payload.nickname ?? payload.name,
            name: payload.name ?? payload.nickname,
            username: payload.username,
            profileImageUrl: payload.profileImageUrl,
          },
        });

        return;
      }

      if (!password) {
        throw new Error("비밀번호가 필요합니다.");
      }

      const result = await authClient.login(emailOrPayload, password);

      setAccessTokenState(result.accessToken);
      setUser(normalizeAuthUser(result.user));
    },
    [setAuthFromResponse],
  );

  const logout = useCallback(async () => {
    await authClient.logout();

    setAccessTokenState(null);
    setUser(null);
  }, []);

  useEffect(() => {
  let cancelled = false;

  const bootstrap = async () => {
    try {
      const currentAccessToken = getAccessToken();

      /**
       * accessToken 자체가 없으면 refresh를 호출하지 않습니다.
       * refreshToken은 HttpOnly Cookie라 JS에서 확인할 수 없고,
       * 없는 상태에서 refresh를 호출하면 브라우저 콘솔에 401이 찍힙니다.
       */
      if (!currentAccessToken) {
        clearAuth();

        if (!cancelled) {
          setAccessTokenState(null);
          setUser(null);
        }

        return;
      }

      /**
       * accessToken이 있으면 우선 /api/auth/me로 사용자 복구를 시도합니다.
       */
      try {
        const me = await authClient.me();

        if (!cancelled) {
          setUser(normalizeAuthUser(me));
          setAccessTokenState(getAccessToken());
        }

        return;
      } catch {
        /**
         * accessToken이 만료됐을 가능성이 있으므로
         * 이때만 refresh token으로 복구를 시도합니다.
         */
      }

      await refreshAuth();
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  bootstrap();

  return () => {
    cancelled = true;
  };
}, [refreshAuth]);

  const value = useMemo<AuthContextValue>(() => {
    const authenticated = Boolean(user && accessToken);

    return {
      user,
      accessToken,
      isAuthenticated: authenticated,
      isLoggedIn: authenticated,
      loading,
      login,
      logout,
      refreshAuth,
      setAuthFromResponse,
    };
  }, [
    user,
    accessToken,
    loading,
    login,
    logout,
    refreshAuth,
    setAuthFromResponse,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}