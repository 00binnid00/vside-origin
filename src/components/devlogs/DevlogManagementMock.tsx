"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  FilePenLine,
  FolderOpen,
  Loader2,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  createWorkspaceDevlogApi,
  fetchWorkspaceDevlogsApi,
  getMyWorkspacesByTokenApi,
} from "@/lib/ide/api";

import {
  fetchWorkspaceSchedulesApi,
  type ScheduleApiItem,
} from "@/lib/schedules/scheduleApi";

import type { DevlogFilter, DevlogItem, ScheduleOption } from "./devlog.types";

import {
  extractWorkspaceList,
  getTodayDateKey,
  normalizeWorkspaceId,
  scheduleStatusLabel,
  statusStyle,
} from "./devlog.utils";

import { CreateDevlogModal } from "./components/CreateDevlogModal";
import { DevlogDetailPanel } from "./components/DevlogDetailPanel";
import { DevlogEmptyBox } from "./components/DevlogEmptyBox";
import { DevlogFilterButton } from "./components/DevlogFilterButton";
import { DevlogListPanel } from "./components/DevlogListPanel";

type WorkspaceMode = "personal" | "team";
type ProjectFilter = "all" | WorkspaceMode;
type SidebarPanelMode = "projects" | "devlog";

type WorkspaceLike = {
  id?: string;
  uuid?: string;
  workspaceId?: string;
  name?: string;
  title?: string;
  projectName?: string;
  mode?: WorkspaceMode;
  type?: WorkspaceMode;
  role?: string;
  childCount?: number;
  subProjectCount?: number;
  childrenCount?: number;
  children?: unknown[];
};

type WorkspaceSidebarItem = {
  id: string;
  name: string;
  mode: WorkspaceMode;
  role?: string;
  childCount: number;
};

function mapScheduleFromApi(item: ScheduleApiItem): ScheduleOption {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    projectName: item.projectName || "프로젝트",
    title: item.title,
    status: item.status,
    hasDevlog: item.hasDevlog,
    startDate: item.startDate,
    endDate: item.endDate,
  };
}

function mapDevlogFromApi(item: any): DevlogItem {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    projectName: item.projectName ?? "프로젝트",
    title: item.title ?? "",
    content: item.content ?? "",
    date: item.date ?? item.workedDate,
    workedDate: item.workedDate ?? item.date,
    type: item.type ?? (item.scheduleId ? "linked" : "general"),
    scheduleId: item.scheduleId ?? null,
    scheduleTitle: item.scheduleTitle ?? null,
    status: item.status ?? item.scheduleStatus ?? null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function mapWorkspaceFromApi(item: WorkspaceLike): WorkspaceSidebarItem | null {
  const id = item.uuid || item.id || item.workspaceId;
  if (!id) return null;

  const mode = item.mode || item.type || "personal";

  return {
    id,
    name: item.name || item.title || item.projectName || "이름 없는 프로젝트",
    mode,
    role: item.role,
    childCount:
      item.childCount ??
      item.subProjectCount ??
      item.childrenCount ??
      (Array.isArray(item.children) ? item.children.length : 0),
  };
}

export default function DevlogManagementMock() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const workspaceId = normalizeWorkspaceId(
    searchParams.get("workspaceId") ?? searchParams.get("id"),
  );

  const [workspaces, setWorkspaces] = useState<WorkspaceSidebarItem[]>([]);
  const [workspaceName, setWorkspaceName] = useState("프로젝트");
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [devlogs, setDevlogs] = useState<DevlogItem[]>([]);

  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceErrorMessage, setWorkspaceErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedDevlogId, setSelectedDevlogId] = useState("");
  const [filter, setFilter] = useState<DevlogFilter>("all");
  const [query, setQuery] = useState("");

  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(true);
  const [sidebarPanelMode, setSidebarPanelMode] =
    useState<SidebarPanelMode>("projects");
  const [isDetailSidebarOpen, setIsDetailSidebarOpen] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formDate, setFormDate] = useState(getTodayDateKey());
  const [formScheduleId, setFormScheduleId] = useState("");
  const [formStatusChange, setFormStatusChange] = useState<
    "none" | "progress" | "done"
  >("none");

  const loadWorkspaces = async () => {
    try {
      setWorkspaceLoading(true);
      setWorkspaceErrorMessage("");

      const response = await getMyWorkspacesByTokenApi();
      const mapped = extractWorkspaceList(response)
        .map(mapWorkspaceFromApi)
        .filter((item): item is WorkspaceSidebarItem => Boolean(item));

      setWorkspaces(mapped);

      const matchedWorkspace = mapped.find(
        (workspace) => workspace.id === workspaceId,
      );

      if (matchedWorkspace) {
        setWorkspaceName(matchedWorkspace.name);
        return;
      }

      if (!workspaceId && mapped[0]) {
        const params = new URLSearchParams(searchParams.toString());

        params.set("workspaceId", mapped[0].id);
        params.set("mode", mapped[0].mode);

        setWorkspaceName(mapped[0].name);
        router.replace(`${pathname}?${params.toString()}`);
      }
    } catch {
      setWorkspaceErrorMessage("프로젝트 목록을 불러오지 못했습니다.");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const loadWorkspaceName = async () => {
    if (!workspaceId) {
      setWorkspaceName("프로젝트");
      return;
    }

    const matchedWorkspace = workspaces.find(
      (workspace) => workspace.id === workspaceId,
    );

    if (matchedWorkspace) {
      setWorkspaceName(matchedWorkspace.name);
      return;
    }

    try {
      const response = await getMyWorkspacesByTokenApi();
      const workspaceList = extractWorkspaceList(response);

      const matchedWorkspaceFromApi = workspaceList.find((workspace) => {
        return (
          workspace.uuid === workspaceId ||
          workspace.id === workspaceId ||
          workspace.workspaceId === workspaceId
        );
      });

      const name =
        matchedWorkspaceFromApi?.name ||
        matchedWorkspaceFromApi?.title ||
        matchedWorkspaceFromApi?.projectName;

      setWorkspaceName(name?.trim() || "프로젝트");
    } catch {
      setWorkspaceName("프로젝트");
    }
  };

  const loadDevlogData = async () => {
    if (!workspaceId) {
      setLoading(false);
      setErrorMessage(
        "workspaceId가 없습니다. 메인에서 프로젝트를 다시 선택해주세요.",
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const [scheduleResult, devlogResult] = await Promise.all([
        fetchWorkspaceSchedulesApi({ workspaceId }),
        fetchWorkspaceDevlogsApi(workspaceId),
      ]);

      const mappedSchedules = scheduleResult.map(mapScheduleFromApi);
      const mappedDevlogs = Array.isArray(devlogResult)
        ? devlogResult.map(mapDevlogFromApi)
        : [];

      setSchedules(mappedSchedules);
      setDevlogs(mappedDevlogs);

      const currentProjectName =
        mappedDevlogs[0]?.projectName || mappedSchedules[0]?.projectName;

      if (currentProjectName) {
        setWorkspaceName(currentProjectName);
      }

      setSelectedDevlogId((prev) => {
        if (prev && mappedDevlogs.some((item) => item.id === prev)) return prev;
        return mappedDevlogs[0]?.id ?? "";
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "개발일지 데이터를 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadWorkspaceName();
    void loadDevlogData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const noDevlogSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      const linkedByDevlog = devlogs.some(
        (devlog) => devlog.scheduleId === schedule.id,
      );

      return !schedule.hasDevlog && !linkedByDevlog;
    });
  }, [devlogs, schedules]);

  const filteredDevlogs = useMemo(() => {
    return devlogs.filter((item) => {
      const matchesFilter =
        filter === "all" || item.type === filter || item.status === filter;

      const keyword = query.trim().toLowerCase();

      const matchesQuery =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(keyword)) ||
        item.scheduleTitle?.toLowerCase().includes(keyword);

      return matchesFilter && matchesQuery;
    });
  }, [devlogs, filter, query]);

  const selectedDevlog =
    filteredDevlogs.find((item) => item.id === selectedDevlogId) ??
    filteredDevlogs[0] ??
    null;

  const totalDevlogs = filteredDevlogs.length;
  const linkedDevlogs = filteredDevlogs.filter(
    (item) => item.type === "linked",
  ).length;
  const generalDevlogs = filteredDevlogs.filter(
    (item) => item.type === "general",
  ).length;

  const currentWeekStart = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());

    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, "0");
    const date = String(start.getDate()).padStart(2, "0");

    return `${year}-${month}-${date}`;
  }, []);

  const weeklyDevlogs = filteredDevlogs.filter(
    (item) => item.workedDate >= currentWeekStart,
  ).length;

  const doneLinkedSchedules = filteredDevlogs.filter(
    (item) => item.type === "linked" && item.status === "done",
  ).length;

  const shouldShowDetailSidebar = isDetailSidebarOpen;

  const handleSelectWorkspace = (workspace: WorkspaceSidebarItem) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("workspaceId", workspace.id);
    params.set("mode", workspace.mode);

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSelectDevlog = (devlogId: string) => {
    setSelectedDevlogId(devlogId);
    setIsDetailSidebarOpen(true);
  };

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormDate(getTodayDateKey());
    setFormScheduleId("");
    setFormStatusChange("none");
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openCreateModalWithSchedule = (scheduleId: string) => {
    resetForm();
    setFormScheduleId(scheduleId);
    setFormStatusChange("progress");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (saving) return;
    setIsCreateModalOpen(false);
  };

  const createDevlog = async () => {
    if (!workspaceId) {
      alert("workspaceId가 없습니다. 메인에서 프로젝트를 다시 선택해주세요.");
      return;
    }

    if (!formTitle.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    if (!formDate) {
      alert("작업한 날짜를 선택해주세요.");
      return;
    }

    if (!formContent.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);

      const created = await createWorkspaceDevlogApi({
        workspaceId,
        scheduleId: formScheduleId || null,
        title: formTitle.trim(),
        content: formContent.trim(),
        workedDate: formDate,
        scheduleStatusAfterWrite: formScheduleId ? formStatusChange : "none",
      });

      const mapped = mapDevlogFromApi(created);

      setDevlogs((prev) => [mapped, ...prev]);
      setSelectedDevlogId(mapped.id);
      setIsDetailSidebarOpen(true);

      await loadDevlogData();

      resetForm();
      setIsCreateModalOpen(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "개발일지 저장에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-900">
      <div
        className={[
          "grid min-h-[calc(100vh-72px)] transition-all duration-300",
          isProjectSidebarOpen && shouldShowDetailSidebar
            ? "grid-cols-[300px_minmax(0,1fr)_340px]"
            : isProjectSidebarOpen
              ? "grid-cols-[300px_minmax(0,1fr)]"
              : shouldShowDetailSidebar
                ? "grid-cols-[84px_minmax(0,1fr)_340px]"
                : "grid-cols-[84px_minmax(0,1fr)]",
        ].join(" ")}
      >
        <DevlogProjectSidebar
          isOpen={isProjectSidebarOpen}
          panelMode={sidebarPanelMode}
          workspaces={workspaces}
          selectedWorkspaceId={workspaceId}
          workspaceLoading={workspaceLoading}
          workspaceErrorMessage={workspaceErrorMessage}
          noDevlogSchedules={noDevlogSchedules}
          onToggleOpen={() => setIsProjectSidebarOpen((prev) => !prev)}
          onChangePanelMode={(mode) => {
            setSidebarPanelMode(mode);
            setIsProjectSidebarOpen(true);
          }}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWithSchedule={openCreateModalWithSchedule}
        />

        <main className="min-w-0 bg-[#f5f6fa] p-6">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-5">
            <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-blue-600">Devlog</p>

                  <h1 className="mt-2 break-keep text-2xl font-black leading-snug text-slate-950">
                    {workspaceName}
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    일정에 연결된 일지는 작업 진행 근거로, 일반 일지는 회고와
                    오류 해결 기록으로 관리합니다.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-bold text-slate-500">
                    <span>
                      전체{" "}
                      <strong className="text-slate-950">
                        {totalDevlogs}개
                      </strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>
                      일정 연결{" "}
                      <strong className="text-slate-950">
                        {linkedDevlogs}개
                      </strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>
                      일반{" "}
                      <strong className="text-slate-950">
                        {generalDevlogs}개
                      </strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>
                      이번 주{" "}
                      <strong className="text-slate-950">
                        {weeklyDevlogs}개
                      </strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      완료 처리 {doneLinkedSchedules}개
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDetailSidebarOpen((prev) => !prev)}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    title={
                      shouldShowDetailSidebar
                        ? "상세 패널 닫기"
                        : "상세 패널 열기"
                    }
                  >
                    {shouldShowDetailSidebar ? (
                      <PanelRightClose size={18} />
                    ) : (
                      <PanelRightOpen size={18} />
                    )}
                    <span className="hidden 2xl:inline">
                      {shouldShowDetailSidebar ? "상세 닫기" : "상세 열기"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    <Plus size={18} />새 개발일지 작성
                  </button>
                </div>
              </div>
            </header>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-xl font-bold">개발일지 목록</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    일정 연결 여부와 진행 상태 기준으로 일지를 확인합니다.
                  </p>
                </div>

                <div className="relative w-full xl:w-[420px]">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="제목, 내용, 태그, 연결 일정 검색"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <DevlogFilterButton
                  active={filter === "all"}
                  label="전체"
                  onClick={() => setFilter("all")}
                />
                <DevlogFilterButton
                  active={filter === "linked"}
                  label="일정 연결"
                  onClick={() => setFilter("linked")}
                />
                <DevlogFilterButton
                  active={filter === "general"}
                  label="일반 일지"
                  onClick={() => setFilter("general")}
                />
                <DevlogFilterButton
                  active={filter === "progress"}
                  label="진행 중"
                  onClick={() => setFilter("progress")}
                />
                <DevlogFilterButton
                  active={filter === "done"}
                  label="완료"
                  onClick={() => setFilter("done")}
                />
              </div>

              <DataState loading={loading} errorMessage={errorMessage}>
                <div className="mt-6">
                  <DevlogListPanel
                    filteredDevlogs={filteredDevlogs}
                    selectedDevlog={selectedDevlog}
                    onSelectDevlog={handleSelectDevlog}
                  />
                </div>
              </DataState>
            </section>
          </div>
        </main>

        {shouldShowDetailSidebar && (
          <DevlogDetailPanel
            selectedDevlog={selectedDevlog}
            onClose={() => setIsDetailSidebarOpen(false)}
          />
        )}
      </div>

      {isCreateModalOpen && (
        <CreateDevlogModal
          selectedProjectName={workspaceName}
          visibleSchedules={schedules}
          formTitle={formTitle}
          formContent={formContent}
          formDate={formDate}
          formScheduleId={formScheduleId}
          formStatusChange={formStatusChange}
          saving={saving}
          onChangeTitle={setFormTitle}
          onChangeContent={setFormContent}
          onChangeDate={setFormDate}
          onChangeScheduleId={setFormScheduleId}
          onChangeStatus={setFormStatusChange}
          onClose={closeCreateModal}
          onSubmit={createDevlog}
        />
      )}
    </div>
  );
}

function DevlogProjectSidebar({
  isOpen,
  panelMode,
  workspaces,
  selectedWorkspaceId,
  workspaceLoading,
  workspaceErrorMessage,
  noDevlogSchedules,
  onToggleOpen,
  onChangePanelMode,
  onSelectWorkspace,
  onCreateWithSchedule,
}: {
  isOpen: boolean;
  panelMode: SidebarPanelMode;
  workspaces: WorkspaceSidebarItem[];
  selectedWorkspaceId: string;
  workspaceLoading: boolean;
  workspaceErrorMessage: string;
  noDevlogSchedules: ScheduleOption[];
  onToggleOpen: () => void;
  onChangePanelMode: (mode: SidebarPanelMode) => void;
  onSelectWorkspace: (workspace: WorkspaceSidebarItem) => void;
  onCreateWithSchedule: (scheduleId: string) => void;
}) {
  if (!isOpen) {
    return (
      <aside className="sticky top-[72px] h-[calc(100vh-72px)] bg-[#f5f6fa] px-6 pb-6 pt-4 pr-0">
        <div className="flex h-full w-[60px] flex-col items-center gap-3 rounded-[24px] border border-slate-200 bg-white py-4 shadow-sm">
          <button
            type="button"
            onClick={onToggleOpen}
            className="grid h-10 w-10 place-items-center rounded-2xl text-slate-600 hover:bg-slate-100"
            title="프로젝트 사이드바 펼치기"
          >
            <Menu size={19} />
          </button>

          <div className="h-px w-8 bg-slate-200" />

          <CollapsedSidebarButton
            active={panelMode === "projects"}
            icon={<FolderOpen size={18} />}
            title="프로젝트 목록"
            onClick={() => onChangePanelMode("projects")}
          />

          <CollapsedSidebarButton
            active={panelMode === "devlog"}
            icon={<FilePenLine size={18} />}
            title="일지 미작성 일정"
            count={noDevlogSchedules.length}
            onClick={() => onChangePanelMode("devlog")}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-[72px] h-[calc(100vh-72px)] bg-[#f5f6fa] px-6 pb-6 pt-4 pr-0">
      <div className="flex h-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex w-[52px] shrink-0 flex-col items-center gap-3 border-r border-slate-100 bg-white py-4">
          <button
            type="button"
            onClick={onToggleOpen}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
            title="프로젝트 사이드바 접기"
          >
            <Menu size={18} />
          </button>

          <div className="h-px w-7 bg-slate-200" />

          <CollapsedSidebarButton
            active={panelMode === "projects"}
            icon={<FolderOpen size={17} />}
            title="프로젝트 목록"
            onClick={() => onChangePanelMode("projects")}
          />

          <CollapsedSidebarButton
            active={panelMode === "devlog"}
            icon={<FilePenLine size={17} />}
            title="일지 미작성 일정"
            count={noDevlogSchedules.length}
            onClick={() => onChangePanelMode("devlog")}
          />
        </div>

        <div className="min-w-0 flex-1">
          {panelMode === "projects" && (
            <MainStyleProjectListPanel
              workspaces={workspaces}
              selectedWorkspaceId={selectedWorkspaceId}
              loading={workspaceLoading}
              errorMessage={workspaceErrorMessage}
              onSelectWorkspace={onSelectWorkspace}
              onClose={onToggleOpen}
            />
          )}

          {panelMode === "devlog" && (
            <NoDevlogSchedulePanel
              schedules={noDevlogSchedules}
              onCreateWithSchedule={onCreateWithSchedule}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

function CollapsedSidebarButton({
  active,
  icon,
  title,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`relative grid h-9 w-9 place-items-center rounded-xl transition ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      {icon}

      {typeof count === "number" && count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

function MainStyleProjectListPanel({
  workspaces,
  selectedWorkspaceId,
  loading,
  errorMessage,
  onSelectWorkspace,
  onClose,
}: {
  workspaces: WorkspaceSidebarItem[];
  selectedWorkspaceId: string;
  loading: boolean;
  errorMessage: string;
  onSelectWorkspace: (workspace: WorkspaceSidebarItem) => void;
  onClose: () => void;
}) {
  const [projectQuery, setProjectQuery] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>("all");

  const totalCount = workspaces.length;
  const personalCount = workspaces.filter(
    (workspace) => workspace.mode === "personal",
  ).length;
  const teamCount = workspaces.filter(
    (workspace) => workspace.mode === "team",
  ).length;

  const filteredWorkspaces = useMemo(() => {
    const keyword = projectQuery.trim().toLowerCase();

    return workspaces.filter((workspace) => {
      const matchFilter = filter === "all" || workspace.mode === filter;
      const matchKeyword =
        !keyword ||
        workspace.name.toLowerCase().includes(keyword) ||
        workspace.mode.toLowerCase().includes(keyword) ||
        workspace.role?.toLowerCase().includes(keyword);

      return matchFilter && matchKeyword;
    });
  }, [workspaces, projectQuery, filter]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-100 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-950">프로젝트</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              전체 {totalCount}개 · 개인 {personalCount}개 · 팀 {teamCount}개
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="프로젝트 사이드바 접기"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <div className="relative">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={projectQuery}
            onChange={(event) => setProjectQuery(event.target.value)}
            placeholder="프로젝트 검색"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </div>

        <div className="mt-3 grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
          <ProjectFilterButton
            active={filter === "all"}
            label="전체"
            onClick={() => setFilter("all")}
          />
          <ProjectFilterButton
            active={filter === "personal"}
            label="개인"
            onClick={() => setFilter("personal")}
          />
          <ProjectFilterButton
            active={filter === "team"}
            label="팀"
            onClick={() => setFilter("team")}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="grid h-40 place-items-center text-sm font-bold text-slate-400">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              프로젝트 불러오는 중
            </div>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-bold leading-5 text-rose-700">
            {errorMessage}
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <DevlogEmptyBox text="조건에 맞는 프로젝트가 없습니다." />
        ) : (
          <div className="flex flex-col gap-1">
            {filteredWorkspaces.map((workspace) => {
              const selected = workspace.id === selectedWorkspaceId;

              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => onSelectWorkspace(workspace)}
                  className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                    selected
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
                      selected
                        ? "bg-white text-blue-700"
                        : "bg-slate-100 text-blue-600"
                    }`}
                  >
                    {workspace.mode === "team" ? (
                      <UsersRound size={17} />
                    ) : (
                      <UserRound size={17} />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">
                      {workspace.name}
                    </span>
                    <span className="mt-1 block truncate text-xs font-medium text-slate-400">
                      {workspace.mode === "team" ? "팀" : "개인"} · 하위{" "}
                      {workspace.childCount}개
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectFilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-xl text-xs font-black transition ${
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function NoDevlogSchedulePanel({
  schedules,
  onCreateWithSchedule,
}: {
  schedules: ScheduleOption[];
  onCreateWithSchedule: (scheduleId: string) => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-100 p-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-blue-600">
          DEVLOG
        </p>
        <h2 className="mt-1 text-sm font-black text-slate-950">
          일지 미작성 일정
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          아직 개발일지가 연결되지 않은 일정입니다.
        </p>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500">미작성 일정</p>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-600">
              {schedules.length}개
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {schedules.length === 0 ? (
          <DevlogEmptyBox text="모든 일정에 개발일지가 작성되었습니다." />
        ) : (
          <div className="flex flex-col gap-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-black leading-5 text-slate-900">
                      {schedule.title}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {schedule.projectName}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${
                      statusStyle[schedule.status]
                    }`}
                  >
                    {scheduleStatusLabel[schedule.status]}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onCreateWithSchedule(schedule.id)}
                  className="mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-xl bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  <FilePenLine size={14} />이 일정으로 일지 작성
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DataState({
  loading,
  errorMessage,
  children,
}: {
  loading: boolean;
  errorMessage: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="mt-6 grid min-h-[320px] place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          개발일지 데이터를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
        {errorMessage}
      </div>
    );
  }

  return <>{children}</>;
}
