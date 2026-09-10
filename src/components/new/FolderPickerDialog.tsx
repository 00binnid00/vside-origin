// 경로: src/components/new/FolderPickerDialog.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronRight,
  ChevronUp,
  Clock3,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Loader2,
  Pencil,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  createSystemFolderApi,
  deleteSystemFolderApi,
  fetchSubFoldersApi,
  fetchSystemRootsApi,
} from "@/lib/ide/api";

/*
 * 프로젝트를 만들 때 저장 위치를 고르는 창.
 *
 * 생김새와 조작을 윈도우 파일 탐색기에 맞춘 이유
 * ------------------------------------------
 * 사용자가 이미 수천 번 써 본 창과 같은 자리에 같은 것이 있으면 설명이 필요 없다.
 * 그래서 뼈대(제목 - 도구모음 - 빠른 이동 - 열 목록 - 상태 표시줄)뿐 아니라 조작도
 * 맞췄다. 한 번 눌러 고르고 두 번 눌러 들어가기, 방향키 이동, Backspace 로 위로,
 * Delete 로 삭제, 우클릭 메뉴, 열 머리글을 눌러 정렬, 주소창을 눌러 경로 직접 입력.
 *
 * 마법사 본문은 굵고 둥근 스타일이지만 이 창은 시스템 대화상자처럼 작고 조용하게 둔다.
 *
 * 보여 주는 것은 서버의 폴더다
 * -------------------------
 * 코드를 보관하고 빌드하는 곳이 서버이므로 고르는 대상도 서버 폴더다. 브라우저의
 * 네이티브 폴더 창(showDirectoryPicker)으로 고른 경로는 서버에 존재하지 않아 쓸 수 없다.
 * 서버가 사용자마다 개인 폴더를 주고 그것을 "C:\" 로 보여 주므로, 여기서 오가는 경로는
 * 전부 그 가상 경로이고 진짜 경로는 프론트로 내려오지 않는다.
 */

const VIRTUAL_ROOT = "C:\\";
const ROOT_LABEL = "내 폴더 (C:)";
const RECENT_KEY = "waivs:folder-picker-recent";
const RECENT_LIMIT = 6;

/* 탐색기와 같은 글꼴. 한글은 윈도우 기본인 맑은 고딕으로 떨어진다. */
const EXPLORER_FONT =
  '"Segoe UI", system-ui, -apple-system, "Malgun Gothic", "맑은 고딕", sans-serif';

type FolderItem = {
  name: string;
  path: string;
  modifiedAt?: string;
};

type SortKey = "name" | "modifiedAt";
type SortState = { key: SortKey; desc: boolean };
type MenuState = { x: number; y: number; target: FolderItem | null };

type FolderPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 창을 열 때 시작할 위치. 비어 있으면 최상위에서 시작한다. */
  initialPath?: string;
  onSelect: (path: string) => void;
};

/* "C:\수업\1학기" -> ["C:", "수업", "1학기"] */
const splitPath = (path: string): string[] =>
  path
    .replace(/\//g, "\\")
    .split("\\")
    .filter((segment) => segment.length > 0);

const joinPath = (segments: string[]): string =>
  segments.length <= 1 ? VIRTUAL_ROOT : segments.join("\\");

const isRoot = (path: string): boolean => splitPath(path).length <= 1;

const toParentPath = (path: string): string => joinPath(splitPath(path).slice(0, -1));

const folderNameOf = (path: string): string => {
  const segments = splitPath(path);
  return segments.length <= 1 ? ROOT_LABEL : segments[segments.length - 1];
};

const formatModified = (value?: string): string => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

/*
 * 탐색기처럼 이름을 미리 채워 둔다.
 *
 * 빈 칸에 안내문구만 띄우면 사람들은 이름이 이미 들어 있는 줄 알고 Enter 를 눌러
 * 버린다. 그러면 이름이 비어 아무것도 만들어지지 않고 "눌러도 안 된다" 가 된다.
 */
const nextDefaultFolderName = (existing: FolderItem[]): string => {
  const taken = new Set(existing.map((folder) => folder.name));

  if (!taken.has("새 폴더")) return "새 폴더";

  let index = 2;
  while (taken.has(`새 폴더 (${index})`)) index += 1;

  return `새 폴더 (${index})`;
};

const sortFolders = (items: FolderItem[], sort: SortState): FolderItem[] => {
  const sorted = [...items].sort((a, b) => {
    if (sort.key === "name") {
      return a.name.localeCompare(b.name, "ko");
    }

    return (a.modifiedAt ?? "").localeCompare(b.modifiedAt ?? "");
  });

  return sort.desc ? sorted.reverse() : sorted;
};

const readRecent = (): string[] => {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    // 시크릿 창이나 저장소 차단 환경에서는 조용히 포기한다. 최근 위치는 편의 기능일 뿐이다.
    return [];
  }
};

const writeRecent = (paths: string[]) => {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(paths));
  } catch {
    /* 저장 못 해도 창은 정상 동작해야 한다 */
  }
};

export default function FolderPickerDialog({
  open,
  onOpenChange,
  initialPath,
  onSelect,
}: FolderPickerDialogProps) {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "name", desc: false });

  /*
   * 뒤로/앞으로. 목록과 위치가 어긋나지 않도록 스택과 현재 위치를 한 덩어리로 둔다.
   * 따로 두면 setState 두 번 사이에 옛 값을 읽어 엉뚱한 곳으로 간다.
   */
  const [nav, setNav] = useState<{ stack: string[]; index: number }>({
    stack: [VIRTUAL_ROOT],
    index: 0,
  });
  const currentPath = nav.stack[nav.index] ?? VIRTUAL_ROOT;

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  const [draftName, setDraftName] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const draftInputRef = useRef<HTMLInputElement | null>(null);

  /* 지우기는 되돌릴 수 없어서 한 번 물어본 뒤에 보낸다. */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [menu, setMenu] = useState<MenuState | null>(null);

  /* 주소창은 평소 브레드크럼이고, 누르면 경로를 직접 칠 수 있게 바뀐다. */
  const [pathDraft, setPathDraft] = useState<string | null>(null);
  const pathInputRef = useRef<HTMLInputElement | null>(null);

  const windowRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const visibleFolders = useMemo(() => sortFolders(folders, sort), [folders, sort]);

  const load = useCallback(async (path: string) => {
    setIsLoading(true);
    setError("");

    try {
      const list = await fetchSubFoldersApi(path);
      setFolders(Array.isArray(list) ? (list as FolderItem[]) : []);
      return true;
    } catch (err) {
      // 서버가 "이 위치는 사용할 수 없습니다" 처럼 이유를 실어 보내므로 그대로 보여 준다.
      setError(err instanceof Error ? err.message : "폴더 목록을 불러오지 못했습니다.");
      setFolders([]);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetTransient = useCallback(() => {
    setSelectedPath(null);
    setDraftName(null);
    setPendingDelete(null);
    setMenu(null);
    setPathDraft(null);
  }, []);

  /* 새 위치로 이동. 뒤로 간 상태에서 이동하면 앞쪽 기록은 버린다(브라우저와 같다). */
  const navigate = useCallback(
    async (path: string) => {
      const ok = await load(path);
      if (!ok) return;

      resetTransient();

      setNav((prev) => {
        const stack = prev.stack.slice(0, prev.index + 1);

        if (stack[stack.length - 1] === path) {
          return { stack, index: stack.length - 1 };
        }

        return { stack: [...stack, path], index: stack.length };
      });

      if (!isRoot(path)) {
        setRecent((prev) => {
          const next = [path, ...prev.filter((item) => item !== path)].slice(0, RECENT_LIMIT);
          writeRecent(next);
          return next;
        });
      }
    },
    [load, resetTransient],
  );

  const goHistory = useCallback(
    async (nextIndex: number) => {
      const target = nav.stack[nextIndex];
      if (!target) return;

      const ok = await load(target);
      if (!ok) return;

      resetTransient();
      setNav((prev) => ({ ...prev, index: nextIndex }));
    },
    [nav.stack, load, resetTransient],
  );

  /*
   * 창이 열릴 때마다 최상위를 다시 물어본다.
   * 이 호출이 서버에서 개인 폴더를 만드는 시점이기도 해서, 처음 쓰는 사용자도
   * 창을 여는 것만으로 자리가 준비된다.
   */
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const start = async () => {
      setRecent(readRecent());

      try {
        const roots = await fetchSystemRootsApi();
        if (cancelled) return;

        const root = Array.isArray(roots) && roots[0] ? String(roots[0]) : VIRTUAL_ROOT;
        const target = initialPath?.trim() ? initialPath.trim() : root;

        const ok = await load(target);
        if (cancelled) return;

        const landed = ok ? target : root;
        if (!ok) await load(root);

        setNav({ stack: [landed], index: 0 });
        resetTransient();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "위치 목록을 불러오지 못했습니다.");
      }
    };

    void start();

    return () => {
      cancelled = true;
    };
  }, [open, initialPath, load, resetTransient]);

  /*
   * 입력칸이 열리는 순간에만 전체 선택한다. 값 자체를 의존성으로 두면 글자를 칠
   * 때마다 다시 선택돼 타이핑이 덮어써진다.
   */
  const isDrafting = draftName !== null;
  const isEditingPath = pathDraft !== null;

  useEffect(() => {
    if (isDrafting) draftInputRef.current?.select();
  }, [isDrafting]);

  useEffect(() => {
    if (isEditingPath) pathInputRef.current?.select();
  }, [isEditingPath]);

  /* 메뉴는 어디를 누르든 닫힌다. 실제 탐색기와 같다. */
  useEffect(() => {
    if (!menu) return undefined;

    const close = () => setMenu(null);

    window.addEventListener("click", close);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const commitDraft = async () => {
    if (isCreating) return;

    const name = (draftName ?? "").trim();

    if (!name) {
      setDraftName(null);
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      await createSystemFolderApi({ path: currentPath, name });
      setDraftName(null);
      await load(currentPath);
      setSelectedPath(`${isRoot(currentPath) ? VIRTUAL_ROOT : `${currentPath}\\`}${name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "폴더를 만들지 못했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || isDeleting) return;

    setIsDeleting(true);
    setError("");

    try {
      await deleteSystemFolderApi(pendingDelete);

      setPendingDelete(null);
      setSelectedPath(null);
      await load(currentPath);
    } catch (err) {
      // 안에 프로젝트가 있으면 서버가 이유를 담아 막는다. 그대로 보여 준다.
      setError(err instanceof Error ? err.message : "폴더를 지우지 못했습니다.");
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const openMenu = (event: React.MouseEvent, target: FolderItem | null) => {
    event.preventDefault();
    event.stopPropagation();

    const bounds = windowRef.current?.getBoundingClientRect();
    if (!bounds) return;

    if (target) setSelectedPath(target.path);

    setMenu({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      target,
    });
  };

  /* 방향키로 목록을 오가고, Enter 로 들어가고, Backspace 로 위로. 탐색기와 같다. */
  const handleListKeyDown = (event: React.KeyboardEvent) => {
    if (isDrafting) return;

    const index = visibleFolders.findIndex((folder) => folder.path === selectedPath);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (visibleFolders.length === 0) return;

      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = index < 0 ? 0 : Math.min(Math.max(index + step, 0), visibleFolders.length - 1);

      setSelectedPath(visibleFolders[next].path);
      return;
    }

    if (event.key === "Enter" && selectedPath) {
      event.preventDefault();
      void navigate(selectedPath);
      return;
    }

    if (event.key === "Backspace" && !isRoot(currentPath)) {
      event.preventDefault();
      void navigate(toParentPath(currentPath));
      return;
    }

    if (event.key === "Delete" && selectedPath) {
      event.preventDefault();
      setPendingDelete(selectedPath);
    }
  };

  const toggleSort = (key: SortKey) =>
    setSort((prev) => ({ key, desc: prev.key === key ? !prev.desc : false }));

  const segments = splitPath(currentPath);
  const chosenPath = selectedPath ?? currentPath;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="block gap-0 overflow-hidden rounded-lg border border-slate-300 p-0 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)] sm:max-w-[780px]"
        style={{ fontFamily: EXPLORER_FONT }}
      >
        <div ref={windowRef} className="relative">
          {/* 제목 줄 */}
          <div className="flex h-11 items-center justify-between border-b border-slate-200 bg-white pl-4 pr-2">
            <DialogTitle className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
              <FolderOpen size={15} className="text-[#dcb067]" />
              저장 위치 선택
            </DialogTitle>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="닫기"
            >
              <X size={15} />
            </button>
          </div>

          {/* 도구 모음 */}
          <div className="flex h-[46px] items-center gap-1 border-b border-slate-200 bg-[#fbfcfd] px-2">
            <NavButton
              label="뒤로"
              disabled={nav.index <= 0 || isLoading}
              onClick={() => void goHistory(nav.index - 1)}
            >
              <ArrowLeft size={15} />
            </NavButton>

            <NavButton
              label="앞으로"
              disabled={nav.index >= nav.stack.length - 1 || isLoading}
              onClick={() => void goHistory(nav.index + 1)}
            >
              <ArrowRight size={15} />
            </NavButton>

            <NavButton
              label="위로"
              disabled={isRoot(currentPath) || isLoading}
              onClick={() => void navigate(toParentPath(currentPath))}
            >
              <ArrowUp size={15} />
            </NavButton>

            <NavButton
              label="새로 고침"
              disabled={isLoading}
              onClick={() => void load(currentPath)}
            >
              <RotateCw size={14} />
            </NavButton>

            <div className="mx-1 h-5 w-px bg-slate-200" />

            {/* 주소창: 누르면 경로를 직접 칠 수 있다 */}
            {isEditingPath ? (
              <input
                ref={pathInputRef}
                value={pathDraft ?? ""}
                onChange={(event) => setPathDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void navigate((pathDraft ?? "").trim() || VIRTUAL_ROOT);
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setPathDraft(null);
                  }
                }}
                onBlur={() => setPathDraft(null)}
                className="h-8 min-w-0 flex-1 rounded border border-[#0f6cbd] bg-white px-2.5 text-[13px] text-slate-800 outline-none"
              />
            ) : (
              <div
                role="button"
                tabIndex={0}
                title="눌러서 경로 직접 입력"
                onClick={(event) => {
                  if (event.target === event.currentTarget) setPathDraft(currentPath);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setPathDraft(currentPath);
                }}
                className="flex h-8 min-w-0 flex-1 cursor-text items-center gap-0.5 rounded border border-slate-300 bg-white px-1.5 transition focus-within:border-[#0f6cbd] hover:border-slate-400"
              >
                {segments.map((segment, index) => {
                  const isLast = index === segments.length - 1;

                  return (
                    <span key={`${segment}-${index}`} className="flex min-w-0 items-center">
                      {index > 0 && (
                        <ChevronRight size={13} className="mx-px shrink-0 text-slate-400" />
                      )}
                      <button
                        type="button"
                        className="max-w-[160px] truncate rounded px-1.5 py-0.5 text-[13px] text-slate-700 transition hover:bg-slate-100 disabled:hover:bg-transparent"
                        onClick={() => void navigate(joinPath(segments.slice(0, index + 1)))}
                        disabled={isLast || isLoading}
                      >
                        {index === 0 ? ROOT_LABEL : segment}
                      </button>
                    </span>
                  );
                })}
                <span className="flex-1" />
                <Pencil size={12} className="mr-1 shrink-0 text-slate-300" />
              </div>
            )}

            <button
              type="button"
              onClick={() => setDraftName(nextDefaultFolderName(folders))}
              disabled={isLoading || isCreating}
              className="ml-1 flex h-8 shrink-0 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 text-[13px] text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <FolderPlus size={14} className="text-[#dcb067]" />새 폴더
            </button>
          </div>

          <div className="flex h-[330px]">
            {/* 빠른 이동 */}
            <aside className="w-[184px] shrink-0 overflow-y-auto border-r border-slate-200 bg-[#fbfcfd] py-2.5">
              <p className="px-3 pb-1.5 text-[11px] font-medium text-slate-400">빠른 이동</p>

              <SidebarItem
                active={isRoot(currentPath)}
                onClick={() => void navigate(VIRTUAL_ROOT)}
                icon={<HardDrive size={14} className="text-slate-500" />}
                label={ROOT_LABEL}
              />

              {recent.length > 0 && (
                <>
                  <p className="mt-4 px-3 pb-1.5 text-[11px] font-medium text-slate-400">
                    최근 위치
                  </p>
                  {recent.map((path) => (
                    <SidebarItem
                      key={path}
                      active={currentPath === path}
                      onClick={() => void navigate(path)}
                      icon={<Clock3 size={14} className="text-slate-400" />}
                      label={folderNameOf(path)}
                      title={path}
                    />
                  ))}
                </>
              )}
            </aside>

            {/* 목록 */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-[30px] shrink-0 items-center border-b border-slate-200 bg-white pl-3 pr-4 text-[12px] text-slate-500">
                <ColumnHeader
                  label="이름"
                  active={sort.key === "name"}
                  desc={sort.desc}
                  onClick={() => toggleSort("name")}
                  className="flex-1"
                />
                <ColumnHeader
                  label="수정한 날짜"
                  active={sort.key === "modifiedAt"}
                  desc={sort.desc}
                  onClick={() => toggleSort("modifiedAt")}
                  className="w-[156px]"
                />
              </div>

              <div
                ref={listRef}
                role="listbox"
                aria-label="폴더 목록"
                tabIndex={0}
                onKeyDown={handleListKeyDown}
                onContextMenu={(event) => openMenu(event, null)}
                className="min-h-0 flex-1 overflow-y-auto bg-white outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#0f6cbd]"
              >
                {isLoading ? (
                  <div className="flex h-full items-center justify-center gap-2 text-[13px] text-slate-400">
                    <Loader2 size={15} className="animate-spin" />
                    불러오는 중
                  </div>
                ) : (
                  <>
                    {/* 새 폴더는 탐색기처럼 목록 안에서 이름을 지어 준다 */}
                    {isDrafting && (
                      <div className="flex h-[28px] items-center bg-[#e8f0fd] pl-3 pr-4">
                        <Folder size={15} className="mr-2 shrink-0 fill-[#f3d18b] text-[#dcb067]" />
                        <input
                          ref={draftInputRef}
                          value={draftName ?? ""}
                          onChange={(event) => setDraftName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();

                              if (!(draftName ?? "").trim()) {
                                setError("폴더 이름을 입력하세요.");
                                return;
                              }

                              void commitDraft();
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setDraftName(null);
                            }
                          }}
                          onBlur={() => void commitDraft()}
                          disabled={isCreating}
                          className="h-[21px] flex-1 rounded-[2px] border border-[#0f6cbd] bg-white px-1.5 text-[13px] text-slate-800 outline-none"
                        />
                      </div>
                    )}

                    {visibleFolders.length === 0 && !isDrafting ? (
                      <div className="flex h-full flex-col items-center justify-center gap-1.5 text-slate-400">
                        <Folder size={28} className="text-slate-200" />
                        <p className="text-[13px]">이 폴더는 비어 있습니다</p>
                        <p className="text-[12px] text-slate-300">
                          빈 곳을 오른쪽 클릭해 새 폴더를 만들 수 있습니다
                        </p>
                      </div>
                    ) : (
                      visibleFolders.map((folder) => {
                        const isSelected = selectedPath === folder.path;

                        return (
                          <div
                            key={folder.path}
                            role="option"
                            aria-selected={isSelected}
                            tabIndex={-1}
                            onClick={() => setSelectedPath(folder.path)}
                            onDoubleClick={() => void navigate(folder.path)}
                            onContextMenu={(event) => openMenu(event, folder)}
                            className={`flex h-[28px] cursor-default items-center pl-3 pr-4 text-[13px] ${
                              isSelected
                                ? "bg-[#e8f0fd] text-slate-900 ring-1 ring-inset ring-[#c2d7fb]"
                                : "text-slate-700 hover:bg-[#f3f6fb]"
                            }`}
                          >
                            <Folder
                              size={15}
                              className="mr-2 shrink-0 fill-[#f3d18b] text-[#dcb067]"
                            />
                            <span className="flex-1 truncate">{folder.name}</span>
                            <span className="w-[156px] shrink-0 text-[12px] text-slate-500">
                              {formatModified(folder.modifiedAt)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>

              {/* 상태 표시줄 */}
              <div className="flex h-[26px] shrink-0 items-center gap-3 border-t border-slate-200 bg-[#fbfcfd] px-3 text-[11px] text-slate-500">
                <span>항목 {visibleFolders.length}개</span>
                {selectedPath && <span>1개 선택됨</span>}
              </div>
            </div>
          </div>

          {pendingDelete && (
            <div className="flex items-center gap-2.5 border-t border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle size={15} className="shrink-0 text-amber-600" />

              <p className="min-w-0 flex-1 text-[12px] leading-5 text-amber-900">
                <span className="font-semibold">{folderNameOf(pendingDelete)}</span> 폴더를
                지웁니다. 안에 든 것까지 함께 지워지고 되돌릴 수 없습니다.
              </p>

              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
                className="h-7 shrink-0 rounded border border-red-600 bg-red-600 px-3 text-[12px] font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "지우는 중" : "지우기"}
              </button>

              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
                className="h-7 shrink-0 rounded border border-slate-300 bg-white px-3 text-[12px] text-slate-700 transition hover:bg-slate-50"
              >
                취소
              </button>
            </div>
          )}

          {error && (
            <p className="border-t border-rose-100 bg-rose-50 px-3 py-2 text-[12px] text-rose-600">
              {error}
            </p>
          )}

          {/* 고른 위치와 확인 */}
          <div className="flex items-center gap-2.5 border-t border-slate-200 bg-[#fbfcfd] px-3 py-3">
            <span className="shrink-0 text-[13px] text-slate-600">폴더</span>

            <div className="h-8 min-w-0 flex-1 truncate rounded border border-slate-300 bg-white px-2.5 py-[7px] text-[13px] text-slate-700">
              {chosenPath}
            </div>

            <button
              type="button"
              onClick={() => {
                onSelect(chosenPath);
                onOpenChange(false);
              }}
              disabled={isLoading}
              className="h-8 shrink-0 rounded bg-[#0f6cbd] px-4 text-[13px] font-medium text-white transition hover:bg-[#0c5a9e] disabled:opacity-50"
            >
              폴더 선택
            </button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-8 shrink-0 rounded border border-slate-300 bg-white px-4 text-[13px] text-slate-700 transition hover:bg-slate-50"
            >
              취소
            </button>
          </div>

          {/* 우클릭 메뉴 */}
          {menu && (
            <div
              role="menu"
              style={{ left: menu.x, top: menu.y }}
              onClick={(event) => event.stopPropagation()}
              className="absolute z-50 w-[184px] rounded-md border border-slate-200 bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.18)]"
            >
              {menu.target ? (
                <>
                  <MenuItem
                    icon={<FolderOpen size={14} />}
                    label="열기"
                    onClick={() => {
                      const target = menu.target;
                      setMenu(null);
                      if (target) void navigate(target.path);
                    }}
                  />
                  <MenuItem
                    icon={<ArrowUp size={14} className="rotate-45" />}
                    label="이 위치 선택"
                    onClick={() => {
                      const target = menu.target;
                      setMenu(null);
                      if (target) {
                        onSelect(target.path);
                        onOpenChange(false);
                      }
                    }}
                  />
                  <div className="my-1 h-px bg-slate-100" />
                  <MenuItem
                    icon={<Trash2 size={14} />}
                    label="삭제"
                    danger
                    onClick={() => {
                      const target = menu.target;
                      setMenu(null);
                      if (target) setPendingDelete(target.path);
                    }}
                  />
                </>
              ) : (
                <>
                  <MenuItem
                    icon={<FolderPlus size={14} />}
                    label="새 폴더"
                    onClick={() => {
                      setMenu(null);
                      setDraftName(nextDefaultFolderName(folders));
                    }}
                  />
                  <MenuItem
                    icon={<RotateCw size={14} />}
                    label="새로 고침"
                    onClick={() => {
                      setMenu(null);
                      void load(currentPath);
                    }}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NavButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-600 transition hover:bg-slate-200/60 disabled:text-slate-300 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function ColumnHeader({
  label,
  active,
  desc,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full items-center gap-1 text-left transition hover:text-slate-800 ${className ?? ""}`}
    >
      {label}
      <ChevronUp
        size={12}
        className={`transition ${
          active ? (desc ? "rotate-180 text-slate-500" : "text-slate-500") : "opacity-0"
        }`}
      />
    </button>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
  title,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={`flex w-full items-center gap-2 px-3 py-[7px] text-left text-[13px] transition ${
        active
          ? "bg-[#e8f0fd] text-slate-900"
          : "text-slate-700 hover:bg-slate-200/50"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span className="shrink-0 text-slate-400">{icon}</span>
      {label}
    </button>
  );
}
