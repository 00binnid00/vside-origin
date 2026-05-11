"use client";

import type React from "react";
import { useMemo, useState } from "react";
import {
  CalendarCheck,
  FilePenLine,
  FileText,
  Link2,
  ListTodo,
  Menu,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";

type ScheduleStatus = "todo" | "progress" | "done" | "delayed";
type DevlogType = "linked" | "general";
type DevlogFilter = "all" | "linked" | "general" | "progress" | "done";
type ProjectMode = "personal" | "team";
type ProjectId = "all" | "p-devw" | "p-shop" | "p-ai";

type ProjectItem = {
  id: ProjectId;
  name: string;
  description: string;
  colorClass: string;
  mode: "all" | ProjectMode;
};

type ScheduleOption = {
  id: string;
  title: string;
  status: ScheduleStatus;
  projectId: Exclude<ProjectId, "all">;
  workspaceId: ProjectMode;
};

type DevlogItem = {
  id: string;
  title: string;
  content: string;
  date: string;
  type: DevlogType;
  scheduleId: string | null;
  scheduleTitle: string | null;
  status: ScheduleStatus | null;
  tags: string[];
  projectId: Exclude<ProjectId, "all">;
  workspaceId: ProjectMode;
};

const PROJECTS: ProjectItem[] = [
  {
    id: "all",
    name: "전체 프로젝트",
    description: "모든 프로젝트 일지",
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

const scheduleStatusLabel: Record<ScheduleStatus, string> = {
  todo: "할 일",
  progress: "진행 중",
  done: "완료",
  delayed: "지연",
};

const statusStyle: Record<ScheduleStatus, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  progress: "bg-blue-50 text-blue-700 border-blue-200",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delayed: "bg-rose-50 text-rose-700 border-rose-200",
};

const initialSchedules: ScheduleOption[] = [
  {
    id: "s1",
    title: "로그인 API 구현",
    status: "done",
    projectId: "p-devw",
    workspaceId: "team",
  },
  {
    id: "s2",
    title: "프로젝트 생성 UI 수정",
    status: "progress",
    projectId: "p-devw",
    workspaceId: "team",
  },
  {
    id: "s3",
    title: "GitHub 브랜치 연동",
    status: "todo",
    projectId: "p-shop",
    workspaceId: "personal",
  },
  {
    id: "s4",
    title: "일정 진행률 계산 로직 정리",
    status: "delayed",
    projectId: "p-ai",
    workspaceId: "personal",
  },
];

const initialDevlogs: DevlogItem[] = [
  {
    id: "d1",
    title: "로그인 API 오류 수정",
    content:
      "JWT 인증 필터에서 Authorization 헤더가 누락되었을 때 object Object 오류가 발생하는 문제를 확인했다. 예외 메시지를 문자열로 변환하고, 토큰 검증 실패 시 명확한 에러를 반환하도록 수정했다.",
    date: "2026-05-01",
    type: "linked",
    scheduleId: "s1",
    scheduleTitle: "로그인 API 구현",
    status: "done",
    tags: ["Backend", "Spring Security", "JWT"],
    projectId: "p-devw",
    workspaceId: "team",
  },
  {
    id: "d2",
    title: "프로젝트 생성 화면 레이아웃 개선",
    content:
      "프로젝트 생성 버튼이 상단에서 따로 떠 보이는 문제가 있어 필터 영역과 함께 배치했다. 개인 프로젝트는 blue, 팀 프로젝트는 green 계열로 구분했다.",
    date: "2026-04-30",
    type: "linked",
    scheduleId: "s2",
    scheduleTitle: "프로젝트 생성 UI 수정",
    status: "progress",
    tags: ["Frontend", "UI", "Tailwind"],
    projectId: "p-devw",
    workspaceId: "team",
  },
  {
    id: "d3",
    title: "Next 개발 환경 오류 정리",
    content:
      "개발 중 왼쪽 하단에 나타나는 Next overlay 오류 원인을 확인했다. Promise reject 값이 객체로 전달되는 케이스를 문자열 에러로 바꾸는 방식으로 정리했다.",
    date: "2026-04-29",
    type: "general",
    scheduleId: null,
    scheduleTitle: null,
    status: null,
    tags: ["Next.js", "Debug", "Error"],
    projectId: "p-shop",
    workspaceId: "personal",
  },
];

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getProjectName(projectId: ProjectId | Exclude<ProjectId, "all">) {
  return (
    PROJECTS.find((project) => project.id === projectId)?.name ??
    "프로젝트 없음"
  );
}

export default function DevlogManagementMock() {
  const [schedules, setSchedules] =
    useState<ScheduleOption[]>(initialSchedules);
  const [devlogs, setDevlogs] = useState<DevlogItem[]>(initialDevlogs);

  const [selectedDevlogId, setSelectedDevlogId] = useState<string>(
    initialDevlogs[0]?.id ?? "",
  );

  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId>("all");
  const [filter, setFilter] = useState<DevlogFilter>("all");
  const [query, setQuery] = useState("");

  // =========================
  // 왼쪽 보조 패널 상태
  // - 일정관리처럼 프로젝트 목록은 넣지 않음
  // - 일지 미작성 일정만 확인하는 용도
  // =========================
  const [isSupportPinned, setIsSupportPinned] = useState(false);
  const [isSupportHovering, setIsSupportHovering] = useState(false);

  // =========================
  // 개발일지 작성 모달 상태
  // =========================
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formDate, setFormDate] = useState(getTodayDateKey());
  const [formScheduleId, setFormScheduleId] = useState("");
  const [formStatusChange, setFormStatusChange] = useState<
    "none" | "progress" | "done"
  >("none");

  const selectedProject =
    PROJECTS.find((project) => project.id === selectedProjectId) ?? PROJECTS[0];

  const visibleSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      if (selectedProjectId === "all") return true;
      return schedule.projectId === selectedProjectId;
    });
  }, [schedules, selectedProjectId]);

  // =========================
  // 일지 미작성 일정
  // - 현재 선택 프로젝트 기준
  // - 해당 scheduleId로 연결된 devlog가 하나도 없는 일정
  // =========================
  const noDevlogSchedules = useMemo(() => {
    return visibleSchedules.filter((schedule) => {
      return !devlogs.some((devlog) => devlog.scheduleId === schedule.id);
    });
  }, [devlogs, visibleSchedules]);

  const filteredDevlogs = useMemo(() => {
    return devlogs.filter((item) => {
      const matchesProject =
        selectedProjectId === "all" || item.projectId === selectedProjectId;

      const matchesFilter =
        filter === "all" || item.type === filter || item.status === filter;

      const keyword = query.trim().toLowerCase();

      const matchesQuery =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.content.toLowerCase().includes(keyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(keyword)) ||
        item.scheduleTitle?.toLowerCase().includes(keyword);

      return matchesProject && matchesFilter && matchesQuery;
    });
  }, [devlogs, filter, query, selectedProjectId]);

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
  const weeklyDevlogs = filteredDevlogs.filter(
    (item) => item.date >= "2026-04-27",
  ).length;

  const doneLinkedSchedules = filteredDevlogs.filter(
    (item) => item.type === "linked" && item.status === "done",
  ).length;

  const isSupportPanelVisible = isSupportPinned || isSupportHovering;

  const handleSelectProject = (projectId: ProjectId) => {
    setSelectedProjectId(projectId);
    setSelectedDevlogId("");
    setFormScheduleId("");
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
    setIsCreateModalOpen(false);
  };

  const createDevlog = () => {
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

    const linkedSchedule =
      schedules.find((item) => item.id === formScheduleId) ?? null;

    const fallbackProjectId: Exclude<ProjectId, "all"> =
      selectedProjectId === "all" ? "p-devw" : selectedProjectId;

    const nextProjectId = linkedSchedule?.projectId ?? fallbackProjectId;
    const nextWorkspaceId =
      linkedSchedule?.workspaceId ??
      (nextProjectId === "p-devw" ? "team" : "personal");

    const nextStatus =
      linkedSchedule && formStatusChange !== "none"
        ? formStatusChange
        : (linkedSchedule?.status ?? null);

    const newDevlog: DevlogItem = {
      id: `d${Date.now()}`,
      title: formTitle.trim(),
      content: formContent.trim(),
      date: formDate,
      type: linkedSchedule ? "linked" : "general",
      scheduleId: linkedSchedule?.id ?? null,
      scheduleTitle: linkedSchedule?.title ?? null,
      status: nextStatus,
      tags: linkedSchedule
        ? ["Schedule", nextStatus ? scheduleStatusLabel[nextStatus] : "Linked"]
        : ["General", "Memo"],
      projectId: nextProjectId,
      workspaceId: nextWorkspaceId,
    };

    setDevlogs((prev) => [newDevlog, ...prev]);
    setSelectedDevlogId(newDevlog.id);

    if (linkedSchedule && formStatusChange !== "none") {
      setSchedules((prev) =>
        prev.map((item) =>
          item.id === linkedSchedule.id
            ? { ...item, status: formStatusChange }
            : item,
        ),
      );
    }

    resetForm();
    setIsCreateModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <div className="grid min-h-screen grid-cols-[56px_minmax(0,1fr)]">
        {/* =========================
            왼쪽 아이콘 레일
        ========================= */}
        <SupportRail
          isPinned={isSupportPinned}
          noDevlogCount={noDevlogSchedules.length}
          onMouseEnter={() => setIsSupportHovering(true)}
          onMouseLeave={() => setIsSupportHovering(false)}
          onTogglePin={() => setIsSupportPinned((prev) => !prev)}
        />

        {/* =========================
            왼쪽 floating 보조 패널
            - 화면 폭을 밀지 않고 위에 뜸
        ========================= */}
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
                      {selectedProject.name}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    일정에 연결된 일지는 작업 진행 근거로, 일반 일지는 회고와
                    오류 해결 기록으로 관리합니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <Plus size={17} />새 개발일지 작성
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <StatCard
                  title="전체 일지"
                  value={`${totalDevlogs}개`}
                  icon={<FileText size={20} />}
                />
                <StatCard
                  title="일정 연결 일지"
                  value={`${linkedDevlogs}개`}
                  icon={<Link2 size={20} />}
                />
                <StatCard
                  title="일반 일지"
                  value={`${generalDevlogs}개`}
                  icon={<NotebookPen size={20} />}
                />
                <StatCard
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
                    프로젝트, 일정 연결 여부, 진행 상태 기준으로 일지를
                    확인합니다.
                  </p>
                </div>

                <div className="relative w-full xl:w-[420px]">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="제목, 내용, 태그, 연결 일정 검색"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <FilterButton
                  active={filter === "all"}
                  label="전체"
                  onClick={() => setFilter("all")}
                />
                <FilterButton
                  active={filter === "linked"}
                  label="일정 연결"
                  onClick={() => setFilter("linked")}
                />
                <FilterButton
                  active={filter === "general"}
                  label="일반 일지"
                  onClick={() => setFilter("general")}
                />
                <FilterButton
                  active={filter === "progress"}
                  label="진행 중"
                  onClick={() => setFilter("progress")}
                />
                <FilterButton
                  active={filter === "done"}
                  label="완료"
                  onClick={() => setFilter("done")}
                />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <DevlogListPanel
                  filteredDevlogs={filteredDevlogs}
                  selectedDevlog={selectedDevlog}
                  onSelectDevlog={setSelectedDevlogId}
                />

                <DevlogDetailPanel selectedDevlog={selectedDevlog} />
              </div>
            </section>
          </div>
        </main>
      </div>

      {isCreateModalOpen && (
        <CreateDevlogModal
          selectedProjectName={selectedProject.name}
          visibleSchedules={visibleSchedules}
          formTitle={formTitle}
          formContent={formContent}
          formDate={formDate}
          formScheduleId={formScheduleId}
          formStatusChange={formStatusChange}
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

/* =========================
   왼쪽 아이콘 레일
========================= */
function SupportRail({
  isPinned,
  noDevlogCount,
  onMouseEnter,
  onMouseLeave,
  onTogglePin,
}: {
  isPinned: boolean;
  noDevlogCount: number;
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
          className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
          title="일지 미작성 일정"
        >
          <ListTodo size={17} />

          {noDevlogCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
              {noDevlogCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onTogglePin}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
          title="개발일지 작성"
        >
          <FilePenLine size={17} />
        </button>
      </div>
    </aside>
  );
}

/* =========================
   왼쪽 보조 패널
   - 프로젝트 목록 없음
   - 일지 미작성 일정만 표시
========================= */
function DevlogSupportPanel({
  isPinned,
  noDevlogSchedules,
  onCreateWithSchedule,
  onMouseEnter,
  onMouseLeave,
  onClose,
  onPin,
}: {
  isPinned: boolean;
  noDevlogSchedules: ScheduleOption[];
  onCreateWithSchedule: (scheduleId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
  onPin: () => void;
}) {
  return (
    <aside
      className="fixed left-14 top-[72px] z-40 h-[calc(100vh-72px)] w-[300px] border-r border-slate-200 bg-white shadow-2xl"
      onMouseEnter={onMouseEnter}
      onMouseLeave={isPinned ? undefined : onMouseLeave}
    >
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">
              일지 미작성 일정
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              아직 개발일지가 연결되지 않은 일정입니다.
            </p>
          </div>

          <button
            type="button"
            onClick={isPinned ? onClose : onPin}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            title={isPinned ? "보조 패널 접기" : "보조 패널 고정"}
          >
            {isPinned ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={17} />
            )}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500">미작성 일정</p>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-600">
              {noDevlogSchedules.length}개
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {noDevlogSchedules.length === 0 ? (
            <EmptyBox text="모든 일정에 개발일지가 작성되었습니다." />
          ) : (
            noDevlogSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-2xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                      {schedule.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {getProjectName(schedule.projectId)}
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
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

function CreateDevlogModal({
  selectedProjectName,
  visibleSchedules,
  formTitle,
  formContent,
  formDate,
  formScheduleId,
  formStatusChange,
  onChangeTitle,
  onChangeContent,
  onChangeDate,
  onChangeScheduleId,
  onChangeStatus,
  onClose,
  onSubmit,
}: {
  selectedProjectName: string;
  visibleSchedules: ScheduleOption[];
  formTitle: string;
  formContent: string;
  formDate: string;
  formScheduleId: string;
  formStatusChange: "none" | "progress" | "done";
  onChangeTitle: (value: string) => void;
  onChangeContent: (value: string) => void;
  onChangeDate: (value: string) => void;
  onChangeScheduleId: (value: string) => void;
  onChangeStatus: (value: "none" | "progress" | "done") => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
      <div className="max-h-[90vh] w-full max-w-[760px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              New Devlog
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              새 개발일지 작성
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="개발일지 작성 모달 닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-136px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  프로젝트
                </label>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
                  {selectedProjectName}
                </div>
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold text-slate-700">
                  작업한 날짜
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(event) => onChangeDate(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold text-slate-700">
                  연결할 일정
                </label>
                <select
                  value={formScheduleId}
                  onChange={(event) => onChangeScheduleId(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">연결 없이 일반 일지 작성</option>
                  {visibleSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.title} · {scheduleStatusLabel[schedule.status]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold text-slate-700">
                  진행 상태 변경
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <StatusOptionButton
                    active={formStatusChange === "none"}
                    label="변경 없음"
                    onClick={() => onChangeStatus("none")}
                  />
                  <StatusOptionButton
                    active={formStatusChange === "progress"}
                    label="진행 중"
                    onClick={() => onChangeStatus("progress")}
                  />
                  <StatusOptionButton
                    active={formStatusChange === "done"}
                    label="완료"
                    onClick={() => onChangeStatus("done")}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <div>
                <label className="text-sm font-bold text-slate-700">제목</label>
                <input
                  value={formTitle}
                  onChange={(event) => onChangeTitle(event.target.value)}
                  placeholder="예: 로그인 API 오류 수정"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold text-slate-700">내용</label>
                <textarea
                  value={formContent}
                  onChange={(event) => onChangeContent(event.target.value)}
                  placeholder="오늘 수행한 작업, 오류 원인, 해결 방법 등을 작성하세요."
                  className="mt-2 h-52 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-blue-400"
                />
              </div>
            </section>
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
            className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
          >
            <NotebookPen size={17} />
            개발일지 저장
          </button>
        </div>
      </div>
    </div>
  );
}

function DevlogListPanel({
  filteredDevlogs,
  selectedDevlog,
  onSelectDevlog,
}: {
  filteredDevlogs: DevlogItem[];
  selectedDevlog: DevlogItem | null;
  onSelectDevlog: (id: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3">
        {filteredDevlogs.length === 0 ? (
          <EmptyBox text="조건에 맞는 개발일지가 없습니다." />
        ) : (
          filteredDevlogs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectDevlog(item.id)}
              className={`rounded-2xl border p-5 text-left transition hover:border-blue-300 ${
                selectedDevlog?.id === item.id
                  ? "border-blue-300 bg-blue-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-bold">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {getProjectName(item.projectId)} · {item.date}
                  </p>
                </div>

                {item.status && (
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${statusStyle[item.status]}`}
                  >
                    {scheduleStatusLabel[item.status]}
                  </span>
                )}
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                {item.content}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.type === "linked" ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    연결 일정: {item.scheduleTitle}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    일반 개발일지
                  </span>
                )}

                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function DevlogDetailPanel({
  selectedDevlog,
}: {
  selectedDevlog: DevlogItem | null;
}) {
  return (
    <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">상세 보기</h2>
        <Sparkles size={20} className="text-blue-500" />
      </div>

      {!selectedDevlog ? (
        <EmptyBox text="선택한 개발일지가 없습니다." />
      ) : (
        <div className="mt-5">
          <p className="text-sm font-semibold text-blue-600">
            {getProjectName(selectedDevlog.projectId)}
          </p>
          <h3 className="mt-1 text-xl font-black leading-8">
            {selectedDevlog.title}
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            작업한 날짜: {selectedDevlog.date}
          </p>

          <div className="mt-5 rounded-2xl bg-white p-4">
            <p className="text-sm font-bold text-slate-700">연결 일정</p>
            <p className="mt-2 text-sm text-slate-500">
              {selectedDevlog.scheduleTitle ?? "연결 없이 작성된 일반 일지"}
            </p>
          </div>

          {selectedDevlog.status && (
            <span
              className={`mt-4 inline-block rounded-full border px-3 py-1 text-xs font-bold ${statusStyle[selectedDevlog.status]}`}
            >
              {scheduleStatusLabel[selectedDevlog.status]}
            </span>
          )}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-700">작성 내용</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {selectedDevlog.content}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {selectedDevlog.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="text-slate-500">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      {subText && <p className="mt-1 text-xs text-slate-500">{subText}</p>}
    </div>
  );
}

function FilterButton({
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
      className={`rounded-full px-4 py-2 text-sm font-bold ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function StatusOptionButton({
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
      className={`h-10 rounded-xl text-xs font-bold ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
