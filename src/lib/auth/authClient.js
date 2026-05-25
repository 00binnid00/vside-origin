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
    return text || fallback;
  } catch {
    return fallback;
  }
};

const getAuthHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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
      throw new Error(
        await parseErrorMessage(
          response,
          "이메일 또는 비밀번호가 올바르지 않습니다.",
        ),
      );
    }

    const data = normalizeTokenResponse(await response.json());

    if (!data.accessToken) {
      throw new Error("accessToken이 응답에 없습니다.");
    }

    setAuthSnapshot(data);
    return data;
  },

  async refresh() {
    const response = await fetch(`${AUTH_BASE_URL}/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      clearAuth();
      throw new Error("토큰 재발급에 실패했습니다.");
    }

    const data = normalizeTokenResponse(await response.json());

    if (!data.accessToken) {
      clearAuth();
      throw new Error("accessToken이 응답에 없습니다.");
    }

    setAuthSnapshot(data);
    return data;
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
        const refreshed = await this.refresh();
        token = refreshed.accessToken;
      } catch {
        throw new Error("accessToken이 없습니다.");
      }
    }

    let response = await fetch(`${AUTH_BASE_URL}/me`, {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      try {
        const refreshed = await this.refresh();

        if (refreshed?.accessToken) {
          setAccessToken(refreshed.accessToken);
        }

        response = await fetch(`${AUTH_BASE_URL}/me`, {
          method: "GET",
          credentials: "include",
          headers: { Authorization: `Bearer ${refreshed.accessToken}` },
        });
      } catch {
        clearAuth();
        throw new Error("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
      }
    }

    if (!response.ok) {
      throw new Error("사용자 정보를 불러오지 못했습니다.");
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
      throw new Error(
        await parseErrorMessage(
          response,
          "회원가입에 실패했습니다. 입력값을 다시 확인해주세요.",
        ),
      );
    }

    try {
      return await response.json();
    } catch {
      return true;
    }
  },
};

export const login = authClient.login;
export const refresh = authClient.refresh;
export const logout = authClient.logout;
export const getMe = authClient.me;
export const register = authClient.register;
