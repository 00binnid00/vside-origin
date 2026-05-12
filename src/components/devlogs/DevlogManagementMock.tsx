"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  FileText,
  Link2,
  Loader2,
  NotebookPen,
  Plus,
  RefreshCw,
  Search,
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

import type {
  DevlogFilter,
  DevlogItem,
  ScheduleOption,
  ScheduleStatus,
} from "./devlog.types";

import {
  extractWorkspaceList,
  getTodayDateKey,
  normalizeWorkspaceId,
} from "./devlog.utils";

import { CreateDevlogModal } from "./components/CreateDevlogModal";
import { DevlogDetailPanel } from "./components/DevlogDetailPanel";
import { DevlogEmptyBox } from "./components/DevlogEmptyBox";
import { DevlogFilterButton } from "./components/DevlogFilterButton";
import { DevlogListPanel } from "./components/DevlogListPanel";
import { DevlogStatCard } from "./components/DevlogStatCard";
import { DevlogSupportPanel } from "./components/DevlogSupportPanel";
import { DevlogSupportRail } from "./components/DevlogSupportRail";

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

export default function DevlogManagementMock() {
  const searchParams = useSearchParams();

  const workspaceId = normalizeWorkspaceId(
    searchParams.get("workspaceId") ?? searchParams.get("id"),
  );

  const [workspaceName, setWorkspaceName] = useState("프로젝트");
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [devlogs, setDevlogs] = useState<DevlogItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedDevlogId, setSelectedDevlogId] = useState("");
  const [filter, setFilter] = useState<DevlogFilter>("all");
  const [query, setQuery] = useState("");

  const [isSupportPinned, setIsSupportPinned] = useState(false);
  const [isSupportHovering, setIsSupportHovering] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formDate, setFormDate] = useState(getTodayDateKey());
  const [formScheduleId, setFormScheduleId] = useState("");
  const [formStatusChange, setFormStatusChange] = useState<
    "none" | "progress" | "done"
  >("none");

  const loadWorkspaceName = async () => {
    if (!workspaceId) {
      setWorkspaceName("프로젝트");
      return;
    }

    try {
      const response = await getMyWorkspacesByTokenApi();
      const workspaces = extractWorkspaceList(response);

      const matchedWorkspace = workspaces.find((workspace) => {
        return (
          workspace.uuid === workspaceId ||
          workspace.id === workspaceId ||
          workspace.workspaceId === workspaceId
        );
      });

      const name =
        matchedWorkspace?.name ||
        matchedWorkspace?.title ||
        matchedWorkspace?.projectName;

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

  const isSupportPanelVisible = isSupportPinned || isSupportHovering;

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
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <div className="grid min-h-screen grid-cols-[56px_minmax(0,1fr)]">
        <DevlogSupportRail
          isPinned={isSupportPinned}
          noDevlogCount={noDevlogSchedules.length}
          onMouseEnter={() => setIsSupportHovering(true)}
          onMouseLeave={() => setIsSupportHovering(false)}
          onTogglePin={() => setIsSupportPinned((prev) => !prev)}
        />

        {isSupportPanelVisible && (
          <DevlogSupportPanel
            isPinned={isSupportPinned}
            noDevlogSchedules={noDevlogSchedules}
            onCreateWithSchedule={openCreateModalWithSchedule}
            onMouseEnter={() => setIsSupportHovering(true)}
            onMouseLeave={() => setIsSupportHovering(false)}
            onClose={() => {
              setIsSupportPinned(false);
              setIsSupportHovering(false);
            }}
            onPin={() => setIsSupportPinned(true)}
          />
        )}

        <main className="min-w-0 p-6">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
            <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <p className="text-sm font-bold text-blue-600">Devlog</p>
                  <p className="mt-2 text-sm text-slate-500">
                    프로젝트:{" "}
                    <span className="text-xl font-bold text-slate-900">
                      {workspaceName}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    일정에 연결된 일지는 작업 진행 근거로, 일반 일지는 회고와
                    오류 해결 기록으로 관리합니다.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadDevlogData}
                    className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                    title="새로고침"
                  >
                    <RefreshCw size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                  >
                    <Plus size={17} />새 개발일지 작성
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <DevlogStatCard
                  title="전체 일지"
                  value={`${totalDevlogs}개`}
                  icon={<FileText size={20} />}
                />
                <DevlogStatCard
                  title="일정 연결 일지"
                  value={`${linkedDevlogs}개`}
                  icon={<Link2 size={20} />}
                />
                <DevlogStatCard
                  title="일반 일지"
                  value={`${generalDevlogs}개`}
                  icon={<NotebookPen size={20} />}
                />
                <DevlogStatCard
                  title="이번 주 작성"
                  value={`${weeklyDevlogs}개`}
                  icon={<CalendarCheck size={20} />}
                  subText={`완료 처리 ${doneLinkedSchedules}개`}
                />
              </div>
            </header>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                  <DevlogListPanel
                    filteredDevlogs={filteredDevlogs}
                    selectedDevlog={selectedDevlog}
                    onSelectDevlog={setSelectedDevlogId}
                  />

                  <DevlogDetailPanel selectedDevlog={selectedDevlog} />
                </div>
              </DataState>
            </section>
          </div>
        </main>
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
