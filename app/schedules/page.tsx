"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  FolderOpen,
  ListTodo,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { MonthlyCalendarBarView } from "@/components/schedules/MonthlyCalendarBarView";

import {
  boardColumnStyle,
  calendarEventStyle,
  formatDateKey,
  getWeekDays,
  scheduleStatusLabel,
  statusBadgeStyle,
  type ScheduleItem,
  type ScheduleStatus,
} from "@/components/schedules/scheduleMockData";

import {
  createWorkspaceScheduleApi,
  deleteScheduleApi,
  fetchWorkspaceSchedulesApi,
  updateScheduleApi,
  updateSchedulePeriodApi,
  updateScheduleStatusApi,
  type ScheduleApiItem,
} from "@/lib/schedules/scheduleApi";

import { getMyWorkspacesByTokenApi } from "@/lib/ide/api";

type ScheduleViewMode = "calendar" | "month" | "board" | "list";
type WorkspaceMode = "personal" | "team";
type ProjectFilter = "all" | WorkspaceMode;
type SidebarPanelMode = "projects" | "today" | "devlog";
type TodayScheduleScope = "selected" | "all";

type ProjectScheduleItem = ScheduleItem & {
  workspaceId: string;
  projectName: string;
  customProjectName?: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
};

type CreateScheduleForm = {
  title: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  description: string;
};

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

const DETAIL_SIDEBAR_DEFAULT_WIDTH = 320;
const DETAIL_SIDEBAR_MIN_WIDTH = 300;
const DETAIL_SIDEBAR_MAX_WIDTH = 620;

function getTodayLocalDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getDateKeyFromDate(date: Date) {
  return formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

function normalizeWorkspaceId(value: string | null) {
  if (!value) return "";
  if (value === "undefined" || value === "null") return "";
  return value;
}

function extractWorkspaceList(value: unknown): WorkspaceLike[] {
  if (Array.isArray(value)) return value as WorkspaceLike[];

  if (value && typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    if (Array.isArray(objectValue.workspaces)) {
      return objectValue.workspaces as WorkspaceLike[];
    }

    if (Array.isArray(objectValue.data)) {
      return objectValue.data as WorkspaceLike[];
    }

    if (Array.isArray(objectValue.content)) {
      return objectValue.content as WorkspaceLike[];
    }

    if (Array.isArray(objectValue.list)) {
      return objectValue.list as WorkspaceLike[];
    }
  }

  return [];
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

function mapScheduleFromApi(item: ScheduleApiItem): ProjectScheduleItem {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    projectName: item.projectName,
    customProjectName: item.customProjectName,
    title: item.title,
    description: item.description,
    date: item.startDate,
    startDate: item.startDate,
    endDate: item.endDate,
    status: item.status,
    hasDevlog: item.hasDevlog,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function getScheduleStartDate(schedule: ProjectScheduleItem) {
  return schedule.startDate ?? schedule.date;
}

function getScheduleEndDate(schedule: ProjectScheduleItem) {
  return schedule.endDate ?? schedule.date;
}

function getSchedulePeriodText(schedule: ProjectScheduleItem) {
  const startDate = getScheduleStartDate(schedule);
  const endDate = getScheduleEndDate(schedule);

  return endDate !== startDate ? `${startDate} ~ ${endDate}` : startDate;
}

function isDateInScheduleRange(schedule: ProjectScheduleItem, dateKey: string) {
  const startDate = getScheduleStartDate(schedule);
  const endDate = getScheduleEndDate(schedule);

  return startDate <= dateKey && dateKey <= endDate;
}

function isScheduleVisibleInWeek(
  schedule: ProjectScheduleItem,
  weekStartKey: string,
  weekEndKey: string,
) {
  const startDate = getScheduleStartDate(schedule);
  const endDate = getScheduleEndDate(schedule);

  return startDate <= weekEndKey && endDate >= weekStartKey;
}

function getProjectName(schedule: ProjectScheduleItem | null) {
  if (!schedule) return "프로젝트 없음";

  return schedule.customProjectName || schedule.projectName || "프로젝트 없음";
}

export default function ScheduleManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const workspaceId = normalizeWorkspaceId(
    searchParams.get("workspaceId") ?? searchParams.get("id"),
  );

  const today = useMemo(() => getTodayLocalDate(), []);
  const todayDate = useMemo(() => getDateKeyFromDate(today), [today]);

  const [workspaces, setWorkspaces] = useState<WorkspaceSidebarItem[]>([]);
  const [workspaceName, setWorkspaceName] = useState("프로젝트");

  const [schedules, setSchedules] = useState<ProjectScheduleItem[]>([]);
  const [allProjectTodaySchedules, setAllProjectTodaySchedules] = useState<
    ProjectScheduleItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [allTodayLoading, setAllTodayLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");
  const [allTodayErrorMessage, setAllTodayErrorMessage] = useState("");
  const [workspaceErrorMessage, setWorkspaceErrorMessage] = useState("");

  const [viewMode, setViewMode] = useState<ScheduleViewMode>("calendar");
  const [query, setQuery] = useState("");

  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null,
  );

  const [baseWeekDate, setBaseWeekDate] = useState<Date>(() =>
    getTodayLocalDate(),
  );

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(true);
  const [sidebarPanelMode, setSidebarPanelMode] =
    useState<SidebarPanelMode>("projects");

  const [isDetailSidebarOpen, setIsDetailSidebarOpen] = useState(true);
  const [detailSidebarWidth, setDetailSidebarWidth] = useState(
    DETAIL_SIDEBAR_DEFAULT_WIDTH,
  );

  const [isDetailSidebarResizing, setIsDetailSidebarResizing] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [editingSchedule, setEditingSchedule] =
    useState<ProjectScheduleItem | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [createForm, setCreateForm] = useState<CreateScheduleForm>({
    title: "",
    startDate: todayDate,
    endDate: todayDate,
    status: "todo",
    description: "",
  });

  const [editForm, setEditForm] = useState<CreateScheduleForm>({
    title: "",
    startDate: todayDate,
    endDate: todayDate,
    status: "todo",
    description: "",
  });

  const loadAllProjectTodaySchedules = async (
    workspaceList: WorkspaceSidebarItem[],
  ) => {
    if (workspaceList.length === 0) {
      setAllProjectTodaySchedules([]);
      setAllTodayLoading(false);
      return;
    }

    try {
      setAllTodayLoading(true);
      setAllTodayErrorMessage("");

      const results = await Promise.allSettled(
        workspaceList.map((workspace) =>
          fetchWorkspaceSchedulesApi({
            workspaceId: workspace.id,
          }),
        ),
      );

      const merged = results.flatMap((result) => {
        if (result.status !== "fulfilled") return [];

        return result.value.map(mapScheduleFromApi);
      });

      const todayItems = merged
        .filter((item) => isDateInScheduleRange(item, todayDate))
        .sort((a, b) => {
          const statusOrder: Record<ScheduleStatus, number> = {
            delayed: 0,
            progress: 1,
            todo: 2,
            done: 3,
          };

          const statusCompare = statusOrder[a.status] - statusOrder[b.status];

          if (statusCompare !== 0) {
            return statusCompare;
          }

          return getScheduleStartDate(a).localeCompare(getScheduleStartDate(b));
        });

      setAllProjectTodaySchedules(todayItems);
    } catch {
      setAllTodayErrorMessage(
        "전체 프로젝트의 오늘 일정을 불러오지 못했습니다.",
      );
    } finally {
      setAllTodayLoading(false);
    }
  };

  const loadWorkspaces = async () => {
    try {
      setWorkspaceLoading(true);
      setWorkspaceErrorMessage("");

      const response = await getMyWorkspacesByTokenApi();

      const mapped = extractWorkspaceList(response)
        .map(mapWorkspaceFromApi)
        .filter((item): item is WorkspaceSidebarItem => Boolean(item));

      setWorkspaces(mapped);

      void loadAllProjectTodaySchedules(mapped);

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
      setAllTodayLoading(false);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const loadSchedules = async () => {
    if (!workspaceId) {
      setLoading(false);

      setErrorMessage(
        "workspaceId가 없습니다. 왼쪽 프로젝트 목록에서 프로젝트를 선택해주세요.",
      );

      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const data = await fetchWorkspaceSchedulesApi({
        workspaceId,
      });

      const mapped = data.map(mapScheduleFromApi);

      setSchedules(mapped);

      const currentProjectName =
        mapped[0]?.customProjectName || mapped[0]?.projectName;

      if (currentProjectName) {
        setWorkspaceName(currentProjectName);
      }

      setSelectedScheduleId((prev) => {
        if (prev && mapped.some((item) => item.id === prev)) {
          return prev;
        }

        return mapped[0]?.id ?? null;
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "일정 목록을 불러오지 못했습니다.",
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
    const matchedWorkspace = workspaces.find(
      (workspace) => workspace.id === workspaceId,
    );

    if (matchedWorkspace) {
      setWorkspaceName(matchedWorkspace.name);
    }

    void loadSchedules();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const filteredSchedules = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return schedules.filter((item) => {
      const projectName = getProjectName(item);

      return (
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        projectName.toLowerCase().includes(keyword)
      );
    });
  }, [schedules, query]);

  const selectedSchedule =
    schedules.find((item) => item.id === selectedScheduleId) ?? null;

  const selectedProjectName =
    selectedSchedule?.projectName ||
    schedules[0]?.projectName ||
    workspaceName ||
    "프로젝트";

  const totalCount = filteredSchedules.length;

  const progressCount = filteredSchedules.filter(
    (item) => item.status === "progress",
  ).length;

  const doneCount = filteredSchedules.filter(
    (item) => item.status === "done",
  ).length;

  const delayedCount = filteredSchedules.filter(
    (item) => item.status === "delayed",
  ).length;

  const progressRate =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const todayTodos = filteredSchedules.filter(
    (item) => isDateInScheduleRange(item, todayDate) && item.status !== "done",
  );

  const selectedProjectTodaySchedules = schedules
    .filter((item) => isDateInScheduleRange(item, todayDate))
    .sort((a, b) => {
      const statusOrder: Record<ScheduleStatus, number> = {
        delayed: 0,
        progress: 1,
        todo: 2,
        done: 3,
      };

      const statusCompare = statusOrder[a.status] - statusOrder[b.status];

      if (statusCompare !== 0) {
        return statusCompare;
      }

      return getScheduleStartDate(a).localeCompare(getScheduleStartDate(b));
    });

  const noDevlogSchedules = filteredSchedules.filter((item) => !item.hasDevlog);

  const recentDoneSchedule =
    filteredSchedules.find((item) => item.status === "done") ?? null;

  const shouldShowDetailSidebar = Boolean(
    isDetailSidebarOpen && selectedSchedule,
  );

  const layoutGridTemplateColumns = useMemo(() => {
    const leftColumn = isProjectSidebarOpen ? "300px" : "84px";

    if (shouldShowDetailSidebar) {
      return `${leftColumn} minmax(0, 1fr) ${detailSidebarWidth}px`;
    }

    return `${leftColumn} minmax(0, 1fr)`;
  }, [detailSidebarWidth, isProjectSidebarOpen, shouldShowDetailSidebar]);

  const handleDetailSidebarResizeStart = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    setIsDetailSidebarResizing(true);
  };

  useEffect(() => {
    if (!isDetailSidebarResizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = window.innerWidth - event.clientX;

      const limitedWidth = Math.min(
        DETAIL_SIDEBAR_MAX_WIDTH,
        Math.max(DETAIL_SIDEBAR_MIN_WIDTH, nextWidth),
      );

      setDetailSidebarWidth(limitedWidth);
    };

    const handlePointerUp = () => {
      setIsDetailSidebarResizing(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDetailSidebarResizing]);

  const weekDays = getWeekDays(baseWeekDate);

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const handleSelectWorkspace = (workspace: WorkspaceSidebarItem) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("workspaceId", workspace.id);
    params.set("mode", workspace.mode);

    router.push(`${pathname}?${params.toString()}`);
  };

  const updateScheduleInState = (updated: ProjectScheduleItem) => {
    setSchedules((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );

    setAllProjectTodaySchedules((prev) => {
      const isTodaySchedule = isDateInScheduleRange(updated, todayDate);

      const exists = prev.some((item) => item.id === updated.id);

      if (!isTodaySchedule) {
        return prev.filter((item) => item.id !== updated.id);
      }

      if (exists) {
        return prev.map((item) => (item.id === updated.id ? updated : item));
      }

      return [updated, ...prev];
    });
  };

  const removeScheduleFromState = (scheduleId: string) => {
    setSchedules((prev) => {
      const next = prev.filter((item) => item.id !== scheduleId);

      setSelectedScheduleId((currentId) => {
        if (currentId !== scheduleId) return currentId;

        return next[0]?.id ?? null;
      });

      if (next.length === 0) {
        setIsDetailSidebarOpen(false);
      }

      return next;
    });

    setAllProjectTodaySchedules((prev) =>
      prev.filter((item) => item.id !== scheduleId),
    );
  };

  const openScheduleDetail = (id: string) => {
    setSelectedScheduleId(id);
    setIsDetailSidebarOpen(true);
  };

  const changeStatus = async (id: string, status: ScheduleStatus) => {
    try {
      const updated = await updateScheduleStatusApi({
        scheduleId: id,
        status,
      });

      updateScheduleInState(mapScheduleFromApi(updated));
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "일정 상태 변경에 실패했습니다.",
      );
    }
  };

  const moveScheduleDate = async (id: string, nextStartDate: string) => {
    const target = schedules.find((item) => item.id === id);

    if (!target) return;

    const currentStartDate = getScheduleStartDate(target);
    const currentEndDate = getScheduleEndDate(target);

    const startTime = new Date(currentStartDate).getTime();
    const endTime = new Date(currentEndDate).getTime();

    const durationDays = Math.max(
      0,
      Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)),
    );

    const nextStart = new Date(nextStartDate);
    const nextEnd = new Date(nextStart);

    nextEnd.setDate(nextStart.getDate() + durationDays);

    const nextEndDate = formatDateKey(
      nextEnd.getFullYear(),
      nextEnd.getMonth(),
      nextEnd.getDate(),
    );

    try {
      const updated = await updateSchedulePeriodApi({
        scheduleId: id,
        startDate: nextStartDate,
        endDate: nextEndDate,
      });

      updateScheduleInState(mapScheduleFromApi(updated));
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "일정 날짜 변경에 실패했습니다.",
      );
    }
  };

  const openCreateModal = () => {
    const defaultDate =
      viewMode === "month"
        ? formatDateKey(currentYear, currentMonth, 1)
        : getDateKeyFromDate(baseWeekDate);

    setCreateForm({
      title: "",
      startDate: defaultDate,
      endDate: defaultDate,
      status: "todo",
      description: "",
    });

    setIsCreateModalOpen(true);
  };

  const createSchedule = async () => {
    if (!workspaceId) {
      alert(
        "workspaceId가 없습니다. 왼쪽 프로젝트 목록에서 프로젝트를 선택해주세요.",
      );
      return;
    }

    if (!createForm.title.trim()) {
      alert("일정 제목을 입력해주세요.");
      return;
    }

    if (!createForm.startDate) {
      alert("시작일을 선택해주세요.");
      return;
    }

    if (!createForm.endDate) {
      alert("종료일을 선택해주세요.");
      return;
    }

    if (createForm.startDate > createForm.endDate) {
      alert("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    try {
      setSaving(true);

      const created = await createWorkspaceScheduleApi({
        workspaceId,
        title: createForm.title.trim(),
        description:
          createForm.description.trim() || "등록된 상세 내용이 없습니다.",
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        status: createForm.status,
      });

      const mapped = mapScheduleFromApi(created);

      setSchedules((prev) => [mapped, ...prev]);

      if (isDateInScheduleRange(mapped, todayDate)) {
        setAllProjectTodaySchedules((prev) => [mapped, ...prev]);
      }

      setWorkspaceName(mapped.projectName || workspaceName);

      setSelectedScheduleId(mapped.id);
      setIsDetailSidebarOpen(true);
      setIsCreateModalOpen(false);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "일정 생성에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (schedule: ProjectScheduleItem) => {
    setEditingSchedule(schedule);

    setEditForm({
      title: schedule.title,
      startDate: getScheduleStartDate(schedule),
      endDate: getScheduleEndDate(schedule),
      status: schedule.status,
      description: schedule.description || "",
    });

    setIsEditModalOpen(true);
  };

  const updateSchedule = async () => {
    if (!editingSchedule) return;

    if (!editForm.title.trim()) {
      alert("일정 제목을 입력해주세요.");
      return;
    }

    if (!editForm.startDate) {
      alert("시작일을 선택해주세요.");
      return;
    }

    if (!editForm.endDate) {
      alert("종료일을 선택해주세요.");
      return;
    }

    if (editForm.startDate > editForm.endDate) {
      alert("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    try {
      setSaving(true);

      const updated = await updateScheduleApi({
        scheduleId: editingSchedule.id,
        title: editForm.title.trim(),
        description:
          editForm.description.trim() || "등록된 상세 내용이 없습니다.",
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        status: editForm.status,
      });

      const mapped = mapScheduleFromApi(updated);

      updateScheduleInState(mapped);

      setSelectedScheduleId(mapped.id);
      setIsDetailSidebarOpen(true);

      setIsEditModalOpen(false);
      setEditingSchedule(null);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "일정 수정에 실패했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    const target = schedules.find((item) => item.id === scheduleId);

    const title = target?.title ?? "선택한 일정";

    if (
      !window.confirm(
        `'${title}' 일정을 삭제할까요? 삭제 후 복구할 수 없습니다.`,
      )
    ) {
      return;
    }

    try {
      setDeleting(true);

      await deleteScheduleApi({
        scheduleId,
      });

      removeScheduleFromState(scheduleId);

      setIsEditModalOpen(false);

      if (editingSchedule?.id === scheduleId) {
        setEditingSchedule(null);
      }
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "일정 삭제에 실패했습니다.",
      );
    } finally {
      setDeleting(false);
    }
  };

  const markDevlogWritten = () => {
    alert("개발일지 작성은 개발일지 화면에서 연결 일정으로 작성해주세요.");
  };

  const moveWeek = (amount: number) => {
    const nextDate = new Date(baseWeekDate);

    nextDate.setDate(baseWeekDate.getDate() + amount * 7);

    setBaseWeekDate(nextDate);
  };

  const moveMonth = (amount: number) => {
    const nextDate = new Date(currentYear, currentMonth + amount, 1);

    setCurrentYear(nextDate.getFullYear());
    setCurrentMonth(nextDate.getMonth());
  };

  const goToday = () => {
    const nextToday = getTodayLocalDate();

    if (viewMode === "month") {
      setCurrentYear(nextToday.getFullYear());
      setCurrentMonth(nextToday.getMonth());
    } else {
      setBaseWeekDate(nextToday);
    }
  };

  return (
    <div className="waivs-page text-slate-900">
      <div
        className={[
          "grid min-h-[calc(100dvh-72px)]",
          isDetailSidebarResizing
            ? "transition-none"
            : "transition-[grid-template-columns] duration-300",
        ].join(" ")}
        style={{
          gridTemplateColumns: layoutGridTemplateColumns,
        }}
      >
        <ScheduleProjectSidebar
          isOpen={isProjectSidebarOpen}
          panelMode={sidebarPanelMode}
          workspaces={workspaces}
          selectedWorkspaceId={workspaceId}
          workspaceLoading={workspaceLoading}
          workspaceErrorMessage={workspaceErrorMessage}
          todayTodos={todayTodos}
          noDevlogSchedules={noDevlogSchedules}
          onToggleOpen={() => setIsProjectSidebarOpen((prev) => !prev)}
          onChangePanelMode={(mode) => {
            setSidebarPanelMode(mode);
            setIsProjectSidebarOpen(true);
          }}
          onSelectWorkspace={handleSelectWorkspace}
          onSelectSchedule={openScheduleDetail}
          onMarkDevlogWritten={markDevlogWritten}
        />

        {viewMode === "month" ? (
          <MonthlySchedulePageView
            currentYear={currentYear}
            currentMonth={currentMonth}
            todayDate={todayDate}
            schedules={filteredSchedules}
            selectedScheduleId={selectedScheduleId}
            loading={loading}
            errorMessage={errorMessage}
            onReload={loadSchedules}
            onBackToWeek={() => setViewMode("calendar")}
            onCreateSchedule={openCreateModal}
            onMoveMonth={moveMonth}
            onGoToday={goToday}
            onSelectSchedule={openScheduleDetail}
            onMoveScheduleDate={moveScheduleDate}
          />
        ) : (
          <WeeklySchedulePageView
            viewMode={viewMode}
            setViewMode={setViewMode}
            query={query}
            setQuery={setQuery}
            selectedProjectName={selectedProjectName}
            totalCount={totalCount}
            progressCount={progressCount}
            doneCount={doneCount}
            delayedCount={delayedCount}
            progressRate={progressRate}
            recentDoneSchedule={recentDoneSchedule}
            filteredSchedules={filteredSchedules}
            selectedScheduleId={selectedScheduleId}
            selectedProjectTodaySchedules={selectedProjectTodaySchedules}
            allProjectTodaySchedules={allProjectTodaySchedules}
            allTodayLoading={allTodayLoading}
            allTodayErrorMessage={allTodayErrorMessage}
            todayDate={todayDate}
            weekDays={weekDays}
            weekStartLabel={`${weekStart.month + 1}월 ${weekStart.date}일`}
            weekEndLabel={`${weekEnd.month + 1}월 ${weekEnd.date}일`}
            loading={loading}
            errorMessage={errorMessage}
            onOpenMonth={() => setViewMode("month")}
            onCreateSchedule={openCreateModal}
            onMoveWeek={moveWeek}
            onGoToday={goToday}
            onSelectSchedule={openScheduleDetail}
            onMoveScheduleDate={moveScheduleDate}
            onChangeStatus={changeStatus}
            onEditSchedule={openEditModal}
            onDeleteSchedule={deleteSchedule}
          />
        )}

        {shouldShowDetailSidebar && (
          <ScheduleDetailAside
            selectedSchedule={selectedSchedule}
            onResizeStart={handleDetailSidebarResizeStart}
            onClose={() => setIsDetailSidebarOpen(false)}
            onChangeStatus={changeStatus}
            onEditSchedule={openEditModal}
            onDeleteSchedule={deleteSchedule}
            deleting={deleting}
            onMarkDevlogWritten={markDevlogWritten}
          />
        )}
      </div>

      {isCreateModalOpen && (
        <CreateScheduleModal
          form={createForm}
          saving={saving}
          projectName={selectedProjectName}
          onChange={setCreateForm}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={createSchedule}
        />
      )}

      {isEditModalOpen && editingSchedule && (
        <ScheduleFormModal
          mode="edit"
          form={editForm}
          saving={saving}
          projectName={getProjectName(editingSchedule)}
          onChange={setEditForm}
          onClose={() => {
            if (saving) return;

            setIsEditModalOpen(false);
            setEditingSchedule(null);
          }}
          onSubmit={updateSchedule}
        />
      )}
    </div>
  );
}

function ScheduleProjectSidebar({
  isOpen,
  panelMode,
  workspaces,
  selectedWorkspaceId,
  workspaceLoading,
  workspaceErrorMessage,
  todayTodos,
  noDevlogSchedules,
  onToggleOpen,
  onChangePanelMode,
  onSelectWorkspace,
  onSelectSchedule,
  onMarkDevlogWritten,
}: {
  isOpen: boolean;
  panelMode: SidebarPanelMode;
  workspaces: WorkspaceSidebarItem[];
  selectedWorkspaceId: string;
  workspaceLoading: boolean;
  workspaceErrorMessage: string;
  todayTodos: ProjectScheduleItem[];
  noDevlogSchedules: ProjectScheduleItem[];
  onToggleOpen: () => void;
  onChangePanelMode: (mode: SidebarPanelMode) => void;
  onSelectWorkspace: (workspace: WorkspaceSidebarItem) => void;
  onSelectSchedule: (id: string) => void;
  onMarkDevlogWritten: () => void;
}) {
  if (!isOpen) {
    return (
      <aside className="sticky top-5 h-[calc(100dvh-112px)] self-start pt-5 pl-5">
        <div className="waivs-sidebar flex h-full w-[60px] flex-col items-center gap-3 overflow-hidden py-4">
          <button
            type="button"
            onClick={onToggleOpen}
            className="grid h-9 w-9 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            title="프로젝트 사이드바 펼치기"
            aria-label="프로젝트 사이드바 펼치기"
          >
            <PanelLeftOpen size={17} strokeWidth={2.4} />
          </button>

          <div className="h-px w-7 bg-[var(--waivs-border)]" />

          <CollapsedSidebarButton
            active={panelMode === "projects"}
            icon={<FolderOpen size={17} />}
            title="프로젝트 목록"
            onClick={() => onChangePanelMode("projects")}
          />

          <CollapsedSidebarButton
            active={panelMode === "today"}
            icon={<ListTodo size={17} />}
            title="오늘 할 일"
            count={todayTodos.length}
            onClick={() => onChangePanelMode("today")}
          />

          <CollapsedSidebarButton
            active={panelMode === "devlog"}
            icon={<FilePenLine size={17} />}
            title="일지 미작성 일정"
            count={noDevlogSchedules.length}
            onClick={() => onChangePanelMode("devlog")}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="sticky top-5 h-[calc(100dvh-112px)] self-start pt-5 pl-5">
      <div className="waivs-sidebar flex h-full w-full overflow-hidden">
        {/* 왼쪽 기능 아이콘 영역 */}
        <div className="flex w-[52px] shrink-0 flex-col items-center gap-3 border-r border-[var(--waivs-border-soft)] bg-white py-4">
          {/* 프로젝트 패널 헤더 높이와 맞추기 위한 공간 */}
          <div className="h-9 w-9 shrink-0" />

          <div className="h-px w-7 bg-[var(--waivs-border)]" />

          <CollapsedSidebarButton
            active={panelMode === "projects"}
            icon={<FolderOpen size={17} />}
            title="프로젝트 목록"
            onClick={() => onChangePanelMode("projects")}
          />

          <CollapsedSidebarButton
            active={panelMode === "today"}
            icon={<ListTodo size={17} />}
            title="오늘 할 일"
            count={todayTodos.length}
            onClick={() => onChangePanelMode("today")}
          />

          <CollapsedSidebarButton
            active={panelMode === "devlog"}
            icon={<FilePenLine size={17} />}
            title="일지 미작성 일정"
            count={noDevlogSchedules.length}
            onClick={() => onChangePanelMode("devlog")}
          />
        </div>

        {/* 오른쪽 사이드바 내용 영역 */}
        <div className="min-w-0 flex-1 bg-white">
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

          {panelMode === "today" && (
            <ScheduleSideTaskPanel
              label="TODAY"
              title="오늘 할 일"
              description="오늘 날짜에 남아 있는 일정입니다."
              schedules={todayTodos}
              emptyText="오늘 남은 일정 없음"
              onSelectSchedule={onSelectSchedule}
            />
          )}

          {panelMode === "devlog" && (
            <ScheduleSideTaskPanel
              label="DEVLOG"
              title="일지 미작성 일정"
              description="작업은 있지만 수행 기록이 없는 일정입니다."
              schedules={noDevlogSchedules}
              emptyText="모든 일정에 일지가 작성됨"
              onSelectSchedule={onSelectSchedule}
              onMarkDevlogWritten={onMarkDevlogWritten}
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
          ? "bg-[#EEF3FF] text-[#5873F9]"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      {icon}

      {typeof count === "number" && count > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#5873F9] px-1 text-[10px] font-black text-white">
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
      <div className="shrink-0 border-b border-[var(--waivs-border-soft)] p-4">
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
            className="grid h-8 w-8 place-items-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            title="프로젝트 사이드바 접기"
            aria-label="프로젝트 사이드바 접기"
          >
            <PanelLeftClose size={17} strokeWidth={2.4} />
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
            className="h-10 w-full rounded-xl border border-[var(--waivs-border)] bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
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
          <EmptyBox text="조건에 맞는 프로젝트가 없습니다." />
        ) : (
          <div className="flex flex-col gap-1">
            {filteredWorkspaces.map((workspace) => {
              const selected = workspace.id === selectedWorkspaceId;

              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => onSelectWorkspace(workspace)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                    selected
                      ? "bg-[#5873F9] text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      selected
                        ? "bg-white/15 text-white"
                        : workspace.mode === "team"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-blue-50 text-blue-700"
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

                    <span
                      className={`mt-1 block truncate text-xs font-medium ${
                        selected ? "text-white/70" : "text-slate-400"
                      }`}
                    >
                      {workspace.mode === "team" ? "팀" : "개인"} · 작업 폴더{" "}
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
      className={`h-8 rounded-lg text-xs font-black transition ${
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function ScheduleSideTaskPanel({
  label,
  title,
  description,
  schedules,
  emptyText,
  onSelectSchedule,
  onMarkDevlogWritten,
}: {
  label: string;
  title: string;
  description: string;
  schedules: ProjectScheduleItem[];
  emptyText: string;
  onSelectSchedule: (id: string) => void;
  onMarkDevlogWritten?: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--waivs-border-soft)] p-4">
        <p className="text-[11px] font-black uppercase tracking-wide text-[#5873F9]">
          {label}
        </p>

        <h2 className="mt-1 text-sm font-black text-slate-950">{title}</h2>

        <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {schedules.length === 0 ? (
          <EmptyBox text={emptyText} />
        ) : (
          <div className="flex flex-col gap-2">
            {schedules.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => onSelectSchedule(item.id)}
                  className="block w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-black leading-5 text-slate-900">
                      {item.title}
                    </p>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        statusBadgeStyle[item.status]
                      }`}
                    >
                      {scheduleStatusLabel[item.status]}
                    </span>
                  </div>

                  <p className="mt-2 text-xs font-medium text-slate-500">
                    {getSchedulePeriodText(item)}
                  </p>

                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                    {item.description || "등록된 상세 내용이 없습니다."}
                  </p>
                </button>

                {onMarkDevlogWritten && !item.hasDevlog && (
                  <button
                    type="button"
                    onClick={onMarkDevlogWritten}
                    className="mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-xl bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <FilePenLine size={14} />
                    개발일지에서 작성
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MonthlySchedulePageView({
  currentYear,
  currentMonth,
  todayDate,
  schedules,
  selectedScheduleId,
  loading,
  errorMessage,
  onReload,
  onBackToWeek,
  onCreateSchedule,
  onMoveMonth,
  onGoToday,
  onSelectSchedule,
  onMoveScheduleDate,
}: {
  currentYear: number;
  currentMonth: number;
  todayDate: string;
  schedules: ProjectScheduleItem[];
  selectedScheduleId: string | null;
  loading: boolean;
  errorMessage: string;
  onReload: () => void;
  onBackToWeek: () => void;
  onCreateSchedule: () => void;
  onMoveMonth: (amount: number) => void;
  onGoToday: () => void;
  onSelectSchedule: (id: string) => void;
  onMoveScheduleDate: (id: string, nextDate: string) => void;
}) {
  return (
    <main className="min-w-0 bg-transparent p-5">
      <section className="waivs-panel min-w-0 p-5">
        <div className="mb-5 flex min-w-0 flex-col justify-between gap-4 2xl:flex-row 2xl:items-center">
          <div className="min-w-0 shrink-0">
            <p className="text-sm font-bold text-[#5873F9]">Schedule</p>

            <h1 className="mt-2 whitespace-nowrap text-2xl font-black text-slate-950 xl:text-3xl">
              {currentYear}년 {currentMonth + 1}월
            </h1>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 2xl:justify-end">
            <button
              type="button"
              onClick={onBackToWeek}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              주간으로 돌아가기
            </button>

            <button
              type="button"
              onClick={onCreateSchedule}
              className="flex h-10 items-center gap-2 rounded-xl bg-[#5873F9] px-4 text-xs font-bold text-white hover:bg-[#4863E8]"
            >
              <Plus size={17} />
              새 일정 추가
            </button>

            <button
              type="button"
              onClick={onReload}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50"
              title="새로고침"
            >
              <RefreshCw size={17} />
            </button>

            <button
              type="button"
              onClick={onGoToday}
              className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold hover:bg-slate-50"
            >
              오늘
            </button>

            <button
              type="button"
              onClick={() => onMoveMonth(-1)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => onMoveMonth(1)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <DataState loading={loading} errorMessage={errorMessage}>
          <div className="min-w-0 overflow-x-auto pb-2">
            <div className="min-w-[860px]">
              <MonthlyCalendarBarView
                schedules={schedules}
                selectedScheduleId={selectedScheduleId}
                currentYear={currentYear}
                currentMonth={currentMonth}
                todayDate={todayDate}
                onSelectSchedule={onSelectSchedule}
                onMoveScheduleDate={onMoveScheduleDate}
              />
            </div>
          </div>
        </DataState>
      </section>
    </main>
  );
}

function WeeklySchedulePageView({
  viewMode,
  setViewMode,
  query,
  setQuery,
  selectedProjectName,
  totalCount,
  progressCount,
  doneCount,
  delayedCount,
  progressRate,
  recentDoneSchedule,
  filteredSchedules,
  selectedScheduleId,
  selectedProjectTodaySchedules,
  allProjectTodaySchedules,
  allTodayLoading,
  allTodayErrorMessage,
  weekDays,
  weekStartLabel,
  weekEndLabel,
  todayDate,
  loading,
  errorMessage,
  onOpenMonth,
  onCreateSchedule,
  onMoveWeek,
  onGoToday,
  onSelectSchedule,
  onMoveScheduleDate,
  onChangeStatus,
  onEditSchedule,
  onDeleteSchedule,
}: {
  viewMode: ScheduleViewMode;
  setViewMode: (mode: ScheduleViewMode) => void;
  query: string;
  setQuery: (value: string) => void;
  selectedProjectName: string;
  totalCount: number;
  progressCount: number;
  doneCount: number;
  delayedCount: number;
  progressRate: number;
  recentDoneSchedule: ProjectScheduleItem | null;
  filteredSchedules: ProjectScheduleItem[];
  selectedScheduleId: string | null;
  selectedProjectTodaySchedules: ProjectScheduleItem[];
  allProjectTodaySchedules: ProjectScheduleItem[];
  allTodayLoading: boolean;
  allTodayErrorMessage: string;
  weekDays: ReturnType<typeof getWeekDays>;
  weekStartLabel: string;
  weekEndLabel: string;
  todayDate: string;
  loading: boolean;
  errorMessage: string;
  onOpenMonth: () => void;
  onCreateSchedule: () => void;
  onMoveWeek: (amount: number) => void;
  onGoToday: () => void;
  onSelectSchedule: (id: string) => void;
  onMoveScheduleDate: (id: string, nextDate: string) => void;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
  onEditSchedule: (schedule: ProjectScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
}) {
  const [todayScope, setTodayScope] =
    useState<TodayScheduleScope>("selected");

  const visibleTodaySchedules =
    todayScope === "selected"
      ? selectedProjectTodaySchedules
      : allProjectTodaySchedules;

  const todayTitle =
    todayScope === "selected"
      ? `${selectedProjectName} 오늘 일정`
      : "전체 프로젝트 오늘 일정";

  const todayDescription =
    todayScope === "selected"
      ? "현재 선택된 프로젝트에 등록된 오늘 날짜의 일정입니다."
      : "모든 프로젝트에 등록된 오늘 날짜의 일정을 한눈에 확인합니다.";

  return (
    <main className="min-w-0 bg-transparent p-5">
      <section className="waivs-panel p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#5873F9]">Today Schedule</p>

            <h1 className="line-clamp-2 break-keep text-xl font-black leading-snug text-slate-950 xl:text-2xl">
              {todayTitle}
            </h1>

            <p className="truncate text-sm text-slate-500">
              {todayDescription}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <TodayScopeButton
                active={todayScope === "selected"}
                label="선택 프로젝트"
                onClick={() => setTodayScope("selected")}
              />

              <TodayScopeButton
                active={todayScope === "all"}
                label="전체"
                onClick={() => setTodayScope("all")}
              />
            </div>
          </div>
        </div>

        <TodayAllProjectSchedulePager
          schedules={visibleTodaySchedules}
          loading={todayScope === "all" ? allTodayLoading : loading}
          errorMessage={
            todayScope === "all" ? allTodayErrorMessage : errorMessage
          }
          todayDate={todayDate}
          scope={todayScope}
          selectedProjectName={selectedProjectName}
          onSelectSchedule={onSelectSchedule}
        />
      </section>

      <section className="waivs-panel mt-5 p-5">
        <ProjectScheduleSummary
          selectedProjectName={selectedProjectName}
          totalCount={totalCount}
          progressCount={progressCount}
          doneCount={doneCount}
          delayedCount={delayedCount}
          progressRate={progressRate}
          onOpenMonth={onOpenMonth}
          onCreateSchedule={onCreateSchedule}
        />

        <div className="mb-5 mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <ViewButton
                active={viewMode === "calendar"}
                onClick={() => setViewMode("calendar")}
                label="주간"
              />

              <ViewButton
                active={viewMode === "month"}
                onClick={onOpenMonth}
                label="월간"
              />

              <ViewButton
                active={viewMode === "board"}
                onClick={() => setViewMode("board")}
                label="보드"
              />

              <ViewButton
                active={viewMode === "list"}
                onClick={() => setViewMode("list")}
                label="리스트"
              />
            </div>

            {viewMode === "calendar" && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onMoveWeek(-1)}
                  className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  onClick={onGoToday}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50"
                >
                  오늘
                </button>

                <button
                  type="button"
                  onClick={() => onMoveWeek(1)}
                  className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>

          <div className="relative w-full xl:w-[420px]">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="일정 검색"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/10"
            />
          </div>
        </div>

        <DataState loading={loading} errorMessage={errorMessage}>
          {viewMode === "calendar" && (
            <WeeklyCalendarBarView
              schedules={filteredSchedules}
              selectedScheduleId={selectedScheduleId}
              weekDays={weekDays}
              weekStartLabel={weekStartLabel}
              weekEndLabel={weekEndLabel}
              todayDate={todayDate}
              onSelect={onSelectSchedule}
              onMoveScheduleDate={onMoveScheduleDate}
            />
          )}

          {viewMode === "board" && (
            <HorizontalBoardView
              schedules={filteredSchedules}
              onSelect={onSelectSchedule}
              onChangeStatus={onChangeStatus}
            />
          )}

          {viewMode === "list" && (
            <ListView
              schedules={filteredSchedules}
              onSelect={onSelectSchedule}
              onChangeStatus={onChangeStatus}
              onEditSchedule={onEditSchedule}
              onDeleteSchedule={onDeleteSchedule}
            />
          )}

          <ProgressRulePanel
            totalCount={totalCount}
            doneCount={doneCount}
            progressRate={progressRate}
            recentDoneSchedule={recentDoneSchedule}
            selectedProjectName={selectedProjectName}
          />
        </DataState>
      </section>
    </main>
  );
}

function TodayAllProjectSchedulePager({
  schedules,
  loading,
  errorMessage,
  todayDate,
  scope,
  selectedProjectName,
  onSelectSchedule,
}: {
  schedules: ProjectScheduleItem[];
  loading: boolean;
  errorMessage: string;
  todayDate: string;
  scope: TodayScheduleScope;
  selectedProjectName: string;
  onSelectSchedule: (id: string) => void;
}) {
  const PAGE_SIZE = 3;

  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(schedules.length / PAGE_SIZE));

  const safePage = Math.min(page, totalPages - 1);

  const pageItems = schedules.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  useEffect(() => {
    setPage(0);
  }, [schedules.length]);

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#5873F9]">
            {todayDate}
          </p>

          <h2 className="mt-1 text-base font-black text-slate-950">
            {scope === "selected"
              ? "오늘 진행할 선택 프로젝트 일정"
              : "오늘 진행할 전체 일정"}
          </h2>
        </div>

        <span className="w-fit rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600">
          전체 {schedules.length}개
        </span>
      </div>

      {loading ? (
        <div className="grid h-[132px] place-items-center rounded-xl border border-dashed border-slate-200 bg-white text-sm font-bold text-slate-400">
          {scope === "selected"
            ? `${selectedProjectName}에 오늘 등록된 일정이 없습니다.`
            : "오늘 등록된 전체 일정이 없습니다."}
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </div>
      ) : schedules.length === 0 ? (
        <div className="grid h-[132px] place-items-center rounded-xl border border-dashed border-slate-200 bg-white text-sm font-bold text-slate-400">
          오늘 등록된 일정이 없습니다.
        </div>
      ) : (
        <>
          <div className="grid gap-3 xl:grid-cols-3">
            {pageItems.map((item) => {
              const projectName = getProjectName(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectSchedule(item.id)}
                  className="min-h-[132px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-black text-[#5873F9]">
                        {projectName}
                      </p>

                      <h3 className="mt-1 line-clamp-2 text-sm font-black leading-5 text-slate-950">
                        {item.title}
                      </h3>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                        statusBadgeStyle[item.status]
                      }`}
                    >
                      {scheduleStatusLabel[item.status]}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-bold text-slate-500">
                    {getSchedulePeriodText(item)}
                  </p>

                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                    {item.description || "등록된 상세 내용이 없습니다."}
                  </p>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {Array.from({
                length: totalPages,
              }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setPage(index)}
                  className={`h-8 min-w-8 rounded-xl px-2 text-xs font-black transition ${
                    safePage === index
                      ? "bg-[#5873F9] text-white"
                      : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProjectScheduleSummary({
  selectedProjectName,
  totalCount,
  progressCount,
  doneCount,
  delayedCount,
  progressRate,
  onOpenMonth,
  onCreateSchedule,
}: {
  selectedProjectName: string;
  totalCount: number;
  progressCount: number;
  doneCount: number;
  delayedCount: number;
  progressRate: number;
  onOpenMonth: () => void;
  onCreateSchedule: () => void;
}) {
  return (
    <div>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#5873F9]">Schedule</p>

          <h1 className="mt-1 line-clamp-2 break-keep text-xl font-black leading-snug text-slate-950 xl:text-2xl">
            {selectedProjectName}
          </h1>

          <p className="mt-1 truncate text-sm text-slate-500">
            현재 선택된 프로젝트의 일정 현황입니다.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
          <button
            type="button"
            onClick={onOpenMonth}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <CalendarDays size={17} />
            월간 캘린더
          </button>

          <button
            type="button"
            onClick={onCreateSchedule}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#5873F9] px-5 text-sm font-semibold text-white hover:bg-[#4863E8]"
          >
            <Plus size={17} />
            새 일정 추가
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm font-bold text-slate-500">
            <span>
              전체 <strong className="text-slate-950">{totalCount}개</strong>
            </span>

            <span className="text-slate-300">·</span>

            <span>
              진행 중{" "}
              <strong className="text-slate-950">{progressCount}개</strong>
            </span>

            <span className="text-slate-300">·</span>

            <span>
              완료 <strong className="text-slate-950">{doneCount}개</strong>
            </span>

            <span className="text-slate-300">·</span>

            <span>
              지연 <strong className="text-slate-950">{delayedCount}개</strong>
            </span>

            <span className="text-slate-300">·</span>

            <span>
              진행률{" "}
              <strong className="text-[#5873F9]">{progressRate}%</strong>
            </span>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#5873F9] transition-all"
            style={{
              width: `${progressRate}%`,
            }}
          />
        </div>
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
      <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          일정 데이터를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">
        {errorMessage}
      </div>
    );
  }

  return <>{children}</>;
}

function WeeklyCalendarBarView({
  schedules,
  selectedScheduleId,
  weekDays,
  weekStartLabel,
  weekEndLabel,
  todayDate,
  onSelect,
  onMoveScheduleDate,
}: {
  schedules: ProjectScheduleItem[];
  selectedScheduleId: string | null;
  weekDays: ReturnType<typeof getWeekDays>;
  weekStartLabel: string;
  weekEndLabel: string;
  todayDate: string;
  onSelect: (id: string) => void;
  onMoveScheduleDate: (id: string, nextDate: string) => void;
}) {
  const weekStartKey = weekDays[0]?.key ?? "";
  const weekEndKey = weekDays[6]?.key ?? "";

  const visibleSchedules = schedules.filter((item) =>
    isScheduleVisibleInWeek(item, weekStartKey, weekEndKey),
  );

  const getColumnRange = (item: ProjectScheduleItem) => {
    const startDate = getScheduleStartDate(item);
    const endDate = getScheduleEndDate(item);

    const startIndex = weekDays.findIndex((day) => day.key >= startDate);

    const endIndexFromRight = [...weekDays]
      .reverse()
      .findIndex((day) => day.key <= endDate);

    const safeStartIndex = startIndex === -1 ? 0 : startIndex;

    const safeEndIndex =
      endIndexFromRight === -1 ? 6 : 6 - endIndexFromRight;

    return {
      gridColumnStart: safeStartIndex + 1,
      gridColumnEnd: safeEndIndex + 2,
    };
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    nextDate: string,
  ) => {
    event.preventDefault();

    const scheduleId = event.dataTransfer.getData("scheduleId");

    if (!scheduleId) return;

    onMoveScheduleDate(scheduleId, nextDate);
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <CalendarDays size={20} className="text-slate-600" />

        <h2 className="text-lg font-bold">
          {weekStartLabel} - {weekEndLabel}
        </h2>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekDays.map((day) => {
            const isToday = day.key === todayDate;

            return (
              <div
                key={day.key}
                className={`border-r border-slate-100 p-3 last:border-r-0 ${
                  isToday ? "bg-blue-50" : ""
                }`}
              >
                <p className="text-xs font-bold text-slate-500">{day.label}</p>

                <p
                  className={`mt-1 text-lg font-black ${
                    isToday ? "text-[#5873F9]" : "text-slate-900"
                  }`}
                >
                  {day.date}일
                </p>

                {isToday && (
                  <p className="mt-1 w-fit rounded-full bg-[#5873F9] px-2 py-0.5 text-[10px] font-bold text-white">
                    오늘
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="relative min-h-[460px] bg-white">
          <div className="absolute inset-0 grid grid-cols-7">
            {weekDays.map((day) => {
              const isToday = day.key === todayDate;

              return (
                <div
                  key={day.key}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, day.key)}
                  className={`border-r border-slate-100 p-3 last:border-r-0 ${
                    isToday ? "bg-blue-50/30" : "bg-white"
                  }`}
                >
                  <p className="text-xs font-medium text-slate-300">
                    {day.date}일
                  </p>
                </div>
              );
            })}
          </div>

          <div className="relative z-10 grid grid-cols-7 gap-x-2 gap-y-3 p-3 pt-12">
            {visibleSchedules.length === 0 ? (
              <div className="col-span-7">
                <EmptyBox text="이번 주에 표시할 일정이 없습니다." />
              </div>
            ) : (
              visibleSchedules.map((item) => {
                const { gridColumnStart, gridColumnEnd } = getColumnRange(item);

                const projectName = getProjectName(item);

                return (
                  <button
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("scheduleId", item.id);
                    }}
                    onClick={() => onSelect(item.id)}
                    className={`min-w-0 cursor-grab rounded-xl border px-4 py-3 text-left shadow-sm transition hover:shadow-md active:cursor-grabbing ${
                      calendarEventStyle[item.status]
                    } ${
                      selectedScheduleId === item.id
                        ? "ring-2 ring-blue-300"
                        : ""
                    }`}
                    style={{
                      gridColumn: `${gridColumnStart} / ${gridColumnEnd}`,
                    }}
                    title={item.description}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {item.title}
                        </p>

                        <p className="mt-1 truncate text-[11px] font-semibold opacity-70">
                          {projectName} · {getSchedulePeriodText(item)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          statusBadgeStyle[item.status]
                        }`}
                      >
                        {scheduleStatusLabel[item.status]}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>

      <p className="mt-4 text-sm text-slate-500">
        기간 일정은 시작일과 종료일에 맞춰 하나의 바 형태로 표시됩니다. 바를
        드래그해서 다른 날짜 칸에 놓으면 기간 길이를 유지한 채 이동됩니다.
      </p>
    </div>
  );
}

function HorizontalBoardView({
  schedules,
  onSelect,
  onChangeStatus,
}: {
  schedules: ProjectScheduleItem[];
  onSelect: (id: string) => void;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
}) {
  const columns: ScheduleStatus[] = ["todo", "progress", "done", "delayed"];

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    nextStatus: ScheduleStatus,
  ) => {
    event.preventDefault();

    const scheduleId = event.dataTransfer.getData("scheduleId");

    if (!scheduleId) return;

    onChangeStatus(scheduleId, nextStatus);
  };

  return (
    <div className="overflow-x-auto pb-3">
      <div className="flex min-w-max gap-4">
        {columns.map((status) => {
          const items = schedules.filter((item) => item.status === status);

          return (
            <div
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, status)}
              className={`w-[320px] shrink-0 rounded-2xl border p-4 ${boardColumnStyle[status]}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold">{scheduleStatusLabel[status]}</h3>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  {items.length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {items.length === 0 ? (
                  <EmptyBox text="여기로 드래그 가능" compact />
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("scheduleId", item.id);
                      }}
                      onClick={() => onSelect(item.id)}
                      className="cursor-grab rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 active:cursor-grabbing"
                    >
                      <p className="text-sm font-bold">{item.title}</p>

                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-bold ${
                            statusBadgeStyle[item.status]
                          }`}
                        >
                          {scheduleStatusLabel[item.status]}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-slate-500">
        보드에서도 일정을 드래그해서 다른 상태 칸으로 옮길 수 있습니다.
      </p>
    </div>
  );
}

function ListView({
  schedules,
  onSelect,
  onChangeStatus,
  onEditSchedule,
  onDeleteSchedule,
}: {
  schedules: ProjectScheduleItem[];
  onSelect: (id: string) => void;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
  onEditSchedule: (schedule: ProjectScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">일정</th>
            <th className="px-4 py-3">프로젝트</th>
            <th className="px-4 py-3">기간</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">일지</th>
            <th className="px-4 py-3">상태 변경</th>
            <th className="px-4 py-3">관리</th>
          </tr>
        </thead>

        <tbody>
          {schedules.map((item) => {
            const projectName = getProjectName(item);

            return (
              <tr
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
              >
                <td className="px-4 py-4">
                  <p className="font-bold">{item.title}</p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.description}
                  </p>
                </td>

                <td className="px-4 py-4 text-slate-500">{projectName}</td>

                <td className="px-4 py-4 text-slate-500">
                  {getSchedulePeriodText(item)}
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${
                      statusBadgeStyle[item.status]
                    }`}
                  >
                    {scheduleStatusLabel[item.status]}
                  </span>
                </td>

                <td className="px-4 py-4 text-slate-500">
                  {item.hasDevlog ? "작성됨" : "미작성"}
                </td>

                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onChangeStatus(item.id, "progress");
                      }}
                      className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                    >
                      진행
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onChangeStatus(item.id, "done");
                      }}
                      className="rounded-lg bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700"
                    >
                      완료
                    </button>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditSchedule(item);
                      }}
                      className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                    >
                      수정
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteSchedule(item.id);
                      }}
                      className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {schedules.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-10">
                <EmptyBox text="조건에 맞는 일정이 없습니다." />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleDetailAside({
  selectedSchedule,
  onResizeStart,
  onClose,
  onChangeStatus,
  onEditSchedule,
  onDeleteSchedule,
  deleting,
  onMarkDevlogWritten,
}: {
  selectedSchedule: ProjectScheduleItem | null;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onClose: () => void;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
  onEditSchedule: (schedule: ProjectScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  deleting: boolean;
  onMarkDevlogWritten: () => void;
}) {
  if (!selectedSchedule) return null;

  const projectName = getProjectName(selectedSchedule);
  const periodText = getSchedulePeriodText(selectedSchedule);

  return (
    <aside className="relative min-w-0 border-l border-slate-200 bg-white">
      <div
        role="separator"
        aria-orientation="vertical"
        title="사이드바 너비 조절"
        onPointerDown={onResizeStart}
        className="absolute left-0 top-0 z-30 h-full w-3 -translate-x-1/2 cursor-col-resize touch-none"
      >
        <div className="mx-auto h-full w-px bg-transparent transition hover:bg-blue-400" />
      </div>

      <div className="sticky top-[72px] flex h-[calc(100vh-72px)] flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#5873F9]">
              Selected Schedule
            </p>

            <h2 className="truncate text-sm font-black text-slate-900">
              일정 상세
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex gap-2">
              <h3 className="min-w-0 text-lg font-black leading-snug text-slate-900">
                {selectedSchedule.title}
              </h3>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                  statusBadgeStyle[selectedSchedule.status]
                }`}
              >
                {scheduleStatusLabel[selectedSchedule.status]}
              </span>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-xs font-black text-slate-800">
              일정 정보
            </h3>

            <div className="space-y-2 text-xs">
              <InfoRow label="프로젝트" value={projectName} />

              <InfoRow label="기간" value={periodText} />

              <InfoRow
                label="상태"
                value={scheduleStatusLabel[selectedSchedule.status]}
              />

              <InfoRow
                label="개발일지"
                value={selectedSchedule.hasDevlog ? "작성됨" : "미작성"}
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black text-slate-800">일정 상세</h3>

            <p className="mt-3 whitespace-pre-wrap break-keep text-sm leading-5 text-slate-600">
              {selectedSchedule.description || "등록된 상세 내용이 없습니다."}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black text-slate-800">일정 관리</h3>

            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              제목, 기간, 상태, 상세 내용을 수정하거나 일정을 삭제할 수
              있습니다.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onEditSchedule(selectedSchedule)}
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                <Pencil size={14} />
                수정
              </button>

              <button
                type="button"
                onClick={() => onDeleteSchedule(selectedSchedule.id)}
                disabled={deleting}
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}

                삭제
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black text-slate-800">상태 변경</h3>

            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              완료 상태로 변경하면 프로젝트 진행률에 반영됩니다.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeStatus(selectedSchedule.id, "todo")}
                className="h-9 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                할 일
              </button>

              <button
                type="button"
                onClick={() => onChangeStatus(selectedSchedule.id, "progress")}
                className="h-9 rounded-xl bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
              >
                진행 중
              </button>

              <button
                type="button"
                onClick={() => onChangeStatus(selectedSchedule.id, "done")}
                className="h-9 rounded-xl bg-purple-50 text-xs font-bold text-purple-700 hover:bg-purple-100"
              >
                완료
              </button>

              <button
                type="button"
                onClick={() => onChangeStatus(selectedSchedule.id, "delayed")}
                className="h-9 rounded-xl bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                지연
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black text-slate-800">
              개발일지 연결
            </h3>

            {selectedSchedule.hasDevlog ? (
              <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-700">
                개발일지가 작성된 일정입니다.
                <br />
                수행 기록이 있어 진행 근거로 사용할 수 있습니다.
              </div>
            ) : (
              <button
                type="button"
                onClick={onMarkDevlogWritten}
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
              >
                <FilePenLine size={14} />
                개발일지 화면에서 작성
              </button>
            )}
          </section>
        </div>
      </div>
    </aside>
  );
}

function CreateScheduleModal(props: {
  form: CreateScheduleForm;
  saving: boolean;
  projectName: string;
  onChange: React.Dispatch<React.SetStateAction<CreateScheduleForm>>;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return <ScheduleFormModal mode="create" {...props} />;
}

function ScheduleFormModal({
  mode,
  form,
  saving,
  projectName,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  form: CreateScheduleForm;
  saving: boolean;
  projectName: string;
  onChange: React.Dispatch<React.SetStateAction<CreateScheduleForm>>;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const updateField = (
    key: keyof CreateScheduleForm,
    value: string | ScheduleStatus,
  ) => {
    onChange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 p-4">
      <div className="flex max-h-[calc(100vh-32px)] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#5873F9]">
              {mode === "create" ? "New Schedule" : "Edit Schedule"}
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              {mode === "create" ? "새 일정 추가" : "일정 수정"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label={
              mode === "create"
                ? "일정 추가 모달 닫기"
                : "일정 수정 모달 닫기"
            }
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                프로젝트
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                {projectName}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                일정 제목
              </label>

              <input
                value={form.title}
                onChange={(event) =>
                  updateField("title", event.target.value)
                }
                placeholder="예: 로그인 API 구현"
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#5873F9]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  시작일
                </label>

                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    updateField("startDate", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#5873F9]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  종료일
                </label>

                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    updateField("endDate", event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#5873F9]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                상태
              </label>

              <div className="grid grid-cols-4 gap-2">
                <StatusSelectButton
                  active={form.status === "todo"}
                  label="할 일"
                  onClick={() => updateField("status", "todo")}
                />

                <StatusSelectButton
                  active={form.status === "progress"}
                  label="진행 중"
                  onClick={() => updateField("status", "progress")}
                />

                <StatusSelectButton
                  active={form.status === "done"}
                  label="완료"
                  onClick={() => updateField("status", "done")}
                />

                <StatusSelectButton
                  active={form.status === "delayed"}
                  label="지연"
                  onClick={() => updateField("status", "delayed")}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                일정 상세
              </label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="일정에 대한 상세 내용을 입력하세요."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-[#5873F9]"
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            취소
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-xl bg-[#5873F9] px-5 text-sm font-bold text-white hover:bg-[#4863E8] disabled:opacity-60"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}

            {mode === "create" ? "일정 추가" : "수정 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusSelectButton({
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
      className={`h-10 rounded-xl text-xs font-bold transition ${
        active
          ? "bg-[#5873F9] text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function ProgressRulePanel({
  totalCount,
  doneCount,
  progressRate,
  recentDoneSchedule,
  selectedProjectName,
}: {
  totalCount: number;
  doneCount: number;
  progressRate: number;
  recentDoneSchedule: ProjectScheduleItem | null;
  selectedProjectName: string;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-bold">진행률 계산 기준</h2>

          <p className="mt-2 text-sm text-slate-500">
            현재 선택된 범위는{" "}
            <span className="font-bold text-slate-700">
              {selectedProjectName}
            </span>
            입니다. 진행률은 선택 범위 안의 완료 일정 수를 전체 일정 수로 나누어
            계산합니다.
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-5 py-4 text-right">
          <p className="text-sm font-semibold text-slate-500">
            완료 {doneCount} / 전체 {totalCount}
          </p>

          <p className="mt-1 text-2xl font-black text-[#5873F9]">
            {progressRate}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">계산식</p>

          <p className="mt-2 text-sm font-bold text-slate-700">
            완료된 일정 수 / 전체 일정 수 × 100
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">최근 완료</p>

          <p className="mt-2 text-sm font-bold text-slate-700">
            {recentDoneSchedule ? recentDoneSchedule.title : "완료된 일정 없음"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">일반 개발일지</p>

          <p className="mt-2 text-sm font-bold text-slate-700">
            진행률에는 미포함
          </p>
        </div>
      </div>
    </section>
  );
}

function ViewButton({
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
      className={`rounded-lg px-5 py-2.5 text-sm font-bold ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function TodayScopeButton({
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
      className={`h-9 rounded-lg px-4 text-xs font-black transition ${
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-slate-400">{label}</span>

      <span className="truncate text-right font-bold text-slate-700">
        {value}
      </span>
    </div>
  );
}

function EmptyBox({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-400 ${
        compact ? "p-3" : "p-5"
      }`}
    >
      {text}
    </div>
  );
}