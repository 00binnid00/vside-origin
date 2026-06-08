import { format } from "date-fns";
import { apiFetch as coreApiFetch } from "@/lib/api/apiClient";
import type {
  ApiScheduleResponse,
  CalendarEvent,
  Category,
  EventStatus,
  Mode,
  ProjectRole,
  ProjectStage,
} from "./schedule.types";

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function sortByDateRange(a: CalendarEvent, b: CalendarEvent) {
  if (a.startDateISO !== b.startDateISO) {
    return a.startDateISO.localeCompare(b.startDateISO);
  }

  if (a.endDateISO !== b.endDateISO) {
    return a.endDateISO.localeCompare(b.endDateISO);
  }

  return a.title.localeCompare(b.title);
}

export function isDateInEventRange(dateISO: string, event: CalendarEvent) {
  return dateISO >= event.startDateISO && dateISO <= event.endDateISO;
}

export function getDatesInRange(startISO: string, endISO: string) {
  const result: string[] = [];
  const current = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);

  while (current <= end) {
    result.push(format(current, "yyyy-MM-dd"));
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export function matchesScope(
  event: CalendarEvent,
  mode: Mode,
  workspaceId: string,
) {
  return event.mode === mode && event.workspaceId === workspaceId;
}

export function dedupeEvents(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent>();

  for (const event of events) {
    map.set(event.id, event);
  }

  return Array.from(map.values()).sort(sortByDateRange);
}

function normalizeEnum(value?: string | null) {
  return (value ?? "").trim().toUpperCase().replace(/[\s-]/g, "_");
}

export function fromApiCategory(value?: string | null): Category {
  switch (normalizeEnum(value)) {
    case "WORK":
      return "Work";
    case "MEETING":
      return "Meeting";
    case "STUDY":
      return "Study";
    case "ETC":
    default:
      return "Etc";
  }
}

export function toApiCategory(value: Category) {
  switch (value) {
    case "Work":
      return "WORK";
    case "Meeting":
      return "MEETING";
    case "Study":
      return "STUDY";
    case "Etc":
    default:
      return "ETC";
  }
}

export function fromApiStage(value?: string | null): ProjectStage {
  switch ((value ?? "").trim().toUpperCase()) {
    case "PLANNING":
      return "Planning";
    case "DESIGN":
      return "Design";
    case "IMPLEMENTATION":
      return "Implementation";
    case "WRAPUP":
    default:
      return "Wrapup";
  }
}

export function toApiStage(value: ProjectStage) {
  switch (value) {
    case "Planning":
      return "PLANNING";
    case "Design":
      return "DESIGN";
    case "Implementation":
      return "IMPLEMENTATION";
    case "Wrapup":
    default:
      return "WRAPUP";
  }
}

export function fromApiRole(value?: string | null): ProjectRole {
  switch (normalizeEnum(value)) {
    case "FRONTEND":
      return "Frontend";
    case "BACKEND":
      return "Backend";
    case "DESIGNER":
      return "Designer";
    case "FULLSTACK":
    default:
      return "Fullstack";
  }
}

export function toApiRole(value: ProjectRole) {
  switch (value) {
    case "Frontend":
      return "FRONTEND";
    case "Backend":
      return "BACKEND";
    case "Designer":
      return "DESIGNER";
    case "Fullstack":
    default:
      return "FULLSTACK";
  }
}

export function fromApiStatus(value?: string | null): EventStatus {
  switch (normalizeEnum(value)) {
    case "TODO":
      return "Todo";
    case "IN_PROGRESS":
    case "INPROGRESS":
      return "InProgress";
    case "DONE":
    default:
      return "Done";
  }
}

export function toApiStatus(value: EventStatus) {
  switch (value) {
    case "Todo":
      return "TODO";
    case "InProgress":
      return "IN_PROGRESS";
    case "Done":
    default:
      return "DONE";
  }
}

export function mapApiScheduleToCalendarEvent(
  schedule: ApiScheduleResponse,
): CalendarEvent {
  return {
    id: String(schedule.id),
    mode: normalizeEnum(schedule.type) === "TEAM" ? "team" : "personal",
    workspaceId: schedule.workspaceId,
    workspaceName: schedule.workspaceName ?? undefined,
    title: schedule.title,
    description: schedule.description ?? undefined,
    location: schedule.location ?? undefined,
    category: fromApiCategory(schedule.category),
    startDateISO: schedule.startDate,
    endDateISO: schedule.endDate,
    assignees: schedule.participants
      ? schedule.participants
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : undefined,
    stage: schedule.stage ? fromApiStage(schedule.stage) : undefined,
    role: schedule.role ? fromApiRole(schedule.role) : undefined,
    status: schedule.status ? fromApiStatus(schedule.status) : undefined,
    creatorId: schedule.creatorId ?? undefined,
    creatorName: schedule.creatorName ?? undefined,
  };
}

async function extractErrorMessage(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return `요청 실패 (${response.status})`;
  }

  try {
    const data = JSON.parse(text);

    if (typeof data === "string") return data;
    if (data?.message) return String(data.message);
    if (data?.error) return String(data.error);

    return text;
  } catch {
    return text;
  }
}

async function readJsonOrUndefined<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text().catch(() => "");

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await coreApiFetch(path, {
    ...options,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return await readJsonOrUndefined<T>(response);
}

export async function apiFetchJson<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<T> {
  const response = await coreApiFetch(path, {
    method,
    headers:
      method === "DELETE"
        ? undefined
        : {
            "Content-Type": "application/json",
          },
    body: method === "DELETE" ? undefined : JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return await readJsonOrUndefined<T>(response);
}