"use client";

// 경로: src/lib/api/apiClient.js

import { authClient } from "@/lib/auth/authClient";
import {
  clearAuth,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth/tokenStore";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const DEFAULT_REFRESH_MARGIN_MS = 60_000;

let refreshPromise = null;

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(String(url));

const isAuthExpiredStatus = (status) => status === 401 || status === 403;

const buildUrl = (url) => {
  if (isAbsoluteUrl(url)) return url;

  const normalizedPath = String(url).startsWith("/") ? String(url) : `/${url}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const isRefreshRequest = (url) => String(url).includes("/api/auth/refresh");

const isFormDataBody = (body) => {
  return typeof FormData !== "undefined" && body instanceof FormData;
};

const decodeBase64Url = (value) => {
  if (typeof window === "undefined") return "";

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return window.atob(padded);
};

const getJwtExpiresAtMs = (token) => {
  if (!token || typeof window === "undefined") return null;

  try {
    const [, payloadPart] = String(token).split(".");

    if (!payloadPart) return null;

    const payload = JSON.parse(decodeBase64Url(payloadPart));
    const exp = Number(payload?.exp);

    if (!Number.isFinite(exp)) return null;

    return exp * 1000;
  } catch {
    return null;
  }
};

const isAccessTokenExpiringSoon = (
  token,
  marginMs = DEFAULT_REFRESH_MARGIN_MS,
) => {
  const expiresAtMs = getJwtExpiresAtMs(token);

  if (!expiresAtMs) return false;

  return expiresAtMs - Date.now() <= marginMs;
};

const buildHeaders = (options = {}, accessToken = getAccessToken()) => {
  const headers = new Headers(options.headers || {});

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const hasBody = options.body !== undefined && options.body !== null;

  if (!headers.has("Content-Type") && hasBody && !isFormDataBody(options.body)) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
};

const requestWithToken = async (
  requestUrl,
  options = {},
  accessToken = getAccessToken(),
) => {
  return fetch(requestUrl, {
    ...options,
    credentials: "include",
    headers: buildHeaders(options, accessToken),
  });
};

const refreshAccessTokenOnce = async () => {
  if (!refreshPromise) {
    refreshPromise = authClient
      .refresh()
      .then((refreshed) => {
        if (refreshed?.accessToken) {
          setAccessToken(refreshed.accessToken);
        }

        return refreshed;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

const getAccessTokenBeforeRequest = async (requestUrl) => {
  const currentToken = getAccessToken();

  if (!currentToken) {
    return {
      accessToken: null,
      preflightRefreshFailed: false,
    };
  }

  if (isRefreshRequest(requestUrl)) {
    return {
      accessToken: currentToken,
      preflightRefreshFailed: false,
    };
  }

  if (!isAccessTokenExpiringSoon(currentToken)) {
    return {
      accessToken: currentToken,
      preflightRefreshFailed: false,
    };
  }

  try {
    const refreshed = await refreshAccessTokenOnce();
    const refreshedToken = refreshed?.accessToken || getAccessToken();

    return {
      accessToken: refreshedToken,
      preflightRefreshFailed: false,
    };
  } catch (error) {
    if (isAuthExpiredStatus(error?.status)) {
      clearAuth();

      return {
        accessToken: null,
        preflightRefreshFailed: true,
      };
    }

    /*
     * refresh 500, 네트워크 오류, 일시 장애는 로그아웃 처리하지 않습니다.
     * 기존 토큰으로 요청을 보내고, 실패 응답은 호출부에서 처리합니다.
     */
    return {
      accessToken: currentToken,
      preflightRefreshFailed: true,
    };
  }
};

export const apiFetch = async (url, options = {}) => {
  const requestUrl = buildUrl(url);

  const { accessToken: tokenAtRequestStart, preflightRefreshFailed } =
    await getAccessTokenBeforeRequest(requestUrl);

  const firstResponse = await requestWithToken(
    requestUrl,
    options,
    tokenAtRequestStart,
  );

  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  /*
   * refresh 요청 자체가 401이면 재귀적으로 refresh를 다시 시도하면 안 됩니다.
   */
  if (isRefreshRequest(requestUrl)) {
    clearAuth();
    return firstResponse;
  }

  /*
   * 요청 전 선갱신이 이미 실패한 경우 같은 요청에서 refresh를 즉시 재시도하지 않습니다.
   * refresh 500 같은 상황에서 불필요한 중복 refresh를 막기 위함입니다.
   */
  if (preflightRefreshFailed) {
    return firstResponse;
  }

  /*
   * 다른 요청이 이미 refresh를 성공해서 accessToken이 바뀐 경우:
   * refresh를 또 호출하지 않고 최신 토큰으로 한 번 재시도합니다.
   */
  const latestToken = getAccessToken();

  if (latestToken && latestToken !== tokenAtRequestStart) {
    return requestWithToken(requestUrl, options, latestToken);
  }

  try {
    await refreshAccessTokenOnce();
  } catch (error) {
    /*
     * refresh token 만료/무효 같은 인증 만료 상태에서만 로그아웃 처리.
     * refresh 500, 네트워크 오류는 서버/일시 장애일 수 있으므로 여기서 clearAuth() 하지 않음.
     */
    if (isAuthExpiredStatus(error?.status)) {
      clearAuth();
    }

    return firstResponse;
  }

  return requestWithToken(requestUrl, options, getAccessToken());
};

const readErrorMessage = async (response, fallback) => {
  const text = await response.text().catch(() => "");

  if (!text) return fallback;

  try {
    const json = JSON.parse(text);
    return json?.message || json?.error || json?.reason || text || fallback;
  } catch {
    return text;
  }
};

const readSuccessJson = async (response) => {
  if (response.status === 204) return null;

  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const apiJson = async (url, options = {}) => {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const message = await readErrorMessage(response, "API 요청에 실패했습니다.");
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return readSuccessJson(response);
};

export const apiText = async (url, options = {}) => {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const message = await readErrorMessage(response, "API 요청에 실패했습니다.");
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.text();
};

export const apiBlob = async (url, options = {}) => {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const message = await readErrorMessage(response, "API 요청에 실패했습니다.");
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.blob();
};