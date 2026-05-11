"use client";

import type React from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FilePenLine,
  LayoutGrid,
  ListTodo,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  X,
} from "lucide-react";

import { MonthlyCalendarBarView } from "@/components/schedules/MonthlyCalendarBarView";

import {
  boardColumnStyle,
  calendarEventStyle,
  formatDateKey,
  getWeekDays,
  initialSchedules,
  scheduleStatusLabel,
  statusBadgeStyle,
  type ScheduleItem,
  type ScheduleStatus,
} from "@/components/schedules/scheduleMockData";

type ProjectId = "all" | "p-devw" | "p-shop" | "p-ai";
type ProjectMode = "personal" | "team";
type ScheduleViewMode = "calendar" | "month" | "board" | "list";

type ProjectItem = {
  id: ProjectId;
  name: string;
  description: string;
  colorClass: string;
  mode: "all" | ProjectMode;
};

type ProjectScheduleItem = ScheduleItem & {
  projectId: Exclude<ProjectId, "all">;
  workspaceId: ProjectMode;
  customProjectName?: string;
  startDate?: string;
  endDate?: string;
};

type CreateScheduleForm = {
  projectName: string;
  title: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  description: string;
};

const PROJECTS: ProjectItem[] = [
  {
    id: "all",
    name: "전체 프로젝트",
    description: "모든 프로젝트 일정",
    colorClass: "bg-slate-900",
    mode: "all",
  },
  {
    id: "p-devw",
    name: "Devw 캡스톤",
    description: "졸업작품 메인 프로젝트",
    colorClass: "bg-blue-500",
    mode: "team",
  },
  {
    id: "p-shop",
    name: "쇼핑몰 웹",
    description: "프론트/백엔드 연습 프로젝트",
    colorClass: "bg-emerald-500",
    mode: "personal",
  },
  {
    id: "p-ai",
    name: "AI 면접 분석",
    description: "AI 기능 실험 프로젝트",
    colorClass: "bg-violet-500",
    mode: "personal",
  },
];

const INITIAL_PROJECT_SCHEDULES: ProjectScheduleItem[] = initialSchedules.map(
  (item, index) => {
    const projectId: ProjectScheduleItem["projectId"] =
      index % 3 === 0 ? "p-devw" : index % 3 === 1 ? "p-shop" : "p-ai";

    return {
      ...item,
      projectId,
      workspaceId: projectId === "p-devw" ? "team" : "personal",
      startDate: item.date,
      endDate: item.date,
    };
  },
);

function getTodayLocalDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getDateKeyFromDate(date: Date) {
  return formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
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

function getProjectName(schedule: ProjectScheduleItem) {
  return (
    schedule.customProjectName ||
    PROJECTS.find((project) => project.id === schedule.projectId)?.name ||
    "프로젝트 없음"
  );
}

export default function ScheduleManagementPage() {
  const today = useMemo(() => getTodayLocalDate(), []);
  const todayDate = useMemo(() => getDateKeyFromDate(today), [today]);

  const [schedules, setSchedules] = useState<ProjectScheduleItem[]>(
    INITIAL_PROJECT_SCHEDULES,
  );

  const [viewMode, setViewMode] = useState<ScheduleViewMode>("calendar");
  const [query, setQuery] = useState("");

  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    INITIAL_PROJECT_SCHEDULES[0]?.id ?? null,
  );

  const [baseWeekDate, setBaseWeekDate] = useState<Date>(() =>
    getTodayLocalDate(),
  );

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const [isSupportPinned, setIsSupportPinned] = useState(false);
  const [isSupportHovering, setIsSupportHovering] = useState(false);
  const [isDetailSidebarOpen, setIsDetailSidebarOpen] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState<CreateScheduleForm>({
    projectName: "",
    title: "",
    startDate: todayDate,
    endDate: todayDate,
    status: "todo",
    description: "",
  });

  const isSupportPanelVisible = isSupportPinned || isSupportHovering;

  const filteredSchedules = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return schedules.filter((item) => {
      const projectName = getProjectName(item);

      return (
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        projectName.toLowerCase().includes(keyword)
      );
    });
  }, [schedules, query]);

  const selectedSchedule =
    schedules.find((item) => item.id === selectedScheduleId) ?? null;

  const selectedProject = PROJECTS[0];

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

  const noDevlogSchedules = filteredSchedules.filter((item) => !item.hasDevlog);

  const recentDoneSchedule =
    filteredSchedules.find((item) => item.status === "done") ?? null;

  const shouldShowDetailSidebar = isDetailSidebarOpen && selectedSchedule;

  const weekDays = getWeekDays(baseWeekDate);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const openScheduleDetail = (id: string) => {
    setSelectedScheduleId(id);
    setIsDetailSidebarOpen(true);
  };

  const changeStatus = (id: string, status: ScheduleStatus) => {
    setSchedules((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };

  const moveScheduleDate = (id: string, nextStartDate: string) => {
    setSchedules((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const currentStartDate = getScheduleStartDate(item);
        const currentEndDate = getScheduleEndDate(item);

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

        return {
          ...item,
          date: nextStartDate,
          startDate: nextStartDate,
          endDate: nextEndDate,
        };
      }),
    );
  };

  const markDevlogWritten = (id: string) => {
    setSchedules((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, hasDevlog: true } : item,
      ),
    );
  };

  const openCreateModal = () => {
    const defaultDate =
      viewMode === "month"
        ? formatDateKey(currentYear, currentMonth, 1)
        : getDateKeyFromDate(baseWeekDate);

    setCreateForm({
      projectName: "",
      title: "",
      startDate: defaultDate,
      endDate: defaultDate,
      status: "todo",
      description: "",
    });

    setIsCreateModalOpen(true);
  };

  const createSchedule = () => {
    if (!createForm.projectName.trim()) {
      alert("프로젝트 이름을 입력해주세요.");
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

    const matchedProject = PROJECTS.find(
      (project) =>
        project.id !== "all" &&
        project.name.trim().toLowerCase() ===
          createForm.projectName.trim().toLowerCase(),
    );

    const targetProjectId: ProjectScheduleItem["projectId"] =
      matchedProject && matchedProject.id !== "all"
        ? matchedProject.id
        : "p-devw";

    const newItem: ProjectScheduleItem = {
      id: `s${Date.now()}`,
      title: createForm.title.trim(),
      description:
        createForm.description.trim() || "등록된 상세 내용이 없습니다.",
      date: createForm.startDate,
      startDate: createForm.startDate,
      endDate: createForm.endDate,
      status: createForm.status,
      category: "New",
      hasDevlog: false,
      projectId: targetProjectId,
      workspaceId: targetProjectId === "p-devw" ? "team" : "personal",
      customProjectName: createForm.projectName.trim(),
    };

    setSchedules((prev) => [newItem, ...prev]);
    openScheduleDetail(newItem.id);
    setIsCreateModalOpen(false);
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
    <div className="min-h-screen bg-[#f5f6fa] text-slate-900">
      <div
        className={[
          "grid min-h-[calc(100vh-72px)] transition-all duration-300",
          shouldShowDetailSidebar
            ? "grid-cols-[56px_minmax(0,1fr)_340px]"
            : "grid-cols-[56px_minmax(0,1fr)]",
        ].join(" ")}
      >
        <SupportRail
          isPinned={isSupportPinned}
          onMouseEnter={() => setIsSupportHovering(true)}
          onMouseLeave={() => setIsSupportHovering(false)}
          onTogglePin={() => setIsSupportPinned((prev) => !prev)}
        />

        {isSupportPanelVisible && (
          <SupportFloatingPanel
            todayTodos={todayTodos}
            noDevlogSchedules={noDevlogSchedules}
            isPinned={isSupportPinned}
            onSelectSchedule={openScheduleDetail}
            onMarkDevlogWritten={markDevlogWritten}
            onMouseEnter={() => setIsSupportHovering(true)}
            onMouseLeave={() => setIsSupportHovering(false)}
            onClose={() => {
              setIsSupportPinned(false);
              setIsSupportHovering(false);
            }}
            onPin={() => setIsSupportPinned(true)}
          />
        )}

        {viewMode === "month" ? (
          <MonthlySchedulePageView
            currentYear={currentYear}
            currentMonth={currentMonth}
            todayDate={todayDate}
            schedules={filteredSchedules}
            selectedScheduleId={selectedScheduleId}
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
            selectedProjectName={selectedProject.name}
            totalCount={totalCount}
            progressCount={progressCount}
            doneCount={doneCount}
            delayedCount={delayedCount}
            progressRate={progressRate}
            recentDoneSchedule={recentDoneSchedule}
            filteredSchedules={filteredSchedules}
            selectedScheduleId={selectedScheduleId}
            weekDays={weekDays}
            weekStartLabel={`${weekStart.month + 1}월 ${weekStart.date}일`}
            weekEndLabel={`${weekEnd.month + 1}월 ${weekEnd.date}일`}
            todayDate={todayDate}
            onOpenMonth={() => setViewMode("month")}
            onCreateSchedule={openCreateModal}
            onToggleDetail={() => setIsDetailSidebarOpen((prev) => !prev)}
            hasSelectedSchedule={!!selectedSchedule}
            onMoveWeek={moveWeek}
            onGoToday={goToday}
            onSelectSchedule={openScheduleDetail}
            onMoveScheduleDate={moveScheduleDate}
            onChangeStatus={changeStatus}
          />
        )}

        {shouldShowDetailSidebar && (
          <ScheduleDetailAside
            selectedSchedule={selectedSchedule}
            onClose={() => setIsDetailSidebarOpen(false)}
            onChangeStatus={changeStatus}
            onMarkDevlogWritten={markDevlogWritten}
          />
        )}
      </div>

      {isCreateModalOpen && (
        <CreateScheduleModal
          form={createForm}
          onChange={setCreateForm}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={createSchedule}
        />
      )}
    </div>
  );
}

function MonthlySchedulePageView({
  currentYear,
  currentMonth,
  todayDate,
  schedules,
  selectedScheduleId,
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
  onBackToWeek: () => void;
  onCreateSchedule: () => void;
  onMoveMonth: (amount: number) => void;
  onGoToday: () => void;
  onSelectSchedule: (id: string) => void;
  onMoveScheduleDate: (id: string, nextDate: string) => void;
}) {
  return (
    <main className="min-w-0 bg-[#f5f6fa] px-6 py-7">
      <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <p className="text-sm font-bold text-blue-600">Schedule</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {currentYear}년 {currentMonth + 1}월
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBackToWeek}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              주간으로 돌아가기
            </button>

            <button
              type="button"
              onClick={onCreateSchedule}
              className="flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Plus size={17} />새 일정 추가
            </button>

            <button
              type="button"
              className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-bold hover:bg-slate-50"
            >
              월
            </button>

            <button
              type="button"
              onClick={onGoToday}
              className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-bold hover:bg-slate-50"
            >
              오늘
            </button>

            <button
              type="button"
              onClick={() => onMoveMonth(-1)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 hover:bg-slate-50"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => onMoveMonth(1)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 hover:bg-slate-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <MonthlyCalendarBarView
          schedules={schedules}
          selectedScheduleId={selectedScheduleId}
          currentYear={currentYear}
          currentMonth={currentMonth}
          todayDate={todayDate}
          onSelectSchedule={onSelectSchedule}
          onMoveScheduleDate={onMoveScheduleDate}
        />
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
  weekDays,
  weekStartLabel,
  weekEndLabel,
  todayDate,
  onOpenMonth,
  onCreateSchedule,
  onToggleDetail,
  hasSelectedSchedule,
  onMoveWeek,
  onGoToday,
  onSelectSchedule,
  onMoveScheduleDate,
  onChangeStatus,
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
  weekDays: ReturnType<typeof getWeekDays>;
  weekStartLabel: string;
  weekEndLabel: string;
  todayDate: string;
  onOpenMonth: () => void;
  onCreateSchedule: () => void;
  onToggleDetail: () => void;
  hasSelectedSchedule: boolean;
  onMoveWeek: (amount: number) => void;
  onGoToday: () => void;
  onSelectSchedule: (id: string) => void;
  onMoveScheduleDate: (id: string, nextDate: string) => void;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
}) {
  return (
    <main className="min-w-0 bg-[#f5f6fa] p-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <p className="text-sm font-bold text-blue-600">Schedule</p>
            <p className="mt-2 text-sm text-slate-500">
              현재 보기:{" "}
              <span className="text-xl font-bold text-slate-900">
                {selectedProjectName}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenMonth}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <CalendarDays size={17} />
              월간 캘린더
            </button>

            <button
              type="button"
              onClick={onCreateSchedule}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={17} />새 일정 추가
            </button>

            {hasSelectedSchedule && (
              <button
                type="button"
                onClick={onToggleDetail}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                title="상세 패널 접기/펼치기"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(132px,1fr))]">
          <StatCard
            title="전체 일정"
            value={`${totalCount}개`}
            icon={<ListTodo size={20} />}
          />
          <StatCard
            title="진행 중"
            value={`${progressCount}개`}
            icon={<Clock size={20} />}
          />
          <StatCard
            title="완료"
            value={`${doneCount}개`}
            icon={<CheckCircle2 size={20} />}
          />
          <StatCard
            title="지연"
            value={`${delayedCount}개`}
            icon={<AlertTriangle size={20} />}
          />
          <StatCard
            title="진행률"
            value={`${progressRate}%`}
            icon={<LayoutGrid size={20} />}
            subText={`완료 ${doneCount} / 전체 ${totalCount}`}
          />
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{selectedProjectName} 진행률</span>
            <span>
              완료된 일정 {doneCount}개 / 전체 일정 {totalCount}개
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progressRate}%` }}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-2xl bg-slate-100 p-1">
              <ViewButton
                active={viewMode === "calendar"}
                onClick={() => setViewMode("calendar")}
                label="주간"
              />
              <ViewButton
                active={viewMode === "month"}
                onClick={() => setViewMode("month")}
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
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>

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
          />
        )}

        <ProgressRulePanel
          totalCount={totalCount}
          doneCount={doneCount}
          progressRate={progressRate}
          recentDoneSchedule={recentDoneSchedule}
          selectedProjectName={selectedProjectName}
        />
      </section>
    </main>
  );
}

function SupportRail({
  isPinned,
  onMouseEnter,
  onMouseLeave,
  onTogglePin,
}: {
  isPinned: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTogglePin: () => void;
}) {
  return (
    <aside
      className="sticky top-[72px] z-30 h-[calc(100vh-72px)] border-r border-slate-200 bg-white"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex h-full w-14 flex-col items-center gap-3 py-4">
        <button
          type="button"
          onClick={onTogglePin}
          className={`grid h-10 w-10 place-items-center rounded-xl transition ${
            isPinned
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          title={isPinned ? "보조 패널 접기" : "보조 패널 펼치기"}
        >
          <Menu size={19} />
        </button>

        <div className="h-px w-8 bg-slate-200" />

        <button
          type="button"
          onClick={onTogglePin}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
          title="일지 미작성 일정 확인"
        >
          <FilePenLine size={17} />
        </button>

        <button
          type="button"
          onClick={onTogglePin}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
          title="오늘 할 일 확인"
        >
          <ListTodo size={17} />
        </button>
      </div>
    </aside>
  );
}

function SupportFloatingPanel({
  todayTodos,
  noDevlogSchedules,
  isPinned,
  onSelectSchedule,
  onMarkDevlogWritten,
  onMouseEnter,
  onMouseLeave,
  onClose,
  onPin,
}: {
  todayTodos: ProjectScheduleItem[];
  noDevlogSchedules: ProjectScheduleItem[];
  isPinned: boolean;
  onSelectSchedule: (id: string) => void;
  onMarkDevlogWritten: (id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
  onPin: () => void;
}) {
  return (
    <aside
      className="fixed left-14 top-[72px] z-40 h-[calc(100vh-72px)] w-[280px] border-r border-slate-200 bg-white shadow-2xl"
      onMouseEnter={onMouseEnter}
      onMouseLeave={isPinned ? undefined : onMouseLeave}
    >
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">보조 패널</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              오늘 할 일과 일지 미작성 일정만 빠르게 확인합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={isPinned ? onClose : onPin}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            {isPinned ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={17} />
            )}
          </button>
        </div>

        <SupportScheduleSection
          title="오늘 할 일"
          description="오늘 날짜에 남아 있는 일정입니다."
          schedules={todayTodos}
          emptyText="오늘 남은 일정 없음"
          onSelectSchedule={onSelectSchedule}
        />

        <SupportScheduleSection
          title="일지 미작성 일정"
          description="작업은 있지만 수행 기록이 없는 일정입니다."
          schedules={noDevlogSchedules}
          emptyText="모든 일정에 일지가 작성됨"
          onSelectSchedule={onSelectSchedule}
          onMarkDevlogWritten={onMarkDevlogWritten}
        />
      </div>
    </aside>
  );
}

function SupportScheduleSection({
  title,
  description,
  schedules,
  emptyText,
  onSelectSchedule,
  onMarkDevlogWritten,
}: {
  title: string;
  description: string;
  schedules: ProjectScheduleItem[];
  emptyText: string;
  onSelectSchedule: (id: string) => void;
  onMarkDevlogWritten?: (id: string) => void;
}) {
  return (
    <section className="mb-4">
      <div className="mb-3">
        <h2 className="text-sm font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      <div className="flex flex-col gap-2">
        {schedules.length === 0 ? (
          <EmptyBox text={emptyText} compact />
        ) : (
          schedules.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 p-3"
            >
              <button
                type="button"
                onClick={() => onSelectSchedule(item.id)}
                className="block w-full text-left"
              >
                <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {getSchedulePeriodText(item)}
                </p>
              </button>

              {onMarkDevlogWritten && !item.hasDevlog && (
                <button
                  type="button"
                  onClick={() => onMarkDevlogWritten(item.id)}
                  className="mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-xl bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  <FilePenLine size={14} />
                  개발일지 작성 처리
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
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
    const safeEndIndex = endIndexFromRight === -1 ? 6 : 6 - endIndexFromRight;

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

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
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
                    isToday ? "text-blue-600" : "text-slate-900"
                  }`}
                >
                  {day.date}일
                </p>

                {isToday && (
                  <p className="mt-1 w-fit rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
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
                    className={`min-w-0 cursor-grab rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:shadow-md active:cursor-grabbing ${
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
                      className="cursor-grab rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-300 active:cursor-grabbing"
                    >
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                        {item.description}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                        <span className="truncate">
                          {getSchedulePeriodText(item)}
                        </span>
                        <span>{item.category}</span>
                      </div>

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
}: {
  schedules: ProjectScheduleItem[];
  onSelect: (id: string) => void;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
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
            <th className="px-4 py-3">변경</th>
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
                      className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                    >
                      완료
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}

          {schedules.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10">
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
  onClose,
  onChangeStatus,
  onMarkDevlogWritten,
}: {
  selectedSchedule: ProjectScheduleItem | null;
  onClose: () => void;
  onChangeStatus: (id: string, status: ScheduleStatus) => void;
  onMarkDevlogWritten: (id: string) => void;
}) {
  if (!selectedSchedule) return null;

  const projectName = getProjectName(selectedSchedule);
  const periodText = getSchedulePeriodText(selectedSchedule);

  return (
    <aside className="min-w-0 border-l border-slate-200 bg-white">
      <div className="sticky top-[72px] flex h-[calc(100vh-72px)] flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-blue-600">
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

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="min-w-0 text-lg font-black leading-snug text-slate-900">
                {selectedSchedule.title}
              </h3>

              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                  statusBadgeStyle[selectedSchedule.status]
                }`}
              >
                {scheduleStatusLabel[selectedSchedule.status]}
              </span>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              {selectedSchedule.description || "등록된 상세 내용이 없습니다."}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-black text-slate-800">
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

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black text-slate-800">일정 상세</h3>

            <p className="mt-3 whitespace-pre-wrap break-keep text-xs leading-5 text-slate-600">
              {selectedSchedule.description || "등록된 상세 내용이 없습니다."}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
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
                className="h-9 rounded-xl bg-emerald-50 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
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

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-black text-slate-800">개발일지 연결</h3>

            {selectedSchedule.hasDevlog ? (
              <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-700">
                개발일지가 작성된 일정입니다.
                <br />
                수행 기록이 있어 진행 근거로 사용할 수 있습니다.
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onMarkDevlogWritten(selectedSchedule.id)}
                className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
              >
                <FilePenLine size={14} />
                개발일지 작성 처리
              </button>
            )}
          </section>
        </div>
      </div>
    </aside>
  );
}

function CreateScheduleModal({
  form,
  onChange,
  onClose,
  onSubmit,
}: {
  form: CreateScheduleForm;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
      <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              New Schedule
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              새 일정 추가
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              프로젝트 이름
            </label>
            <input
              value={form.projectName}
              onChange={(event) =>
                updateField("projectName", event.target.value)
              }
              placeholder="예: Devw 캡스톤"
              className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              일정 제목
            </label>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="예: 로그인 API 구현"
              className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400"
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
                className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                종료일
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => updateField("endDate", event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400"
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
              rows={5}
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            취소
          </button>

          <button
            type="button"
            onClick={onSubmit}
            className="h-10 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
          >
            일정 추가
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
          ? "bg-blue-600 text-white"
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
    <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5">
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

        <div className="rounded-2xl bg-slate-50 px-5 py-4 text-right">
          <p className="text-sm font-semibold text-slate-500">
            완료 {doneCount} / 전체 {totalCount}
          </p>
          <p className="mt-1 text-2xl font-black text-blue-600">
            {progressRate}%
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">계산식</p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            완료된 일정 수 / 전체 일정 수 × 100
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">최근 완료</p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            {recentDoneSchedule ? recentDoneSchedule.title : "완료된 일정 없음"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-400">일반 개발일지</p>
          <p className="mt-2 text-sm font-bold text-slate-700">
            진행률에는 미포함
          </p>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
  icon,
  subText,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subText?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="text-slate-500">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      {subText && <p className="mt-1 text-xs text-slate-500">{subText}</p>}
    </div>
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
      className={`rounded-xl px-5 py-2.5 text-sm font-bold ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
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
      className={`rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-400 ${
        compact ? "p-3" : "p-5"
      }`}
    >
      {text}
    </div>
  );
}
