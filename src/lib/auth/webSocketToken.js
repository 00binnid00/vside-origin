"use client";

import { authClient } from "@/lib/auth/authClient";
import { getAccessToken } from "@/lib/auth/tokenStore";

const DEFAULT_REFRESH_MARGIN_MS = 60_000;

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

export const getFreshAccessTokenForSocket = async ({
  marginMs = DEFAULT_REFRESH_MARGIN_MS,
} = {}) => {
  const currentToken = getAccessToken();

  if (currentToken && !isAccessTokenExpiringSoon(currentToken, marginMs)) {
    return currentToken;
  }

  const refreshed = await authClient.refresh();

  return refreshed?.accessToken || getAccessToken();
};
