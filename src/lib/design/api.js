"use client";

import { authFetch } from "@/lib/ide/api";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const WORKSPACE_API_BASE = `${BASE_URL}/api/workspaces`;
const DESIGN_API_BASE = `${BASE_URL}/api/design`;

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

  const response = await authFetch(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(
      workspaceId,
    )}/design/requirements`,
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "요구사항 목록 로드 실패");
  }

  const data = await response.json();

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

  const response = await authFetch(
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
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "요구사항 생성 실패");
  }

  return normalizeRequirementFromApi(await response.json());
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

  const response = await authFetch(
    `${DESIGN_API_BASE}/requirements/${encodeURIComponent(requirementId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        category,
        name,
        description,
      }),
    },
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "요구사항 수정 실패");
  }

  return normalizeRequirementFromApi(await response.json());
};

export const deleteRequirementApi = async (requirementId) => {
  if (!requirementId) {
    throw new Error("requirementId가 없습니다.");
  }

  const response = await authFetch(
    `${DESIGN_API_BASE}/requirements/${encodeURIComponent(requirementId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "요구사항 삭제 실패");
  }

  return true;
};

// ============================================================================
// API 명세서 API
// ============================================================================

export const fetchWorkspaceApiSpecsApi = async (workspaceId) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const response = await authFetch(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/apis`,
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "API 명세서 목록 로드 실패");
  }

  const data = await response.json();

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

  const apiResponse = await authFetch(
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
  );

  if (!apiResponse.ok) {
    const errMsg = await apiResponse.text();
    throw new Error(errMsg || "API 명세서 생성 실패");
  }

  return normalizeApiSpecFromApi(await apiResponse.json());
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

  const apiResponse = await authFetch(
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
  );

  if (!apiResponse.ok) {
    const errMsg = await apiResponse.text();
    throw new Error(errMsg || "API 명세서 수정 실패");
  }

  return normalizeApiSpecFromApi(await apiResponse.json());
};

export const deleteApiSpecApi = async (apiSpecId) => {
  if (!apiSpecId) {
    throw new Error("apiSpecId가 없습니다.");
  }

  const response = await authFetch(
    `${DESIGN_API_BASE}/apis/${encodeURIComponent(apiSpecId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "API 명세서 삭제 실패");
  }

  return true;
};

// ============================================================================
// 설계 문서 API - ERD / 데이터 플로우
// ============================================================================

export const fetchWorkspaceDesignDocumentApi = async (workspaceId) => {
  if (!workspaceId) {
    throw new Error("workspaceId가 없습니다.");
  }

  const response = await authFetch(
    `${WORKSPACE_API_BASE}/${encodeURIComponent(workspaceId)}/design/document`,
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "설계 문서 로드 실패");
  }

  return normalizeDesignDocumentFromApi(await response.json());
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

  const response = await authFetch(
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
  );

  if (!response.ok) {
    const errMsg = await response.text();
    throw new Error(errMsg || "설계 문서 저장 실패");
  }

  return normalizeDesignDocumentFromApi(await response.json());
};
