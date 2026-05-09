"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  ArrowUpRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Code2,
  ExternalLink,
  FileText,
  Filter,
  FolderKanban,
  FolderOpen,
  Info,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import CreateProjectModal from "@/components/ide/CreateProjectModal";
import { openProjectModal } from "@/store/slices/uiSlice";
import { setWorkspaceId } from "@/store/slices/fileSystemSlice";

import type {
  ProjectSummaryResponse,
  WorkspaceMode,
} from "@/components/main-dashboard/dashboard.types";

import {
  getAivsHref,
  getDevlogHref,
  getScheduleHref,
} from "@/components/main-dashboard/dashboard.utils";

const API_BASE = "http://localhost:8080";

type SubProjectStatus = "todo" | "progress" | "done" | "hold";
type SortType = "recent" | "name" | "progress";

type ProjectListResponse = ProjectSummaryResponse & {
  description?: string | null;
  gitUrl?: string | null;
  workspaceId: string;
  workspaceName: string;

  status?: SubProjectStatus | string | null;
  progress?: number | null;
  scheduleCount?: number | null;
  doneScheduleCount?: number | null;
  devlogCount?: number | null;
  memberCount?: number | null;
};

type SubProject = ProjectListResponse & {
  id: string;
};

type Props = {
  workspaceId?: string;
  mode?: WorkspaceMode;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (!ref.current || !target) return;
      if (ref.current.contains(target)) return;

      handler();
    };

    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};

  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");

  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

function normalizeStatus(value?: string | null): SubProjectStatus {
  if (value === "done") return "done";
  if (value === "hold") return "hold";
  if (value === "progress") return "progress";
  return "todo";
}

function getStatusLabel(status: SubProjectStatus) {
  switch (status) {
    case "progress":
      return "진행 중";
    case "done":
      return "완료";
    case "hold":
      return "보류";
    case "todo":
    default:
      return "시작 전";
  }
}

function getStatusClassName(status: SubProjectStatus) {
  switch (status) {
    case "progress":
      return "bg-indigo-50 text-indigo-700 ring-indigo-100";
    case "done":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "hold":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "todo":
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function getProgress(project: SubProject) {
  if (typeof project.progress === "number") {
    return Math.max(0, Math.min(100, Math.round(project.progress)));
  }

  const total = project.scheduleCount ?? 0;
  const done = project.doneScheduleCount ?? 0;

  if (total > 0) {
    return Math.round((done / total) * 100);
  }

  return 0;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  if (/^\d{4}\.\d{2}\.\d{2}/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function mapProjectResponse(project: ProjectListResponse): SubProject {
  return {
    ...project,
    id: String(project.id),
    description: project.description ?? null,
    gitUrl: project.gitUrl ?? null,
    status: project.status ?? "todo",
    progress: project.progress ?? 0,
    scheduleCount: project.scheduleCount ?? 0,
    doneScheduleCount: project.doneScheduleCount ?? 0,
    devlogCount: project.devlogCount ?? 0,
    memberCount: project.memberCount ?? 1,
  };
}

async function fetchSubProjectsByWorkspaceApi(
  workspaceId: string,
): Promise<SubProject[]> {
  const response = await fetch(
    `${API_BASE}/api/projects/workspace/${encodeURIComponent(workspaceId)}`,
    {
      method: "GET",
      headers: {
        ...getAuthHeaders(),
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "하위 프로젝트 목록 조회에 실패했습니다.");
  }

  const data: ProjectListResponse[] = await response.json();

  return Array.isArray(data) ? data.map(mapProjectResponse) : [];
}

function StatusPill({ status }: { status: SubProjectStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1",
        getStatusClassName(status),
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-extrabold text-slate-950">{value}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
          {icon}
        </div>
      </div>

      <p className="mt-2 text-xs font-medium text-slate-400">{helper}</p>
    </div>
  );
}

function SubProjectCard({
  project,
  mode,
  open,
  onOpenMenu,
  onCloseMenu,
  onDelete,
  menuRef,
}: {
  project: SubProject;
  mode: WorkspaceMode;
  open: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onDelete: () => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const status = normalizeStatus(project.status);
  const progress = getProgress(project);

  const scheduleCount = project.scheduleCount ?? 0;
  const doneScheduleCount = project.doneScheduleCount ?? 0;
  const devlogCount = project.devlogCount ?? 0;
  const memberCount = project.memberCount ?? 1;

  const openHref = getAivsHref(project.workspaceId, mode);
  const scheduleHref = getScheduleHref(project.workspaceId, mode);
  const devlogHref = getDevlogHref(project.workspaceId);

  return (
    <section className="group relative rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FolderKanban size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-extrabold text-slate-950">
                {project.name}
              </h3>

              <StatusPill status={status} />
            </div>

            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
              {project.description?.trim()
                ? project.description
                : `${project.language || "General"} 기반 하위 프로젝트입니다.`}
            </p>

            {project.gitUrl ? (
              <a
                href={project.gitUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-slate-400 transition hover:text-indigo-600"
              >
                <span className="truncate">{project.gitUrl}</span>
                <ExternalLink size={12} />
              </a>
            ) : null}
          </div>
        </div>

        <div className="relative shrink-0" ref={open ? menuRef : null}>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="하위 프로젝트 메뉴"
            onClick={onOpenMenu}
          >
            <MoreVertical size={17} />
          </button>

          {open ? (
            <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <Link
                href={openHref}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={onCloseMenu}
              >
                <FolderOpen size={16} className="text-slate-500" />
                하위 프로젝트 열기
              </Link>

              <Link
                href={scheduleHref}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={onCloseMenu}
              >
                <CalendarCheck size={16} className="text-slate-500" />
                일정관리
              </Link>

              <Link
                href={devlogHref}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={onCloseMenu}
              >
                <FileText size={16} className="text-slate-500" />
                개발일지
              </Link>

              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  onCloseMenu();
                  console.log("project detail:", project.id);
                }}
              >
                <Info size={16} className="text-slate-500" />
                프로젝트 정보
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  onCloseMenu();
                  console.log("project settings:", project.id);
                }}
              >
                <Settings size={16} className="text-slate-500" />
                설정
              </button>

              <div className="h-px bg-slate-100" />

              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 size={16} />
                삭제
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold">
          <span className="text-slate-500">진행률</span>
          <span className="text-slate-900">{progress}%</span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              status === "done"
                ? "bg-emerald-500"
                : status === "hold"
                  ? "bg-amber-500"
                  : "bg-indigo-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <CalendarCheck size={14} />
            일정
          </div>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {doneScheduleCount}/{scheduleCount}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <FileText size={14} />
            일지
          </div>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {devlogCount}개
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <UsersRound size={14} />
            인원
          </div>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {memberCount}명
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-400">
            최근 수정
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-700">
            {formatDate(project.updatedAt)}
          </p>
        </div>

        <Link
          href={openHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-indigo-600"
        >
          열기
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}

export function ProjectManagerList({
  workspaceId: workspaceIdProp,
  mode = "personal",
}: Props) {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();

  const workspaceIdFromUrl =
    searchParams.get("workspaceId") ??
    searchParams.get("id") ??
    searchParams.get("workspace");

  const modeFromUrl = searchParams.get("mode");
  const currentMode: WorkspaceMode =
    modeFromUrl === "team" || modeFromUrl === "personal" ? modeFromUrl : mode;

  const [rememberedWorkspaceId, setRememberedWorkspaceId] = useState<
    string | null
  >(null);

  const currentWorkspaceId =
    workspaceIdProp ?? workspaceIdFromUrl ?? rememberedWorkspaceId;

  const [projects, setProjects] = useState<SubProject[]>([]);
  const [workspaceName, setWorkspaceName] = useState("AIVS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<"all" | SubProjectStatus>(
    "all",
  );
  const [sortType, setSortType] = useState<SortType>("recent");
  const [query, setQuery] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useOnClickOutside(menuRef, () => setOpenMenuId(null));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedWorkspaceId = localStorage.getItem("currentWorkspaceId");
    if (storedWorkspaceId) {
      setRememberedWorkspaceId(storedWorkspaceId);
    }
  }, []);

  useEffect(() => {
    if (!currentWorkspaceId) return;

    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);
  }, [currentWorkspaceId]);

  async function loadProjects(workspaceId: string) {
    try {
      setLoading(true);
      setError("");

      const data = await fetchSubProjectsByWorkspaceApi(workspaceId);

      setProjects(data);

      const nameFromResponse = data[0]?.workspaceName;
      setWorkspaceName(nameFromResponse || "AIVS");
    } catch (err) {
      console.error(err);
      setProjects([]);
      setError(
        err instanceof Error
          ? err.message
          : "하위 프로젝트 조회 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!currentWorkspaceId) {
      setLoading(false);
      setProjects([]);
      setError("선택된 상위 프로젝트 ID가 없습니다.");
      return;
    }

    loadProjects(currentWorkspaceId);
  }, [currentWorkspaceId]);

  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    const result = projects
      .filter((project) => {
        const status = normalizeStatus(project.status);

        if (statusFilter === "all") return true;
        return status === statusFilter;
      })
      .filter((project) => {
        if (!keyword) return true;

        return (
          project.name.toLowerCase().includes(keyword) ||
          project.language.toLowerCase().includes(keyword) ||
          (project.description ?? "").toLowerCase().includes(keyword) ||
          (project.gitUrl ?? "").toLowerCase().includes(keyword)
        );
      });

    result.sort((a, b) => {
      if (sortType === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sortType === "progress") {
        return getProgress(b) - getProgress(a);
      }

      return a.updatedAt < b.updatedAt ? 1 : -1;
    });

    return result;
  }, [projects, query, statusFilter, sortType]);

  const allSubProjectCount = projects.length;

  const progressCount = projects.filter(
    (project) => normalizeStatus(project.status) === "progress",
  ).length;

  const totalDevlogCount = projects.reduce(
    (sum, project) => sum + (project.devlogCount ?? 0),
    0,
  );

  const averageProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((sum, project) => sum + getProgress(project), 0) /
            projects.length,
        )
      : 0;

  async function handleDeleteSubProject(projectId: string) {
    if (
      !window.confirm(
        "정말 이 하위 프로젝트를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/projects/${encodeURIComponent(projectId)}`,
        {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
          },
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "하위 프로젝트 삭제에 실패했습니다.");
      }

      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      setOpenMenuId(null);
      alert("하위 프로젝트가 삭제되었습니다.");
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "하위 프로젝트 삭제 중 오류가 발생했습니다.",
      );
    }
  }

  function handleOpenCreateProjectModal() {
    if (!currentWorkspaceId) {
      alert("선택된 상위 프로젝트 ID가 없습니다.");
      return;
    }

    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);

    dispatch(setWorkspaceId(currentWorkspaceId));
    dispatch(openProjectModal());
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-50 shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-5 lg:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600">
                  Sub Project Board
                </p>

                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                  AIVS
                </span>
              </div>

              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <FolderKanban size={19} />
                </div>

                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-black tracking-tight text-slate-950">
                    {workspaceName}
                  </h1>

                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                    선택된 상위 프로젝트 안의 하위 프로젝트를 작업 단위로
                    관리합니다.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      Workspace ID {currentWorkspaceId ?? "-"}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1">
                      {currentMode === "team" ? "팀 프로젝트" : "개인 프로젝트"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateProjectModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-700"
            >
              하위 프로젝트 추가
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4 lg:px-6">
          <SummaryCard
            icon={<FolderKanban size={19} />}
            label="전체 하위 프로젝트"
            value={allSubProjectCount}
            helper="현재 상위 프로젝트에 포함된 작업 단위"
          />

          <SummaryCard
            icon={<TrendingUp size={19} />}
            label="평균 진행률"
            value={`${averageProgress}%`}
            helper="하위 프로젝트 평균 진행 상태"
          />

          <SummaryCard
            icon={<CheckCircle2 size={19} />}
            label="진행 중"
            value={progressCount}
            helper="작업이 진행 중인 하위 프로젝트"
          />

          <SummaryCard
            icon={<FileText size={19} />}
            label="개발일지"
            value={totalDevlogCount}
            helper="하위 프로젝트에 연결된 기록"
          />
        </div>

        <div className="border-b border-slate-200 bg-white px-5 py-4 lg:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="하위 프로젝트명, 설명, 언어, Git URL 검색"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between xl:justify-end">
              <div className="flex flex-wrap items-center gap-1.5">
                <Filter size={15} className="text-slate-400" />

                {[
                  { value: "all", label: "전체" },
                  { value: "todo", label: "시작 전" },
                  { value: "progress", label: "진행 중" },
                  { value: "done", label: "완료" },
                  { value: "hold", label: "보류" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setStatusFilter(item.value as "all" | SubProjectStatus)
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-extrabold transition",
                      statusFilter === item.value
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <select
                value={sortType}
                onChange={(event) =>
                  setSortType(event.target.value as SortType)
                }
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
              >
                <option value="recent">최근 수정순</option>
                <option value="name">이름순</option>
                <option value="progress">진행률 높은순</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 lg:px-6">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <Clock3 size={22} />
              </div>

              <p className="mt-4 text-sm font-extrabold text-slate-800">
                하위 프로젝트를 불러오는 중입니다.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                잠시만 기다려 주세요.
              </p>
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-5 text-sm font-semibold text-red-600">
              {error}
            </div>
          ) : null}

          {!loading && !error && filteredProjects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Code2 size={22} />
              </div>

              <p className="mt-4 text-sm font-extrabold text-slate-800">
                표시할 하위 프로젝트가 없습니다.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                검색어나 필터를 다시 확인하거나 새 하위 프로젝트를 추가해
                주세요.
              </p>

              <button
                type="button"
                onClick={handleOpenCreateProjectModal}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-indigo-700"
              >
                하위 프로젝트 추가
                <Plus size={17} />
              </button>
            </div>
          ) : null}

          {!loading && !error && filteredProjects.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    하위 프로젝트 {filteredProjects.length}개
                  </p>

                  <p className="mt-0.5 text-xs font-medium text-slate-400">
                    현재 워크스페이스에 속한 하위 프로젝트만 표시합니다.
                  </p>
                </div>

                <div className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200 sm:flex">
                  <TrendingUp size={14} />
                  평균 {averageProgress}%
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {filteredProjects.map((project) => (
                  <SubProjectCard
                    key={project.id}
                    project={project}
                    mode={currentMode}
                    open={openMenuId === project.id}
                    menuRef={menuRef}
                    onOpenMenu={() =>
                      setOpenMenuId((current) =>
                        current === project.id ? null : project.id,
                      )
                    }
                    onCloseMenu={() => setOpenMenuId(null)}
                    onDelete={() => handleDeleteSubProject(project.id)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>

      <CreateProjectModal redirectToIdeAfterCreate ideMode={currentMode} />
    </>
  );
}
