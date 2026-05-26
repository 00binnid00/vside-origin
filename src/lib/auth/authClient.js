"use client";

// 경로: src/lib/auth/authClient.js

import {
  clearAuth,
  getAccessToken,
  setAccessToken,
  setAuthSnapshot,
  setAuthUser,
} from "@/lib/auth/tokenStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const AUTH_BASE_URL = `${API_BASE_URL}/api/auth`;
const USER_BASE_URL = `${API_BASE_URL}/api/users`;

let refreshPromise = null;

const isAuthExpiredStatus = (status) => status === 401 || status === 403;

const createAuthError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeTokenResponse = (data) => {
  const accessToken = data?.accessToken || data?.token || null;

  const user =
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

  return {
    accessToken,
    token: accessToken,
    userId: data?.userId ?? user?.id ?? null,
    user,
  };
};

const parseErrorMessage = async (response, fallback) => {
  try {
    const text = await response.text();

    if (!text) return fallback;

    try {
      const json = JSON.parse(text);
      return json?.message || json?.error || json?.reason || text || fallback;
    } catch {
      return text || fallback;
    }
  } catch {
    return fallback;
  }
};

const getAuthHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const requestRefresh = async () => {
  const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const message = await parseErrorMessage(
      response,
      "토큰 재발급에 실패했습니다.",
    );

    /**
     * 401/403은 refresh token 자체가 없거나 만료된 상태입니다.
     * 이때만 클라이언트 인증 정보를 지웁니다.
     *
     * 500은 백엔드 refresh rotation 오류 또는 일시 장애일 수 있으므로
     * 여기서 clearAuth()를 하면 사용자가 즉시 로그아웃됩니다.
     */
    if (isAuthExpiredStatus(response.status)) {
      clearAuth();
    }

    throw createAuthError(message, response.status);
  }

  const data = normalizeTokenResponse(await response.json());

  if (!data.accessToken) {
    throw createAuthError("accessToken이 응답에 없습니다.", 500);
  }

  setAuthSnapshot(data);
  return data;
};

export const authClient = {
  async login(email, password) {
    const response = await fetch(`${AUTH_BASE_URL}/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw createAuthError(
        await parseErrorMessage(
          response,
          "이메일 또는 비밀번호가 올바르지 않습니다.",
        ),
        response.status,
      );
    }

    const data = normalizeTokenResponse(await response.json());

    if (!data.accessToken) {
      throw createAuthError("accessToken이 응답에 없습니다.", 500);
    }

    setAuthSnapshot(data);
    return data;
  },

  async refresh() {
    if (!refreshPromise) {
      refreshPromise = requestRefresh().finally(() => {
        refreshPromise = null;
      });
    }

    return refreshPromise;
  },

  async logout() {
    try {
      await fetch(`${AUTH_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
      });
    } finally {
      clearAuth();
    }
  },

  async me() {
    let token = getAccessToken();

    if (!token) {
      try {
        const refreshed = await authClient.refresh();
        token = refreshed.accessToken;
      } catch (error) {
        throw error;
      }
    }

    let response = await fetch(`${AUTH_BASE_URL}/me`, {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      try {
        const refreshed = await authClient.refresh();

        if (refreshed?.accessToken) {
          setAccessToken(refreshed.accessToken);
        }

        response = await fetch(`${AUTH_BASE_URL}/me`, {
          method: "GET",
          credentials: "include",
          headers: { Authorization: `Bearer ${refreshed.accessToken}` },
        });
      } catch (error) {
        if (isAuthExpiredStatus(error?.status)) {
          clearAuth();
        }

        throw error;
      }
    }

    if (!response.ok) {
      throw createAuthError(
        await parseErrorMessage(response, "사용자 정보를 불러오지 못했습니다."),
        response.status,
      );
    }

    const user = await response.json();
    setAuthUser(user);
    return user;
  },

  async register({ email, nickname, password }) {
    const response = await fetch(`${USER_BASE_URL}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nickname, password }),
    });

    if (!response.ok) {
      throw createAuthError(
        await parseErrorMessage(
          response,
          "회원가입에 실패했습니다. 입력값을 다시 확인해주세요.",
        ),
        response.status,
      );
    }

    try {
      return await response.json();
    } catch {
      return true;
    }
  },
};

export const login = (...args) => authClient.login(...args);
export const refresh = (...args) => authClient.refresh(...args);
export const logout = (...args) => authClient.logout(...args);
export const getMe = (...args) => authClient.me(...args);
export const register = (...args) => authClient.register(...args);