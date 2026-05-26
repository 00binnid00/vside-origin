import type { ScheduleStatus } from "@/components/schedules/scheduleMockData";
import { apiFetch, apiJson } from "@/lib/api/apiClient";

export type BackendScheduleResponse = {
  id: string;
  workspaceId: string;
  projectName: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  hasDevlog: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleApiItem = {
  id: string;
  workspaceId: string;
  projectName: string;
  customProjectName: string;
  title: string;
  description: string;
  date: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  hasDevlog: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateScheduleRequest = {
  workspaceId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
};

export type UpdateScheduleStatusRequest = {
  scheduleId: string;
  status: ScheduleStatus;
};

export type UpdateSchedulePeriodRequest = {
  scheduleId: string;
  startDate: string;
  endDate: string;
};

export type UpdateScheduleRequest = {
  scheduleId: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
};

export function normalizeScheduleFromApi(
  item: BackendScheduleResponse,
): ScheduleApiItem {
  return {
    id: String(item.id),
    workspaceId: String(item.workspaceId),
    projectName: item.projectName ?? "",
    customProjectName: item.projectName ?? "",
    title: item.title ?? "",
    description: item.description ?? "",
    date: item.startDate,
    startDate: item.startDate,
    endDate: item.endDate,
    status: item.status ?? "todo",
    hasDevlog: Boolean(item.hasDevlog),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function fetchWorkspaceSchedulesApi({
  workspaceId,
  startDate,
  endDate,
}: {
  workspaceId: string;
  startDate?: string;
  endDate?: string;
}) {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const params = new URLSearchParams();

  if (startDate && endDate) {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  }

  const queryString = params.toString();

  const data = (await apiJson(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/schedules${
      queryString ? `?${queryString}` : ""
    }`,
  )) as BackendScheduleResponse[];

  return Array.isArray(data) ? data.map(normalizeScheduleFromApi) : [];
}

export async function createWorkspaceScheduleApi({
  workspaceId,
  title,
  description,
  startDate,
  endDate,
  status,
}: CreateScheduleRequest) {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const data = (await apiJson(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/schedules`,
    {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        startDate,
        endDate,
        status,
      }),
    },
  )) as BackendScheduleResponse;

  return normalizeScheduleFromApi(data);
}

export async function updateScheduleApi({
  scheduleId,
  title,
  description,
  startDate,
  endDate,
  status,
}: UpdateScheduleRequest) {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const data = (await apiJson(
    `/api/schedules/${encodeURIComponent(scheduleId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        title,
        description,
        startDate,
        endDate,
        status,
      }),
    },
  )) as BackendScheduleResponse;

  return normalizeScheduleFromApi(data);
}

export async function updateScheduleStatusApi({
  scheduleId,
  status,
}: UpdateScheduleStatusRequest) {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const data = (await apiJson(
    `/api/schedules/${encodeURIComponent(scheduleId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  )) as BackendScheduleResponse;

  return normalizeScheduleFromApi(data);
}

export async function updateSchedulePeriodApi({
  scheduleId,
  startDate,
  endDate,
}: UpdateSchedulePeriodRequest) {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const data = (await apiJson(
    `/api/schedules/${encodeURIComponent(scheduleId)}/period`,
    {
      method: "PATCH",
      body: JSON.stringify({
        startDate,
        endDate,
      }),
    },
  )) as BackendScheduleResponse;

  return normalizeScheduleFromApi(data);
}

export async function deleteScheduleApi(
  value: string | { scheduleId: string },
) {
  const scheduleId = typeof value === "string" ? value : value.scheduleId;

  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const response = await apiFetch(
    `/api/schedules/${encodeURIComponent(scheduleId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "일정 삭제 실패");
  }

  return true;
}