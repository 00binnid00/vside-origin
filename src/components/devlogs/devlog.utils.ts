import type { ScheduleStatus, WorkspaceLike } from "./devlog.types";

export const scheduleStatusLabel: Record<ScheduleStatus, string> = {
  todo: "할 일",
  progress: "진행 중",
  done: "완료",
  delayed: "지연",
};

export const statusStyle: Record<ScheduleStatus, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  progress: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-purple-50 text-purple-700 border-purple-200",
  delayed: "bg-rose-50 text-rose-700 border-rose-200",
};

export function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

export function extractWorkspaceList(value: unknown): WorkspaceLike[] {
  if (Array.isArray(value)) return value as WorkspaceLike[];

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    if (Array.isArray(objectValue.workspaces)) {
      return objectValue.workspaces as WorkspaceLike[];
    }

    if (Array.isArray(objectValue.data)) {
      return objectValue.data as WorkspaceLike[];
    }

    if (Array.isArray(objectValue.content)) {
      return objectValue.content as WorkspaceLike[];
    }

    if (Array.isArray(objectValue.list)) {
      return objectValue.list as WorkspaceLike[];
    }
  }

  return [];
}

export function normalizeWorkspaceId(value: string | null) {
  if (!value) return "";
  if (value === "undefined" || value === "null") return "";
  return value;
}
