"use client";

import {
  clearAuth,
  getAccessToken,
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

    if (text) return text;

    return fallback;
  } catch {
    return fallback;
  }
};

export const authClient = {
  async login(email, password) {
    const response = await fetch(`${AUTH_BASE_URL}/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
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
      const token = getAccessToken();

      await fetch(`${AUTH_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
    } finally {
      clearAuth();
    }
  },

  async me() {
    const token = getAccessToken();

    if (!token) {
      throw new Error("accessToken이 없습니다.");
    }

    const response = await fetch(`${AUTH_BASE_URL}/me`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        nickname,
        password,
      }),
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