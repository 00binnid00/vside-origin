"use client";

import { apiFetch } from "@/lib/api/apiClient";

const WORKSPACE_API_BASE = "/api/workspaces";
const DESIGN_API_BASE = "/api/design";

// ============================================================================
// 설계관리 API - 공통 응답 처리
// ============================================================================

async function readResponseText(response) {
  return await response.text().catch(() => "");
}

async function requestJson(path, options = {}, fallbackMessage = "요청 처리 중 오류가 발생했습니다.") {
  const response = await apiFetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await readResponseText(response);

  if (!response.ok) {
    throw new Error(text || fallbackMessage);
  }

  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

async function requestVoid(path, options = {}, fallbackMessage = "요청 처리 중 오류가 발생했습니다.") {
  const response = await apiFetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await readResponseText(response);

  if (!response.ok) {
    throw new Error(text || fallbackMessage);
  }

  return true;
}

// ============================================================================
// 설계관리 API - 공통 정규화
// ============================================================================

const normalizeRequirementFromApi = (item) => {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    category: item.category ?? "기본",
    name: item.name ?? "",
    description: item.description ?? "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

const normalizeApiSpecFromApi = (item) => {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    method: item.method ?? "GET",
    endpoint: item.endpoint ?? "",
    description: item.description ?? "",
    request: item.request ?? "",
    response: item.response ?? "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
};

const safeJsonArrayString = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "[]";
  }

  return value;
};

const normalizeDesignDocumentFromApi = (item) => {
  return {
    id: item?.id ?? null,
    workspaceId: item?.workspaceId ?? "",
    erdNodesJson: safeJsonArrayString(item?.erdNodesJson),
    erdEdgesJson: safeJsonArrayString(item?.erdEdgesJson),
    flowNodesJson: safeJsonArrayString(item?.flowNodesJson),
    flowEdgesJson: safeJsonArrayString(item?.flowEdgesJson),
    createdAt: item?.createdAt ?? null,
    updatedAt: item?.updatedAt ?? null,
  };
};

// ============================================================================
// 요구사항 API
// ============================================================================

export const fetchWorkspaceRequirementsApi = async (workspaceId) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const data = await requestJson(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(
      workspaceId,
    )}/design/requirements`,
    {
      method: "GET",
    },
    "요구사항 목록 로드 실패",
  );

  return Array.isArray(data) ? data.map(normalizeRequirementFromApi) : [];
};

export const createWorkspaceRequirementApi = async ({
  workspaceId,
  category = "기본",
  name,
  description = "",
}) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const data = await requestJson(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(
      workspaceId,
    )}/design/requirements`,
    {
      method: "POST",
      body: JSON.stringify({
        category,
        name,
        description,
      }),
    },
    "요구사항 생성 실패",
  );

  return normalizeRequirementFromApi(data);
};

export const updateRequirementApi = async ({
  requirementId,
  category,
  name,
  description,
}) => {
  if (!requirementId) {
    throw new Error("requirementId가 없습니다.");
  }

  const data = await requestJson(
    `${DESIGN_API_BASE}/requirements/${encodeURIComponent(requirementId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        category,
        name,
        description,
      }),
    },
    "요구사항 수정 실패",
  );

  return normalizeRequirementFromApi(data);
};

export const deleteRequirementApi = async (requirementId) => {
  if (!requirementId) {
    throw new Error("requirementId가 없습니다.");
  }

  return await requestVoid(
    `${DESIGN_API_BASE}/requirements/${encodeURIComponent(requirementId)}`,
    {
      method: "DELETE",
    },
    "요구사항 삭제 실패",
  );
};

// ============================================================================
// API 명세서 API
// ============================================================================

export const fetchWorkspaceApiSpecsApi = async (workspaceId) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const data = await requestJson(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/apis`,
    {
      method: "GET",
    },
    "API 명세서 목록 로드 실패",
  );

  return Array.isArray(data) ? data.map(normalizeApiSpecFromApi) : [];
};

export const createWorkspaceApiSpecApi = async ({
  workspaceId,
  method = "GET",
  endpoint,
  description = "",
  request = "",
  response = "",
}) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const data = await requestJson(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/apis`,
    {
      method: "POST",
      body: JSON.stringify({
        method,
        endpoint,
        description,
        request,
        response,
      }),
    },
    "API 명세서 생성 실패",
  );

  return normalizeApiSpecFromApi(data);
};

export const updateApiSpecApi = async ({
  apiSpecId,
  method,
  endpoint,
  description,
  request,
  response,
}) => {
  if (!apiSpecId) {
    throw new Error("apiSpecId가 없습니다.");
  }

  const data = await requestJson(
    `${DESIGN_API_BASE}/apis/${encodeURIComponent(apiSpecId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        method,
        endpoint,
        description,
        request,
        response,
      }),
    },
    "API 명세서 수정 실패",
  );

  return normalizeApiSpecFromApi(data);
};

export const deleteApiSpecApi = async (apiSpecId) => {
  if (!apiSpecId) {
    throw new Error("apiSpecId가 없습니다.");
  }

  return await requestVoid(
    `${DESIGN_API_BASE}/apis/${encodeURIComponent(apiSpecId)}`,
    {
      method: "DELETE",
    },
    "API 명세서 삭제 실패",
  );
};

// ============================================================================
// 설계 문서 API - ERD / 데이터 플로우
// ============================================================================

export const fetchWorkspaceDesignDocumentApi = async (workspaceId) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const data = await requestJson(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/document`,
    {
      method: "GET",
    },
    "설계 문서 로드 실패",
  );

  return normalizeDesignDocumentFromApi(data);
};

export const saveWorkspaceDesignDocumentApi = async ({
  workspaceId,
  erdNodesJson = "[]",
  erdEdgesJson = "[]",
  flowNodesJson = "[]",
  flowEdgesJson = "[]",
}) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const data = await requestJson(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/document`,
    {
      method: "PUT",
      body: JSON.stringify({
        erdNodesJson,
        erdEdgesJson,
        flowNodesJson,
        flowEdgesJson,
      }),
    },
    "설계 문서 저장 실패",
  );

  return normalizeDesignDocumentFromApi(data);
};