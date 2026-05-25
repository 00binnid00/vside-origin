import type { ScheduleStatus } from "@/components/schedules/scheduleMockData";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

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

function getToken() {
  if (typeof window === "undefined") return null;

  const directToken = localStorage.getItem("token");
  if (directToken) return directToken;

  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;

  try {
    const parsedUser = JSON.parse(storedUser);
    return parsedUser?.token ?? null;
  } catch {
    return null;
  }
}

async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export function normalizeScheduleFromApi(
  item: BackendScheduleResponse,
): ScheduleApiItem {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    projectName: item.projectName,
    customProjectName: item.projectName,
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

  const response = await authFetch(
    `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/schedules${
      queryString ? `?${queryString}` : ""
    }`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "일정 목록 로드 실패"));
  }

  const data = (await response.json()) as BackendScheduleResponse[];

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

  const response = await authFetch(
    `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/schedules`,
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
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "일정 생성 실패"));
  }

  return normalizeScheduleFromApi(
    (await response.json()) as BackendScheduleResponse,
  );
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

  const response = await authFetch(
    `${API_BASE}/schedules/${encodeURIComponent(scheduleId)}`,
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
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "일정 수정 실패"));
  }

  return normalizeScheduleFromApi(
    (await response.json()) as BackendScheduleResponse,
  );
}

export async function updateScheduleStatusApi({
  scheduleId,
  status,
}: UpdateScheduleStatusRequest) {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const response = await authFetch(
    `${API_BASE}/schedules/${encodeURIComponent(scheduleId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "일정 상태 변경 실패"));
  }

  return normalizeScheduleFromApi(
    (await response.json()) as BackendScheduleResponse,
  );
}

export async function updateSchedulePeriodApi({
  scheduleId,
  startDate,
  endDate,
}: UpdateSchedulePeriodRequest) {
  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const response = await authFetch(
    `${API_BASE}/schedules/${encodeURIComponent(scheduleId)}/period`,
    {
      method: "PATCH",
      body: JSON.stringify({
        startDate,
        endDate,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "일정 날짜 변경 실패"));
  }

  return normalizeScheduleFromApi(
    (await response.json()) as BackendScheduleResponse,
  );
}

export async function deleteScheduleApi(
  value: string | { scheduleId: string },
) {
  const scheduleId = typeof value === "string" ? value : value.scheduleId;

  if (!scheduleId) {
    throw new Error("scheduleId가 없습니다.");
  }

  const response = await authFetch(
    `${API_BASE}/schedules/${encodeURIComponent(scheduleId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "일정 삭제 실패"));
  }

  return true;
}
