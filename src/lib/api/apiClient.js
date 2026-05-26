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

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url);

const isAuthExpiredStatus = (status) => status === 401 || status === 403;

const buildUrl = (url) => {
  if (isAbsoluteUrl(url)) return url;

  const normalizedPath = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

const isRefreshRequest = (url) => String(url).includes("/api/auth/refresh");

const buildHeaders = (options = {}) => {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
};

const refreshAccessTokenOnce = async () => {
  const refreshed = await authClient.refresh();

  if (refreshed?.accessToken) {
    setAccessToken(refreshed.accessToken);
  }

  return refreshed;
};

export const apiFetch = async (url, options = {}) => {
  const requestUrl = buildUrl(url);

  const firstResponse = await fetch(requestUrl, {
    ...options,
    credentials: "include",
    headers: buildHeaders(options),
  });

  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  /**
   * refresh 요청 자체가 401이면 다시 refresh를 시도하면 안 됩니다.
   */
  if (isRefreshRequest(requestUrl)) {
    clearAuth();
    return firstResponse;
  }

  try {
    await refreshAccessTokenOnce();
  } catch (error) {
    /**
     * refresh token이 없거나 만료된 경우만 인증 상태 제거.
     * refresh 500은 백엔드 오류일 수 있으므로 여기서 clearAuth() 하지 않습니다.
     */
    if (isAuthExpiredStatus(error?.status)) {
      clearAuth();
    }

    return firstResponse;
  }

  return fetch(requestUrl, {
    ...options,
    credentials: "include",
    headers: buildHeaders(options),
  });
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

export const apiJson = async (url, options = {}) => {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const message = await readErrorMessage(response, "API 요청에 실패했습니다.");
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;

  return response.json();
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