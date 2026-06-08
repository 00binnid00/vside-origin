"use client";

// 경로: src/lib/auth/webSocketToken.js

import { authClient } from "@/lib/auth/authClient";
import { getAccessToken, setAccessToken } from "@/lib/auth/tokenStore";

const DEFAULT_REFRESH_MARGIN_MS = 60_000;

let socketTokenPromise = null;

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return window.atob(padded);
};

export const getJwtExpiresAtMs = (token) => {
  if (!token || typeof window === "undefined") return null;

  try {
    const [, payloadPart] = token.split(".");

    if (!payloadPart) return null;

    const payload = JSON.parse(decodeBase64Url(payloadPart));
    const exp = Number(payload?.exp);

    if (!Number.isFinite(exp)) return null;

    return exp * 1000;
  } catch {
    return null;
  }
};

export const isAccessTokenExpiringSoon = (
  token,
  marginMs = DEFAULT_REFRESH_MARGIN_MS,
) => {
  const expiresAtMs = getJwtExpiresAtMs(token);

  if (!expiresAtMs) return true;

  return expiresAtMs - Date.now() <= marginMs;
};

const requestFreshSocketToken = async (marginMs) => {
  const latestToken = getAccessToken();

  if (latestToken && !isAccessTokenExpiringSoon(latestToken, marginMs)) {
    return latestToken;
  }

  const refreshed = await authClient.refresh();
  const refreshedToken = refreshed?.accessToken || getAccessToken();

  if (!refreshedToken) {
    throw new Error("웹소켓 인증 토큰을 준비하지 못했습니다.");
  }

  setAccessToken(refreshedToken);

  return refreshedToken;
};

export const getFreshAccessTokenForSocket = async ({
  marginMs = DEFAULT_REFRESH_MARGIN_MS,
} = {}) => {
  const currentToken = getAccessToken();

  if (currentToken && !isAccessTokenExpiringSoon(currentToken, marginMs)) {
    return currentToken;
  }

  if (!socketTokenPromise) {
    socketTokenPromise = requestFreshSocketToken(marginMs).finally(() => {
      socketTokenPromise = null;
    });
  }

  return socketTokenPromise;
};