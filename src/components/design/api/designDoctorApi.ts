"use client";

// 경로: src/components/design/api/designDoctorApi.ts

import { apiFetch } from "@/lib/api/apiClient";

import type { DesignModel } from "../model/schema";

export type FindingSeverity = "ERROR" | "WARNING" | "INFO";

export type FixKind =
  | "RENAME_COLUMN"
  | "SET_SCREEN_ROUTE"
  | "ADD_PK_COLUMN"
  | "ALIGN_FK_TYPE"
  | "DELETE_RELATION"
  | "DELETE_TRANSITION";

/**
 * 기계적으로 고칠 수 있는 문제를 어떻게 고칠지.
 *
 * 무엇을 어떻게 바꿀지까지 서버가 정한다. 화면이 따로 계산하면 판정하는 쪽과
 * 어긋나서, 눌러도 오류가 안 사라지는 일이 생긴다.
 */
export interface Fix {
  kind: FixKind;
  targetId: string;
  columnId: string | null;
  value: string | null;
  length: number | null;
}

export interface Finding {
  ruleId: string;
  severity: FindingSeverity;
  /** requirement | screen | transition | api | table | relation */
  targetKind: string;
  targetId: string;
  targetLabel: string;
  message: string;
  fixHint: string;
  /** 고칠 수 있는 문제에만 담긴다. */
  fix: Fix | null;
}

/**
 * 한 단계가 얼마나 채워졌는지.
 *
 * `itemCount` 가 0 이면 `percent` 도 0 인데, 화면은 이때 0% 라고 쓰지 않고
 * "아직 없음" 으로 보여 준다. 아무것도 만들지 않은 단계를 0% 라고 하는 것도
 * 100% 라고 하는 것도 사실이 아니다.
 */
export interface StageProgress {
  itemCount: number;
  itemsDone: number;
  passedChecks: number;
  totalChecks: number;
  percent: number;
}

export interface ProgressReport {
  requirements: StageProgress;
  screens: StageProgress;
  apis: StageProgress;
  tables: StageProgress;
  passedChecks: number;
  totalChecks: number;
  percent: number;
}

export interface DoctorReport {
  findings: Finding[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  codegenBlocked: boolean;
  /** "아직 안 했다" 는 경고가 아니라 여기로 온다. */
  progress: ProgressReport;
}

const EMPTY_STAGE: StageProgress = {
  itemCount: 0,
  itemsDone: 0,
  passedChecks: 0,
  totalChecks: 0,
  percent: 0,
};

export const EMPTY_PROGRESS: ProgressReport = {
  requirements: EMPTY_STAGE,
  screens: EMPTY_STAGE,
  apis: EMPTY_STAGE,
  tables: EMPTY_STAGE,
  passedChecks: 0,
  totalChecks: 0,
  percent: 0,
};

export const EMPTY_REPORT: DoctorReport = {
  findings: [],
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  codegenBlocked: false,
  progress: EMPTY_PROGRESS,
};

export async function inspectDesignApi(
  workspaceId: string,
  projection: DesignModel,
): Promise<DoctorReport> {
  const response = await apiFetch(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/design/doctor`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projection }),
    },
  );

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    const error = new Error(text || "설계 점검에 실패했습니다.") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const parsed = (text ? JSON.parse(text) : EMPTY_REPORT) as DoctorReport;

  // 백엔드를 아직 재시작하지 않았으면 progress 가 없다. 그때 화면이 깨지지 않도록
  // 빈 값으로 채운다(진행률이 0% 로 보이고, 오류 목록은 정상 동작한다).
  return { ...parsed, progress: parsed.progress ?? EMPTY_PROGRESS };
}
