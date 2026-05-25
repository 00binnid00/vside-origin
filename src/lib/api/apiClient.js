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

let refreshPromise = null;

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url);

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

  if (isRefreshRequest(requestUrl)) {
    clearAuth();
    return firstResponse;
  }

  try {
    await refreshAccessTokenOnce();
  } catch {
    clearAuth();
    return firstResponse;
  }

  return fetch(requestUrl, {
    ...options,
    credentials: "include",
    headers: buildHeaders(options),
  });
};

export const apiJson = async (url, options = {}) => {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "API 요청에 실패했습니다.");
  }

  if (response.status === 204) return null;

  return response.json();
};

export const apiText = async (url, options = {}) => {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "API 요청에 실패했습니다.");
  }

  return response.text();
};

export const apiBlob = async (url, options = {}) => {
  const response = await apiFetch(url, options);

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "API 요청에 실패했습니다.");
  }

  return response.blob();
};
