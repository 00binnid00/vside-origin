import { apiFetch, apiJson } from "@/lib/api/apiClient";

export type ScheduleView = "personal" | "team";

export type UserMeResponse = {
  id: string | number;
  email: string;
  nickname: string;
  profileImageUrl?: string | null;
  createdAt?: string;
};

export type WorkspaceProjectResponse = {
  id: string;
  name: string;
  description?: string | null;
  language?: string | null;
  stack?: string[];
  status?: string | null;
  progress?: number | null;
  updatedAt?: string | null;
  devlogCount?: number | null;
};

export type WorkspaceListResponse = {
  id: string;
  uuid?: string;
  name: string;
  description?: string | null;
  mode: ScheduleView;
  role?: "owner" | "member" | string;
  updatedAt?: string | null;
  projects?: WorkspaceProjectResponse[];
};

export type ScheduleProgressResponse = {
  totalCount: number;
  doneCount: number;
  progress: number;
};

export type MyPageDevlogResponse = Record<string, unknown>;

export type WorkspaceDevlogsResponse =
  | MyPageDevlogResponse[]
  | {
      devlogs?: MyPageDevlogResponse[];
      data?: MyPageDevlogResponse[];
      content?: MyPageDevlogResponse[];
      list?: MyPageDevlogResponse[];
      workspaceId?: string;
      workspaceName?: string;
      name?: string;
      [key: string]: unknown;
    };

export type GithubAccountStatus = {
  connected: boolean;
  username?: string | null;
  login?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  connectedAt?: string | null;
};

export type ActivityHeatmapLevel = 0 | 1 | 2 | 3 | 4;

export type ActivityHeatmapDayResponse = {
  date: string;
  count: number;
  level: ActivityHeatmapLevel;
};

export type ActivityHeatmapResponse = {
  days: ActivityHeatmapDayResponse[];
  totalActivityCount: number;
  activeDays: number;
  devlogCount: number;
  scheduleDoneCount: number;
  commitCount: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function normalizeHeatmapLevel(value: unknown): ActivityHeatmapLevel {
  const level = Number(value);

  if (!Number.isFinite(level)) return 0;
  if (level <= 0) return 0;
  if (level === 1) return 1;
  if (level === 2) return 2;
  if (level === 3) return 3;
  return 4;
}

function normalizeActivityHeatmapResponse(
  value: unknown,
): ActivityHeatmapResponse {
  if (!isRecord(value)) {
    return {
      days: [],
      totalActivityCount: 0,
      activeDays: 0,
      devlogCount: 0,
      scheduleDoneCount: 0,
      commitCount: 0,
    };
  }

  const rawDays = Array.isArray(value.days)
    ? value.days
    : Array.isArray(value.data)
      ? value.data
      : [];

  const days = rawDays
    .filter(isRecord)
    .map((day) => ({
      date: getStringValue(day.date),
      count: Number(day.count ?? day.activityCount ?? 0),
      level: normalizeHeatmapLevel(day.level),
    }))
    .filter((day) => day.date);

  return {
    days,
    totalActivityCount: Number(value.totalActivityCount ?? 0),
    activeDays: Number(value.activeDays ?? 0),
    devlogCount: Number(value.devlogCount ?? 0),
    scheduleDoneCount: Number(value.scheduleDoneCount ?? 0),
    commitCount: Number(value.commitCount ?? 0),
  };
}

/**
 * 마이페이지 개발 활동 히트맵 조회
 *
 * GET /api/users/me/activity/heatmap?days=49
 */
export async function fetchMyActivityHeatmapApi(
  days = 49,
): Promise<ActivityHeatmapResponse> {
  const data = await apiJson(
    `/api/users/me/activity/heatmap?days=${encodeURIComponent(days)}`,
    {
      cache: "no-store",
    },
  );

  return normalizeActivityHeatmapResponse(data);
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function readOptionalJson(response: Response) {
  const text = await response.text().catch(() => "");

  if (!text) {
    return true;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeWorkspaceMode(value: unknown): ScheduleView {
  const raw = String(value ?? "").toLowerCase();

  if (raw === "team" || raw === "팀") return "team";
  return "personal";
}

function normalizeWorkspaceRole(value: unknown) {
  const raw = String(value ?? "").toLowerCase();

  if (raw === "owner") return "owner";
  return "member";
}

function normalizeProject(project: unknown): WorkspaceProjectResponse {
  if (!isRecord(project)) {
    return {
      id: crypto.randomUUID(),
      name: "이름 없는 프로젝트",
      language: "Unknown",
      stack: ["Unknown"],
      status: "active",
      progress: 0,
      devlogCount: 0,
    };
  }

  const id =
    getStringValue(project.id) ||
    getStringValue(project.uuid) ||
    getStringValue(project.projectId) ||
    crypto.randomUUID();

  const name =
    getStringValue(project.name) ||
    getStringValue(project.projectName) ||
    getStringValue(project.title) ||
    "이름 없는 프로젝트";

  const language =
    getStringValue(project.language) ||
    getStringValue(project.languageType) ||
    "Unknown";

  const stackValue = project.stack;

  const stack = Array.isArray(stackValue)
    ? stackValue.map((item) => String(item)).filter(Boolean)
    : language
      ? [language]
      : ["Unknown"];

  return {
    id,
    name,
    description:
      getStringValue(project.description) ||
      getStringValue(project.summary) ||
      "",
    language,
    stack,
    status:
      getStringValue(project.status) ||
      getStringValue(project.projectStatus) ||
      "active",
    progress:
      typeof project.progress === "number" ? project.progress : undefined,
    updatedAt:
      getStringValue(project.updatedAt) ||
      getStringValue(project.modifiedAt) ||
      undefined,
    devlogCount:
      typeof project.devlogCount === "number" ? project.devlogCount : 0,
  };
}

function normalizeWorkspace(workspace: unknown): WorkspaceListResponse {
  if (!isRecord(workspace)) {
    return {
      id: crypto.randomUUID(),
      name: "이름 없는 워크스페이스",
      mode: "personal",
      role: "member",
      projects: [],
    };
  }

  const id =
    getStringValue(workspace.id) ||
    getStringValue(workspace.uuid) ||
    getStringValue(workspace.workspaceId) ||
    crypto.randomUUID();

  const name =
    getStringValue(workspace.name) ||
    getStringValue(workspace.workspaceName) ||
    getStringValue(workspace.title) ||
    "이름 없는 워크스페이스";

  const rawProjects = Array.isArray(workspace.projects)
    ? workspace.projects
    : Array.isArray(workspace.projectList)
      ? workspace.projectList
      : [];

  return {
    id,
    uuid: getStringValue(workspace.uuid) || id,
    name,
    description:
      getStringValue(workspace.description) ||
      getStringValue(workspace.summary) ||
      "",
    mode: normalizeWorkspaceMode(workspace.mode ?? workspace.type),
    role: normalizeWorkspaceRole(workspace.role),
    updatedAt:
      getStringValue(workspace.updatedAt) ||
      getStringValue(workspace.modifiedAt) ||
      undefined,
    projects: rawProjects.map(normalizeProject),
  };
}

function extractWorkspaceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (isRecord(value)) {
    if (Array.isArray(value.workspaces)) return value.workspaces;
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.content)) return value.content;
    if (Array.isArray(value.list)) return value.list;
  }

  return [];
}

function extractDevlogArray(
  value: WorkspaceDevlogsResponse,
): MyPageDevlogResponse[] {
  if (Array.isArray(value)) return value;

  if (isRecord(value)) {
    if (Array.isArray(value.devlogs)) return value.devlogs;
    if (Array.isArray(value.data)) return value.data;
    if (Array.isArray(value.content)) return value.content;
    if (Array.isArray(value.list)) return value.list;
  }

  return [];
}

/**
 * 내 프로필 조회
 */
export async function fetchMyProfile(): Promise<UserMeResponse> {
  const data = (await apiJson("/api/auth/me", {
    cache: "no-store",
  })) as UserMeResponse;

  return data;
}

/**
 * 내 워크스페이스 목록 조회
 */
export async function fetchMyWorkspaces(): Promise<WorkspaceListResponse[]> {
  const data = await apiJson("/api/workspaces/me", {
    cache: "no-store",
  });

  const workspaces = extractWorkspaceArray(data);

  return workspaces.map(normalizeWorkspace);
}

/**
 * 일정 진행률 조회
 */
export async function fetchScheduleProgress(
  _view: ScheduleView,
  workspaceId: string,
): Promise<ScheduleProgressResponse> {
  if (!workspaceId) {
    return {
      totalCount: 0,
      doneCount: 0,
      progress: 0,
    };
  }

  const data = await apiJson(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/schedules`,
    {
      cache: "no-store",
    },
  );

  const schedules = Array.isArray(data) ? data : [];

  const totalCount = schedules.length;

  const doneCount = schedules.filter((schedule) => {
    if (!isRecord(schedule)) return false;

    const status = String(schedule.status ?? "").toLowerCase();

    return status === "done" || status === "완료";
  }).length;

  return {
    totalCount,
    doneCount,
    progress: totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100),
  };
}

/**
 * 워크스페이스별 개발일지 조회
 */
export async function fetchWorkspaceDevlogs(
  workspaceId: string,
): Promise<WorkspaceDevlogsResponse> {
  if (!workspaceId) {
    return [];
  }

  const data = (await apiJson(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/devlogs`,
    {
      cache: "no-store",
    },
  )) as WorkspaceDevlogsResponse;

  const devlogs = extractDevlogArray(data);

  if (Array.isArray(data)) {
    return devlogs;
  }

  return {
    ...data,
    devlogs,
  };
}

/**
 * 이메일 변경
 */
export async function changeMyEmailApi(email: string) {
  const response = await apiFetch("/api/users/me/email", {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "이메일 변경 실패"));
  }

  return await readOptionalJson(response);
}

/**
 * 비밀번호 변경
 */
export async function changeMyPasswordApi(
  currentPassword: string,
  newPassword: string,
) {
  const response = await apiFetch("/api/users/me/password", {
    method: "PATCH",
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "비밀번호 변경 실패"));
  }

  return await readOptionalJson(response);
}

/**
 * 회원 탈퇴
 */
export async function deleteMyAccountApi() {
  const response = await apiFetch("/api/users/me", {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "회원 탈퇴 실패"));
  }

  return true;
}

export async function generateFinalReportDraftApi({
  workspaceId,
  project,
  devlogs,
  requirements,
  apiSpecs,
  erdTables,
  flowNodes,
}: {
  workspaceId: string;
  project: {
    name: string;
    description?: string;
    type?: string;
    language?: string;
    stack?: string[];
    progress?: number;
    doneScheduleCount?: number;
    scheduleTotalCount?: number;
    devlogCount?: number;
  };
  devlogs: {
    title: string;
    date?: string;
    projectName?: string;
    summary?: string;
  }[];
  requirements: {
    category?: string;
    name: string;
    description?: string;
  }[];
  apiSpecs: {
    method?: string;
    endpoint: string;
    description?: string;
    request?: string;
    response?: string;
  }[];
  erdTables: {
    name: string;
    columns: {
      name: string;
      type?: string;
      pk?: boolean;
      fk?: boolean;
    }[];
  }[];
  flowNodes: {
    label: string;
    type?: string;
    techStack?: string;
  }[];
}) {
  if (!workspaceId) {
    throw new Error("AI 초안을 생성할 프로젝트를 선택해주세요.");
  }

  const response = await apiFetch(
    `/api/workspaces/${encodeURIComponent(
      workspaceId,
    )}/archive/final-report/draft`,
    {
      method: "POST",
      body: JSON.stringify({
        project,
        devlogs,
        requirements,
        apiSpecs,
        erdTables,
        flowNodes,
      }),
    },
  );

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      message ||
        `AI 최종 보고서 초안 생성에 실패했습니다. 상태 코드: ${response.status}`,
    );
  }

  if (!contentType.includes("application/json")) {
    const text = await response.text();

    throw new Error(
      [
        "AI 최종 보고서 API 응답이 JSON 형식이 아닙니다.",
        "프론트가 백엔드가 아닌 Next 서버로 요청하고 있거나, 백엔드 라우팅이 맞지 않을 수 있습니다.",
        text.slice(0, 300),
      ].join("\n"),
    );
  }

  return response.json() as Promise<{ draft: string }>;
}

export async function fetchGithubAccountStatusApi(): Promise<GithubAccountStatus> {
  const response = await apiFetch("/api/github/status", {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 404) {
    return {
      connected: false,
    };
  }

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "GitHub 연결 상태 조회 실패"),
    );
  }

  const data = await response.json();

  return {
    connected: Boolean(data.connected ?? data.linked ?? data.githubLinked),
    username: data.username ?? data.githubUsername ?? data.login ?? null,
    login: data.login ?? null,
    email: data.email ?? data.githubEmail ?? null,
    avatarUrl:
      data.avatarUrl ?? data.profileImageUrl ?? data.githubAvatarUrl ?? null,
    connectedAt: data.connectedAt ?? data.updatedAt ?? null,
  };
}

export async function disconnectGithubAccountApi() {
  const response = await apiFetch("/api/github/link", {
    method: "DELETE",
    cache: "no-store",
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(await readErrorMessage(response, "GitHub 연결 해제 실패"));
  }

  return true;
}