const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_BASE = `${BASE_URL}/api`;

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

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken")
  );
}

function getStoredUserId() {
  if (typeof window === "undefined") return null;

  return localStorage.getItem("userId");
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();

  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
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
 *
 * 우선 /api/users/me를 시도하고,
 * 백엔드에 me 엔드포인트가 없으면 localStorage의 userId로 /api/users/{userId}를 조회함.
 */
export async function fetchMyProfile(): Promise<UserMeResponse> {
  const meResponse = await authFetch(`${API_BASE}/users/me`);

  if (meResponse.ok) {
    return await meResponse.json();
  }

  const userId = getStoredUserId();

  if (!userId) {
    throw new Error("로그인 사용자 ID가 없습니다.");
  }

  const response = await authFetch(
    `${API_BASE}/users/${encodeURIComponent(userId)}`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "내 프로필 조회 실패"));
  }

  return await response.json();
}

/**
 * 내 워크스페이스 목록 조회
 *
 * 새 구조 기준:
 * GET /api/workspaces/me
 */
export async function fetchMyWorkspaces(): Promise<WorkspaceListResponse[]> {
  const response = await authFetch(`${API_BASE}/workspaces/me`);

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "워크스페이스 목록 조회 실패"),
    );
  }

  const data = await response.json();
  const workspaces = extractWorkspaceArray(data);

  return workspaces.map(normalizeWorkspace);
}

/**
 * 일정 진행률 조회
 *
 * 예전 progress 전용 API를 쓰지 않음.
 * 새 일정 API에서 전체 일정을 가져와서 프론트에서 계산함.
 *
 * GET /api/workspaces/{workspaceId}/schedules
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

  const response = await authFetch(
    `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/schedules`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "일정 진행률 조회 실패"));
  }

  const data = await response.json();
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
 *
 * 예전 주소:
 * /api/devlogs/workspaces/{workspaceId}
 *
 * 새 주소:
 * /api/workspaces/{workspaceId}/devlogs
 */
export async function fetchWorkspaceDevlogs(
  workspaceId: string,
): Promise<WorkspaceDevlogsResponse> {
  if (!workspaceId) {
    return [];
  }

  const response = await authFetch(
    `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/devlogs`,
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "개발일지 조회 실패"));
  }

  const data = (await response.json()) as WorkspaceDevlogsResponse;

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
 *
 * 백엔드 엔드포인트가 다르면 여기 URL만 맞추면 됨.
 */
export async function changeMyEmailApi(email: string) {
  const response = await authFetch(`${API_BASE}/users/me/email`, {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "이메일 변경 실패"));
  }

  return await response.json().catch(() => true);
}

/**
 * 비밀번호 변경
 *
 * 백엔드 엔드포인트가 다르면 여기 URL만 맞추면 됨.
 */
export async function changeMyPasswordApi(
  currentPassword: string,
  newPassword: string,
) {
  const response = await authFetch(`${API_BASE}/users/me/password`, {
    method: "PATCH",
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "비밀번호 변경 실패"));
  }

  return await response.json().catch(() => true);
}
/**
 * 회원 탈퇴
 *
 * 백엔드 엔드포인트가 다르면 여기 URL만 맞추면 됨.
 */
export async function deleteMyAccountApi() {
  const response = await authFetch(`${API_BASE}/users/me`, {
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

  const response = await authFetch(
    `${API_BASE}/workspaces/${encodeURIComponent(
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

