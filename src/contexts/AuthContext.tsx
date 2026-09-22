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

/* ==========================================
   권한
========================================== */

export type UserRole = "USER" | "ADMIN";

/* ==========================================
   사용자 타입
========================================== */

export type AuthUser = {
  id: string | null;
  userId: number | null;

  email: string;
  nickname: string;
  name: string;

  username?: string;

  profileImageUrl?: string | null;

  role: UserRole;
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

  role?: UserRole;
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
  ) => Promise<AuthUser>;

  logout: () => Promise<void>;

  refreshAuth: () => Promise<boolean>;

  setAuthFromResponse: (data: any) => void;
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

/* ==========================================
   인증 만료 여부
========================================== */

const isAuthExpiredStatus = (
  status: unknown,
) => {
  return (
    status === 401 ||
    status === 403
  );
};

/* ==========================================
   에러 status
========================================== */

const getErrorStatus = (
  error: unknown,
): number | null => {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error
  ) {
    const status =
      Number(
        (
          error as {
            status?: unknown;
          }
        ).status,
      );

    return Number.isFinite(status)
      ? status
      : null;
  }

  return null;
};

/* ==========================================
   사용자 정규화
========================================== */

const normalizeAuthUser = (
  user: any,
): AuthUser | null => {
  const normalized =
    normalizeUser(user);

  if (!normalized) {
    return null;
  }

  return {
    id: normalized.id,

    userId:
      normalized.userId,

    email:
      normalized.email ?? "",

    nickname:
      normalized.nickname ?? "",

    name:
      normalized.name ??
      normalized.nickname ??
      "",

    username:
      normalized.username,

    profileImageUrl:
      normalized.profileImageUrl ??
      null,

    role:
      normalized.role === "ADMIN"
        ? "ADMIN"
        : "USER",
  };
};

/* ==========================================
   Provider
========================================== */

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      () =>
        normalizeAuthUser(
          getAuthUser(),
        ),
    );

  const [
    accessToken,
    setAccessTokenState,
  ] =
    useState<string | null>(
      () =>
        getAccessToken(),
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  /* ========================================
     Storage → State
  ======================================== */

  const syncStateFromStorage =
    useCallback(() => {
      setAccessTokenState(
        getAccessToken(),
      );

      setUser(
        normalizeAuthUser(
          getAuthUser(),
        ),
      );
    }, []);

  /* ========================================
     인증 초기화
  ======================================== */

  const clearAuthState =
    useCallback(() => {
      clearAuth();

      setAccessTokenState(
        null,
      );

      setUser(
        null,
      );
    }, []);

  /* ========================================
     로그인 응답 저장
  ======================================== */

  const setAuthFromResponse =
    useCallback(
      (data: any) => {
        const token =
          data?.accessToken ||
          data?.token ||
          null;

        const nextUser =
          data?.user ||
          (
            data?.userId
              ? {
                  id:
                    data.userId,

                  userId:
                    data.userId,

                  email:
                    data.email,

                  nickname:
                    data.nickname,

                  profileImageUrl:
                    data.profileImageUrl,

                  role:
                    data.role,
                }
              : null
          );

        setAuthSnapshot({
          accessToken:
            token,

          token,

          user:
            nextUser,

          userId:
            data?.userId,
        });

        setAccessTokenState(
          token,
        );

        setUser(
          normalizeAuthUser(
            nextUser,
          ),
        );
      },
      [],
    );

  /* ========================================
     Refresh
  ======================================== */

  const refreshAuth =
    useCallback(
      async () => {
        try {
          const result =
            await authClient.refresh();

          /*
           * refresh 응답도 role을 포함하고 있지만
           * /me를 다시 호출해서 현재 DB의 권한을 기준으로
           * 사용자 정보를 동기화한다.
           */
          const me =
            await authClient.me();

          const normalizedUser =
            normalizeAuthUser(me);

          if (!normalizedUser) {
            throw new Error(
              "사용자 정보를 확인할 수 없습니다.",
            );
          }

          setAuthSnapshot({
            accessToken:
              result.accessToken,

            token:
              result.token,

            user:
              me,

            userId:
              me?.id,
          });

          setAccessTokenState(
            result.accessToken,
          );

          setUser(
            normalizedUser,
          );

          return true;
        } catch (error) {
          const status =
            getErrorStatus(error);

          if (
            isAuthExpiredStatus(
              status,
            )
          ) {
            clearAuthState();
          } else {
            syncStateFromStorage();
          }

          return false;
        }
      },
      [
        clearAuthState,
        syncStateFromStorage,
      ],
    );

  /* ========================================
     로그인
  ======================================== */

  const login =
    useCallback(
      async (
        emailOrPayload:
          | string
          | LegacyLoginPayload,

        password?: string,
      ): Promise<AuthUser> => {
        /* ==================================
           Legacy 로그인
        ================================== */

        if (
          typeof emailOrPayload ===
          "object"
        ) {
          const payload =
            emailOrPayload;

          const nextUser = {
            id:
              payload.id ??
              payload.userId,

            userId:
              payload.userId ??
              payload.id,

            email:
              payload.email,

            nickname:
              payload.nickname ??
              payload.name,

            name:
              payload.name ??
              payload.nickname,

            username:
              payload.username,

            profileImageUrl:
              payload.profileImageUrl,

            role:
              payload.role ??
              "USER",
          };

          setAuthFromResponse({
            accessToken:
              payload.accessToken ||
              payload.token,

            token:
              payload.token ||
              payload.accessToken,

            userId:
              payload.userId ??
              payload.id,

            user:
              nextUser,
          });

          const normalized =
            normalizeAuthUser(
              nextUser,
            );

          if (!normalized) {
            throw new Error(
              "로그인 사용자 정보를 확인할 수 없습니다.",
            );
          }

          return normalized;
        }

        /* ==================================
           일반 로그인
        ================================== */

        if (!password) {
          throw new Error(
            "비밀번호가 필요합니다.",
          );
        }

        /*
         * 1. 로그인
         */
        const loginResult =
          await authClient.login(
            emailOrPayload,
            password,
          );

        /*
         * 2. 로그인 직후 /me 호출
         *
         * 로그인 응답만 믿지 않고
         * DB의 최신 role을 다시 확인한다.
         */
        const me =
          await authClient.me();

        const normalizedUser =
          normalizeAuthUser(me);

        if (!normalizedUser) {
          throw new Error(
            "로그인 사용자 정보를 확인할 수 없습니다.",
          );
        }

        /*
         * 3. role까지 포함된 사용자 저장
         */
        setAuthSnapshot({
          accessToken:
            loginResult.accessToken,

          token:
            loginResult.token,

          user:
            me,

          userId:
            me?.id,
        });

        setAccessTokenState(
          loginResult.accessToken,
        );

        setUser(
          normalizedUser,
        );

        console.log(
          "[AuthContext 로그인 사용자]",
          normalizedUser,
        );

        console.log(
          "[AuthContext 로그인 role]",
          normalizedUser.role,
        );

        return normalizedUser;
      },
      [
        setAuthFromResponse,
      ],
    );

  /* ========================================
     로그아웃
  ======================================== */

  const logout =
    useCallback(
      async () => {
        try {
          await authClient.logout();
        } finally {
          clearAuthState();
        }
      },
      [
        clearAuthState,
      ],
    );

  /* ========================================
     최초 인증 확인
  ======================================== */

  useEffect(() => {
    let cancelled =
      false;

    const bootstrap =
      async () => {
        try {
          const currentAccessToken =
            getAccessToken();

          if (
            !currentAccessToken
          ) {
            clearAuth();

            if (!cancelled) {
              setAccessTokenState(
                null,
              );

              setUser(
                null,
              );
            }

            return;
          }

          try {
            /*
             * 서버 기준 사용자 정보 조회
             * 여기서 role도 다시 받는다.
             */
            const me =
              await authClient.me();

            const normalized =
              normalizeAuthUser(
                me,
              );

            if (!cancelled) {
              setUser(
                normalized,
              );

              setAccessTokenState(
                getAccessToken(),
              );
            }

            return;
          } catch (error) {
            const status =
              getErrorStatus(error);

            if (
              isAuthExpiredStatus(
                status,
              )
            ) {
              await refreshAuth();

              return;
            }

            if (!cancelled) {
              syncStateFromStorage();
            }
          }
        } finally {
          if (!cancelled) {
            setLoading(
              false,
            );
          }
        }
      };

    bootstrap();

    return () => {
      cancelled =
        true;
    };
  }, [
    refreshAuth,
    syncStateFromStorage,
  ]);

  /* ========================================
     Context 값
  ======================================== */

  const value =
    useMemo<AuthContextValue>(
      () => {
        const authenticated =
          Boolean(
            user &&
            accessToken,
          );

        return {
          user,

          accessToken,

          isAuthenticated:
            authenticated,

          isLoggedIn:
            authenticated,

          loading,

          login,

          logout,

          refreshAuth,

          setAuthFromResponse,
        };
      },
      [
        user,
        accessToken,
        loading,
        login,
        logout,
        refreshAuth,
        setAuthFromResponse,
      ],
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ==========================================
   Hook
========================================== */

export function useAuth() {
  const context =
    useContext(
      AuthContext,
    );

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider.",
    );
  }

  return context;
}