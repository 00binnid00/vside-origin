import type {
  ApiScheduleResponse,
  Mode,
} from "@/components/schedule/schedule.types";
import { apiJson } from "@/lib/api/apiClient";

/**
 * 개발일지 좌측 캘린더용 월간 일정 조회
 */
export async function fetchDevlogMonthSchedules(
  mode: Mode,
  workspaceId: string,
  year: number,
  month: number,
): Promise<ApiScheduleResponse[]> {
  const query = new URLSearchParams({
    view: mode,
    workspaceId,
    year: String(year),
    month: String(month),
  });

  const data = await apiJson(`/api/schedules/calendar?${query}`, {
    cache: "no-store",
  });

  return Array.isArray(data) ? (data as ApiScheduleResponse[]) : [];
}

/**
 * 개발일지 좌측 캘린더용 선택 날짜 일정 조회
 */
export async function fetchDevlogDaySchedules(
  mode: Mode,
  workspaceId: string,
  date: string,
): Promise<ApiScheduleResponse[]> {
  const query = new URLSearchParams({
    view: mode,
    workspaceId,
    date,
    category: "all",
  });

  const data = await apiJson(`/api/schedules?${query}`, {
    cache: "no-store",
  });

  return Array.isArray(data) ? (data as ApiScheduleResponse[]) : [];
}

/**
 * 개발일지 좌측 캘린더용 주간 일정 조회
 */
export async function fetchDevlogWeekSchedules(
  mode: Mode,
  workspaceId: string,
  dateISO: string,
): Promise<ApiScheduleResponse[]> {
  const query = new URLSearchParams({
    view: mode,
    workspaceId,
    date: dateISO,
  });

  const data = await apiJson(`/api/schedules/weekly?${query}`, {
    cache: "no-store",
  });

  return Array.isArray(data) ? (data as ApiScheduleResponse[]) : [];
}