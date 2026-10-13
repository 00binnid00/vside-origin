"use client";

// 경로: src/components/design/api/designAiApi.ts
//
// 초안은 서버가 맡아서 끝까지 만든다. 화면은 시작만 시키고 상태를 물어본다.
// 예전에는 브라우저가 두 단계를 차례로 직접 불러서, 만드는 동안 창을 닫거나
// 다른 페이지로 가면 결과가 버려졌다.

import { apiFetch } from "@/lib/api/apiClient";

import type { DesignModel, TechStack } from "../model/schema";
import type { DoctorReport } from "./designDoctorApi";

export interface DraftJob {
  status: "RUNNING" | "DONE" | "FAILED";
  /** 지금 몇 번째 단계인지(1 또는 2). */
  stage: number;
  model: DesignModel | null;
  report: DoctorReport | null;
  errorMessage: string | null;
}

function jobPath(workspaceId: string): string {
  return `/api/workspaces/${encodeURIComponent(workspaceId)}/design/ai/draft-job`;
}

/**
 * @param existing 지금 문서에 이미 있는 내용. 알려 주지 않으면 AI 가 빈
 *   문서인 줄 알고 이미 있는 요구사항과 화면을 다시 내놓는다.
 */
export async function startDraftJobApi(
  workspaceId: string,
  summary: string,
  techStack: TechStack,
  instruction: string,
  existing: DesignModel | null,
): Promise<DraftJob> {
  const response = await apiFetch(jobPath(workspaceId), {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary, techStack, instruction, existing }),
  });

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    // 서버가 이유를 문장으로 돌려주므로 그대로 보여 준다.
    throw new Error(text || "초안을 만들지 못했습니다.");
  }

  return JSON.parse(text) as DraftJob;
}

/** 내 초안 작업의 지금 상태. 서버에 남은 것이 없으면 null. */
export async function fetchDraftJobApi(workspaceId: string): Promise<DraftJob | null> {
  const response = await apiFetch(jobPath(workspaceId), { cache: "no-store" });

  if (response.status === 204) return null;
  if (!response.ok) throw new Error("초안 상태를 확인하지 못했습니다.");

  return (await response.json()) as DraftJob;
}

/** 문서에 넣었거나 버렸을 때 서버에서 치운다. 실패해도 한 시간 뒤 저절로 사라진다. */
export async function discardDraftJobApi(workspaceId: string): Promise<void> {
  await apiFetch(jobPath(workspaceId), { method: "DELETE" }).catch(() => undefined);
}

export async function fetchAiStatusApi(): Promise<boolean> {
  try {
    const response = await apiFetch("/api/design/ai/status", { cache: "no-store" });
    if (!response.ok) return false;

    const text = await response.text();
    return Boolean(JSON.parse(text)?.available);
  } catch {
    return false;
  }
}
