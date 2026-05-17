"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Code2,
  Download,
  Github,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Settings,
  UserRound,
} from "lucide-react";

import {
  changeMyEmailApi,
  changeMyPasswordApi,
  deleteMyAccountApi,
  fetchMyProfile,
  fetchMyWorkspaces,
  fetchScheduleProgress,
  fetchWorkspaceDevlogs,
  type MyPageDevlogResponse,
  type ScheduleProgressResponse,
  type ScheduleView,
  type UserMeResponse,
  type WorkspaceDevlogsResponse,
  type WorkspaceListResponse,
  type WorkspaceProjectResponse,
} from "@/components/mypage/api";

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
type ArchiveTabKey = "devlog" | "design" | "final";

const fallbackHeatmapValues: HeatmapLevel[] = [
  0, 1, 2, 0, 3, 1, 4, 2, 0, 1, 3, 0, 2, 1, 4, 3, 1, 0, 2, 4, 1, 0, 1, 3, 2, 0,
  1, 4, 2, 3, 0, 1, 2, 4, 3, 1, 0, 2, 3, 4, 1, 2, 3, 1, 0, 2, 4, 3, 1,
];

const tabs: {
  key: TabKey;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: "overview",
    label: "Overview",
    description: "전체 활동 요약",
    icon: LayoutDashboard,
  },
  {
    key: "progress",
    label: "진행 중 프로젝트",
    description: "현재 작업 중",
    icon: Clock3,
  },
  {
    key: "completed",
    label: "완료 프로젝트",
    description: "끝낸 작업",
    icon: CheckCircle2,
  },
  {
    key: "devlogs",
    label: "자료실",
    description: "문서화 자료",
    icon: BookOpen,
  },
  {
    key: "github",
    label: "GitHub 설정",
    description: "커밋 연동",
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
        `${workspace.name} 워크스페이스입니다.`,
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
    commitCount: 0,
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
  return value
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

export default function MyPageDemo() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [keyword, setKeyword] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [devlogs, setDevlogs] = useState<Devlog[]>([]);
  const [heatmapValues] = useState<HeatmapLevel[]>(fallbackHeatmapValues);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const progressProjects = useMemo(
    () => projects.filter((project) => project.status === "active"),
    [projects],
  );

  const completedProjects = useMemo(
    () => projects.filter((project) => project.status === "completed"),
    [projects],
  );

  const summary = useMemo(
    () => buildActivitySummary(projects, devlogs.length),
    [projects, devlogs.length],
  );

  useEffect(() => {
    let mounted = true;

    async function loadMyPage() {
      try {
        setLoading(true);
        setError("");

        const [profileDto, workspaceDtos] = await Promise.all([
          fetchMyProfile(),
          fetchMyWorkspaces(),
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
            "[mypage schedules] 일부 워크스페이스 일정 진행률 요청 실패:",
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
            "[mypage devlogs] 일부 워크스페이스 자료 요청 실패:",
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
      <main className="min-h-screen bg-blue-50 text-slate-950">
        <div className="mx-auto max-w-[1280px] px-6 py-8">
          <section className="rounded-2xl border border-blue-100 bg-white p-5 text-sm font-semibold text-slate-600 shadow-sm">
            마이페이지 불러오는 중...
          </section>
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="min-h-screen bg-blue-50 text-slate-950">
        <div className="mx-auto max-w-[1280px] px-6 py-8">
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 shadow-sm">
            {error || "사용자 정보를 불러오지 못했습니다."}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-blue-50 text-slate-950">
      <div className="mx-auto max-w-[1440px] px-6 py-8">
        <section className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-blue-100 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-white text-xl font-black shadow-sm">
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

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">
                  {user.nickname}님의 마이페이지
                </h2>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-slate-500">
                  Dev Activity
                </span>
              </div>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                프로젝트, 자료실, GitHub 활동을 한 곳에서 확인합니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 text-sm font-black text-slate-700 hover:bg-blue-50"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
              <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                My Page
              </p>

              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={[
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                        isActive
                          ? "bg-blue-950 text-white shadow-sm"
                          : "text-slate-600 hover:bg-blue-100 hover:text-slate-950",
                      ].join(" ")}
                    >
                      <Icon size={17} />

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black">
                          {tab.label}
                        </span>
                        <span
                          className={[
                            "mt-0.5 block text-[11px] font-semibold",
                            isActive ? "text-blue-100" : "text-slate-400",
                          ].join(" ")}
                        >
                          {tab.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-black">요약</p>

              <div className="mt-3 space-y-2">
                <SummaryCard
                  label="대표 언어"
                  value={summary.primaryLanguage}
                />
                <SummaryCard
                  label="진행 중 프로젝트"
                  value={`${summary.progressProjectCount}개`}
                />
                <SummaryCard
                  label="완료 프로젝트"
                  value={`${summary.completedProjectCount}개`}
                />
                <SummaryCard
                  label="자료실"
                  value={`${summary.devlogCount}개`}
                />
                <SummaryCard
                  label="완료 일정"
                  value={`${summary.doneScheduleCount}개`}
                />
              </div>
            </section>
          </aside>

          <section className="min-w-0 space-y-5">
            {activeTab === "overview" && (
              <OverviewSection
                summary={summary}
                progressProjects={progressProjects}
                devlogs={devlogs}
                heatmapValues={heatmapValues}
                keyword={keyword}
                onKeywordChange={setKeyword}
              />
            )}

            {activeTab === "progress" && (
              <ProjectSection
                title="진행 중 프로젝트"
                description="현재 작업 중인 프로젝트를 리스트 형태로 확인합니다."
                projects={progressProjects}
                emptyText="진행 중인 프로젝트가 없습니다."
                keyword={keyword}
                onKeywordChange={setKeyword}
              />
            )}

            {activeTab === "completed" && (
              <ProjectSection
                title="완료 프로젝트"
                description="완료한 프로젝트만 따로 분리해서 확인할 수 있습니다."
                projects={completedProjects}
                emptyText="완료한 프로젝트가 없습니다."
                keyword={keyword}
                onKeywordChange={setKeyword}
              />
            )}

            {activeTab === "devlogs" && (
              <ProjectArchiveSection
                devlogs={devlogs}
                projects={projects}
                keyword={keyword}
                onKeywordChange={setKeyword}
              />
            )}

            {activeTab === "github" && <GithubSection />}

            {activeTab === "account" && <AccountSection user={user} />}
          </section>
        </div>
      </div>
    </main>
  );
}

function OverviewSection({
  summary,
  progressProjects,
  devlogs,
  heatmapValues,
  keyword,
  onKeywordChange,
}: {
  summary: ActivitySummary;
  progressProjects: Project[];
  devlogs: Devlog[];
  heatmapValues: HeatmapLevel[];
  keyword: string;
  onKeywordChange: (value: string) => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-380px)] flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <ActivityCard
          label="진행 중"
          value={`${summary.progressProjectCount}개`}
          icon={Clock3}
          description="현재 작업 중"
        />
        <ActivityCard
          label="완료 일정"
          value={`${summary.doneScheduleCount}개`}
          icon={CheckCircle2}
          description="DONE 상태 기준"
        />
        <ActivityCard
          label="자료실"
          value={`${summary.devlogCount}개`}
          icon={BookOpen}
          description="전체 문서"
        />
        <ActivityCard
          label="커밋"
          value={`${summary.commitCount}개`}
          icon={Github}
          description="GitHub 연동 후 표시"
        />
      </div>

      <ProjectSection
        title="현재 작업 중"
        description="최근 활동이 있는 진행 중 프로젝트입니다."
        projects={progressProjects}
        emptyText="현재 작업 중인 프로젝트가 없습니다."
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        maxItems={4}
      />

      <HeatmapSection heatmapValues={heatmapValues} />

      <DevlogPreviewSection devlogs={devlogs} />
    </div>
  );
}

function ProjectSection({
  title,
  description,
  projects,
  emptyText,
  keyword,
  onKeywordChange,
  maxItems,
}: {
  title: string;
  description: string;
  projects: Project[];
  emptyText: string;
  keyword: string;
  onKeywordChange: (value: string) => void;
  maxItems?: number;
}) {
  const [projectTypeFilter, setProjectTypeFilter] =
    useState<ProjectTypeFilter>("all");

  const filteredProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    const result = projects.filter((project) => {
      const matchesType =
        projectTypeFilter === "all" ||
        (projectTypeFilter === "team" && project.type === "팀") ||
        (projectTypeFilter === "personal" && project.type === "개인");

      const matchesKeyword =
        !normalizedKeyword ||
        project.name.toLowerCase().includes(normalizedKeyword) ||
        (project.description || "").toLowerCase().includes(normalizedKeyword) ||
        (project.language || "").toLowerCase().includes(normalizedKeyword);

      return matchesType && matchesKeyword;
    });

    return typeof maxItems === "number" ? result.slice(0, maxItems) : result;
  }, [projects, projectTypeFilter, keyword, maxItems]);

  const projectTypeFilters: {
    key: ProjectTypeFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "all",
      label: "전체",
      count: projects.length,
    },
    {
      key: "personal",
      label: "개인",
      count: projects.filter((project) => project.type === "개인").length,
    },
    {
      key: "team",
      label: "팀",
      count: projects.filter((project) => project.type === "팀").length,
    },
  ];

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black tracking-tight text-slate-950">
              {title}
            </h3>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
              {filteredProjects.length}개
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {projectTypeFilters.map((filter) => {
            const isActive = projectTypeFilter === filter.key;

            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setProjectTypeFilter(filter.key)}
                className={[
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-black transition",
                  isActive
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-100"
                    : "border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200 hover:bg-blue-100",
                ].join(" ")}
              >
                <span>{filter.label}</span>
                <span
                  className={[
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white text-blue-600",
                  ].join(" ")}
                >
                  {filter.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="프로젝트 검색"
              className="h-9 w-full rounded-xl border border-blue-100 bg-blue-50 pl-10 pr-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white sm:w-[230px]"
            />
          </div>

          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-sm font-black text-white hover:bg-blue-900"
          >
            <Plus size={16} />새 프로젝트
          </button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState
          message={
            projects.length === 0
              ? emptyText
              : "검색 또는 선택한 구분에 해당하는 프로젝트가 없습니다."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-blue-100">
          <div className="hidden grid-cols-[1.4fr_90px_120px_120px_120px] border-b border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 md:grid">
            <span>프로젝트명</span>
            <span>구분</span>
            <span>진행률</span>
            <span>완료 일정</span>
            <span className="text-right">최근 수정일</span>
          </div>

          <div className="divide-y divide-blue-50 bg-white">
            {filteredProjects.map((project) => (
              <ProjectListRow
                key={`${project.workspaceId}-${project.id}`}
                project={project}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ProjectListRow({ project }: { project: Project }) {
  const isCompleted = project.status === "completed";
  const isTeam = project.type === "팀";

  return (
    <article className="grid grid-cols-1 gap-3 px-4 py-4 transition hover:bg-blue-50/70 md:grid-cols-[1.4fr_90px_120px_120px_120px] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <h4
            className={[
              "line-clamp-1 text-sm font-black",
              isCompleted ? "text-blue-700" : "text-slate-950",
            ].join(" ")}
          >
            {project.name}
          </h4>

          <span
            className={[
              "rounded-full px-2 py-0.5 text-[11px] font-black",
              isCompleted
                ? "bg-blue-100 text-blue-700"
                : "bg-sky-50 text-sky-700",
            ].join(" ")}
          >
            {isCompleted ? "완료" : "진행 중"}
          </span>
        </div>

        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
          {project.description || "설명이 없습니다."}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-black text-blue-700">
            {project.language || "Unknown"}
          </span>

          {project.stack.slice(0, 2).map((stack) => (
            <span
              key={stack}
              className="rounded-full border border-blue-100 bg-white px-2.5 py-0.5 text-[11px] font-black text-slate-500"
            >
              {stack}
            </span>
          ))}

          {project.stack.length > 2 && (
            <span className="rounded-full border border-blue-100 bg-white px-2.5 py-0.5 text-[11px] font-black text-slate-400">
              +{project.stack.length - 2}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between md:block">
        <span className="text-xs font-black text-slate-400 md:hidden">
          구분
        </span>
        <span
          className={[
            "inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-black",
            isTeam ? "bg-blue-100 text-blue-700" : "bg-sky-50 text-sky-700",
          ].join(" ")}
        >
          {project.type}
        </span>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-black">
          <span className="text-slate-400 md:hidden">진행률</span>
          <span className={isCompleted ? "text-blue-700" : "text-slate-700"}>
            {project.progress}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-blue-100">
          <div
            className={[
              "h-full rounded-full transition-all",
              isCompleted ? "bg-blue-600" : "bg-sky-500",
            ].join(" ")}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between md:block">
        <span className="text-xs font-black text-slate-400 md:hidden">
          완료 일정
        </span>
        <p className="text-sm font-black text-slate-800">
          {project.doneScheduleCount}/{project.scheduleTotalCount}개
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
          자료 {project.devlogCount}개
        </p>
      </div>

      <div className="flex items-center justify-between md:block md:text-right">
        <span className="text-xs font-black text-slate-400 md:hidden">
          최근 수정일
        </span>
        <span className="text-xs font-black text-slate-400">
          {formatDateLabel(project.updatedAt)}
        </span>
      </div>
    </article>
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
}: {
  devlogs: Devlog[];
  projects: Project[];
  keyword: string;
  onKeywordChange: (value: string) => void;
}) {
  const [activeArchiveTab, setActiveArchiveTab] =
    useState<ArchiveTabKey>("devlog");
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [sortType, setSortType] = useState<DevlogSortType>("latest");
  const [finalReportDraft, setFinalReportDraft] = useState("");

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const project of projects) {
      map.set(project.id, project.name);
    }

    for (const devlog of devlogs) {
      if (devlog.projectId && devlog.projectName) {
        map.set(devlog.projectId, devlog.projectName);
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [projects, devlogs]);

  const selectedProject = useMemo(() => {
    if (selectedProjectId === "all") return projects[0] ?? null;
    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  const filteredDevlogs = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return devlogs
      .filter((devlog) => {
        const matchesProject =
          selectedProjectId === "all" ||
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
      description: "요구사항·ERD·데이터 흐름",
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
    const selectedProjectName =
      selectedProjectId === "all"
        ? "전체 프로젝트"
        : selectedProject?.name || "선택된 프로젝트";

    const designSections = [
      {
        title: "요구사항 정의",
        body: "사용자, 프로젝트, 일정, 개발일지, 설계 자료를 프로젝트 단위로 관리할 수 있어야 합니다.",
      },
      {
        title: "기능 명세",
        body: "프로젝트 목록 조회, 개인/팀 필터링, 개발일지 문서화, 설계 문서 정리, 최종 보고서 생성 기능을 제공합니다.",
      },
      {
        title: "ERD",
        body: "사용자, 워크스페이스, 프로젝트, 일정, 개발일지, 설계 문서 엔티티를 중심으로 구성합니다. 실제 ERD 연결 시 이 영역에 이미지 또는 다이어그램 데이터를 표시하면 됩니다.",
      },
      {
        title: "데이터 플로우",
        body: "프로젝트 선택 후 일정/일지/설계 데이터가 워크스페이스 기준으로 조회되고, 자료실에서 문서 형태로 재구성됩니다.",
      },
    ];

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
        return designSections
          .map(
            (section, index) => `
              <article class="print-card">
                <div class="print-card-header">
                  <span class="index">${index + 1}</span>
                  <div>
                    <h2>${escapeHtml(section.title)}</h2>
                    <p class="meta">설계 문서</p>
                  </div>
                </div>
                <p class="body-text">${escapeHtmlWithLineBreaks(section.body)}</p>
              </article>
            `,
          )
          .join("");
      }

      const reportContent =
        finalReportDraft.trim() ||
        "AI 초안 생성 버튼을 눌러 최종 보고서 초안을 생성한 뒤 PDF로 저장할 수 있습니다.";

      return `
        <article class="print-card report-card">
          <h2>프로젝트 최종 보고서 초안</h2>
          <div class="report-text">${escapeHtmlWithLineBreaks(reportContent)}</div>
        </article>
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

            .print-card {
              break-inside: avoid;
              page-break-inside: avoid;
              padding: 18px 0;
              border-bottom: 1px solid #e5e7eb;
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

            .report-text {
              white-space: normal;
            }

            .empty {
              padding: 40px 0;
              color: #64748b;
              font-size: 14px;
              font-weight: 700;
              text-align: center;
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

  const handleGenerateFinalReport = () => {
    const projectName = selectedProject?.name ?? "선택된 프로젝트";
    const stack =
      selectedProject?.stack?.join(", ") || selectedProject?.language || "미정";
    const progress = selectedProject?.progress ?? 0;
    const doneScheduleCount = selectedProject?.doneScheduleCount ?? 0;
    const scheduleTotalCount = selectedProject?.scheduleTotalCount ?? 0;

    setFinalReportDraft(
      `프로젝트 최종 보고서 초안\n\n1. 프로젝트 개요\n${projectName}은(는) 프로젝트 관리, 개발 기록, 설계 자료 문서화를 지원하는 프로젝트입니다. 프로젝트 진행 과정에서 작성된 개발일지와 설계 정보를 바탕으로 최종 산출물을 정리합니다.\n\n2. 개발 목적\n프로젝트 진행 상황과 개발 기록을 한 곳에서 관리하고, 누적된 자료를 문서 형태로 확인할 수 있도록 하는 것을 목표로 합니다.\n\n3. 주요 기능\n- 프로젝트별 개발일지 관리\n- 설계 문서 정리\n- 프로젝트 진행률 및 완료 일정 요약\n- 최종 보고서 초안 생성 및 PDF 저장\n\n4. 기술 스택\n${stack}\n\n5. 개발 진행 요약\n현재 진행률은 ${progress}%이며, 완료 일정은 ${doneScheduleCount}/${scheduleTotalCount}개입니다. 작성된 개발일지는 ${filteredDevlogs.length}개입니다.\n\n6. 개발 결과\n프로젝트 자료실을 통해 개발일지, 설계 문서, 최종 보고서를 한 화면에서 확인할 수 있도록 구성했습니다.\n\n7. 향후 개선점\nAI 초안 생성 결과를 서버에 저장하고, Word 또는 PDF 파일 다운로드 기능으로 확장할 수 있습니다.`,
    );
  };

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div>
          <h3 className="text-lg font-black tracking-tight text-slate-950">
            프로젝트 자료실
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            개발일지, 설계 문서, 최종 보고서를 문서 형태로 확인합니다.
          </p>
        </div>

        <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
          {activeArchive?.label}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        {archiveTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeArchiveTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveArchiveTab(tab.key)}
              className={[
                "flex items-center gap-3 rounded-2xl border p-4 text-left transition",
                isActive
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-100"
                  : "border-blue-100 bg-blue-50 text-slate-700 hover:border-blue-200 hover:bg-blue-100",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  isActive ? "bg-white/20" : "bg-white text-blue-700",
                ].join(" ")}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black">{tab.label}</span>
                <span
                  className={[
                    "mt-0.5 block text-[11px] font-semibold",
                    isActive ? "text-blue-100" : "text-slate-500",
                  ].join(" ")}
                >
                  {tab.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,1fr)_150px] xl:w-[520px]">
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="h-9 rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
          >
            <option value="all">전체 프로젝트</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            value={sortType}
            onChange={(event) =>
              setSortType(event.target.value as DevlogSortType)
            }
            disabled={activeArchiveTab !== "devlog"}
            className="h-9 rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-400 focus:bg-white"
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="자료실 검색"
              className="h-9 w-full rounded-xl border border-blue-100 bg-blue-50 pl-10 pr-3 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white sm:w-[230px]"
            />
          </div>

          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-4 text-sm font-black text-blue-700 hover:bg-blue-50"
          >
            <Download size={16} />
            PDF 저장
          </button>
        </div>
      </div>

      {activeArchiveTab === "devlog" && (
        <ArchiveDevlogContent devlogs={filteredDevlogs} />
      )}

      {activeArchiveTab === "design" && (
        <ArchiveDesignContent selectedProject={selectedProject} />
      )}

      {activeArchiveTab === "final" && (
        <ArchiveFinalReportContent
          selectedProject={selectedProject}
          devlogCount={filteredDevlogs.length}
          draft={finalReportDraft}
          onDraftChange={setFinalReportDraft}
          onGenerate={handleGenerateFinalReport}
        />
      )}
    </section>
  );
}

function ArchiveDevlogContent({ devlogs }: { devlogs: Devlog[] }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-black text-slate-950">개발일지</h4>
          <p className="mt-0.5 text-sm font-semibold text-slate-500">
            일정 기반 일지와 일반 일지를 문서 형태로 모아 보여줍니다.
          </p>
        </div>
        <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
          {devlogs.length}개
        </span>
      </div>

      {devlogs.length === 0 ? (
        <EmptyState message="조건에 맞는 개발일지가 없습니다." />
      ) : (
        <div className="space-y-2.5">
          {devlogs.map((devlog) => (
            <DevlogCard key={devlog.id} devlog={devlog} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchiveDesignContent({
  selectedProject,
}: {
  selectedProject: Project | null;
}) {
  const designSections = [
    {
      title: "요구사항 정의",
      body: "사용자, 프로젝트, 일정, 개발일지, 설계 자료를 프로젝트 단위로 관리할 수 있어야 합니다.",
    },
    {
      title: "기능 명세",
      body: "프로젝트 목록 조회, 개인/팀 필터링, 개발일지 문서화, 설계 문서 정리, 최종 보고서 생성 기능을 제공합니다.",
    },
    {
      title: "ERD",
      body: "사용자, 워크스페이스, 프로젝트, 일정, 개발일지, 설계 문서 엔티티를 중심으로 구성합니다. 실제 ERD 연결 시 이 영역에 이미지 또는 다이어그램 데이터를 표시하면 됩니다.",
    },
    {
      title: "데이터 플로우",
      body: "프로젝트 선택 후 일정/일지/설계 데이터가 워크스페이스 기준으로 조회되고, 자료실에서 문서 형태로 재구성됩니다.",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-black text-blue-700">설계 문서</p>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {selectedProject
            ? `${selectedProject.name}의 설계 단계 자료를 문서화하는 영역입니다.`
            : "프로젝트를 선택하면 해당 프로젝트의 설계 문서를 확인할 수 있습니다."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {designSections.map((section, index) => (
          <article
            key={section.title}
            className="rounded-2xl border border-blue-100 bg-white p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
                {index + 1}
              </span>
              <h4 className="text-sm font-black text-slate-950">
                {section.title}
              </h4>
            </div>
            <p className="text-sm font-semibold leading-6 text-slate-500">
              {section.body}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ArchiveFinalReportContent({
  selectedProject,
  devlogCount,
  draft,
  onDraftChange,
  onGenerate,
}: {
  selectedProject: Project | null;
  devlogCount: number;
  draft: string;
  onDraftChange: (value: string) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <ArchiveMetricCard
          label="선택 프로젝트"
          value={selectedProject?.name ?? "전체 기준"}
        />
        <ArchiveMetricCard
          label="진행률"
          value={`${selectedProject?.progress ?? 0}%`}
        />
        <ArchiveMetricCard label="개발일지" value={`${devlogCount}개`} />
      </div> */}

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h4 className="text-base font-black text-slate-950">최종 보고서</h4>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              프로젝트 정보와 개발일지 요약을 기반으로 AI 초안 형태의 보고서를
              작성합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 text-sm font-black text-white hover:bg-blue-900"
          >
            <Sparkles size={16} />
            AI 초안 생성
          </button>
        </div>
      </div>

      <div className="min-h-screen rounded-2xl border border-blue-100 bg-white p-4 xl:min-h-[calc(100vh-200px)]">
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="AI 초안 생성 버튼을 누르면 최종 보고서 초안이 여기에 작성됩니다. 생성 후 직접 수정할 수 있습니다."
          className="h-full min-h-[600px] w-full resize-none border-0 bg-transparent text-sm font-semibold leading-7 text-slate-700 outline-none placeholder:text-slate-400 xl:min-h-[calc(100vh-360px)]"
        />
      </div>
    </div>
  );
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
    <article className="rounded-2xl border border-blue-100 bg-white p-4 transition hover:bg-blue-50">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <h4 className="text-sm font-black">{devlog.title}</h4>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-500">
              {devlog.projectName}
            </span>
          </div>

          <p className="text-sm font-semibold leading-5 text-slate-500">
            {devlog.summary}
          </p>
        </div>

        <span className="shrink-0 text-[11px] font-black text-slate-400">
          {devlog.date}
        </span>
      </div>
    </article>
  );
}

function HeatmapSection({ heatmapValues }: { heatmapValues: HeatmapLevel[] }) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-black tracking-tight">
            개발 활동 히트맵
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            자료 작성, 일정 완료, 프로젝트 생성, 커밋 기록 기준입니다.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400">
          <span>적음</span>
          <HeatCell level={0} />
          <HeatCell level={1} />
          <HeatCell level={2} />
          <HeatCell level={3} />
          <HeatCell level={4} />
          <span>많음</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-1.5">
          {heatmapValues.map((level, index) => (
            <HeatCell key={index} level={level} />
          ))}
        </div>
      </div>
    </section>
  );
}

function GithubSection() {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-lg font-black tracking-tight">GitHub 설정</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          GitHub 계정과 저장소 연동 상태를 관리합니다.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-950 text-white">
              <Github size={22} />
            </div>

            <div>
              <p className="text-sm font-black">GitHub 연동 준비 중</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-500">
                GitHub API를 연결하면 커밋 기록과 저장소 정보를 표시할 수
                있습니다.
              </p>
            </div>
          </div>

          <button className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-black text-white hover:bg-blue-900">
            GitHub 연결
          </button>
        </div>
      </div>
    </section>
  );
}

function AccountSection({ user }: { user: User }) {
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const resetNotice = () => {
    setMessage("");
    setErrorMessage("");
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
      setMessage("이메일이 변경되었습니다. 다시 로그인해야 할 수 있습니다.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "이메일 변경에 실패했습니다.",
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
    <section className="space-y-5">
      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-lg font-black tracking-tight">계정 설정</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            사용자명, 이메일, 가입일 정보를 확인하고 계정 정보를 변경합니다.
          </p>
        </div>

        {(message || errorMessage) && (
          <div
            className={[
              "mt-4 rounded-xl border px-4 py-3 text-sm font-bold",
              message
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700",
            ].join(" ")}
          >
            {message || errorMessage}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <AccountRow label="사용자명" value={user.nickname} icon={UserRound} />
          <AccountRow
            label="가입일"
            value={formatDateLabel(user.createdAt)}
            icon={Settings}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h4 className="text-base font-black text-slate-950">이메일 변경</h4>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            로그인 계정에 사용할 이메일을 변경합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1.5 block text-xs font-black text-slate-500">
              이메일
            </label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
              placeholder="이메일을 입력하세요"
            />
          </div>

          <button
            type="button"
            onClick={handleChangeEmail}
            disabled={emailLoading}
            className="self-end rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {emailLoading ? "변경 중..." : "이메일 변경"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h4 className="text-base font-black text-slate-950">비밀번호 변경</h4>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            현재 비밀번호 확인 후 새 비밀번호로 변경합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <PasswordField
            label="현재 비밀번호"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="현재 비밀번호"
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={passwordLoading}
              className="rounded-xl bg-blue-950 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {passwordLoading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h4 className="text-base font-black text-red-700">회원 탈퇴</h4>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              계정을 삭제하면 복구할 수 없습니다. 필요한 데이터는 먼저
              백업하세요.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
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
    <article className="flex min-h-[74px] items-center gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-950 text-white">
        <Icon size={15} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black text-slate-500">{label}</p>
        <div className="mt-0.5 flex items-end gap-1.5">
          <p className="truncate text-lg font-black leading-none tracking-tight">
            {value}
          </p>
          <p className="hidden truncate text-[10px] font-black leading-none text-slate-400 xl:block">
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

function HeatCell({ level }: { level: HeatmapLevel }) {
  const bgClass =
    level === 0
      ? "bg-slate-200"
      : level === 1
        ? "bg-blue-100"
        : level === 2
          ? "bg-blue-300"
          : level === 3
            ? "bg-blue-500"
            : "bg-blue-700";

  return (
    <div
      title={`활동 ${level}`}
      className={`h-3.5 w-3.5 rounded-[4px] border border-white ${bgClass}`}
    />
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
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-600">
        <Icon size={16} />
        {label}
      </div>

      <div className="rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 text-sm font-black text-slate-800">
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
      <label className="mb-1.5 block text-xs font-black text-slate-500">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-blue-100 bg-blue-50 px-3 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-blue-100 bg-blue-50 px-4 py-8 text-center">
      <p className="text-sm font-black text-slate-500">{message}</p>
    </div>
  );
}
