"use client";

// 경로: src/components/design/api/designCodegenApi.ts
//
// 코드 생성은 미리보기와 적용 두 번에 나눠 부른다. 무엇이 덮어써지는지
// 보지 않고 결정하게 하면 안 되기 때문이다.
//
// 적용할 때 파일 내용을 보내지 않는다는 점을 기억해 두면 좋다. 서버가 같은
// 설계로 다시 만들어서 고른 경로만 쓴다. 경로와 내용을 그대로 보내는 구조는
// 사실상 "아무 파일이나 쓸 수 있는 통로"가 된다.

import { apiFetch } from "@/lib/api/apiClient";

import type { DesignModel } from "../model/schema";
import type { Finding } from "./designDoctorApi";

export type CodegenFileStatus = "NEW" | "IDENTICAL" | "CONFLICT";

export interface CodegenFileView {
  path: string;
  content: string;
  status: CodegenFileStatus;
  existingHash: string;
  existingContent: string;
  target: string;
  targetLabel: string;
  sourceLabel: string;
  /**
   * 이 파일이 어느 요구사항에서 나왔는지.
   *
   * 묶는 열쇠는 id 다. 라벨은 이름이 바뀌면 같이 바뀌고 같은 이름이 둘일 수도 있다.
   * 비어 있으면 여러 기능이 함께 쓰는 파일(DDL, 라우트 표)이거나 연결이 빠진 파일이다.
   */
  requirementIds: string[];
  requirementLabels: string[];
  /**
   * 사람이 직접 채워야 하는 몸통이 남아 있는지.
   *
   * 생성기가 알려 준다. 내용에서 "UnsupportedOperationException" 을 찾아 알아내면
   * 스텁 문구를 바꾸는 순간 표시가 조용히 사라진다.
   */
  needsHandWork: boolean;
}

export interface CodegenPreview {
  stack: "SPRING" | "REACT" | "NEXT" | "UNKNOWN";
  stackLabel: string;
  basePackage: string;
  note: string;
  files: CodegenFileView[];
  blockedBy: Finding[];
}

export type ApplyStatus = "WRITTEN" | "SKIPPED" | "CHANGED_MEANWHILE" | "FAILED";

export interface CodegenApplyResult {
  path: string;
  status: ApplyStatus;
  message: string;
}

export interface CodegenApplyReport {
  results: CodegenApplyResult[];
  written: number;
  skipped: number;
  failed: number;
}

export interface CodegenTargets {
  /** git 이 아는 브랜치가 아니라 디스크에 실제로 있는 작업 폴더다. */
  branches: string[];
  stack: CodegenPreview["stack"];
  stackLabel: string;
  basePackage: string;
  note: string;
}

export async function fetchCodegenTargetsApi(
  workspaceId: string,
  projectName: string,
  branchName: string,
): Promise<CodegenTargets> {
  const query = new URLSearchParams({ projectName });
  if (branchName) query.set("branchName", branchName);

  const response = await apiFetch(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/design/codegen/targets?${query}`,
    { cache: "no-store" },
  );

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(text || "프로젝트를 확인하지 못했습니다.");
  }

  return JSON.parse(text) as CodegenTargets;
}

async function post<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const response = await apiFetch(path, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    const error = new Error(text || fallback) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return JSON.parse(text) as T;
}

export async function previewCodegenApi(
  workspaceId: string,
  model: DesignModel,
  projectName: string,
  branchName: string,
  basePackage: string,
): Promise<CodegenPreview> {
  return post(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/design/codegen/preview`,
    { model, projectName, branchName, basePackage },
    "코드를 만들지 못했습니다.",
  );
}

export async function applyCodegenApi(
  workspaceId: string,
  model: DesignModel,
  projectName: string,
  branchName: string,
  basePackage: string,
  files: { path: string; expectedExistingHash: string }[],
): Promise<CodegenApplyReport> {
  return post(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/design/codegen/apply`,
    { model, projectName, branchName, basePackage, files },
    "파일을 넣지 못했습니다.",
  );
}
