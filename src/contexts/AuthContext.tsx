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

  isAuthenticated: boolean;
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

const isAuthExpiredStatus = (status: unknown) => status === 401 || status === 403;

const getErrorStatus = (error: unknown): number | null => {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : null;
  }

  return null;
};

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

  const syncStateFromStorage = useCallback(() => {
    setAccessTokenState(getAccessToken());
    setUser(normalizeAuthUser(getAuthUser()));
  }, []);

  const clearAuthState = useCallback(() => {
    clearAuth();
    setAccessTokenState(null);
    setUser(null);
  }, []);

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
    } catch (error) {
      const status = getErrorStatus(error);

      /*
       * refresh token 자체가 만료/무효인 경우에만 인증 상태 제거.
       * refresh 500, 네트워크 오류, 일시 서버 오류에서는 로그인 정보를 지우지 않습니다.
       */
      if (isAuthExpiredStatus(status)) {
        clearAuthState();
      } else {
        syncStateFromStorage();
      }

      return false;
    }
  }, [clearAuthState, syncStateFromStorage]);

  const login = useCallback(
    async (
      emailOrPayload: string | LegacyLoginPayload,
      password?: string,
    ) => {
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

        if (!currentAccessToken) {
          clearAuth();

          if (!cancelled) {
            setAccessTokenState(null);
            setUser(null);
          }

          return;
        }

        try {
          const me = await authClient.me();

          if (!cancelled) {
            setUser(normalizeAuthUser(me));
            setAccessTokenState(getAccessToken());
          }

          return;
        } catch (error) {
          const status = getErrorStatus(error);

          /*
           * /me가 인증 만료로 실패한 경우에만 refresh 복구 시도.
           * 서버 500, 네트워크 오류는 로그인 상태를 유지합니다.
           */
          if (isAuthExpiredStatus(status)) {
            await refreshAuth();
            return;
          }

          if (!cancelled) {
            syncStateFromStorage();
          }
        }
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
  }, [refreshAuth, syncStateFromStorage]);

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