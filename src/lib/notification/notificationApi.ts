"use client";

import { apiFetch } from "@/lib/api/apiClient";

export type BackendNotificationType =
  | "SCHEDULE"
  | "CHAT"
  | "GIT_COMMIT"
  | "GIT_PUSH"
  | "BOARD_POST"
  | "BOARD_COMMENT"
  | "DEVLOG"
  | "INVITE"
  | "SYSTEM"
  | "ERROR";

export type NotificationTypeFilter = BackendNotificationType | "ALL";

export type NotificationResponse = {
  id: number;
  type: BackendNotificationType;
  title: string;
  body: string;
  targetUrl?: string | null;
  read: boolean;
  workspaceId?: string | null;
  workspaceName?: string | null;
  createdAt: string;
};

export type NotificationPageResponse = {
  content: NotificationResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export type NotificationQuery = {
  page?: number;
  size?: number;
  type?: NotificationTypeFilter;
  read?: boolean;
  from?: string;
  to?: string;
};

function buildQuery(params: NotificationQuery) {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(params.page ?? 0));
  searchParams.set("size", String(params.size ?? 20));

  if (params.type && params.type !== "ALL") {
    searchParams.set("type", params.type);
  }

  if (typeof params.read === "boolean") {
    searchParams.set("read", String(params.read));
  }

  if (params.from) {
    searchParams.set("from", params.from);
  }

  if (params.to) {
    searchParams.set("to", params.to);
  }

  return searchParams.toString();
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "요청 처리 중 오류가 발생했습니다.");
  }

  return response.json() as Promise<T>;
}

export async function getNotifications(
  params: NotificationQuery = {},
): Promise<NotificationPageResponse> {
  const query = buildQuery(params);
  const response = await apiFetch(`/api/notifications?${query}`);

  return parseJson<NotificationPageResponse>(response);
}

export async function getUnreadNotificationCount(): Promise<{
  unreadCount: number;
}> {
  const response = await apiFetch("/api/notifications/unread-count");

  return parseJson<{ unreadCount: number }>(response);
}

export async function markNotificationAsRead(id: number): Promise<void> {
  const response = await apiFetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "읽음 처리에 실패했습니다.");
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const response = await apiFetch("/api/notifications/read-all", {
    method: "PATCH",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "전체 읽음 처리에 실패했습니다.");
  }
}

export async function deleteNotification(id: number): Promise<void> {
  const response = await apiFetch(`/api/notifications/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "알림 삭제에 실패했습니다.");
  }
}