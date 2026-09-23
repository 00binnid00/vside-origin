"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Code2,
  Database,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  GitBranch,
  Github,
  Info,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Search,
  Sparkles,
  Settings,
  UserRound,
  Users,
  X,
  Filter,
} from "lucide-react";

import {
  changeMyEmailApi,
  changeMyNicknameApi,
  changeMyPasswordApi,
  deleteMyAccountApi,
  fetchGithubAccountStatusApi,
  disconnectGithubAccountApi,
  fetchMyProfile,
  fetchMyWorkspaces,
  fetchScheduleProgress,
  fetchWorkspaceDevlogs,
  fetchMyActivityHeatmapApi,
  fetchMyRecentActivitiesApi,
  generateFinalReportDraftApi,
  type GithubAccountStatus,
  type MyPageDevlogResponse,
  type ScheduleProgressResponse,
  type ScheduleView,
  type UserMeResponse,
  type WorkspaceDevlogsResponse,
  type WorkspaceListResponse,
  type WorkspaceProjectResponse,
  type ActivityHeatmapResponse,
  type RecentActivityResponse,
} from "@/components/mypage/api";

import {
  getAivsHref,
  getDevlogHref,
  getScheduleHref,
} from "@/components/main-dashboard/dashboard.utils";

import {
  fetchWorkspaceApiSpecsApi,
  fetchWorkspaceDesignDocumentApi,
  fetchWorkspaceRequirementsApi,
} from "@/lib/design/api";

import type {
  ActivitySummary,
   Devlog,
  HeatmapLevel,
  Project,
  ProjectStatus,
  TabKey,
  User,
} from "@/components/mypage/types";

type DevlogSortType = "latest" | "oldest";
type ProjectTypeFilter = "all" | "personal" | "team";
type ProjectStatusFilter = "all" | "active" | "completed";
type ArchiveTabKey = "devlog" | "design" | "final";
type DesignArchiveSectionKey = "requirements" | "api" | "erd" | "flow";

type DesignRequirementItem = {
  id: string | number;
  category: string;
  name: string;
  description: string;
};

type DesignApiSpecItem = {
  id: string | number;
  method: string;
  endpoint: string;
  description: string;
  request: string;
  response: string;
};

type DesignDocumentItem = {
  erdNodesJson?: string | null;
  erdEdgesJson?: string | null;
  flowNodesJson?: string | null;
  flowEdgesJson?: string | null;
};

type ParsedDesignDocument = {
  erdNodes: Record<string, unknown>[];
  erdEdges: Record<string, unknown>[];
  flowNodes: Record<string, unknown>[];
  flowEdges: Record<string, unknown>[];
};

const DEFAULT_HEATMAP_DAYS = 365;

function createEmptyHeatmapValues(days = DEFAULT_HEATMAP_DAYS): HeatmapLevel[] {
  return Array.from({ length: days }, () => 0 as HeatmapLevel);
}

function createEmptyActivityHeatmap(): ActivityHeatmapResponse {
  return {
    days: [],
    totalActivityCount: 0,
    activeDays: 0,
    devlogCount: 0,
    scheduleDoneCount: 0,
    commitCount: 0,
  };
}


function mapHeatmapValuesFromResponse(
  heatmap: ActivityHeatmapResponse,
): HeatmapLevel[] {
  if (!Array.isArray(heatmap.days) || heatmap.days.length === 0) {
    return createEmptyHeatmapValues();
  }

  return heatmap.days.map((day) => day.level as HeatmapLevel);
}
const OAUTH_RESULT_STORAGE_KEY = "wevaisGithubOAuthResult";
const OAUTH_PENDING_STORAGE_KEY = "wevaisPendingGitRemoteAction";
const OAUTH_RETURN_URL_STORAGE_KEY = "wevaisGithubOAuthReturnUrl";

function openGithubAccountOAuth() {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

  if (!clientId) {
    alert(
      "GitHub OAuth 설정이 없습니다. .env.local에 NEXT_PUBLIC_GITHUB_CLIENT_ID를 추가해주세요.",
    );
    return;
  }

  const statePayload = {
    source: "mypage",
    action: "account-link",
    requestedAt: Date.now(),
  };

  window.sessionStorage.setItem(
    OAUTH_PENDING_STORAGE_KEY,
    JSON.stringify(statePayload),
  );

  window.sessionStorage.setItem(
    OAUTH_RETURN_URL_STORAGE_KEY,
    window.location.href,
  );

  const authUrl = new URL("https://github.com/login/oauth/authorize");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "repo");
  authUrl.searchParams.set(
    "redirect_uri",
    `${window.location.origin}/auth/github/callback`,
  );
  authUrl.searchParams.set("state", JSON.stringify(statePayload));

  window.location.assign(authUrl.toString());
}

function getGithubAccountName(status: GithubAccountStatus | null) {
  return status?.username || status?.login || "";
}

const tabs: {
  key: TabKey;
  label: string;
  description: string;
  icon: React.ElementType;
  children?: {
    key: ArchiveTabKey;
    label: string;
    description: string;
    icon: React.ElementType;
  }[];
}[] = [
  {
    key: "overview",
    label: "Overview",
    description: "내 활동 요약",
    icon: LayoutDashboard,
  },
  {
    key: "progress",
    label: "내 프로젝트",
    description: "참여 프로젝트 관리",
    icon: FolderKanban,
  },
  {
    key: "devlogs",
    label: "자료실",
    description: "개발 문서 모음",
    icon: BookOpen,
    children: [
      {
        key: "devlog",
        label: "개발일지",
        description: "작성 기록",
        icon: BookOpen,
      },
      {
        key: "design",
        label: "설계 문서",
        description: "요구사항·ERD·API",
        icon: FileText,
      },
      {
        key: "final",
        label: "최종 보고서",
        description: "AI 초안",
        icon: Sparkles,
      },
    ],
  },
  {
    key: "github",
    label: "GitHub 설정",
    description: "계정 연동",
    icon: Github,
  },
  {
    key: "account",
    label: "계정 설정",
    description: "프로필 관리",
    icon: Settings,
  },
];

function mapUser(dto: UserMeResponse): User {
  return {
    id: String(dto.id),
    email: dto.email,
    nickname: dto.nickname,
    profileImageUrl: dto.profileImageUrl ?? null,
    createdAt: dto.createdAt,
  };
}

function normalizeRole(value: unknown): "owner" | "member" {
  return String(value ?? "").toLowerCase() === "owner" ? "owner" : "member";
}

function normalizeProjectStatus(value: unknown): ProjectStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    raw === "completed" ||
    raw === "complete" ||
    raw === "done" ||
    raw === "finished" ||
    raw === "완료"
  ) {
    return "completed";
  }

  return "active";
}

function normalizeProgress(value: unknown, status: ProjectStatus) {
  const progress = Number(value);

  if (Number.isFinite(progress)) {
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  return status === "completed" ? 100 : 65;
}

function normalizeStack(project: WorkspaceProjectResponse) {
  if (Array.isArray(project.stack) && project.stack.length > 0) {
    return project.stack.filter(Boolean);
  }

  if (project.language) {
    return [project.language];
  }

  return ["언어 없음"];
}

function getScheduleViewFromWorkspace(
  workspace: WorkspaceListResponse,
): ScheduleView {
  return workspace.mode === "team" ? "team" : "personal";
}

function mapProjectsFromWorkspaces(
  workspaces: WorkspaceListResponse[],
  scheduleProgressMap: Map<string, ScheduleProgressResponse>,
): Project[] {
  return workspaces.map((workspace) => {
    const workspaceRole = normalizeRole(workspace.role);
    const workspaceVisibility = workspace.mode === "team" ? "team" : "private";
    const workspaceType = workspace.mode === "team" ? "팀" : "개인";

    const scheduleProgress = scheduleProgressMap.get(workspace.id);

    // 하위 프로젝트는 카드로 펼치지 않고,
    // 최상위 워크스페이스 카드의 보조 정보로만 사용함.
    const childProjects = workspace.projects ?? [];
    const firstProject = childProjects[0];

    const progress =
      typeof scheduleProgress?.progress === "number"
        ? scheduleProgress.progress
        : 0;

    const status: ProjectStatus = progress >= 100 ? "completed" : "active";

    const language =
      firstProject?.language ||
      childProjects.find((project) => project.language)?.language ||
      "Unknown";

    const stack =
      childProjects.length > 0
        ? Array.from(
            new Set(
              childProjects
                .flatMap((project) => normalizeStack(project))
                .filter(Boolean),
            ),
          )
        : language
          ? [language]
          : ["언어 없음"];

    const updatedAt =
      workspace.updatedAt ??
      childProjects
        .map((project) => project.updatedAt)
        .filter(Boolean)
        .sort()
        .reverse()[0] ??
      undefined;

    const devlogCount = childProjects.reduce(
      (sum, project) => sum + Number(project.devlogCount ?? 0),
      0,
    );

    return {
      id: workspace.id,
      name: workspace.name,
      description:
        workspace.description ||
        firstProject?.description ||
        `${workspace.name} 프로젝트입니다.`,
      type: workspaceType,
      status,
      progress,
      language,
      stack,
      updatedAt,
      devlogCount,
      doneScheduleCount: Number(scheduleProgress?.doneCount ?? 0),
      scheduleTotalCount: Number(scheduleProgress?.totalCount ?? 0),

      workspaceId: workspace.id,
      workspaceName: workspace.name,
      workspaceRole,
      workspaceVisibility,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(
  record: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getProjectNameFromDevlog(
  devlog: Record<string, unknown>,
  workspace: WorkspaceListResponse,
  rootResponse?: WorkspaceDevlogsResponse | null,
) {
  const directProjectName = getStringValue(devlog, [
    "projectName",
    "projectTitle",
    "workspaceProjectName",
  ]);

  if (directProjectName) return directProjectName;

  const projectObject = devlog.project;

  if (isRecord(projectObject)) {
    const nestedProjectName = getStringValue(projectObject, ["name", "title"]);

    if (nestedProjectName) return nestedProjectName;
  }

  const projectId = getStringValue(devlog, [
    "projectId",
    "project_id",
    "workspaceProjectId",
    "workspace_project_id",
  ]);

  if (projectId) {
    const matchedProject = workspace.projects?.find(
      (project) => String(project.id) === String(projectId),
    );

    if (matchedProject?.name) {
      return matchedProject.name;
    }
  }

  if (isRecord(rootResponse)) {
    const responseWorkspaceName = getStringValue(rootResponse, [
      "workspaceName",
      "name",
    ]);

    if (responseWorkspaceName) return responseWorkspaceName;
  }

  return workspace.name;
}

function getProjectIdFromDevlog(
  devlog: Record<string, unknown>,
  workspace: WorkspaceListResponse,
) {
  const directProjectId = getStringValue(devlog, [
    "projectId",
    "project_id",
    "workspaceProjectId",
    "workspace_project_id",
  ]);

  if (directProjectId) return directProjectId;

  const projectObject = devlog.project;

  if (isRecord(projectObject)) {
    const nestedProjectId = getStringValue(projectObject, [
      "id",
      "projectId",
      "workspaceProjectId",
    ]);

    if (nestedProjectId) return nestedProjectId;
  }

  const projectName = getProjectNameFromDevlog(devlog, workspace, null);

  const matchedProject = workspace.projects?.find((project) => {
    return (
      project.name === projectName ||
      project.name?.trim() === projectName.trim()
    );
  });

  return matchedProject?.id ? String(matchedProject.id) : undefined;
}

function looksLikeDevlog(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;

  const hasTitleLike =
    typeof value.title === "string" ||
    typeof value.summary === "string" ||
    typeof value.content === "string";

  const hasDevlogLikeKey =
    "devlogId" in value ||
    "date" in value ||
    "createdAt" in value ||
    "updatedAt" in value ||
    "stage" in value ||
    "goal" in value ||
    "issue" in value ||
    "solution" in value ||
    "nextPlan" in value ||
    "commitHash" in value;

  return hasTitleLike && hasDevlogLikeKey;
}

function collectDevlogCandidates(
  value: unknown,
  result: MyPageDevlogResponse[] = [],
  depth = 0,
): MyPageDevlogResponse[] {
  if (depth > 7) return result;

  if (Array.isArray(value)) {
    for (const item of value) {
      collectDevlogCandidates(item, result, depth + 1);
    }

    return result;
  }

  if (!isRecord(value)) return result;

  if (looksLikeDevlog(value)) {
    result.push(value);
    return result;
  }

  for (const [key, child] of Object.entries(value)) {
    const lowerKey = key.toLowerCase();

    const shouldSearch =
      Array.isArray(child) ||
      lowerKey.includes("devlog") ||
      lowerKey.includes("log") ||
      lowerKey.includes("data") ||
      lowerKey.includes("content") ||
      lowerKey.includes("project") ||
      lowerKey.includes("workspace");

    if (shouldSearch) {
      collectDevlogCandidates(child, result, depth + 1);
    }
  }

  return result;
}

function formatDateLabel(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDevlogSortTime(devlog: Devlog) {
  const value = devlog.rawDate || devlog.date;
  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function mapDevlogItem(
  devlog: MyPageDevlogResponse,
  workspace: WorkspaceListResponse,
  rootResponse: WorkspaceDevlogsResponse,
  index: number,
): Devlog {
  const id =
    getStringValue(devlog, ["id", "devlogId", "logId"]) ||
    `${workspace.id}-${index}`;

  const title =
    getStringValue(devlog, ["title", "name", "subject"]) || "제목 없는 자료";

  const rawDate =
    getStringValue(devlog, [
      "date",
      "createdAt",
      "updatedAt",
      "writeDate",
      "devlogDate",
      "loggedAt",
    ]) || "";

  const summary =
    getStringValue(devlog, ["summary", "content", "description"]) ||
    getStringValue(devlog, ["issue", "solution", "nextPlan"]) ||
    "작성된 요약이 없습니다.";

  const projectId = getProjectIdFromDevlog(devlog, workspace);

  return {
    id,
    projectId,
    workspaceId: workspace.id,
    title,
    projectName: getProjectNameFromDevlog(devlog, workspace, rootResponse),
    date: formatDateLabel(rawDate),
    rawDate,
    summary,
  };
}

function mapDevlogsFromWorkspaceResponse(
  response: WorkspaceDevlogsResponse,
  workspace: WorkspaceListResponse,
): Devlog[] {
  const candidates = collectDevlogCandidates(response);

  const mapped = candidates.map((devlog, index) =>
    mapDevlogItem(devlog, workspace, response, index),
  );

  const uniqueMap = new Map<string, Devlog>();

  for (const item of mapped) {
    uniqueMap.set(item.id, item);
  }

  return Array.from(uniqueMap.values());
}

function applyDevlogCountToProjects(
  projects: Project[],
  devlogs: Devlog[],
): Project[] {
  const countMap = new Map<string, number>();

  for (const devlog of devlogs) {
    if (!devlog.projectId) continue;

    const key = String(devlog.projectId);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  return projects.map((project) => {
    const countByProjectId = countMap.get(String(project.id));

    return {
      ...project,
      devlogCount:
        typeof countByProjectId === "number"
          ? countByProjectId
          : project.devlogCount,
    };
  });
}

function buildActivitySummary(
  projects: Project[],
  devlogCount: number,
  commitCount: number,
): ActivitySummary {
  const progressProjectCount = projects.filter(
    (project) => project.status === "active",
  ).length;

  const completedProjectCount = projects.filter(
    (project) => project.status === "completed",
  ).length;

  const doneScheduleCount = projects.reduce(
    (sum, project) => sum + project.doneScheduleCount,
    0,
  );

  const languageCount = new Map<string, number>();

  for (const project of projects) {
    const language = project.language || "Unknown";
    languageCount.set(language, (languageCount.get(language) ?? 0) + 1);
  }

  const primaryLanguage =
    Array.from(languageCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "-";

  return {
    progressProjectCount,
    completedProjectCount,
    devlogCount,
    doneScheduleCount,
    commitCount,
    primaryLanguage,
  };
}

function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("jwt");
  localStorage.removeItem("authToken");
  localStorage.removeItem("userId");

  window.location.href = "/login";
}

function escapeHtml(value: string) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlWithLineBreaks(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function getPrintDateLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function parseDesignJsonArray(
  value?: string | null,
): Record<string, unknown>[] {
  if (!value || typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null && !Array.isArray(item),
        )
      : [];
  } catch {
    return [];
  }
}

function getParsedDesignDocument(
  designDocument: DesignDocumentItem | null,
): ParsedDesignDocument {
  return {
    erdNodes: parseDesignJsonArray(designDocument?.erdNodesJson),
    erdEdges: parseDesignJsonArray(designDocument?.erdEdgesJson),
    flowNodes: parseDesignJsonArray(designDocument?.flowNodesJson),
    flowEdges: parseDesignJsonArray(designDocument?.flowEdgesJson),
  };
}

function getNodeData(node: Record<string, unknown>) {
  const data = node.data;

  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function getNodeLabel(node: Record<string, unknown>, fallback: string) {
  const data = getNodeData(node);
  const label = data.label ?? data.name ?? node.label ?? node.name;

  return typeof label === "string" && label.trim() ? label.trim() : fallback;
}

function getNodeSubText(node: Record<string, unknown>) {
  const data = getNodeData(node);
  const type = data.type;
  const techStack = data.techStack;

  const typeLabel =
    type === "client"
      ? "화면"
      : type === "server"
        ? "서버/API"
        : type === "db"
          ? "DB"
          : type === "external"
            ? "외부 서비스"
            : typeof type === "string" && type.trim()
              ? type.trim()
              : "설계 노드";

  const techText =
    typeof techStack === "string" && techStack.trim()
      ? techStack.trim()
      : "설명 없음";

  return `${typeLabel} · ${techText}`;
}

function getNodeColumns(node: Record<string, unknown>) {
  const data = getNodeData(node);
  const columns = data.columns;

  return Array.isArray(columns)
    ? columns.filter(
        (column): column is Record<string, unknown> =>
          typeof column === "object" &&
          column !== null &&
          !Array.isArray(column),
      )
    : [];
}

function getNodePosition(node: Record<string, unknown>, index: number) {
  const position = node.position;

  if (
    typeof position === "object" &&
    position !== null &&
    !Array.isArray(position)
  ) {
    const record = position as Record<string, unknown>;
    const x = Number(record.x);
    const y = Number(record.y);

    return {
      x: Number.isFinite(x) ? x : 120 + (index % 3) * 280,
      y: Number.isFinite(y) ? y : 100 + Math.floor(index / 3) * 190,
    };
  }

  return {
    x: 120 + (index % 3) * 280,
    y: 100 + Math.floor(index / 3) * 190,
  };
}

function getEdgeSourceTarget(edge: Record<string, unknown>) {
  const source = edge.source;
  const target = edge.target;

  return {
    source: typeof source === "string" ? source : "",
    target: typeof target === "string" ? target : "",
  };
}

function buildSvgPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  const midX = (sourceX + targetX) / 2;

  return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
}

type NormalizedDiagramNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  columns: Record<string, unknown>[];
  subText: string;
  /** 화면 흐름 상자 아랫줄에 쓰는 라우트 경로. */
  route: string;
  /** 시작 화면이면 설계단계처럼 초록 테두리를 두른다. */
  isEntry: boolean;
  /** 로그인이 필요한 화면인지. */
  requiresAuth: boolean;
  /** 화면 / 팝업 / 외부. */
  roleLabel: string;
  /** 이 화면이 만족시키는 요구사항 개수. */
  requirementCount: number;
  /** 이 화면이 부르는 API 이름들. */
  apiLabels: string[];
};

/** 설계단계 화면 상자에 찍히는 종류 이름. */
const SCREEN_ROLE_LABEL: Record<string, string> = {
  page: "화면",
  modal: "팝업",
  external: "외부",
};

/** 화면 흐름 노드가 실어 온 부가 정보를 상자에 쓸 모양으로 꺼낸다. */
function getScreenExtras(node: Record<string, unknown>) {
  const data = getNodeData(node);
  const role = typeof data.role === "string" ? data.role : "page";

  return {
    isEntry: Boolean(data.isEntry),
    requiresAuth: Boolean(data.requiresAuth),
    roleLabel: SCREEN_ROLE_LABEL[role] ?? role,
    requirementCount:
      typeof data.requirementCount === "number" ? data.requirementCount : 0,
    apiLabels: Array.isArray(data.apiLabels)
      ? data.apiLabels.filter(
          (label): label is string => typeof label === "string",
        )
      : [],
  };
}

function normalizeDiagramNodes(
  nodes: Record<string, unknown>[],
  type: "erd" | "flow",
): NormalizedDiagramNode[] {
  return nodes.map((node, index) => {
    const position = getNodePosition(node, index);

    return {
      id: String(node.id ?? `node-${index}`),
      label: getNodeLabel(
        node,
        type === "erd" ? `TABLE_${index + 1}` : `NODE_${index + 1}`,
      ),
      x: position.x,
      y: position.y,
      columns: getNodeColumns(node),
      subText: getNodeSubText(node),
      route: getFlowNodeTechStack(node),
      ...getScreenExtras(node),
    };
  });
}

function getDiagramLayout(
  nodes: NormalizedDiagramNode[],
  type: "erd" | "flow",
) {
  const nodeWidth = type === "erd" ? 248 : 236;
  const nodeHeight = type === "erd" ? 138 : 152;
  const padding = 80;

  if (nodes.length === 0) {
    return {
      nodes: [] as NormalizedDiagramNode[],
      width: 760,
      height: 420,
      nodeWidth,
      nodeHeight,
    };
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const maxY = Math.max(...nodes.map((node) => node.y));

  const offsetX = padding - minX;
  const offsetY = padding - minY;

  return {
    nodes: nodes.map((node) => ({
      ...node,
      x: node.x + offsetX,
      y: node.y + offsetY,
    })),
    width: Math.max(860, maxX - minX + nodeWidth + padding * 2),
    height: Math.max(460, maxY - minY + nodeHeight + padding * 2),
    nodeWidth,
    nodeHeight,
  };
}

/**
 * 인쇄용 화면 흐름 상자.
 *
 * 화면용 ScreenFlowNodeShape 와 같은 그림을 문자열 SVG 로 만든다.
 * 둘이 어긋나면 화면에서 본 것과 뽑은 PDF 가 달라진다.
 */
function buildPrintScreenNodeSvg(
  node: NormalizedDiagramNode,
  width: number,
  height: number,
) {
  const shownApis = node.apiLabels.slice(0, 3);
  const restApis = node.apiLabels.length - shownApis.length;

  const entrySvg = node.isEntry
    ? `<rect x="${node.x + 12}" y="${node.y + 12}" width="34" height="17" rx="6" fill="#ecfdf5" />
       <text x="${node.x + 29}" y="${node.y + 24}" text-anchor="middle" class="diagram-entry">시작</text>`
    : "";

  const authSvg = node.requiresAuth
    ? `<text x="${node.x + width - 14}" y="${node.y + 25}" text-anchor="end" class="diagram-chip-muted">로그인</text>`
    : "";

  const apiSvg = shownApis.length
    ? shownApis
        .map(
          (label, index) =>
            `<text x="${node.x + 14}" y="${node.y + 100 + index * 14}" class="diagram-api">${escapeHtml(label)}</text>`,
        )
        .join("")
    : `<text x="${node.x + 14}" y="${node.y + 100}" class="diagram-chip-muted">호출하는 API 없음</text>`;

  const restSvg =
    restApis > 0
      ? `<text x="${node.x + 14}" y="${node.y + 100 + shownApis.length * 14}" class="diagram-chip-muted">외 ${restApis}개</text>`
      : "";

  return `
    <g>
      <rect x="${node.x}" y="${node.y}" width="${width}" height="${height}" rx="16"
        fill="#ffffff" stroke="${node.isEntry ? "#34d399" : "#e5e7eb"}" stroke-width="${node.isEntry ? 2 : 1}" />
      ${entrySvg}
      <text x="${node.x + (node.isEntry ? 54 : 14)}" y="${node.y + 25}" class="diagram-title">${escapeHtml(node.label)}</text>
      ${authSvg}
      <line x1="${node.x}" y1="${node.y + 38}" x2="${node.x + width}" y2="${node.y + 38}" stroke="#eef1f4" />
      <text x="${node.x + 14}" y="${node.y + 56}" class="diagram-route">${escapeHtml(node.route)}</text>
      <rect x="${node.x + 14}" y="${node.y + 64}" width="62" height="17" rx="5"
        fill="${node.requirementCount === 0 ? "#fef2f2" : "#f1f5f9"}" />
      <text x="${node.x + 20}" y="${node.y + 76}" class="${node.requirementCount === 0 ? "diagram-chip-warn" : "diagram-chip"}">요구사항 ${node.requirementCount}</text>
      <rect x="${node.x + 82}" y="${node.y + 64}" width="34" height="17" rx="5" fill="#f1f5f9" />
      <text x="${node.x + 99}" y="${node.y + 76}" text-anchor="middle" class="diagram-chip">${escapeHtml(node.roleLabel)}</text>
      ${apiSvg}
      ${restSvg}
    </g>
  `;
}

function buildPrintDiagramSvg({
  nodes,
  edges,
  type,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  type: "erd" | "flow";
}) {
  if (nodes.length === 0) {
    return `<div class="empty small-empty">표시할 다이어그램이 없습니다.</div>`;
  }

  const layout = getDiagramLayout(normalizeDiagramNodes(nodes, type), type);
  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));
  const strokeColor = type === "erd" ? "#2563eb" : "#7c3aed";

  const edgeSvg = edges
    .map((edge) => {
      const { source, target } = getEdgeSourceTarget(edge);
      const sourceNode = nodeMap.get(source);
      const targetNode = nodeMap.get(target);

      if (!sourceNode || !targetNode) return "";

      const sourceX = sourceNode.x + layout.nodeWidth;
      const sourceY = sourceNode.y + layout.nodeHeight / 2;
      const targetX = targetNode.x;
      const targetY = targetNode.y + layout.nodeHeight / 2;

      // 화면 흐름에서는 "무엇을 했을 때 넘어가는가" 가 핵심 정보다.
      // 선만 그리면 그 정보가 그림에서 통째로 빠진다.
      const label = typeof edge.label === "string" ? edge.label.trim() : "";

      return `
        <path
          d="${buildSvgPath(sourceX, sourceY, targetX, targetY)}"
          fill="none"
          stroke="${strokeColor}"
          stroke-width="2"
          marker-end="url(#arrow-${type})"
        />
        ${
          label
            ? `<text x="${(sourceX + targetX) / 2}" y="${
                (sourceY + targetY) / 2 - 8
              }" class="diagram-edge-label" text-anchor="middle">${escapeHtml(label)}</text>`
            : ""
        }
      `;
    })
    .join("");

  const nodeSvg = layout.nodes
    .map((node) => {
      if (type === "erd") {
        const columnRows = node.columns.length
          ? node.columns
              .slice(0, 4)
              .map((column, columnIndex) => {
                const columnName =
                  typeof column.name === "string" ? column.name : "column";
                const columnType =
                  typeof column.type === "string" ? column.type : "TYPE";

                // 설계단계 표는 기본키에 열쇠, 외래키에 고리 표시를 붙인다.
                // 인쇄물은 아이콘을 쓸 수 없어 글자로 대신한다.
                const marker = column.isPk ? "PK " : column.isFk ? "FK " : "";

                return `
                  <text x="${node.x + 16}" y="${node.y + 74 + columnIndex * 18}" class="diagram-column">
                    ${escapeHtml(marker + columnName)} · ${escapeHtml(columnType)}
                  </text>
                `;
              })
              .join("")
          : `<text x="${node.x + 16}" y="${node.y + 78}" class="diagram-muted">컬럼 없음</text>`;

        return `
          <g>
            <rect x="${node.x}" y="${node.y}" width="${layout.nodeWidth}" height="${layout.nodeHeight}" rx="14" fill="#ffffff" stroke="#bfdbfe" />
            <rect x="${node.x}" y="${node.y}" width="${layout.nodeWidth}" height="42" rx="14" fill="#5873F9" />
            <text x="${node.x + 16}" y="${node.y + 27}" class="diagram-title diagram-white">${escapeHtml(node.label)}</text>
            ${columnRows}
          </g>
        `;
      }

      return buildPrintScreenNodeSvg(
        node,
        layout.nodeWidth,
        layout.nodeHeight,
      );
    })
    .join("");

  return `
    <div class="diagram-wrap">
      <svg viewBox="0 0 ${layout.width} ${layout.height}" class="diagram-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow-${type}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="${strokeColor}" />
          </marker>
          <pattern id="dot-grid-${type}" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#dbeafe" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#f8fbff" />
        <rect width="100%" height="100%" fill="url(#dot-grid-${type})" />
        ${edgeSvg}
        ${nodeSvg}
      </svg>
    </div>
  `;
}

function getColumnStringValue(
  column: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = column[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getColumnBooleanValue(
  column: Record<string, unknown>,
  keys: string[],
) {
  return keys.some((key) => column[key] === true || column[key] === "true");
}

function getFlowNodeType(node: Record<string, unknown>) {
  const data = getNodeData(node);
  const type = data.type ?? node.type;

  return typeof type === "string" && type.trim() ? type.trim() : "설계 노드";
}

function getFlowNodeTechStack(node: Record<string, unknown>) {
  const data = getNodeData(node);
  const techStack =
    data.techStack ?? data.description ?? data.memo ?? node.description;

  return typeof techStack === "string" && techStack.trim()
    ? techStack.trim()
    : getNodeSubText(node);
}

function buildErdTablesForDraft(erdNodes: Record<string, unknown>[]) {
  return erdNodes.map((node, index) => ({
    name: getNodeLabel(node, `TABLE_${index + 1}`),
    columns: getNodeColumns(node).map((column) => ({
      name: getColumnStringValue(column, "name", "column"),
      type: getColumnStringValue(column, "type", "TYPE"),
      pk: getColumnBooleanValue(column, ["pk", "primaryKey", "isPrimaryKey"]),
      fk: getColumnBooleanValue(column, ["fk", "foreignKey", "isForeignKey"]),
    })),
  }));
}

function buildFlowNodesForDraft(flowNodes: Record<string, unknown>[]) {
  return flowNodes.map((node, index) => ({
    label: getNodeLabel(node, `NODE_${index + 1}`),
    type: getFlowNodeType(node),
    techStack: getFlowNodeTechStack(node),
  }));
}

type ProjectDestination = "open" | "dashboard" | "schedule" | "devlog";

function getProjectMode(project: Project): "personal" | "team" {
  return project.type === "팀" ? "team" : "personal";
}

function rememberCurrentWorkspace(project: Project) {
  if (typeof window === "undefined") return;

  localStorage.setItem("currentWorkspaceId", project.workspaceId || project.id);
  localStorage.setItem("currentWorkspaceMode", getProjectMode(project));
}

function getProjectDestinationHref(
  project: Project,
  destination: ProjectDestination,
) {
  const workspaceId = encodeURIComponent(project.workspaceId || project.id);
  const mode = getProjectMode(project);

  if (destination === "dashboard") {
    return `/main/${workspaceId}?mode=${mode}`;
  }

  if (destination === "schedule") {
    return getScheduleHref(project.workspaceId || project.id, mode);
  }

  if (destination === "devlog") {
    return getDevlogHref(project.workspaceId || project.id);
  }

  return getAivsHref(project.workspaceId || project.id, mode);
}

function openProjectDestination(
  project: Project,
  destination: ProjectDestination,
) {
  rememberCurrentWorkspace(project);
  window.location.href = getProjectDestinationHref(project, destination);
}

export default function MyPageDemo() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [activeArchiveTab, setActiveArchiveTab] =
    useState<ArchiveTabKey>("devlog");
  const [keyword, setKeyword] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [devlogs, setDevlogs] = useState<Devlog[]>([]);

const [heatmapValues, setHeatmapValues] = useState<HeatmapLevel[]>(
  createEmptyHeatmapValues(),
);
const [activityHeatmap, setActivityHeatmap] =
  useState<ActivityHeatmapResponse>(createEmptyActivityHeatmap());
const [recentActivities, setRecentActivities] =
  useState<RecentActivityResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

const summary = useMemo(
  () =>
    buildActivitySummary(
      projects,
      devlogs.length,
      activityHeatmap.commitCount,
    ),
  [projects, devlogs.length, activityHeatmap.commitCount],
);

  useEffect(() => {
  let mounted = true;

  async function loadMyPage() {
    try {
      setLoading(true);
      setError("");

      const [
        profileDto,
        workspaceDtos,
        heatmapResult,
        recentActivityResult,
      ] = await Promise.all([
        fetchMyProfile(),
        fetchMyWorkspaces(),
        fetchMyActivityHeatmapApi(DEFAULT_HEATMAP_DAYS).catch((error) => {
          console.warn("[mypage activity heatmap] 활동 히트맵 요청 실패:", error);
          return createEmptyActivityHeatmap();
        }),
        fetchMyRecentActivitiesApi(6).catch((error) => {
          console.warn("[mypage recent activity] 최근 활동 요청 실패:", error);
          return [] as RecentActivityResponse[];
        }),
      ]);

      const scheduleProgressResults = await Promise.allSettled(
        workspaceDtos.map(async (workspace) => {
          const view = getScheduleViewFromWorkspace(workspace);
          const progress = await fetchScheduleProgress(view, workspace.id);

          return {
            workspaceId: workspace.id,
            progress,
          };
        }),
      );

      const scheduleProgressMap = new Map<string, ScheduleProgressResponse>();

      for (const result of scheduleProgressResults) {
        if (result.status === "fulfilled") {
          scheduleProgressMap.set(
            result.value.workspaceId,
            result.value.progress,
          );
        }
      }

      const failedScheduleRequests = scheduleProgressResults.filter(
        (result) => result.status === "rejected",
      );

      if (failedScheduleRequests.length > 0) {
        console.warn(
          "[mypage schedules] 일부 프로젝트 일정 진행률 요청 실패:",
          failedScheduleRequests,
        );
      }

      const devlogResults = await Promise.allSettled(
        workspaceDtos.map(async (workspace) => {
          const response = await fetchWorkspaceDevlogs(workspace.id);

          console.log(
            "[mypage devlogs] workspace:",
            workspace.name,
            response,
          );

          return mapDevlogsFromWorkspaceResponse(response, workspace);
        }),
      );

      const failedDevlogRequests = devlogResults.filter(
        (result) => result.status === "rejected",
      );

      if (failedDevlogRequests.length > 0) {
        console.warn(
          "[mypage devlogs] 일부 프로젝트 자료 요청 실패:",
          failedDevlogRequests,
        );
      }

      const nextDevlogs = devlogResults
        .filter(
          (result): result is PromiseFulfilledResult<Devlog[]> =>
            result.status === "fulfilled",
        )
        .flatMap((result) => result.value)
        .sort((a, b) => getDevlogSortTime(b) - getDevlogSortTime(a));

      const nextProjects = mapProjectsFromWorkspaces(
        workspaceDtos,
        scheduleProgressMap,
      );

      const projectsWithDevlogCount = applyDevlogCountToProjects(
        nextProjects,
        nextDevlogs,
      );

      if (!mounted) return;

      setUser(mapUser(profileDto));
      setProjects(projectsWithDevlogCount);
      setDevlogs(nextDevlogs);
      setActivityHeatmap(heatmapResult);
      setHeatmapValues(mapHeatmapValuesFromResponse(heatmapResult));
      setRecentActivities(recentActivityResult);
    } catch (error) {
      if (!mounted) return;

      setError(
        error instanceof Error
          ? error.message
          : "마이페이지 정보를 불러오지 못했습니다.",
      );
    } finally {
      if (mounted) setLoading(false);
    }
  }

  loadMyPage();

  return () => {
    mounted = false;
  };
}, []);

if (loading) {
  return (
    <main className="waivs-page min-h-[calc(100dvh-72px)] p-5 text-slate-950">
      <section className="waivs-panel flex min-h-[320px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#5873F9]" />
          마이페이지 정보를 불러오는 중입니다.
        </div>
      </section>
    </main>
  );
}

if (error || !user) {
  return (
    <main className="waivs-page min-h-[calc(100dvh-72px)] p-5 text-slate-950">
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
        {error || "사용자 정보를 불러오지 못했습니다."}
      </section>
    </main>
  );
}

return (
  <main className="waivs-page min-h-[calc(100dvh-72px)] text-slate-950">
    <div className="w-full p-4 md:p-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="self-start xl:sticky xl:top-5 xl:h-[calc(100dvh-112px)] xl:min-h-[620px]">
          <section className="waivs-sidebar flex min-h-[620px] flex-col overflow-hidden xl:h-full xl:min-h-0">
            <div className="shrink-0 border-b border-[var(--waivs-border-soft)] px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5873F9]">
                My Page
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                나의 작업 공간
              </p>
            </div>
            
            <nav className="flex-1 p-3">
              <div className="space-y-1.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  const hasChildren = Boolean(tab.children?.length);
                  const isArchiveOpen = tab.key === "devlogs" && isActive;

                  return (
                    <div key={tab.key}>
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={[
                          "flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition",
                          isActive
                            ? "bg-[#EEF3FF] text-[#5873F9]"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "grid h-8 w-8 shrink-0 place-items-center rounded-lg transition",
                            isActive
                              ? "bg-white text-[#5873F9] shadow-sm"
                              : "bg-slate-50 text-slate-500",
                          ].join(" ")}
                        >
                          <Icon size={15} />
                        </span>

                        <span
                          className={[
                            "min-w-0 flex-1 truncate text-sm font-black",
                            isActive ? "text-[#5873F9]" : "text-slate-800",
                          ].join(" ")}
                        >
                          {tab.label}
                        </span>

                        {hasChildren && (
                          <ChevronDown
                            size={14}
                            className={[
                              "shrink-0 transition-transform",
                              isArchiveOpen ? "rotate-0" : "-rotate-90",
                              isActive ? "text-[#5873F9]" : "text-slate-400",
                            ].join(" ")}
                          />
                        )}
                      </button>

                      {hasChildren && isArchiveOpen && (
                        <div className="ml-[28px] mt-1.5 space-y-1 border-l border-[var(--waivs-border-soft)] pl-3">
                          {tab.children?.map((child) => {
                            const ChildIcon = child.icon;
                            const isChildActive = activeArchiveTab === child.key;

                            return (
                              <button
                                key={child.key}
                                type="button"
                                onClick={() => {
                                  setActiveTab("devlogs");
                                  setActiveArchiveTab(child.key);
                                }}
                                className={[
                                  "flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left transition",
                                  isChildActive
                                    ? "bg-[#EEF3FF] text-[#5873F9]"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                                ].join(" ")}
                              >
                                <ChildIcon size={12} />
                                <span className="truncate text-xs font-black">
                                  {child.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </nav>

            <div className="mt-auto shrink-0 border-t border-[var(--waivs-border-soft)] p-3">
              <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#EEF3FF] text-xs font-black text-[#5873F9]">
                  {user.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.profileImageUrl}
                      alt="profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    user.nickname.slice(0, 1)
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black text-slate-800">
                    {user.nickname}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </div>
          </section>
        </aside>

        <section className="min-w-0">
          {activeTab === "overview" && (
            <OverviewSection
              user={user}
              projects={projects}
              summary={summary}
              recentActivities={recentActivities}
              heatmapValues={heatmapValues}
              activityHeatmap={activityHeatmap}
              onOpenProjects={() => setActiveTab("progress")}
              onOpenAccount={() => setActiveTab("account")}
            />
          )}

          {activeTab === "progress" && (
            <MyProjectsSection
              projects={projects}
              keyword={keyword}
              onKeywordChange={setKeyword}
              onOpenArchive={(project) => {
                rememberCurrentWorkspace(project);
                setActiveArchiveTab("devlog");
                setActiveTab("devlogs");
              }}
            />
          )}

          {activeTab === "devlogs" && (
            <ProjectArchiveSection
              devlogs={devlogs}
              projects={projects}
              keyword={keyword}
              onKeywordChange={setKeyword}
              activeArchiveTab={activeArchiveTab}
              onActiveArchiveTabChange={setActiveArchiveTab}
            />
          )}

          {activeTab === "github" && <GithubSection />}

          {activeTab === "account" && (
            <AccountSection user={user} onUserChange={setUser} />
          )}
        </section>
      </div>
    </div>
  </main>
);
}

function OverviewSection({
  user,
  projects,
  summary,
  recentActivities,
  heatmapValues,
  activityHeatmap,
  onOpenProjects,
  onOpenAccount,
}: {
  user: User;
  projects: Project[];
  summary: ActivitySummary;
  recentActivities: RecentActivityResponse[];
  heatmapValues: HeatmapLevel[];
  activityHeatmap: ActivityHeatmapResponse;
  onOpenProjects: () => void;
  onOpenAccount: () => void;
}) {
  const totalProjectCount =
    summary.progressProjectCount + summary.completedProjectCount;

  return (
    <div className="space-y-4">
      <section className="waivs-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--waivs-border-soft)] px-4 py-3.5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#EEF3FF] text-sm font-black text-[#5873F9]">
              {user.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profileImageUrl}
                  alt="profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                user.nickname.slice(0, 1)
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-base font-black text-slate-950">
                  {user.nickname}
                </p>
                <span className="rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[9px] font-black text-[#5873F9]">
                  MY WORKSPACE
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-500">
              참여 프로젝트 <strong className="text-slate-800">{totalProjectCount}개</strong>
            </span>
            <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] font-bold text-slate-500">
              가입일 <strong className="text-slate-800">{formatDateLabel(user.createdAt)}</strong>
            </span>
            <button
              type="button"
              onClick={onOpenAccount}
              className="h-8 rounded-lg border border-[var(--waivs-border)] bg-white px-3 text-[10px] font-black text-slate-600 transition hover:bg-slate-50"
            >
              계정 설정
            </button>
          </div>
        </div>

        <div className="px-4 py-3.5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#5873F9]">
                Overview
              </p>
              <h2 className="mt-0.5 text-lg font-black tracking-tight text-slate-950">
                개발 활동 요약
              </h2>
            </div>
            <p className="hidden text-[11px] font-medium text-slate-400 md:block">
              내 프로젝트와 개발 활동을 한눈에 확인합니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <ActivityCard
              label="내 프로젝트"
              value={`${totalProjectCount}개`}
              icon={FolderKanban}
              description="전체 참여 프로젝트"
            />
            <ActivityCard
              label="완료 일정"
              value={`${summary.doneScheduleCount}개`}
              icon={CheckCircle2}
              description="DONE 상태"
            />
            <ActivityCard
              label="개발일지"
              value={`${summary.devlogCount}개`}
              icon={BookOpen}
              description="작성 기록"
            />
            <ActivityCard
              label="GitHub 커밋"
              value={`${summary.commitCount}개`}
              icon={Github}
              description="연동 활동"
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.25fr_0.75fr]">
        <RecentProjectsPanel
          projects={projects}
          onOpenAll={onOpenProjects}
        />
        <RecentActivitySection activities={recentActivities} />
      </div>

      <HeatmapSection
        heatmapValues={heatmapValues}
        activityHeatmap={activityHeatmap}
      />
    </div>
  );
}

function RecentProjectsPanel({
  projects,
  onOpenAll,
}: {
  projects: Project[];
  onOpenAll: () => void;
}) {
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 4);
  }, [projects]);

  return (
    <>
      <section className="waivs-panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--waivs-border-soft)] px-4 py-3.5">
          <div>
            <h3 className="text-sm font-black text-slate-950">최근 프로젝트</h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              최근 수정한 프로젝트를 빠르게 이어서 작업합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAll}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[10px] font-black text-[#5873F9] transition hover:bg-[#EEF3FF]"
          >
            전체 보기
            <ArrowUpRight size={12} />
          </button>
        </div>

        {recentProjects.length === 0 ? (
          <div className="p-4">
            <EmptyState message="참여 중인 프로젝트가 없습니다." />
          </div>
        ) : (
          <div className="divide-y divide-[var(--waivs-border-soft)]">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col gap-3 px-4 py-3 transition hover:bg-slate-50/60 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EEF3FF] text-[#5873F9]">
                    <FolderKanban size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-slate-900">
                        {project.name}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">
                        {project.type} · {project.workspaceRole.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 min-w-[90px] max-w-[180px] flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#5873F9]"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-500">
                        {project.progress}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDetailProject(project)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--waivs-border)] bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label="프로젝트 정보"
                  >
                    <Info size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openProjectDestination(project, "open")}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#5873F9] px-3 text-[10px] font-black text-white transition hover:bg-[#4863E8]"
                  >
                    열기
                    <ArrowUpRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {detailProject && (
        <ProjectInfoModal
          project={detailProject}
          onClose={() => setDetailProject(null)}
        />
      )}
    </>
  );
}

function formatRecentActivityDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getRecentActivityIcon(type: RecentActivityResponse["type"]) {
  if (type === "DEVLOG_CREATED") {
    return FileText;
  }

  if (type === "SCHEDULE_COMPLETED") {
    return CheckCircle2;
  }

  return Github;
}

function RecentActivitySection({
  activities,
}: {
  activities: RecentActivityResponse[];
}) {
  return (
    <section className="waivs-panel overflow-hidden">
      <div className="border-b border-[var(--waivs-border-soft)] px-4 py-3.5">
        <h3 className="text-sm font-black text-slate-950">최근 활동</h3>
        <p className="mt-0.5 text-[11px] font-medium text-slate-400">
          개발일지, 일정 완료, GitHub 커밋 활동을 최신순으로 표시합니다.
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs font-bold text-slate-400">
          아직 표시할 활동이 없습니다.
        </div>
      ) : (
        <div className="divide-y divide-[var(--waivs-border-soft)] px-4">
          {activities.map((activity) => {
            const Icon = getRecentActivityIcon(activity.type);

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 py-3"
              >
                <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#EEF3FF] text-[#5873F9]">
                  <Icon size={12} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-800">
                    {activity.title}
                  </p>

                  <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
                    {activity.description}
                  </p>
                </div>

                <span className="shrink-0 text-[9px] font-bold text-slate-400">
                  {formatRecentActivityDate(activity.occurredAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MyProjectsSection({
  projects,
  keyword,
  onKeywordChange,
  onOpenArchive,
}: {
  projects: Project[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  onOpenArchive: (project: Project) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<ProjectTypeFilter>("all");
  const [projectSortType, setProjectSortType] = useState<DevlogSortType>("latest");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "team" && project.type === "팀") ||
        (typeFilter === "personal" && project.type === "개인");

      const matchesKeyword =
        !normalizedKeyword ||
        project.name.toLowerCase().includes(normalizedKeyword) ||
        (project.description || "").toLowerCase().includes(normalizedKeyword) ||
        (project.language || "").toLowerCase().includes(normalizedKeyword);

      return matchesStatus && matchesType && matchesKeyword;
    });
  }, [projects, keyword, statusFilter, typeFilter]);

  const activeCount = projects.filter((project) => project.status === "active").length;
  const completedCount = projects.filter(
    (project) => project.status === "completed",
  ).length;

  return (
    <>
      <section className="waivs-panel overflow-visible">
  <div className="flex flex-col gap-3 px-5 py-4 xl:flex-row xl:items-end xl:justify-between">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#5873F9]">
        My Projects
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-black tracking-tight text-slate-950">
          내 프로젝트
        </h2>

        <span className="rounded-full bg-[#EEF3FF] px-2.5 py-1 text-[10px] font-black text-[#5873F9]">
          {projects.length}개
        </span>
      </div>

      <p className="mt-1 text-xs font-medium text-slate-500">
        참여 중인 프로젝트를 확인하고 필요한 작업 화면으로 바로 이동합니다.
      </p>
    </div>

    <div className="flex w-full items-center gap-2 xl:w-auto">
      <div className="relative w-full xl:w-[250px]">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="프로젝트 검색"
          className="h-10 w-full rounded-xl border border-[var(--waivs-border)] bg-white pl-10 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
        />
      </div>

      <div className="relative shrink-0">
        <Filter
          size={13}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <select
          value={projectSortType}
          onChange={(event) =>
            setProjectSortType(event.target.value as DevlogSortType)
          }
          className="h-10 shrink-0 rounded-xl border border-[var(--waivs-border)] bg-white pl-8 pr-8 text-sm font-bold text-slate-600 outline-none focus:border-[#5873F9]"
        >
          <option value="latest">최신순</option>
          <option value="oldest">오래된순</option>
        </select>
      </div>
    </div>
  </div>

        <div className="flex flex-col gap-3 border-y border-[var(--waivs-border-soft)] bg-slate-50/50 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all" as const, label: "전체", count: projects.length },
              { key: "active" as const, label: "진행 중", count: activeCount },
              { key: "completed" as const, label: "완료", count: completedCount },
            ].map((filter) => {
              const active = statusFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={[
                    "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-black transition",
                    active
                      ? "bg-[#5873F9] text-white"
                      : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                  ].join(" ")}
                >
                  {filter.label}
                  <span
                    className={[
                      "rounded-full px-1.5 py-0.5 text-[9px]",
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { key: "all" as const, label: "전체 구분" },
              { key: "personal" as const, label: "개인" },
              { key: "team" as const, label: "팀" },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setTypeFilter(filter.key)}
                className={[
                  "h-8 rounded-lg border px-3 text-[10px] font-black transition",
                  typeFilter === filter.key
                    ? "border-[#BFCBFF] bg-[#EEF3FF] text-[#5873F9]"
                    : "border-[var(--waivs-border)] bg-white text-slate-500 hover:bg-slate-50",
                ].join(" ")}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {filteredProjects.length === 0 ? (
            <EmptyState message="조건에 맞는 프로젝트가 없습니다." />
          ) : (
            <div className="overflow-visible rounded-xl border border-[var(--waivs-border)] bg-white">
              <div className="hidden grid-cols-[minmax(0,1.5fr)_110px_130px_150px_118px] border-b border-[var(--waivs-border-soft)] bg-slate-50 px-4 py-3 text-[10px] font-black text-slate-500 md:grid">
                <span>프로젝트</span>
                <span>구분 / 권한</span>
                <span>진행률</span>
                <span>활동</span>
                <span className="text-right">작업</span>
              </div>

              <div className="divide-y divide-[var(--waivs-border-soft)]">
                {filteredProjects.map((project) => (
                  <ProjectListRow
                    key={project.id}
                    project={project}
                    menuOpen={openMenuId === project.id}
                    onToggleMenu={() =>
                      setOpenMenuId((current) =>
                        current === project.id ? null : project.id,
                      )
                    }
                    onCloseMenu={() => setOpenMenuId(null)}
                    onOpenInfo={() => {
                      setOpenMenuId(null);
                      setDetailProject(project);
                    }}
                    onOpenArchive={() => {
                      setOpenMenuId(null);
                      onOpenArchive(project);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {detailProject && (
        <ProjectInfoModal
          project={detailProject}
          onClose={() => setDetailProject(null)}
        />
      )}
    </>
  );
}

function ProjectListRow({
  project,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onOpenInfo,
  onOpenArchive,
}: {
  project: Project;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onOpenInfo: () => void;
  onOpenArchive: () => void;
}) {
  const isCompleted = project.status === "completed";
  const isTeam = project.type === "팀";
  const isTeamOwner = isTeam && project.workspaceRole === "owner";

  return (
    <article className="grid grid-cols-1 gap-3 px-4 py-3.5 transition hover:bg-slate-50/60 md:grid-cols-[minmax(0,1.5fr)_110px_130px_150px_118px] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="truncate text-sm font-black text-slate-950">
            {project.name}
          </h4>
          <span
            className={[
              "rounded-full px-2 py-0.5 text-[9px] font-black",
              isCompleted
                ? "bg-emerald-50 text-emerald-600"
                : "bg-[#EEF3FF] text-[#5873F9]",
            ].join(" ")}
          >
            {isCompleted ? "완료" : "진행 중"}
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
          {project.description || "설명이 없습니다."}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">
            {project.language || "Unknown"}
          </span>
          <span className="text-[9px] font-bold text-slate-400">
            최근 수정 {formatDateLabel(project.updatedAt)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 md:block">
        <span className="text-[10px] font-black text-slate-400 md:hidden">구분 / 권한</span>
        <div className="flex flex-wrap gap-1">
          <span
            className={[
              "rounded-full px-2 py-1 text-[9px] font-black",
              isTeam
                ? "bg-violet-50 text-violet-600"
                : "bg-[#EEF3FF] text-[#5873F9]",
            ].join(" ")}
          >
            {project.type}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">
            {project.workspaceRole.toUpperCase()}
          </span>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-black">
          <span className="text-slate-400 md:hidden">진행률</span>
          <span className="text-slate-700">{project.progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#5873F9]"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between md:block">
        <span className="text-[10px] font-black text-slate-400 md:hidden">활동</span>
        <div className="space-y-1 text-[10px] font-bold text-slate-500">
          <p>
            일정 <strong className="text-slate-800">{project.doneScheduleCount}/{project.scheduleTotalCount}</strong>
          </p>
          <p>
            개발일지 <strong className="text-slate-800">{project.devlogCount}개</strong>
          </p>
        </div>
      </div>

      <div className="relative flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => openProjectDestination(project, "open")}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#5873F9] px-3 text-[10px] font-black text-white transition hover:bg-[#4863E8]"
        >
          열기
          <ArrowUpRight size={11} />
        </button>

        <button
          type="button"
          onClick={onToggleMenu}
          className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--waivs-border)] bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          aria-label="프로젝트 메뉴"
        >
          <MoreHorizontal size={15} />
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="메뉴 닫기"
              className="fixed inset-0 z-20 cursor-default"
              onClick={onCloseMenu}
            />
            <div className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-xl border border-[var(--waivs-border)] bg-white py-1 shadow-xl">
              <ProjectMenuButton icon={Info} label="프로젝트 정보" onClick={onOpenInfo} />
              <ProjectMenuButton
                icon={LayoutDashboard}
                label="대시보드"
                onClick={() => openProjectDestination(project, "dashboard")}
              />
              <ProjectMenuButton
                icon={CalendarDays}
                label="일정관리"
                onClick={() => openProjectDestination(project, "schedule")}
              />
              <ProjectMenuButton
                icon={FileText}
                label="개발일지"
                onClick={() => openProjectDestination(project, "devlog")}
              />
              <ProjectMenuButton icon={BookOpen} label="자료실 보기" onClick={onOpenArchive} />

              {isTeamOwner && (
                <>
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-300"
                    title="팀원 관리 화면 연결 전"
                  >
                    <Users size={13} />
                    팀원 관리 · 준비 중
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}

function ProjectMenuButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
    >
      <Icon size={13} className="text-slate-400" />
      {label}
    </button>
  );
}

function ProjectInfoModal({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const isTeamOwner = project.type === "팀" && project.workspaceRole === "owner";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#EEF3FF] text-[#5873F9]">
              <FolderKanban size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#5873F9]">
                Project Info
              </p>
              <h3 className="mt-0.5 truncate text-base font-black text-slate-950">
                {project.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm font-medium leading-6 text-slate-500">
            {project.description || "등록된 프로젝트 설명이 없습니다."}
          </p>

          <div className="mt-4 grid overflow-hidden rounded-xl border border-[var(--waivs-border)] sm:grid-cols-2">
            <ProjectInfoCell label="구분" value={project.type} />
            <ProjectInfoCell label="내 권한" value={project.workspaceRole.toUpperCase()} />
            <ProjectInfoCell label="진행 상태" value={project.status === "completed" ? "완료" : "진행 중"} />
            <ProjectInfoCell label="진행률" value={`${project.progress}%`} />
            <ProjectInfoCell label="완료 일정" value={`${project.doneScheduleCount}/${project.scheduleTotalCount}개`} />
            <ProjectInfoCell label="개발일지" value={`${project.devlogCount}개`} />
            <ProjectInfoCell label="대표 언어" value={project.language || "Unknown"} />
            <ProjectInfoCell label="최근 수정" value={formatDateLabel(project.updatedAt)} />
          </div>

          {project.stack.length > 0 && (
            <div className="mt-4 rounded-xl border border-[var(--waivs-border)] px-4 py-3">
              <p className="text-[10px] font-black text-slate-400">기술 스택</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.stack.map((stack) => (
                  <span
                    key={stack}
                    className="rounded-full bg-[#EEF3FF] px-2.5 py-1 text-[10px] font-black text-[#5873F9]"
                  >
                    {stack}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isTeamOwner && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-white text-violet-600">
                  <Users size={14} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800">팀 프로젝트 OWNER</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                    추후 팀원 초대·권한 관리 기능을 이 영역에 연결할 수 있습니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="h-8 shrink-0 cursor-not-allowed rounded-lg border border-violet-100 bg-white px-3 text-[10px] font-black text-violet-300"
              >
                팀원 관리 준비 중
              </button>
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-xl border border-[var(--waivs-border)] bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => openProjectDestination(project, "dashboard")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#D9E1FF] bg-white px-4 text-xs font-black text-[#5873F9] transition hover:bg-[#F7F9FF]"
            >
              대시보드
              <ExternalLink size={12} />
            </button>
            <button
              type="button"
              onClick={() => openProjectDestination(project, "open")}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8]"
            >
              프로젝트 열기
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectInfoCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 sm:border-r">
      <span className="text-[10px] font-bold text-slate-400">{label}</span>
      <span className="truncate text-xs font-black text-slate-700">{value}</span>
    </div>
  );
}

function DevlogPreviewSection({ devlogs }: { devlogs: Devlog[] }) {
  const previewDevlogs = devlogs.slice(0, 2);

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-black tracking-tight">최근 자료</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          최근 작성된 자료 2개만 표시합니다.
        </p>
      </div>

      {previewDevlogs.length === 0 ? (
        <EmptyState message="표시할 자료가 없습니다." />
      ) : (
        <div className="space-y-2.5">
          {previewDevlogs.map((devlog) => (
            <DevlogCard key={devlog.id} devlog={devlog} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectArchiveSection({
  devlogs,
  projects,
  keyword,
  onKeywordChange,
  activeArchiveTab,
  onActiveArchiveTabChange,
}: {
  devlogs: Devlog[];
  projects: Project[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  activeArchiveTab: ArchiveTabKey;
  onActiveArchiveTabChange: (value: ArchiveTabKey) => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [sortType, setSortType] = useState<DevlogSortType>("latest");
  const [finalReportDraft, setFinalReportDraft] = useState("");
  const [finalReportLoading, setFinalReportLoading] = useState(false);
  const [finalReportError, setFinalReportError] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [dateFilterMode, setDateFilterMode] =
    useState<"single" | "range">("single");

  const [selectedDate, setSelectedDate] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [designRequirements, setDesignRequirements] = useState<
    DesignRequirementItem[]
  >([]);
  const [designApiSpecs, setDesignApiSpecs] = useState<DesignApiSpecItem[]>([]);
  const [designDocument, setDesignDocument] =
    useState<DesignDocumentItem | null>(null);
  const [designLoading, setDesignLoading] = useState(false);
  const [designError, setDesignError] = useState("");

  const projectOptions = useMemo(() => {
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
    }));
  }, [projects]);

  useEffect(() => {
    if (projectOptions.length === 0) {
      if (selectedProjectId) setSelectedProjectId("");
      return;
    }

    const exists = projectOptions.some(
      (project) => project.id === selectedProjectId,
    );

    if (!selectedProjectId || !exists) {
      const storedWorkspaceId =
        typeof window !== "undefined"
          ? localStorage.getItem("currentWorkspaceId")
          : null;

      const preferredProject = storedWorkspaceId
        ? projectOptions.find(
            (project) => String(project.id) === String(storedWorkspaceId),
          )
        : null;

      setSelectedProjectId(preferredProject?.id ?? projectOptions[0].id);
    }
  }, [projectOptions, selectedProjectId]);

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const selectedDesignWorkspaceId =
    selectedProject?.workspaceId || selectedProject?.id || "";

  const parsedDesignDocument = useMemo(
    () => getParsedDesignDocument(designDocument),
    [designDocument],
  );

  useEffect(() => {
    setFinalReportDraft("");
    setFinalReportError("");
  }, [selectedProjectId]);

  useEffect(() => {
    let mounted = true;

    async function loadDesignArchive() {
      if (activeArchiveTab !== "design" && activeArchiveTab !== "final") return;

      if (!selectedDesignWorkspaceId) {
        setDesignRequirements([]);
        setDesignApiSpecs([]);
        setDesignDocument(null);
        return;
      }

      try {
        setDesignLoading(true);
        setDesignError("");

        const [requirementsResult, apiSpecsResult, designDocumentResult] =
          await Promise.allSettled([
            fetchWorkspaceRequirementsApi(selectedDesignWorkspaceId),
            fetchWorkspaceApiSpecsApi(selectedDesignWorkspaceId),
            fetchWorkspaceDesignDocumentApi(selectedDesignWorkspaceId),
          ]);

        if (!mounted) return;

        if (requirementsResult.status === "fulfilled") {
          setDesignRequirements(
            Array.isArray(requirementsResult.value)
              ? requirementsResult.value
              : [],
          );
        } else {
          setDesignRequirements([]);
        }

        if (apiSpecsResult.status === "fulfilled") {
          setDesignApiSpecs(
            Array.isArray(apiSpecsResult.value) ? apiSpecsResult.value : [],
          );
        } else {
          setDesignApiSpecs([]);
        }

        if (designDocumentResult.status === "fulfilled") {
          setDesignDocument(designDocumentResult.value ?? null);
        } else {
          setDesignDocument(null);
        }

        const failedCount = [
          requirementsResult,
          apiSpecsResult,
          designDocumentResult,
        ].filter((result) => result.status === "rejected").length;

        if (failedCount > 0) {
          setDesignError(
            "일부 설계 문서를 불러오지 못했습니다. 저장된 항목만 표시합니다.",
          );
        }
      } catch (error) {
        if (!mounted) return;

        setDesignRequirements([]);
        setDesignApiSpecs([]);
        setDesignDocument(null);
        setDesignError(
          error instanceof Error
            ? error.message
            : "설계 문서를 불러오지 못했습니다.",
        );
      } finally {
        if (mounted) setDesignLoading(false);
      }
    }

    loadDesignArchive();

    return () => {
      mounted = false;
    };
  }, [activeArchiveTab, selectedDesignWorkspaceId]);

  const filteredDevlogs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return devlogs
      .filter((devlog) => {
        const matchesProject =
          String(devlog.projectId ?? "") === selectedProjectId ||
          String(devlog.workspaceId ?? "") === selectedProjectId;

        const matchesKeyword =
          !normalizedKeyword ||
          devlog.title.toLowerCase().includes(normalizedKeyword) ||
          devlog.summary.toLowerCase().includes(normalizedKeyword) ||
          devlog.projectName.toLowerCase().includes(normalizedKeyword);

        return matchesProject && matchesKeyword;
      })
      .sort((a, b) => {
        const aTime = getDevlogSortTime(a);
        const bTime = getDevlogSortTime(b);

        return sortType === "latest" ? bTime - aTime : aTime - bTime;
      });
  }, [devlogs, keyword, selectedProjectId, sortType]);

  const archiveTabs: {
    key: ArchiveTabKey;
    label: string;
    description: string;
    icon: React.ElementType;
  }[] = [
    {
      key: "devlog",
      label: "개발일지",
      description: "작성 기록 문서화",
      icon: BookOpen,
    },
    {
      key: "design",
      label: "설계 문서",
      description: "요구사항·ERD·화면 흐름",
      icon: Code2,
    },
    {
      key: "final",
      label: "최종 보고서",
      description: "AI 초안 생성",
      icon: Sparkles,
    },
  ];

  const activeArchive = archiveTabs.find((tab) => tab.key === activeArchiveTab);

  const handlePrintPdf = () => {
    const printWindow = window.open("", "_blank", "width=920,height=1000");

    if (!printWindow) {
      alert("팝업이 차단되어 PDF 저장 창을 열 수 없습니다.");
      return;
    }

    const documentTitle = activeArchive?.label ?? "프로젝트 자료실";
    const selectedProjectName = selectedProject?.name || "선택된 프로젝트";

    const printBody = (() => {
      if (activeArchiveTab === "devlog") {
        if (filteredDevlogs.length === 0) {
          return `<div class="empty">조건에 맞는 개발일지가 없습니다.</div>`;
        }

        return filteredDevlogs
          .map(
            (devlog, index) => `
              <article class="print-card">
                <div class="print-card-header">
                  <span class="index">${index + 1}</span>
                  <div>
                    <h2>${escapeHtml(devlog.title)}</h2>
                    <p class="meta">${escapeHtml(devlog.projectName)} · ${escapeHtml(devlog.date)}</p>
                  </div>
                </div>
                <p class="body-text">${escapeHtmlWithLineBreaks(devlog.summary)}</p>
              </article>
            `,
          )
          .join("");
      }

      if (activeArchiveTab === "design") {
        const erdTables = parsedDesignDocument.erdNodes;
        const flowNodes = parsedDesignDocument.flowNodes;

        const requirementHtml = designRequirements.length
          ? designRequirements
              .map(
                (item, index) => `
                  <article class="print-card compact-card">
                    <div class="print-card-header">
                      <span class="index">${index + 1}</span>
                      <div>
                        <h2>${escapeHtml(item.name || "이름 없는 요구사항")}</h2>
                        <p class="meta">${escapeHtml(item.category || "기본")}</p>
                      </div>
                    </div>
                    <p class="body-text">${escapeHtmlWithLineBreaks(item.description || "설명이 없습니다.")}</p>
                  </article>
                `,
              )
              .join("")
          : `<div class="empty small-empty">작성된 요구사항이 없습니다.</div>`;

        const apiHtml = designApiSpecs.length
          ? designApiSpecs
              .map(
                (item) => `
          <article class="print-card compact-card">
            <h2>
              <span class="method">${escapeHtml(item.method || "GET")}</span>
              ${escapeHtml(item.endpoint || "/api/example")}
            </h2>
            <p class="body-text">${escapeHtmlWithLineBreaks(
              item.description || "설명이 없습니다.",
            )}</p>

            <div class="api-payload-grid">
              <div>
                <p class="payload-title">요청 데이터</p>
                <pre class="code-block">${escapeHtml(
                  formatApiPayload(item.request),
                )}</pre>
              </div>

              <div>
                <p class="payload-title">응답 데이터</p>
                <pre class="code-block">${escapeHtml(
                  formatApiPayload(item.response),
                )}</pre>
              </div>
            </div>
          </article>
        `,
              )
              .join("")
          : `<div class="empty small-empty">작성된 API 명세가 없습니다.</div>`;
        const erdDiagramHtml = buildPrintDiagramSvg({
          nodes: erdTables,
          edges: parsedDesignDocument.erdEdges,
          type: "erd",
        });

        const flowDiagramHtml = buildPrintDiagramSvg({
          nodes: flowNodes,
          edges: parsedDesignDocument.flowEdges,
          type: "flow",
        });

        const erdHtml = erdTables.length
          ? erdTables
              .map((node, index) => {
                const columns = getNodeColumns(node);

                return `
                  <article class="print-card compact-card">
                    <div class="print-card-header">
                      <span class="index">${index + 1}</span>
                      <div>
                        <h2>${escapeHtml(getNodeLabel(node, `TABLE_${index + 1}`))}</h2>
                        <p class="meta">컬럼 ${columns.length}개</p>
                      </div>
                    </div>
                    <p class="body-text">${
                      columns.length
                        ? columns
                            .slice(0, 8)
                            .map((column) => {
                              const name =
                                typeof column.name === "string"
                                  ? column.name
                                  : "column";
                              const type =
                                typeof column.type === "string"
                                  ? column.type
                                  : "TYPE";

                              return `${escapeHtml(name)} (${escapeHtml(type)})`;
                            })
                            .join(", ")
                        : "컬럼이 없습니다."
                    }</p>
                  </article>
                `;
              })
              .join("")
          : `<div class="empty small-empty">작성된 ERD 테이블이 없습니다.</div>`;

        const flowHtml = flowNodes.length
          ? flowNodes
              .map(
                (node, index) => `
                  <article class="print-card compact-card">
                    <div class="print-card-header">
                      <span class="index">${index + 1}</span>
                      <div>
                        <h2>${escapeHtml(getNodeLabel(node, `NODE_${index + 1}`))}</h2>
                        <p class="meta">${escapeHtml(getNodeSubText(node))}</p>
                      </div>
                    </div>
                  </article>
                `,
              )
              .join("")
          : `<div class="empty small-empty">작성된 화면 흐름이 없습니다.</div>`;

        return `
          <section class="print-section">
            <h2 class="section-title">1. 요구사항 정의</h2>
            ${requirementHtml}
          </section>
          <section class="print-section">
            <h2 class="section-title">2. API 명세</h2>
            ${apiHtml}
          </section>
          <section class="print-section">
            <h2 class="section-title">3. ERD</h2>
            <p class="body-text section-description">설계단계에서 작성한 테이블과 관계선을 시각화한 다이어그램입니다.</p>
            ${erdDiagramHtml}
            ${erdHtml}
          </section>
          <section class="print-section">
            <h2 class="section-title">4. 화면 흐름</h2>
            <p class="body-text section-description">설계단계에서 작성한 화면 사이의 이동 흐름을 시각화한 다이어그램입니다.</p>
            ${flowDiagramHtml}
            ${flowHtml}
          </section>
        `;
      }

      const reportContent =
        finalReportDraft.trim() ||
        "AI 초안 생성 버튼을 눌러 최종 보고서 초안을 생성한 뒤 PDF로 저장할 수 있습니다.";

      const finalErdDiagramHtml = buildPrintDiagramSvg({
        nodes: parsedDesignDocument.erdNodes,
        edges: parsedDesignDocument.erdEdges,
        type: "erd",
      });

      const finalFlowDiagramHtml = buildPrintDiagramSvg({
        nodes: parsedDesignDocument.flowNodes,
        edges: parsedDesignDocument.flowEdges,
        type: "flow",
      });

      return `
  <section class="print-section">
    <h2 class="section-title">1. 최종 보고서 초안</h2>
    <article class="print-card report-card">
      <div class="report-text">${escapeHtmlWithLineBreaks(reportContent)}</div>
    </article>
  </section>

  <section class="print-section diagram-page">
    <h2 class="section-title">2. ERD</h2>
    <p class="body-text section-description">
      설계단계에서 작성한 테이블 구조와 관계선을 최종 보고서에 포함합니다.
    </p>
    ${finalErdDiagramHtml}
  </section>

  <section class="print-section diagram-page">
    <h2 class="section-title">3. 화면 흐름</h2>
    <p class="body-text section-description">
      설계단계에서 작성한 화면 사이의 이동 흐름을 최종 보고서에 포함합니다.
    </p>
    ${finalFlowDiagramHtml}
  </section>
`;
    })();

    printWindow.document.write(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(documentTitle)}</title>
          <style>
            @page {
              size: A4;
              margin: 18mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #111827;
              font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              line-height: 1.65;
            }

            .document {
              width: 100%;
            }

            .document-header {
              padding-bottom: 18px;
              margin-bottom: 22px;
              border-bottom: 2px solid #1d4ed8;
            }

            .eyebrow {
              margin: 0 0 6px;
              color: #2563eb;
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 0.08em;
            }

            h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 900;
              letter-spacing: -0.04em;
            }

            .header-meta {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              margin-top: 16px;
            }

            .meta-box {
              padding: 10px 12px;
              border: 1px solid #dbeafe;
              border-radius: 12px;
              background: #eff6ff;
            }

            .meta-label {
              display: block;
              margin-bottom: 2px;
              color: #64748b;
              font-size: 10px;
              font-weight: 800;
            }

            .meta-value {
              color: #0f172a;
              font-size: 13px;
              font-weight: 800;
            }

            .print-section {
              margin-bottom: 22px;
            }

            .section-title {
              margin: 0 0 8px;
              color: #1d4ed8;
              font-size: 18px;
              font-weight: 900;
            }

            .print-card {
              break-inside: avoid;
              page-break-inside: avoid;
              padding: 18px 0;
              border-bottom: 1px solid #e5e7eb;
            }

            .compact-card {
              padding: 12px 0;
            }

            .print-card:first-of-type {
              padding-top: 0;
            }

            .print-card-header {
              display: flex;
              gap: 10px;
              align-items: flex-start;
              margin-bottom: 10px;
            }

            .index {
              display: inline-flex;
              width: 26px;
              height: 26px;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              background: #2563eb;
              color: #ffffff;
              font-size: 12px;
              font-weight: 900;
              flex-shrink: 0;
            }

            h2 {
              margin: 0;
              color: #111827;
              font-size: 17px;
              font-weight: 900;
              letter-spacing: -0.02em;
            }

            .method {
              display: inline-block;
              margin-right: 6px;
              border-radius: 7px;
              background: #dbeafe;
              color: #1d4ed8;
              padding: 2px 7px;
              font-size: 11px;
            }

            .meta {
              margin: 3px 0 0;
              color: #64748b;
              font-size: 11px;
              font-weight: 700;
            }

            .body-text,
            .report-text {
              margin: 0;
              color: #374151;
              font-size: 13px;
              font-weight: 600;
              white-space: normal;
            }

            .report-card {
              border-bottom: 0;
            }

            .report-card h2 {
              margin-bottom: 14px;
            }

            .empty {
              padding: 40px 0;
              color: #64748b;
              font-size: 14px;
              font-weight: 700;
              text-align: center;
            }

            .small-empty {
              padding: 14px 0;
              text-align: left;
            }



            .section-description {
              margin-bottom: 10px;
            }

            .diagram-wrap {
              width: 100%;
              margin: 12px 0 18px;
              border: 1px solid #dbeafe;
              border-radius: 16px;
              overflow: hidden;
              background: #f8fbff;
              break-inside: avoid;
              page-break-inside: avoid;
            }
              .diagram-page {
  break-before: auto;
  page-break-before: auto;
}

.code-block {
  margin: 8px 0 0;
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #f8fbff;
  color: #1e293b;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.api-payload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.payload-title {
  margin: 0 0 4px;
  color: #2563eb;
  font-size: 11px;
  font-weight: 900;
}

@media print {
  .api-payload-grid {
    grid-template-columns: 1fr;
  }
}

            .diagram-svg {
              display: block;
              width: 100%;
              min-height: 360px;
            }

            .diagram-title {
              fill: #0f172a;
              font-size: 13px;
              font-weight: 900;
            }

            .diagram-white {
              fill: #ffffff;
            }

            .diagram-column {
              fill: #334155;
              font-size: 11px;
              font-weight: 700;
            }

            .diagram-muted {
              fill: #64748b;
              font-size: 10px;
              font-weight: 700;
            }

            /* 화면 흐름 상자에 쓰는 작은 글씨들. 화면용과 같은 값이어야 한다. */
            .diagram-route {
              fill: #6b7280;
              font-size: 10px;
              font-weight: 700;
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            }

            .diagram-entry {
              fill: #047857;
              font-size: 9px;
              font-weight: 900;
            }

            .diagram-chip {
              fill: #475569;
              font-size: 9px;
              font-weight: 900;
            }

            .diagram-chip-warn {
              fill: #dc2626;
              font-size: 9px;
              font-weight: 900;
            }

            .diagram-chip-muted {
              fill: #9ca3af;
              font-size: 9px;
              font-weight: 900;
            }

            .diagram-api {
              fill: #6b7280;
              font-size: 9px;
              font-weight: 700;
              font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            }

            /* 화살표 위에 얹는 이동 조건. 선과 겹쳐도 읽히도록 흰 테를 두른다. */
            .diagram-edge-label {
              fill: #475569;
              font-size: 10px;
              font-weight: 700;
              stroke: #ffffff;
              stroke-width: 3px;
              paint-order: stroke;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <main class="document">
            <header class="document-header">
              <p class="eyebrow">PROJECT ARCHIVE</p>
              <h1>${escapeHtml(documentTitle)}</h1>
              <section class="header-meta">
                <div class="meta-box">
                  <span class="meta-label">프로젝트</span>
                  <span class="meta-value">${escapeHtml(selectedProjectName)}</span>
                </div>
                <div class="meta-box">
                  <span class="meta-label">문서 구분</span>
                  <span class="meta-value">${escapeHtml(documentTitle)}</span>
                </div>
                <div class="meta-box">
                  <span class="meta-label">저장일</span>
                  <span class="meta-value">${escapeHtml(getPrintDateLabel())}</span>
                </div>
              </section>
            </header>

            ${printBody}
          </main>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleGenerateFinalReport = async () => {
    if (!selectedProject) {
      alert("최종 보고서 초안을 생성할 프로젝트를 선택해주세요.");
      return;
    }

    if (!selectedDesignWorkspaceId) {
      alert("프로젝트 식별값을 찾지 못했습니다.");
      return;
    }

    if (finalReportLoading) {
      return;
    }

    try {
      setFinalReportLoading(true);
      setFinalReportError("");

      console.log("[final report] AI 초안 생성 요청 시작", {
        workspaceId: selectedDesignWorkspaceId,
        projectName: selectedProject.name,
        devlogCount: filteredDevlogs.length,
        requirementCount: designRequirements.length,
        apiSpecCount: designApiSpecs.length,
        erdCount: parsedDesignDocument.erdNodes.length,
        flowCount: parsedDesignDocument.flowNodes.length,
      });

      const response = await generateFinalReportDraftApi({
        workspaceId: selectedDesignWorkspaceId,
        project: {
          name: selectedProject.name,
          description: selectedProject.description,
          type: selectedProject.type,
          language: selectedProject.language,
          stack: selectedProject.stack,
          progress: selectedProject.progress,
          doneScheduleCount: selectedProject.doneScheduleCount,
          scheduleTotalCount: selectedProject.scheduleTotalCount,
          devlogCount: filteredDevlogs.length,
        },
        devlogs: filteredDevlogs.map((devlog) => ({
          title: devlog.title,
          date: devlog.date,
          projectName: devlog.projectName,
          summary: devlog.summary,
        })),
        requirements: designRequirements.map((item) => ({
          category: item.category,
          name: item.name,
          description: item.description,
        })),
        apiSpecs: designApiSpecs.map((item) => ({
          method: item.method,
          endpoint: item.endpoint,
          description: item.description,
          request: item.request,
          response: item.response,
        })),
        erdTables: buildErdTablesForDraft(parsedDesignDocument.erdNodes),
        flowNodes: buildFlowNodesForDraft(parsedDesignDocument.flowNodes),
      });

      console.log("[final report] AI 초안 생성 응답", response);

      const responseRecord =
        typeof response === "object" && response !== null
          ? (response as Record<string, unknown>)
          : null;

      const nextDraft =
        typeof response === "string"
          ? response
          : typeof responseRecord?.draft === "string"
            ? responseRecord.draft
            : typeof responseRecord?.content === "string"
              ? responseRecord.content
              : typeof responseRecord?.result === "string"
                ? responseRecord.result
                : typeof responseRecord?.message === "string"
                  ? responseRecord.message
                  : "";

      if (!nextDraft.trim()) {
        throw new Error(
          "AI 초안 응답은 왔지만 보고서 내용이 비어 있습니다. 백엔드 응답 필드명을 확인해주세요.",
        );
      }

      setFinalReportDraft(nextDraft);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "AI 최종 보고서 초안 생성에 실패했습니다.";

      console.error("[final report] AI 초안 생성 실패", error);

      setFinalReportError(message);
      alert(message);
    } finally {
      setFinalReportLoading(false);
    }
  };

  return (
    <section className="waivs-panel overflow-visible">
      {/* 자료실 상단 */}
      <div className="p-5">
        {/* 제목 + PDF 저장 */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#5873F9]">
              Project Archive
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                {selectedProject?.name ?? "프로젝트 없음"}
              </h2>

              {selectedProject && (
                <span className="rounded-full bg-[#EEF3FF] px-2.5 py-1 text-[10px] font-black text-[#5873F9]">
                  {selectedProject.type}
                </span>
              )}

              <span className="text-slate-300">/</span>

              <span className="text-sm font-black text-slate-700">
                {activeArchive?.label}
              </span>
            </div>

            <p className="mt-1 text-sm font-medium text-slate-500">
              선택한 프로젝트의 개발 자료를 조회하고 문서화합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-[#5873F9] px-4 text-sm font-black text-white transition hover:bg-[#4863E8]"
          >
            <Download size={16} />
            PDF 저장
          </button>
        </div>

        <div className="mt-4 border-t border-[var(--waivs-border-soft)] pt-4">
          {/* 프로젝트 선택 - 다른 컨트롤과 분리해서 강조 */}
          <div className="rounded-2xl border border-[#DCE4FF] bg-[#F7F9FF] p-3.5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex shrink-0 items-center gap-2.5 lg:w-[170px]">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#5873F9] shadow-sm">
                  <FolderKanban size={17} />
                </span>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#5873F9]">
                    Project
                  </p>
                  <p className="text-xs font-black text-slate-800">
                    프로젝트 선택
                  </p>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <select
                  value={selectedProjectId}
                  onChange={(event) => {
                    const nextProjectId = event.target.value;
                    setSelectedProjectId(nextProjectId);

                    const nextProject = projects.find(
                      (project) => project.id === nextProjectId,
                    );

                    if (nextProject) {
                      rememberCurrentWorkspace(nextProject);
                    }
                  }}
                  disabled={projectOptions.length === 0}
                  className="h-11 w-full rounded-xl border border-[#C8D3FF] bg-white px-4 text-sm font-black text-slate-800 outline-none transition disabled:opacity-50 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
                >
                  {projectOptions.length === 0 && (
                    <option value="">프로젝트 없음</option>
                  )}

                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProject && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-[#5873F9] shadow-sm">
                    {selectedProject.type}
                  </span>

                  <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-slate-500 shadow-sm">
                    {selectedProject.workspaceRole.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 자료 종류 + 검색/정렬 */}
          <div className="mt-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-fit shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1">
              {archiveTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeArchiveTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onActiveArchiveTabChange(tab.key)}
                    aria-current={isActive ? "page" : undefined}
                    className={[
                      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-black transition",
                      isActive
                        ? "bg-white text-[#5873F9] shadow-sm"
                        : "text-slate-500 hover:text-slate-800",
                    ].join(" ")}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row xl:justify-end">
          {/* 검색 */}
          <div className="relative min-w-0 sm:w-[300px] xl:w-[360px]">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="자료실 검색"
              className="h-10 w-full rounded-xl border border-[var(--waivs-border)] bg-white pl-10 pr-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
            />
          </div>

          {/* 정렬 */}
          <div className="relative shrink-0">
            <Filter
              size={13}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={sortType}
              onChange={(event) =>
                setSortType(event.target.value as DevlogSortType)
              }
              className="h-10 shrink-0 rounded-xl border border-[var(--waivs-border)] bg-white pl-7 pr-8 text-sm font-bold text-slate-600 outline-none focus:border-[#5873F9]"
            >
              <option value="latest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
          </div>

          {/* 날짜 / 기간 선택 */}
          <div className="relative shrink-0">
            {/* 화면에 보이는 버튼 하나 */}
            <button
              type="button"
              onClick={() => setDatePickerOpen((prev) => !prev)}
              className="flex h-10 items-center gap-2 rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-sm font-bold text-slate-600 outline-none transition hover:bg-slate-50 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
            >
              <CalendarDays size={15} />

              <span>
                {dateFilterMode === "single" && selectedDate
                  ? selectedDate
                  : dateFilterMode === "range" && startDate && endDate
                    ? `${startDate} ~ ${endDate}`
                    : "날짜/기간"}
              </span>

              <ChevronDown
                size={14}
                className={`transition-transform ${
                  datePickerOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* 버튼 클릭 시 나오는 팝업 */}
            {datePickerOpen && (
              <div className="absolute right-0 top-12 z-50 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">

                {/* 날짜 / 기간 탭 */}
                <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterMode("single");
                      setStartDate("");
                      setEndDate("");
                    }}
                    className={[
                      "h-9 rounded-lg text-sm font-bold transition",
                      dateFilterMode === "single"
                        ? "bg-white text-[#5873F9] shadow-sm"
                        : "text-slate-500 hover:text-slate-700",
                    ].join(" ")}
                  >
                    날짜
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDateFilterMode("range");
                      setSelectedDate("");
                    }}
                    className={[
                      "h-9 rounded-lg text-sm font-bold transition",
                      dateFilterMode === "range"
                        ? "bg-white text-[#5873F9] shadow-sm"
                        : "text-slate-500 hover:text-slate-700",
                    ].join(" ")}
                  >
                    기간
                  </button>
                </div>

                {/* 날짜 모드 */}
                {dateFilterMode === "single" && (
                  <div>
                    <p className="mb-2 text-xs font-bold text-slate-500">
                      조회할 날짜
                    </p>

                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(event) =>
                        setSelectedDate(event.target.value)
                      }
                      className="h-10 w-full rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-sm font-bold text-slate-600 outline-none transition focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
                    />
                  </div>
                )}

                {/* 기간 모드 */}
                {dateFilterMode === "range" && (
                  <div>
                    <p className="mb-2 text-xs font-bold text-slate-500">
                      조회할 기간
                    </p>

                    <div className="flex flex-col gap-3">
                      {/* 시작일 */}
                      <div>
                        <p className="mb-1 text-[11px] font-bold text-slate-400">
                          시작일
                        </p>

                        <input
                          type="date"
                          value={startDate}
                          max={endDate || undefined}
                          onChange={(event) =>
                            setStartDate(event.target.value)
                          }
                          className="h-10 w-full rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-sm font-bold text-slate-600 outline-none transition focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
                        />
                      </div>

                      {/* 종료일 */}
                      <div>
                        <p className="mb-1 text-[11px] font-bold text-slate-400">
                          종료일
                        </p>

                        <input
                          type="date"
                          value={endDate}
                          min={startDate || undefined}
                          onChange={(event) =>
                            setEndDate(event.target.value)
                          }
                          className="h-10 w-full rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-sm font-bold text-slate-600 outline-none transition focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 하단 */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate("");
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="text-xs font-bold text-slate-400 transition hover:text-slate-700"
                  >
                    초기화
                  </button>

                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(false)}
                    className="h-8 rounded-lg bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8]"
                  >
                    적용
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>

    {/* 콘텐츠 */}
    <div className="border-t border-[var(--waivs-border-soft)] p-5">
      {activeArchiveTab === "devlog" && (
        <ArchiveDevlogContent devlogs={filteredDevlogs} />
      )}

      {activeArchiveTab === "design" && (
        <ArchiveDesignContent
          selectedProject={selectedProject}
          requirements={designRequirements}
          apiSpecs={designApiSpecs}
          designDocument={parsedDesignDocument}
          isLoading={designLoading}
          errorMessage={designError}
        />
      )}

      {activeArchiveTab === "final" && (
        <ArchiveFinalReportContent
          selectedProject={selectedProject}
          devlogCount={filteredDevlogs.length}
          draft={finalReportDraft}
          onDraftChange={setFinalReportDraft}
          onGenerate={handleGenerateFinalReport}
          designDocument={parsedDesignDocument}
          isGenerating={finalReportLoading}
          errorMessage={finalReportError}
        />
      )}
    </div>
  </section>
);}

function ArchiveDevlogContent({ devlogs }: { devlogs: Devlog[] }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            개발일지
          </h3>

          <p className="mt-1 text-sm font-medium text-slate-500">
            일정 기반 일지와 일반 일지를 문서 형태로 확인합니다.
          </p>
        </div>

        <span className="rounded-full bg-[#EEF3FF] px-3 py-1 text-[11px] font-black text-[#5873F9]">
          {devlogs.length}개
        </span>
      </div>

      {devlogs.length === 0 ? (
        <EmptyState message="아직 작성된 개발일지가 없습니다." />
      ) : (
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
          {devlogs.map((devlog) => (
            <DevlogCard key={devlog.id} devlog={devlog} />
          ))}
        </div>
      )}
    </section>
  );
}

function ArchiveDesignContent({
  selectedProject,
  requirements,
  apiSpecs,
  designDocument,
  isLoading,
  errorMessage,
}: {
  selectedProject: Project | null;
  requirements: DesignRequirementItem[];
  apiSpecs: DesignApiSpecItem[];
  designDocument: ParsedDesignDocument;
  isLoading: boolean;
  errorMessage: string;
}) {
  const [activeDesignSection, setActiveDesignSection] =
    useState<DesignArchiveSectionKey>("requirements");

  const erdTables = designDocument.erdNodes;
  const erdRelations = designDocument.erdEdges;
  const flowNodes = designDocument.flowNodes;
  const flowEdges = designDocument.flowEdges;

  const designSectionTabs: {
    key: DesignArchiveSectionKey;
    label: string;
    description: string;
    count: number;
    icon: React.ElementType;
  }[] = [
    {
      key: "requirements",
      label: "요구사항",
      description: "구현 범위와 기능 조건",
      count: requirements.length,
      icon: CheckCircle2,
    },
    {
      key: "api",
      label: "API",
      description: "요청/응답과 엔드포인트",
      count: apiSpecs.length,
      icon: Code2,
    },
    {
      key: "erd",
      label: "ERD",
      description: "테이블·컬럼·관계",
      count: erdTables.length,
      icon: Database,
    },
    {
      key: "flow",
      label: "화면 흐름",
      description: "화면 사이 이동",
      count: flowNodes.length,
      icon: GitBranch,
    },
  ];

  const activeDesignTab = designSectionTabs.find(
    (tab) => tab.key === activeDesignSection,
  );
  const ActiveDesignIcon = activeDesignTab?.icon;

  const hasAnyDesignData =
    requirements.length > 0 ||
    apiSpecs.length > 0 ||
    erdTables.length > 0 ||
    flowNodes.length > 0;

  return (
    <div className="space-y-3">
      {errorMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
      {/* 설계 문서 탭 */}
      <div className="flex w-fit shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1">
        {designSectionTabs.map((tab) => {
          const isActive = activeDesignSection === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveDesignSection(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-black transition",
                isActive
                  ? "bg-white text-[#5873F9] shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 선택 프로젝트 */}
      <span className="w-fit rounded-full border border-blue-100 bg-white px-3 py-1 text-[11px] font-black text-blue-700">
        선택 프로젝트: {selectedProject?.name ?? "프로젝트 없음"}
      </span>
    </div>

    {isLoading ? (
      <div className="rounded-2xl border border-blue-100 bg-white px-4 py-10 text-center text-sm font-black text-slate-500">
        설계 문서를 불러오는 중입니다.
      </div>
    ) : !hasAnyDesignData ? (
      <EmptyState message="아직 문서화할 설계 데이터가 없습니다. 설계단계에서 요구사항, ERD 또는 화면 흐름을 먼저 작성해주세요." />
    ) : (
      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col justify-between gap-2 border-b border-blue-50 pb-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-center gap-2">
            {ActiveDesignIcon && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <ActiveDesignIcon size={16} />
              </span>
            )}

            <div className="min-w-0">
              <h4 className="truncate text-base font-black tracking-tight text-slate-950">
                {activeDesignTab?.label}
              </h4>

              <p className="truncate text-xs font-semibold text-slate-500">
                {activeDesignTab?.description}
              </p>
            </div>
          </div>
        </div>

        {activeDesignSection === "requirements" && (
          <DesignRequirementsPage requirements={requirements} />
        )}

        {activeDesignSection === "api" && (
          <DesignApiSpecsPage apiSpecs={apiSpecs} />
        )}

        {activeDesignSection === "erd" && (
          <DesignErdPage
            tables={erdTables}
            edges={erdRelations}
            relationCount={erdRelations.length}
          />
        )}

        {activeDesignSection === "flow" && (
          <DesignFlowPage
            nodes={flowNodes}
            edges={flowEdges}
            edgeCount={flowEdges.length}
          />
        )}
      </section>
    )}
    </div>
  );
}

function DesignRequirementsPage({
  requirements,
}: {
  requirements: DesignRequirementItem[];
}) {
  if (requirements.length === 0) {
    return <DesignEmptyText text="작성된 요구사항이 없습니다." />;
  }

  return (
    <div className="space-y-2.5">
      {requirements.map((item, index) => (
        <article
          key={item.id}
          className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
              {index + 1}
            </span>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-blue-700">
              {item.category || "기본"}
            </span>
            <h5 className="text-sm font-black text-slate-950">
              {item.name || "이름 없는 요구사항"}
            </h5>
          </div>
          <p className="text-sm font-semibold leading-6 text-slate-600">
            {item.description || "설명이 없습니다."}
          </p>
        </article>
      ))}
    </div>
  );
}
function formatApiPayload(value?: string | null) {
  if (!value || !value.trim()) return "-";

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function DesignApiSpecsPage({ apiSpecs }: { apiSpecs: DesignApiSpecItem[] }) {
  if (apiSpecs.length === 0) {
    return <DesignEmptyText text="작성된 API 명세가 없습니다." />;
  }

  return (
    <div className="space-y-3">
      {apiSpecs.map((item) => (
        <article
          key={item.id}
          className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white">
                {item.method || "GET"}
              </span>

              <code className="min-w-0 break-all rounded-lg bg-white px-3 py-1.5 text-sm font-black text-slate-900">
                {item.endpoint || "/api/example"}
              </code>
            </div>

            <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black text-blue-700">
              API 명세
            </span>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <p className="mb-1 text-xs font-black text-slate-400">설명</p>
              <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700">
                {item.description || "설명이 없습니다."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="mb-2 text-xs font-black text-blue-700">
                  요청 데이터
                </p>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-blue-100 bg-white p-3 text-xs font-bold leading-6 text-slate-700">
                  {formatApiPayload(item.request)}
                </pre>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="mb-2 text-xs font-black text-blue-700">
                  응답 데이터
                </p>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-blue-100 bg-white p-3 text-xs font-bold leading-6 text-slate-700">
                  {formatApiPayload(item.response)}
                </pre>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function DesignErdPage({
  tables,
  edges,
  relationCount,
}: {
  tables: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  relationCount: number;
}) {
  if (tables.length === 0) {
    return <DesignEmptyText text="작성된 ERD 테이블이 없습니다." />;
  }

  return (
    <div className="space-y-3">
      <DesignDiagramPreview
        nodes={tables}
        edges={edges}
        type="erd"
        title="ERD 구조 미리보기"
        description="설계단계에서 작성한 테이블 위치와 관계선을 시각화했습니다."
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-black text-slate-700">
          테이블 {tables.length}개 · 관계 {relationCount}개
        </p>
        <p className="text-xs font-semibold text-slate-500">
          아래 목록에서는 각 테이블의 컬럼을 문서 형태로 확인합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
        {tables.map((node, index) => {
          const columns = getNodeColumns(node);

          return (
            <article
              key={String(node.id ?? index)}
              className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 bg-slate-950 px-4 py-3 text-white">
                <div className="min-w-0">
                  <h5 className="truncate text-sm font-black">
                    {getNodeLabel(node, `TABLE_${index + 1}`)}
                  </h5>
                  <p className="text-[11px] font-semibold text-slate-300">
                    컬럼 {columns.length}개
                  </p>
                </div>
                <Database size={16} />
              </div>

              <div className="max-h-[220px] divide-y divide-slate-100 overflow-y-auto">
                {columns.length === 0 ? (
                  <p className="px-4 py-4 text-xs font-bold text-slate-400">
                    컬럼이 없습니다.
                  </p>
                ) : (
                  columns.map((column, columnIndex) => (
                    <div
                      key={String(column.id ?? columnIndex)}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs"
                    >
                      <span className="min-w-0 truncate font-black text-slate-700">
                        {typeof column.name === "string"
                          ? column.name
                          : "column"}
                      </span>
                      <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-0.5 font-black text-blue-700">
                        {typeof column.type === "string" ? column.type : "TYPE"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DesignFlowPage({
  nodes,
  edges,
  edgeCount,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  edgeCount: number;
}) {
  if (nodes.length === 0) {
    return <DesignEmptyText text="작성된 화면 흐름이 없습니다." />;
  }

  return (
    <div className="space-y-3">
      <DesignDiagramPreview
        nodes={nodes}
        edges={edges}
        type="flow"
        title="화면 흐름 미리보기"
        description="화면 사이의 이동 흐름을 시각화했습니다."
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm font-black text-slate-700">
          노드 {nodes.length}개 · 연결 {edgeCount}개
        </p>
        <p className="text-xs font-semibold text-slate-500">
          아래 목록에서는 각 흐름 노드의 역할을 문서 형태로 확인합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        {nodes.map((node, index) => (
          <div
            key={String(node.id ?? index)}
            className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
              <GitBranch size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950">
                {getNodeLabel(node, `NODE_${index + 1}`)}
              </p>
              <p className="truncate text-xs font-semibold text-slate-500">
                {getNodeSubText(node)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 화면 흐름 상자.
 *
 * 설계단계의 화면 카드(src/components/design/tabs/screens/ScreenNode.tsx)와
 * 같은 것을 보여 준다. 같은 데이터인데 그림이 다르면 다른 자료로 오해한다.
 */
function ScreenFlowNodeShape({
  node,
  width,
  height,
}: {
  node: NormalizedDiagramNode;
  width: number;
  height: number;
}) {
  const shownApis = node.apiLabels.slice(0, 3);
  const restApis = node.apiLabels.length - shownApis.length;

  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={width}
        height={height}
        rx={16}
        fill="#ffffff"
        stroke={node.isEntry ? "#34d399" : "#e5e7eb"}
        strokeWidth={node.isEntry ? 2 : 1}
      />

      {node.isEntry ? (
        <>
          <rect
            x={node.x + 12}
            y={node.y + 12}
            width={34}
            height={17}
            rx={6}
            fill="#ecfdf5"
          />
          <text
            x={node.x + 29}
            y={node.y + 24}
            textAnchor="middle"
            fill="#047857"
            fontSize={9}
            fontWeight={900}
          >
            시작
          </text>
        </>
      ) : null}

      <text
        x={node.x + (node.isEntry ? 54 : 14)}
        y={node.y + 25}
        fill="#0f172a"
        fontSize={13}
        fontWeight={900}
      >
        {node.label}
      </text>

      {node.requiresAuth ? (
        <text
          x={node.x + width - 14}
          y={node.y + 25}
          textAnchor="end"
          fill="#9ca3af"
          fontSize={9}
          fontWeight={900}
        >
          로그인
        </text>
      ) : null}

      <line
        x1={node.x}
        y1={node.y + 38}
        x2={node.x + width}
        y2={node.y + 38}
        stroke="#eef1f4"
      />

      <text
        x={node.x + 14}
        y={node.y + 56}
        fill="#6b7280"
        fontSize={10}
        fontWeight={700}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      >
        {node.route}
      </text>

      <rect
        x={node.x + 14}
        y={node.y + 64}
        width={62}
        height={17}
        rx={5}
        fill={node.requirementCount === 0 ? "#fef2f2" : "#f1f5f9"}
      />
      <text
        x={node.x + 20}
        y={node.y + 76}
        fill={node.requirementCount === 0 ? "#dc2626" : "#475569"}
        fontSize={9}
        fontWeight={900}
      >
        요구사항 {node.requirementCount}
      </text>

      <rect
        x={node.x + 82}
        y={node.y + 64}
        width={34}
        height={17}
        rx={5}
        fill="#f1f5f9"
      />
      <text
        x={node.x + 99}
        y={node.y + 76}
        textAnchor="middle"
        fill="#475569"
        fontSize={9}
        fontWeight={900}
      >
        {node.roleLabel}
      </text>

      {shownApis.length === 0 ? (
        <text
          x={node.x + 14}
          y={node.y + 100}
          fill="#9ca3af"
          fontSize={9}
          fontWeight={700}
        >
          호출하는 API 없음
        </text>
      ) : (
        shownApis.map((label, index) => (
          <text
            key={label}
            x={node.x + 14}
            y={node.y + 100 + index * 14}
            fill="#6b7280"
            fontSize={9}
            fontWeight={700}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {label}
          </text>
        ))
      )}

      {restApis > 0 ? (
        <text
          x={node.x + 14}
          y={node.y + 100 + shownApis.length * 14}
          fill="#9ca3af"
          fontSize={9}
          fontWeight={700}
        >
          외 {restApis}개
        </text>
      ) : null}
    </g>
  );
}

function DesignDiagramPreview({
  nodes,
  edges,
  type,
  title,
  description,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  type: "erd" | "flow";
  title: string;
  description: string;
}) {
  const normalizedNodes = useMemo(
    () => normalizeDiagramNodes(nodes, type),
    [nodes, type],
  );

  const layout = useMemo(
    () => getDiagramLayout(normalizedNodes, type),
    [normalizedNodes, type],
  );

  const nodeMap = useMemo(
    () => new Map(layout.nodes.map((node) => [node.id, node])),
    [layout.nodes],
  );

  const strokeColor = type === "erd" ? "#2563eb" : "#7c3aed";

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-2 border-b border-blue-100 bg-blue-50 px-4 py-3 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-black text-slate-950">{title}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            {description}
          </p>
        </div>
        <span className="w-fit rounded-full bg-white px-3 py-1 text-[11px] font-black text-blue-700 shadow-sm">
          노드 {nodes.length}개 · 연결 {edges.length}개
        </span>
      </div>

      <div className="overflow-auto bg-[#f8fbff] p-3">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="h-[420px] min-w-[860px] w-full rounded-xl border border-blue-100 bg-white"
          role="img"
          aria-label={title}
        >
          <defs>
            <marker
              id={`archive-arrow-${type}`}
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L9,3 z" fill={strokeColor} />
            </marker>
            <pattern
              id={`archive-dot-grid-${type}`}
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="#dbeafe" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="#f8fbff" />
          <rect
            width="100%"
            height="100%"
            fill={`url(#archive-dot-grid-${type})`}
          />

          {edges.map((edge, index) => {
            const { source, target } = getEdgeSourceTarget(edge);
            const sourceNode = nodeMap.get(source);
            const targetNode = nodeMap.get(target);

            if (!sourceNode || !targetNode) return null;

            const sourceX = sourceNode.x + layout.nodeWidth;
            const sourceY = sourceNode.y + layout.nodeHeight / 2;
            const targetX = targetNode.x;
            const targetY = targetNode.y + layout.nodeHeight / 2;

            // 화면 흐름에서는 "무엇을 했을 때 넘어가는가" 가 핵심 정보다.
            const edgeLabel =
              typeof edge.label === "string" ? edge.label.trim() : "";

            return (
              <g key={String(edge.id ?? index)}>
                <path
                  d={buildSvgPath(sourceX, sourceY, targetX, targetY)}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={2}
                  markerEnd={`url(#archive-arrow-${type})`}
                />

                {edgeLabel ? (
                  <text
                    x={(sourceX + targetX) / 2}
                    y={(sourceY + targetY) / 2 - 8}
                    textAnchor="middle"
                    fill="#475569"
                    fontSize={10}
                    fontWeight={700}
                    stroke="#ffffff"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {edgeLabel}
                  </text>
                ) : null}
              </g>
            );
          })}

          {layout.nodes.map((node) => {
            if (type === "erd") {
              return (
                <g key={node.id}>
                  <rect
                    x={node.x}
                    y={node.y}
                    width={layout.nodeWidth}
                    height={layout.nodeHeight}
                    rx={14}
                    fill="#ffffff"
                    stroke="#bfdbfe"
                  />
                  <rect
                    x={node.x}
                    y={node.y}
                    width={layout.nodeWidth}
                    height={42}
                    rx={14}
                    fill="#5873F9"
                  />
                  <text
                    x={node.x + 16}
                    y={node.y + 27}
                    fill="#ffffff"
                    fontSize={13}
                    fontWeight={900}
                  >
                    {node.label}
                  </text>

                  {node.columns.length === 0 ? (
                    <text
                      x={node.x + 16}
                      y={node.y + 78}
                      fill="#64748b"
                      fontSize={11}
                      fontWeight={700}
                    >
                      컬럼 없음
                    </text>
                  ) : (
                    node.columns.slice(0, 4).map((column, columnIndex) => {
                      const columnName =
                        typeof column.name === "string"
                          ? column.name
                          : "column";
                      const columnType =
                        typeof column.type === "string" ? column.type : "TYPE";

                      return (
                        <text
                          key={String(column.id ?? columnIndex)}
                          x={node.x + 16}
                          y={node.y + 74 + columnIndex * 18}
                          fill="#334155"
                          fontSize={11}
                          fontWeight={700}
                        >
                          {column.isPk ? "PK " : column.isFk ? "FK " : ""}
                          {columnName} · {columnType}
                        </text>
                      );
                    })
                  )}
                </g>
              );
            }

            return (
              <ScreenFlowNodeShape
                key={node.id}
                node={node}
                width={layout.nodeWidth}
                height={layout.nodeHeight}
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function DesignDocumentBlock({
  title,
  description,
  count,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  count: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <h4 className="text-base font-black text-slate-950">{title}</h4>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {description}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
          {count}
        </span>
      </div>

      {children}
    </section>
  );
}

function DesignEmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-100 bg-blue-50/70 px-4 py-8 text-center">
      <p className="text-sm font-black text-slate-400">{text}</p>
    </div>
  );
}

function ArchiveFinalReportContent({
  selectedProject,
  devlogCount,
  draft,
  onDraftChange,
  onGenerate,
  designDocument,
  isGenerating,
  errorMessage,
}: {
  selectedProject: Project | null;
  devlogCount: number;
  draft: string;
  onDraftChange: (value: string) => void;
  onGenerate: () => void;
  designDocument: ParsedDesignDocument;
  isGenerating: boolean;
  errorMessage: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 420)}px`;
  }, [draft]);

  return (
    <div className="pb-20">
      {errorMessage && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        {/* 보고서 헤더: 별도 AI 안내 박스를 없애고 액션을 한곳에 모음 */}
        <div className="mb-4 flex flex-col justify-between gap-3 border-b border-blue-50 pb-4 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-black text-slate-950">
                {selectedProject?.name
                  ? `${selectedProject.name} 최종 보고서`
                  : "프로젝트 최종 보고서"}
              </p>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                개발일지 {devlogCount}개
              </span>
            </div>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              AI 초안을 생성한 뒤 직접 수정하고, ERD와 화면 흐름을 함께 확인할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-xs font-black text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles size={15} />
            {isGenerating ? "생성 중..." : draft.trim() ? "AI 초안 다시 생성" : "AI 초안 생성"}
          </button>
        </div>

        <div className="space-y-5">
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h5 className="text-sm font-black text-slate-950">
                1. AI 최종 보고서 초안
              </h5>

              {draft.trim() && (
                <span className="text-[10px] font-bold text-emerald-600">
                  직접 수정 가능
                </span>
              )}
            </div>

            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder={
                isGenerating
                  ? "AI가 최종 보고서 초안을 생성하는 중입니다."
                  : "AI 초안 생성 버튼을 누르면 최종 보고서 초안이 여기에 작성됩니다. 생성 후 직접 수정할 수 있습니다."
              }
              className="block min-h-[420px] w-full resize-none overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/30 p-4 text-sm font-semibold leading-7 text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
            />
          </section>

          <section>
            <h5 className="mb-2 text-sm font-black text-slate-950">
              2. 설계 다이어그램
            </h5>

            <FinalReportDesignVisuals designDocument={designDocument} />
          </section>
        </div>
      </section>
    </div>
  );
}

function FinalReportDesignVisuals({
  designDocument,
}: {
  designDocument: ParsedDesignDocument;
}) {
  const erdNodes = designDocument.erdNodes;
  const erdEdges = designDocument.erdEdges;
  const flowNodes = designDocument.flowNodes;
  const flowEdges = designDocument.flowEdges;

  const hasErd = erdNodes.length > 0;
  const hasFlow = flowNodes.length > 0;

  if (!hasErd && !hasFlow) {
    return (
      <section className="rounded-2xl border border-dashed border-blue-100 bg-blue-50/70 px-4 py-10 text-center">
        <p className="text-sm font-black text-slate-400">
          최종 보고서에 표시할 ERD 또는 화면 흐름이 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="border-b border-blue-50 pb-4">
        <p className="text-sm font-black text-slate-950">설계 다이어그램</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          설계관리에서 작성한 ERD와 화면 흐름을 최종 보고서에 함께
          표시합니다.
        </p>
      </div>

      {hasErd && <FinalReportErdDiagram nodes={erdNodes} edges={erdEdges} />}

      {hasFlow && (
        <FinalReportFlowDiagram nodes={flowNodes} edges={flowEdges} />
      )}
    </section>
  );
}

function FinalReportErdDiagram({
  nodes,
  edges,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
}) {
  const bounds = getDiagramBounds(nodes);

  return (
    <section className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
      <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h5 className="text-sm font-black text-slate-950">ERD</h5>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            테이블 {nodes.length}개 · 관계 {edges.length}개
          </p>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-blue-100 bg-white">
        <div
          className="relative"
          style={{
            width: bounds.width,
            height: bounds.height,
            minWidth: "100%",
            minHeight: 420,
          }}
        >
          <DiagramEdgeLayer nodes={nodes} edges={edges} bounds={bounds} />

          {nodes.map((node, index) => {
            const position = getDiagramPosition(node, index, bounds);
            const columns = getNodeColumns(node);

            return (
              <article
                key={String(node.id ?? index)}
                className="absolute w-[230px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                style={{
                  left: position.x,
                  top: position.y,
                }}
              >
                <div className="flex items-center justify-between bg-slate-950 px-4 py-3 text-white">
                  <div className="min-w-0">
                    <h6 className="truncate text-xs font-black">
                      {getNodeLabel(node, `TABLE_${index + 1}`)}
                    </h6>
                    <p className="text-[10px] font-semibold text-slate-300">
                      컬럼 {columns.length}개
                    </p>
                  </div>
                  <Database size={15} />
                </div>

                <div className="divide-y divide-slate-100">
                  {columns.length === 0 ? (
                    <p className="px-4 py-3 text-xs font-bold text-slate-400">
                      컬럼 없음
                    </p>
                  ) : (
                    columns.slice(0, 6).map((column, columnIndex) => {
                      const name =
                        typeof column.name === "string"
                          ? column.name
                          : "column";
                      const type =
                        typeof column.type === "string" ? column.type : "TYPE";

                      return (
                        <div
                          key={String(column.id ?? columnIndex)}
                          className="flex items-center justify-between gap-2 px-4 py-2 text-[11px]"
                        >
                          <span className="min-w-0 truncate font-black text-slate-700">
                            {name}
                          </span>
                          <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-0.5 font-black text-blue-700">
                            {type}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalReportFlowDiagram({
  nodes,
  edges,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
}) {
  const bounds = getDiagramBounds(nodes);

  return (
    <section className="rounded-2xl border border-blue-100 bg-slate-50 p-4">
      <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <h5 className="text-sm font-black text-slate-950">화면 흐름</h5>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            노드 {nodes.length}개 · 연결 {edges.length}개
          </p>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-blue-100 bg-white">
        <div
          className="relative"
          style={{
            width: bounds.width,
            height: bounds.height,
            minWidth: "100%",
            minHeight: 420,
          }}
        >
          <DiagramEdgeLayer nodes={nodes} edges={edges} bounds={bounds} />

          {nodes.map((node, index) => {
            const position = getDiagramPosition(node, index, bounds);
            const data = getNodeData(node);
            const type = typeof data.type === "string" ? data.type : "server";

            const colorClass =
              type === "client"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : type === "db"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : type === "external"
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700";

            return (
              <article
                key={String(node.id ?? index)}
                className={[
                  "absolute flex w-[260px] items-center gap-3 rounded-2xl border p-4 shadow-sm",
                  colorClass,
                ].join(" ")}
                style={{
                  left: position.x,
                  top: position.y,
                }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80">
                  <GitBranch size={17} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black">
                    {getNodeLabel(node, `NODE_${index + 1}`)}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold opacity-80">
                    {getNodeSubText(node)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DiagramEdgeLayer({
  nodes,
  edges,
  bounds,
}: {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  bounds: DiagramBounds;
}) {
  const nodeMap = new Map<string, Record<string, unknown>>();

  for (const node of nodes) {
    if (node.id) {
      nodeMap.set(String(node.id), node);
    }
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={bounds.width}
      height={bounds.height}
    >
      {edges.map((edge, index) => {
        const sourceId = String(edge.source ?? "");
        const targetId = String(edge.target ?? "");

        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(targetId);

        if (!source || !target) return null;

        const sourcePosition = getDiagramPosition(source, index, bounds);
        const targetPosition = getDiagramPosition(target, index + 1, bounds);

        const x1 = sourcePosition.x + 230;
        const y1 = sourcePosition.y + 60;
        const x2 = targetPosition.x;
        const y2 = targetPosition.y + 60;

        const midX = (x1 + x2) / 2;

        return (
          <path
            key={String(edge.id ?? index)}
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeDasharray="6 5"
          />
        );
      })}
    </svg>
  );
}

type DiagramBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

function getDiagramBounds(nodes: Record<string, unknown>[]): DiagramBounds {
  const positions = nodes.map((node, index) => {
    const rawPosition = node.position;

    if (
      typeof rawPosition === "object" &&
      rawPosition !== null &&
      !Array.isArray(rawPosition)
    ) {
      const position = rawPosition as Record<string, unknown>;

      return {
        x: typeof position.x === "number" ? position.x : 180 + index * 260,
        y:
          typeof position.y === "number" ? position.y : 120 + (index % 3) * 160,
      };
    }

    return {
      x: 180 + index * 260,
      y: 120 + (index % 3) * 160,
    };
  });

  const minX = Math.min(...positions.map((position) => position.x), 0);
  const minY = Math.min(...positions.map((position) => position.y), 0);
  const maxX = Math.max(...positions.map((position) => position.x), 600);
  const maxY = Math.max(...positions.map((position) => position.y), 320);

  return {
    minX,
    minY,
    width: maxX - minX + 420,
    height: maxY - minY + 260,
  };
}

function getDiagramPosition(
  node: Record<string, unknown>,
  index: number,
  bounds: DiagramBounds,
) {
  const rawPosition = node.position;

  if (
    typeof rawPosition === "object" &&
    rawPosition !== null &&
    !Array.isArray(rawPosition)
  ) {
    const position = rawPosition as Record<string, unknown>;

    return {
      x:
        (typeof position.x === "number" ? position.x : 180 + index * 260) -
        bounds.minX +
        40,
      y:
        (typeof position.y === "number"
          ? position.y
          : 120 + (index % 3) * 160) -
        bounds.minY +
        40,
    };
  }

  return {
    x: 180 + index * 260,
    y: 120 + (index % 3) * 160,
  };
}

function ArchiveMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 truncate text-base font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function DevlogCard({ devlog }: { devlog: Devlog }) {
  return (
    <article className="rounded-xl border border-[var(--waivs-border)] bg-white p-4 transition hover:border-[#5873F9]/30 hover:shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h4 className="line-clamp-1 text-sm font-black text-slate-950">
              {devlog.title}
            </h4>

            <span className="rounded-full bg-[#EEF3FF] px-2.5 py-0.5 text-[10px] font-black text-[#5873F9]">
              {devlog.projectName}
            </span>
          </div>

          <p className="line-clamp-4 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-600">
            {devlog.summary}
          </p>
        </div>

        <span className="shrink-0 text-[11px] font-bold text-slate-400">
          {devlog.date}
        </span>
      </div>
    </article>
  );
}

function HeatmapSection({
  heatmapValues,
  activityHeatmap,
}: {
  heatmapValues: HeatmapLevel[];
  activityHeatmap: ActivityHeatmapResponse;
}) {
  const heatmapStats = useMemo(() => {
    const maxLevel: HeatmapLevel =
      heatmapValues.length > 0
        ? (Math.max(...heatmapValues) as HeatmapLevel)
        : 0;

    const maxLevelCount =
      maxLevel > 0
        ? heatmapValues.filter((level) => level === maxLevel).length
        : 0;

    const averageScore =
      heatmapValues.length > 0
        ? Math.round(
            (activityHeatmap.totalActivityCount / heatmapValues.length) * 10,
          ) / 10
        : 0;

    return {
      totalScore: activityHeatmap.totalActivityCount,
      activeDays: activityHeatmap.activeDays,
      maxLevel,
      maxLevelCount,
      averageScore,
      totalDays: heatmapValues.length,
      devlogCount: activityHeatmap.devlogCount,
      scheduleDoneCount: activityHeatmap.scheduleDoneCount,
      commitCount: activityHeatmap.commitCount,
    };
  }, [heatmapValues, activityHeatmap]);

  /*
   * =========================================================
   * GitHub 방식 53주 캘린더
   *
   * - 현재 주 포함 정확히 53주
   * - 일요일 ~ 토요일 7행
   * - 최근 365일 활동 데이터 사용
   * - 첫 주 데이터 이전 날짜는 빈칸
   * - 현재 날짜 이후는 빈칸
   * =========================================================
   */
  const calendar = useMemo(() => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    /*
     * 365일 데이터의 시작 날짜
     *
     * 데이터가
     * [가장 오래된 날짜 ... 오늘]
     * 순서라고 보고 날짜를 연결
     */
    const dataStart = new Date(today);

    dataStart.setDate(
      today.getDate() - Math.max(heatmapValues.length - 1, 0),
    );

    /*
     * 날짜별 활동 단계 Map
     */
    const activityMap = new Map<string, HeatmapLevel>();

    heatmapValues.forEach((level, index) => {
      const date = new Date(dataStart);

      date.setDate(dataStart.getDate() + index);

      activityMap.set(
        formatHeatmapDateKey(date),
        level,
      );
    });

    /*
     * 현재 주의 일요일
     */
    const currentWeekSunday = new Date(today);

    currentWeekSunday.setDate(
      today.getDate() - today.getDay(),
    );

    /*
     * 53주 캘린더 시작
     *
     * 현재 주 + 이전 52주
     */
    const gridStart = new Date(currentWeekSunday);

    gridStart.setDate(
      currentWeekSunday.getDate() - 52 * 7,
    );

    type CalendarDay = {
      date: Date;
      level: HeatmapLevel | null;
      isFuture: boolean;
      isBeforeData: boolean;
    };

    const weeks: CalendarDay[][] = [];

    /*
     * 정확히 53열 생성
     */
    for (
      let weekIndex = 0;
      weekIndex < 53;
      weekIndex++
    ) {
      const week: CalendarDay[] = [];

      /*
       * 각 주는
       * 일 ~ 토
       * 7개의 셀
       */
      for (
        let dayIndex = 0;
        dayIndex < 7;
        dayIndex++
      ) {
        const date = new Date(gridStart);

        date.setDate(
          gridStart.getDate() +
            weekIndex * 7 +
            dayIndex,
        );

        date.setHours(0, 0, 0, 0);

        const isFuture =
          date.getTime() > today.getTime();

        const isBeforeData =
          date.getTime() < dataStart.getTime();

        const dateKey =
          formatHeatmapDateKey(date);

        week.push({
          date,
          isFuture,
          isBeforeData,

          level:
            isFuture || isBeforeData
              ? null
              : (activityMap.get(dateKey) ?? 0),
        });
      }

      weeks.push(week);
    }

    /*
     * =====================================
     * 월 이름 위치 계산
     *
     * GitHub처럼 월이 바뀌는 주 위에만 표시
     * =====================================
     */
    const monthLabels: {
      weekIndex: number;
      label: string;
    }[] = [];

    let previousMonth: number | null = null;

    weeks.forEach((week, weekIndex) => {
      /*
       * 해당 주에서 실제 표시 가능한 날짜만 선택
       */
      const validDays = week.filter(
        (day) =>
          !day.isFuture &&
          !day.isBeforeData,
      );

      if (validDays.length === 0) {
        return;
      }

      /*
       * 그 주 중 첫 번째 유효 날짜
       */
      const referenceDate =
        validDays[0].date;

      const month =
        referenceDate.getMonth();

      /*
       * 이전 주와 월이 달라졌다면 월 이름 생성
       */
      if (month !== previousMonth) {
        monthLabels.push({
          weekIndex,
          label: `${month + 1}월`,
        });

        previousMonth = month;
      }
    });

    return {
      weeks,
      monthLabels,
    };
  }, [heatmapValues]);

  return (
    <section className="waivs-panel min-w-0 p-5">
      {/* =====================================================
          제목
         ===================================================== */}
      <div className="flex flex-col gap-3 border-b border-[var(--waivs-border-soft)] pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black tracking-tight text-slate-950">
              개발 활동 히트맵
            </h3>

            <span className="rounded-full bg-[#EEF3FF] px-2.5 py-1 text-[11px] font-black text-[#5873F9]">
              최근 {heatmapStats.totalDays}일
            </span>
          </div>

          <p className="mt-1 text-sm font-medium text-slate-500">
            개발일지, 일정 완료, GitHub 커밋 활동을 날짜별로 확인합니다.
          </p>
        </div>

        {/* 활동 범례 */}
        <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <span className="mr-1">
            적음
          </span>

          <HeatLegendCell level={0} />
          <HeatLegendCell level={1} />
          <HeatLegendCell level={2} />
          <HeatLegendCell level={3} />
          <HeatLegendCell level={4} />

          <span className="ml-1">
            많음
          </span>
        </div>
      </div>

      {/* =====================================================
          상단 통계
         ===================================================== */}
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <HeatmapMetricCard
          label="총 활동"
          value={`${heatmapStats.totalScore}건`}
          description="전체 활동 합산"
        />

        <HeatmapMetricCard
          label="활동한 날"
          value={`${heatmapStats.activeDays}일`}
          description={`최근 ${heatmapStats.totalDays}일 기준`}
        />

        <HeatmapMetricCard
          label="하루 평균"
          value={`${heatmapStats.averageScore}건`}
          description="일 평균 활동"
        />

        <HeatmapMetricCard
          label="최고 활동"
          value={`${heatmapStats.maxLevel}단계`}
          description={
            heatmapStats.maxLevel > 0
              ? `${heatmapStats.maxLevelCount}일 기록`
              : "활동 없음"
          }
        />
      </div>

      {/* =====================================================
          GitHub 스타일 잔디 영역
         ===================================================== */}
      <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-[var(--waivs-border)] bg-white">
        <div className="w-full min-w-0 px-5 pb-5 pt-4">
          {/* ===============================================
              월
             =============================================== */}
          <div className="mb-2 grid grid-cols-[26px_minmax(0,1fr)] gap-2">
            {/* 요일 영역만큼 왼쪽 빈칸 */}
            <div />

            <div
              className="grid min-w-0 gap-[3px]"
              style={{
                gridTemplateColumns:
                  "repeat(53, minmax(0, 1fr))",
              }}
            >
              {calendar.monthLabels.map(
                (month) => (
                  <span
                    key={`${month.weekIndex}-${month.label}`}
                    className="pointer-events-none whitespace-nowrap text-[9px] font-bold text-slate-400"
                    style={{
                      gridColumnStart:
                        month.weekIndex + 1,
                    }}
                  >
                    {month.label}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* ===============================================
              요일 + 53주
             =============================================== */}
          <div className="grid min-w-0 grid-cols-[26px_minmax(0,1fr)] gap-2">
            {/* 요일 */}
            <div
              className="grid gap-[3px]"
              style={{
                gridTemplateRows:
                  "repeat(7, minmax(0, 1fr))",
              }}
            >
              {[
                "일",
                "월",
                "화",
                "수",
                "목",
                "금",
                "토",
              ].map((day) => (
                <div
                  key={day}
                  className="flex min-h-0 items-center text-[9px] font-bold text-slate-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 53주 */}
            <div
              className="grid min-w-0 gap-[3px]"
              style={{
                gridTemplateColumns:
                  "repeat(53, minmax(0, 1fr))",
              }}
            >
              {calendar.weeks.map(
                (week, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="grid min-w-0 gap-[3px]"
                    style={{
                      gridTemplateRows:
                        "repeat(7, minmax(0, 1fr))",
                    }}
                  >
                    {week.map(
                      (
                        day,
                        dayIndex,
                      ) => {
                        /*
                         * 365일 범위 밖 또는 미래 날짜
                         */
                        if (
                          day.isFuture ||
                          day.isBeforeData ||
                          day.level === null
                        ) {
                          return (
                            <div
                              key={dayIndex}
                              className="aspect-square w-full min-w-0 rounded-[3px] bg-transparent"
                            />
                          );
                        }

                        return (
                          <HeatCell
                            key={
                              formatHeatmapDateKey(
                                day.date,
                              )
                            }
                            level={
                              day.level
                            }
                            title={`${formatHeatmapDisplayDate(
                              day.date,
                            )} · ${getHeatmapLevelLabel(
                              day.level,
                            )}`}
                          />
                        );
                      },
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            하단 설명
           ================================================= */}
        <div className="flex flex-col gap-3 border-t border-[var(--waivs-border-soft)] bg-slate-50/50 px-5 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs font-medium text-slate-500">
            하루의 개발 활동이 많을수록 더 진한 색으로 표시됩니다.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <HeatmapActivitySummary
              label="개발일지"
              value={
                heatmapStats.devlogCount
              }
            />

            <HeatmapActivitySummary
              label="일정 완료"
              value={
                heatmapStats.scheduleDoneCount
              }
            />

            <HeatmapActivitySummary
              label="GitHub 커밋"
              value={
                heatmapStats.commitCount
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   히트맵 통계 카드
   ========================================================= */

function HeatmapMetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--waivs-border-soft)] bg-slate-50/70 px-4 py-3">
      <p className="text-[10px] font-bold text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-base font-black tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   하단 활동 요약
   ========================================================= */

function HeatmapActivitySummary({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
      <span className="font-semibold text-slate-400">
        {label}
      </span>

      <strong className="font-black text-slate-700">
        {value}건
      </strong>
    </div>
  );
}

/* =========================================================
   실제 잔디 셀

   width 고정 X
   부모의 53등분된 너비를 그대로 사용함.
   ========================================================= */

function HeatCell({
  level,
  title,
}: {
  level: HeatmapLevel;
  title?: string;
}) {
  const bgClass =
    level === 0
      ? "bg-slate-100"
      : level === 1
        ? "bg-[#E4EAFF]"
        : level === 2
          ? "bg-[#B8C5FF]"
          : level === 3
            ? "bg-[#8298FF]"
            : "bg-[#5873F9]";

  return (
    <div
      title={
        title ??
        getHeatmapLevelLabel(level)
      }
      aria-label={
        title ??
        getHeatmapLevelLabel(level)
      }
      className={[
        /*
         * 핵심
         *
         * h-4 w-4 같은 고정 크기 사용 안 함
         */
        "aspect-square w-full min-w-0 rounded-[3px]",
        "transition",
        "hover:z-10 hover:ring-2 hover:ring-[#5873F9]/25",
        bgClass,
      ].join(" ")}
    />
  );
}

/* =========================================================
   상단 범례 셀

   범례는 화면 크기에 따라 줄어들 필요 없으므로
   별도 고정 크기 사용
   ========================================================= */

function HeatLegendCell({
  level,
}: {
  level: HeatmapLevel;
}) {
  const bgClass =
    level === 0
      ? "bg-slate-100"
      : level === 1
        ? "bg-[#E4EAFF]"
        : level === 2
          ? "bg-[#B8C5FF]"
          : level === 3
            ? "bg-[#8298FF]"
            : "bg-[#5873F9]";

  return (
    <span
      className={[
        "block h-[11px] w-[11px] shrink-0 rounded-[3px]",
        bgClass,
      ].join(" ")}
    />
  );
}

/* =========================================================
   Date → YYYY-MM-DD

   날짜 비교/Map key용
   ========================================================= */

function formatHeatmapDateKey(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================================
   tooltip 표시용 날짜
   ========================================================= */

function formatHeatmapDisplayDate(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month =
    date.getMonth() + 1;

  const day =
    date.getDate();

  return `${year}.${month}.${day}`;
}

/* =========================================================
   활동 단계 문구
   ========================================================= */

function getHeatmapLevelLabel(
  level: HeatmapLevel,
) {
  if (level === 0) {
    return "활동 없음";
  }

  if (level === 1) {
    return "활동 1단계";
  }

  if (level === 2) {
    return "활동 2단계";
  }

  if (level === 3) {
    return "활동 3단계";
  }

  return "활동 4단계";
}
function GithubSection() {
  const [status, setStatus] = useState<GithubAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const githubName = getGithubAccountName(status);
  const isConnected = Boolean(status?.connected);

  const loadGithubStatus = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const nextStatus = await fetchGithubAccountStatusApi();

      setStatus(nextStatus);
    } catch (error) {
      setStatus({
        connected: false,
      });

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "GitHub 연결 상태를 확인하지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGithubStatus();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawResult = window.sessionStorage.getItem(
      OAUTH_RESULT_STORAGE_KEY,
    );

    if (!rawResult) return;

    window.sessionStorage.removeItem(
      OAUTH_RESULT_STORAGE_KEY,
    );

    try {
      const result = JSON.parse(rawResult);

      if (result.status === "success") {
        setMessage(
          "GitHub 계정 연결이 완료되었습니다.",
        );

        setErrorMessage("");

        loadGithubStatus();

        return;
      }

      if (result.status === "error") {
        setMessage("");

        setErrorMessage(
          result.message ||
            "GitHub 인증 처리 중 문제가 발생했습니다.",
        );
      }
    } catch {
      setErrorMessage(
        "GitHub 인증 결과를 확인하지 못했습니다.",
      );
    }
  }, []);

  const handleConnectGithub = () => {
    setMessage("");
    setErrorMessage("");

    openGithubAccountOAuth();
  };

  const handleDisconnectGithub = async () => {
    const confirmed = window.confirm(
      "GitHub 계정 연결을 해제할까요? 프로젝트에 연결된 저장소 정보는 별도로 유지됩니다.",
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setMessage("");
      setErrorMessage("");

      await disconnectGithubAccountApi();

      setStatus({
        connected: false,
      });

      setMessage(
        "GitHub 계정 연결이 해제되었습니다.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "GitHub 연결 해제에 실패했습니다.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="waivs-panel overflow-hidden">
      {/* ==========================================
          제목
         ========================================== */}
      <div className="p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#5873F9]">
          Connection
        </p>

        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
          GitHub 설정
        </h2>

        <p className="mt-1 max-w-[850px] text-sm font-medium leading-6 text-slate-500">
          마이페이지에서는 GitHub 계정 인증 상태를 관리합니다.
          프로젝트별 저장소 연결은 프로젝트 생성 또는 IDE에서 별도로
          설정합니다.
        </p>

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
            {errorMessage}
          </div>
        )}
      </div>

      {/* ==========================================
          GitHub 계정 연결 상태
         ========================================== */}
      <div className="border-y border-[var(--waivs-border-soft)] bg-slate-50/60 p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-900 text-white">
              {isConnected && status?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={status.avatarUrl}
                  alt="GitHub profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Github size={21} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-slate-950">
                  {loading
                    ? "GitHub 연결 상태 확인 중"
                    : isConnected
                      ? "GitHub 계정 연결됨"
                      : "GitHub 계정 미연결"}
                </p>

                <span
                  className={[
                    "rounded-full px-2.5 py-0.5 text-[10px] font-black",
                    isConnected
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white text-slate-500",
                  ].join(" ")}
                >
                  {isConnected
                    ? "CONNECTED"
                    : "NOT CONNECTED"}
                </span>
              </div>

              <p className="mt-1 text-sm font-medium text-slate-500">
                {isConnected
                  ? `${githubName || "GitHub 계정"} 계정으로 인증되어 있습니다.`
                  : "GitHub 계정을 연결하면 IDE에서 Pull, Push, 커밋 연동 기능을 사용할 수 있습니다."}
              </p>

              {isConnected && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {githubName && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#5873F9]">
                      @{githubName}
                    </span>
                  )}

                  {status?.email && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">
                      {status.email}
                    </span>
                  )}

                  {status?.connectedAt && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">
                      연결일{" "}
                      {formatDateLabel(
                        status.connectedAt,
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ======================================
              버튼
             ====================================== */}
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={loadGithubStatus}
              disabled={loading || actionLoading}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[var(--waivs-border)] bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              새로고침
            </button>

            {isConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleConnectGithub}
                  disabled={actionLoading}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8] disabled:opacity-60"
                >
                  다시 인증
                </button>

                <button
                  type="button"
                  onClick={handleDisconnectGithub}
                  disabled={actionLoading}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  연결 해제
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnectGithub}
                disabled={loading || actionLoading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8] disabled:opacity-60"
              >
                <Github size={15} />
                GitHub 연결
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          기능 설명
         ========================================== */}
      <div className="grid grid-cols-1 divide-y divide-[var(--waivs-border-soft)] md:grid-cols-3 md:divide-x md:divide-y-0">
        <GithubRoleItem
          label="마이페이지"
          title="GitHub 계정 인증"
          description="사용자 계정과 GitHub 계정을 연결합니다."
        />

        <GithubRoleItem
          label="프로젝트"
          title="저장소 URL 연결"
          description="프로젝트마다 서로 다른 Repository를 연결합니다."
        />

        <GithubRoleItem
          label="IDE"
          title="Pull / Push 실행"
          description="현재 프로젝트 저장소를 기준으로 Git 작업을 수행합니다."
        />
      </div>
    </section>
  );
}
function GithubRoleItem({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#5873F9]">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function AccountSection({
  user,
  onUserChange,
}: {
  user: User;
  onUserChange: React.Dispatch<React.SetStateAction<User | null>>;
}) {
  const [nickname, setNickname] = useState(user.nickname);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setNickname(user.nickname);
    setEmail(user.email);
  }, [user.nickname, user.email]);

  const resetNotice = () => {
    setMessage("");
    setErrorMessage("");
  };

  const handleChangeNickname = async () => {
    resetNotice();

    const nextNickname = nickname.trim();

    if (!nextNickname) {
      setErrorMessage("변경할 사용자명을 입력해주세요.");
      return;
    }

    if (nextNickname === user.nickname) {
      setErrorMessage("현재 사용자명과 동일합니다.");
      return;
    }

    if (nextNickname.length < 2 || nextNickname.length > 20) {
      setErrorMessage("사용자명은 2자 이상 20자 이하로 입력해주세요.");
      return;
    }

    try {
      setNicknameLoading(true);

      await changeMyNicknameApi(nextNickname);

      onUserChange((prev) =>
        prev
          ? {
              ...prev,
              nickname: nextNickname,
            }
          : prev,
      );

      setMessage("사용자명이 변경되었습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "사용자명 변경에 실패했습니다.",
      );
    } finally {
      setNicknameLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    resetNotice();

    const nextEmail = email.trim();

    if (!nextEmail) {
      setErrorMessage("변경할 이메일을 입력해주세요.");
      return;
    }

    if (nextEmail === user.email) {
      setErrorMessage("현재 이메일과 동일합니다.");
      return;
    }

    try {
      setEmailLoading(true);

      await changeMyEmailApi(nextEmail);

      onUserChange((prev) =>
        prev
          ? {
              ...prev,
              email: nextEmail,
            }
          : prev,
      );

      setMessage("이메일이 변경되었습니다. 다시 로그인해야 할 수 있습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "이메일 변경에 실패했습니다.",
      );
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async () => {
    resetNotice();

    if (!currentPassword.trim()) {
      setErrorMessage("현재 비밀번호를 입력해주세요.");
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage("새 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("새 비밀번호는 8자 이상으로 입력해주세요.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setErrorMessage("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      setPasswordLoading(true);

      await changeMyPasswordApi(currentPassword, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setMessage("비밀번호가 변경되었습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "비밀번호 변경에 실패했습니다.",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    resetNotice();

    const confirmed = window.confirm(
      "정말 회원 탈퇴를 진행할까요? 이 작업은 되돌릴 수 없습니다.",
    );

    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      "회원 탈퇴 시 계정 정보가 삭제됩니다. 계속 진행할까요?",
    );

    if (!doubleConfirmed) return;

    try {
      setDeleteLoading(true);

      await deleteMyAccountApi();

      localStorage.removeItem("accessToken");
      localStorage.removeItem("token");
      localStorage.removeItem("jwt");
      localStorage.removeItem("authToken");
      localStorage.removeItem("userId");

      window.location.href = "/login";
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "회원 탈퇴에 실패했습니다.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <section className="waivs-panel overflow-hidden">
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#5873F9]">
          Account
        </p>

        <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">
          계정 설정
        </h2>

        <p className="mt-0.5 text-xs font-medium text-slate-500">
          사용자 정보와 로그인 계정 정보를 확인하고 변경합니다.
        </p>

        {(message || errorMessage) && (
          <div
            className={[
              "mt-3 rounded-xl border px-4 py-3 text-sm font-bold",
              message
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700",
            ].join(" ")}
          >
            {message || errorMessage}
          </div>
        )}
      </div>

      <section className="border-t border-[var(--waivs-border-soft)] p-4">
        <div className="mb-3">
          <h3 className="text-sm font-black text-slate-900">
            사용자명 변경
          </h3>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            서비스 화면에 표시되는 사용자명을 변경합니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-[11px] font-black text-slate-500">
              사용자명
            </label>

            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={20}
              className="h-10 w-full rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
              placeholder="사용자명을 입력하세요"
            />
          </div>

          <button
            type="button"
            onClick={handleChangeNickname}
            disabled={nicknameLoading}
            className="h-10 shrink-0 rounded-xl bg-[#5873F9] px-4 text-sm font-black text-white transition hover:bg-[#4863E8] disabled:opacity-50"
          >
            {nicknameLoading ? "변경 중..." : "사용자명 변경"}
          </button>
        </div>
      </section>

      <section className="border-t border-[var(--waivs-border-soft)] p-4">
        <div className="mb-3">
          <h3 className="text-sm font-black text-slate-900">
            계정 정보
          </h3>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            가입일과 현재 계정 정보를 확인합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <AccountRow
            label="현재 사용자명"
            value={user.nickname}
            icon={UserRound}
          />

          <AccountRow
            label="가입일"
            value={formatDateLabel(user.createdAt)}
            icon={Settings}
          />
        </div>
      </section>

      <section className="border-t border-[var(--waivs-border-soft)] p-4">
        <div className="mb-3">
          <h3 className="text-sm font-black text-slate-900">
            이메일 변경
          </h3>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            로그인 계정에 사용할 이메일을 변경합니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-1.5 block text-[11px] font-black text-slate-500">
              이메일
            </label>

            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
              placeholder="이메일을 입력하세요"
            />
          </div>

          <button
            type="button"
            onClick={handleChangeEmail}
            disabled={emailLoading}
            className="h-10 shrink-0 rounded-xl bg-[#5873F9] px-4 text-sm font-black text-white transition hover:bg-[#4863E8] disabled:opacity-50"
          >
            {emailLoading ? "변경 중..." : "이메일 변경"}
          </button>
        </div>
      </section>

      <section className="border-t border-[var(--waivs-border-soft)] p-4">
        <div className="mb-3">
          <h3 className="text-sm font-black text-slate-900">
            비밀번호 변경
          </h3>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <PasswordField
            label="현재 비밀번호"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="현재 비밀번호"
          />

          <PasswordField
            label="새 비밀번호"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="8자 이상"
          />

          <PasswordField
            label="새 비밀번호 확인"
            value={newPasswordConfirm}
            onChange={setNewPasswordConfirm}
            placeholder="새 비밀번호 확인"
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={passwordLoading}
            className="h-10 rounded-xl bg-[#5873F9] px-4 text-sm font-black text-white transition hover:bg-[#4863E8] disabled:opacity-50"
          >
            {passwordLoading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </div>
      </section>

      <section className="border-t border-red-100 bg-red-50/30 p-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="text-sm font-black text-red-600">
              회원 탈퇴
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-500">
              계정을 삭제하면 복구할 수 없습니다. 필요한 데이터는 먼저
              백업해주세요.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="h-9 shrink-0 rounded-xl border border-red-200 bg-white px-4 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            {deleteLoading ? "처리 중..." : "회원 탈퇴"}
          </button>
        </div>
      </section>
    </section>
  );
}

function ActivityCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <article className="flex min-h-[66px] items-center gap-2.5 rounded-xl border border-[var(--waivs-border-soft)] bg-slate-50/70 px-3 py-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#EEF3FF] text-[#5873F9]">
        <Icon size={14} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold text-slate-400">
          {label}
        </p>

        <div className="mt-0.5 flex items-end gap-1.5">
          <p className="text-base font-black leading-none tracking-tight text-slate-950">
            {value}
          </p>

          <p className="hidden truncate text-[9px] font-semibold text-slate-400 2xl:block">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-black">{value}</p>
    </div>
  );
}


function AccountRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black text-slate-500">
        <Icon size={13} />
        {label}
      </div>

      <div className="flex h-10 items-center rounded-xl border border-[var(--waivs-border)] bg-slate-50 px-3 text-sm font-bold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-black text-slate-500">
        {label}
      </label>

      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-[var(--waivs-border)] bg-white px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-[var(--waivs-border)] bg-slate-50/70 px-6 py-10 text-center">
      <div className="max-w-[420px]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#EEF3FF] text-[#5873F9]">
          <CheckCircle2 size={20} />
        </div>

        <p className="mt-4 text-sm font-black text-slate-800">
          {message}
        </p>

        <p className="mt-1.5 text-xs font-medium leading-5 text-slate-400">
          새로운 데이터가 등록되면 이 영역에서 바로 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
