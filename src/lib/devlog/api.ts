import { ApiWorkspaceDetailResponse, FormValue } from "./types";
import { apiFetch, apiJson } from "@/lib/api/apiClient";

async function handleVoidResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "요청 처리 중 오류가 발생했습니다.");
  }
}

function toPayload(workspaceId: string, form: FormValue) {
  return {
    workspaceId,
    projectId: Number(form.projectId),
    title: form.title.trim(),
    summary: form.summary.trim(),
    content: form.content.trim(),
    date: form.date,
    tagsText: form.tagsText,
    stage: form.stage,
    goal: form.goal,
    design: form.design,
    issue: form.issue,
    solution: form.solution,
    nextPlan: form.nextPlan,
    commitHash: form.commitHash,
    progress: Number(form.progress || 0),
  };
}

/**
 * 워크스페이스 상세 + 개발일지 목록
 */
export async function fetchWorkspaceDevlogs(
  workspaceId: string,
): Promise<ApiWorkspaceDetailResponse> {
  return (await apiJson(
    `/api/devlogs/workspaces/${encodeURIComponent(workspaceId)}`,
    {
      cache: "no-store",
    },
  )) as ApiWorkspaceDetailResponse;
}

/**
 * 개발일지 생성
 */
export async function createDevlog(workspaceId: string, form: FormValue) {
  const response = await apiFetch("/api/devlogs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toPayload(workspaceId, form)),
    cache: "no-store",
  });

  await handleVoidResponse(response);
}

/**
 * 개발일지 수정
 */
export async function updateDevlog(
  devlogId: number,
  workspaceId: string,
  form: FormValue,
) {
  const response = await apiFetch(`/api/devlogs/${devlogId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toPayload(workspaceId, form)),
    cache: "no-store",
  });

  await handleVoidResponse(response);
}

/**
 * 개발일지 삭제
 */
export async function deleteDevlog(
  devlogId: number,
  workspaceId: string,
  projectId: number,
) {
  const query = new URLSearchParams({
    workspaceId,
    projectId: String(projectId),
  });

  const response = await apiFetch(`/api/devlogs/${devlogId}?${query}`, {
    method: "DELETE",
    cache: "no-store",
  });

  await handleVoidResponse(response);
}