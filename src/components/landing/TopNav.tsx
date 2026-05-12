"use client";

import Link from "next/link";
import { useEffect, useRef, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bell, Menu, X, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type DemoNotif = {
  id: string;
  title: string;
  body: string;
  time: string;
  href?: string;
  unread?: boolean;
};

type WorkspaceMode = "personal" | "team";

function normalizeMode(value: string | null): WorkspaceMode {
  return value === "team" ? "team" : "personal";
}

function withModeQuery(href: string, mode: WorkspaceMode) {
  return `${href}?mode=${mode}`;
}

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { user, isLoggedIn, logout } = useAuth();

  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openMobileNav, setOpenMobileNav] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  /*
    현재 URL path에서 workspaceId를 추출한다.

    예:
    /main/abc123
    /projects/abc123
    /schedules/abc123
    /devlogs/abc123

    주의:
    여기서는 localStorage의 currentWorkspaceId를 사용하지 않는다.
    헤더는 "현재 화면이 프로젝트 선택 상태인지"만 보고 링크를 만들어야 한다.
    localStorage를 쓰면 프로젝트를 선택하지 않은 상태에서도 이전 프로젝트로 이동할 수 있다.
  */
  const workspaceIdFromPath = useMemo(() => {
    const parts = pathname?.split("/").filter(Boolean) ?? [];

    const workspaceSections = [
      "main",
      "projects",
      "schedules",
      "schedule",
      "devlogs",
      "devlog",
      "relocation",
    ];

    if (workspaceSections.includes(parts[0]) && parts[1]) {
      return parts[1];
    }

    return null;
  }, [pathname]);

  /*
    쿼리스트링에서 workspaceId를 추출한다.

    예:
    /schedules?view=personal&workspaceId=abc123
    /devlogs?workspaceId=abc123
    /relocation?workspaceId=abc123&mode=personal
  */
  const workspaceIdFromQuery =
    searchParams.get("workspaceId") ??
    searchParams.get("workspaceid") ??
    searchParams.get("workspace");

  /*
    현재 선택된 프로젝트 ID.

    localStorage를 fallback으로 쓰지 않는다.
    즉, 현재 URL에 workspaceId가 없으면 프로젝트가 선택되지 않은 상태로 본다.
  */
  const currentWorkspaceId = workspaceIdFromPath || workspaceIdFromQuery;

  /*
    mode는 URL query에서 가져온다.
    mode가 없으면 personal로 둔다.

    팀 프로젝트에서 정확한 이동을 원하면
    메인 프로젝트 선택 링크가 /main/[workspaceId]?mode=team 형태로 들어와야 한다.
  */
  const currentMode = normalizeMode(
    searchParams.get("mode") ?? searchParams.get("view"),
  );

  const hasSelectedWorkspace = Boolean(currentWorkspaceId);

  /*
    프로젝트 선택이 필요한 메뉴:
    HOME, AIVS, 설계단계, 일정관리, 개발일지

    프로젝트가 선택되어 있으면 해당 프로젝트 기준 경로로 이동한다.
    프로젝트가 선택되어 있지 않으면 /main으로 보내서 프로젝트를 먼저 선택하게 한다.
  */
  const homeHref = hasSelectedWorkspace
    ? withModeQuery(`/main/${currentWorkspaceId}`, currentMode)
    : "/main";

  const aivsHref = hasSelectedWorkspace
    ? withModeQuery(`/projects/${currentWorkspaceId}`, currentMode)
    : "/main";

  const relocationHref = hasSelectedWorkspace
    ? `/relocation?workspaceId=${currentWorkspaceId}&mode=${currentMode}`
    : "/main";

  const schedulesHref = hasSelectedWorkspace
    ? `/schedules?view=${currentMode}&workspaceId=${currentWorkspaceId}`
    : "/main";

  const devlogsHref = hasSelectedWorkspace
    ? `/devlogs?workspaceId=${currentWorkspaceId}`
    : "/main";

  /*
    프로젝트 선택 없이 접근 가능한 메뉴.
  */
  const communityHref = "/community";
  const myPageHref = "/my";

  /*
    현재 URL에 workspaceId가 있을 때만 localStorage에 저장한다.
    이 값은 IDE나 모달 등 다른 기능에서 사용할 수 있지만,
    헤더 링크 생성에는 직접 사용하지 않는다.
  */
  useEffect(() => {
    if (!currentWorkspaceId) return;

    localStorage.setItem("currentWorkspaceId", currentWorkspaceId);
    localStorage.setItem("currentWorkspaceMode", currentMode);
  }, [currentWorkspaceId, currentMode]);

  const demoNotifs: DemoNotif[] = [
    {
      id: "n1",
      title: "일정 알림",
      body: "오늘 오후 3시 팀 회의가 예정되어 있습니다",
      time: "10분 전",
      unread: true,
      href: schedulesHref,
    },
    {
      id: "n2",
      title: "커밋 알림",
      body: "김개발님이 main 브랜치에 커밋했습니다",
      time: "30분 전",
      unread: true,
      href: aivsHref,
    },
    {
      id: "n3",
      title: "팀 채팅",
      body: "이프로트: 코드 리뷰 부탁드립니다",
      time: "1시간 전",
      unread: false,
      href: aivsHref,
    },
    {
      id: "n4",
      title: "오류 알림",
      body: "빌드 프로세스에서 오류가 발생했습니다. 로그를 확인하세요",
      time: "4시간 전",
      unread: false,
      href: homeHref,
    },
  ];

  const unreadCount = demoNotifs.filter((n) => n.unread).length;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setOpenUserMenu(false);
      }

      if (notifRef.current && !notifRef.current.contains(target)) {
        setOpenNotif(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);

    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setOpenMobileNav(false);
    setOpenUserMenu(false);
    setOpenNotif(false);
  }, [pathname]);

  const onLogout = async () => {
    logout();
    router.replace("/");
  };

  const onToggleBell = () => {
    setOpenUserMenu(false);
    setOpenNotif((v) => !v);
  };

  const NAV_ITEMS = [
    {
      href: homeHref,
      label: "HOME",
      matchPath: "/main",
      requiresWorkspace: true,
    },
    {
      href: aivsHref,
      label: "AIVS",
      matchPath: "/projects",
      requiresWorkspace: true,
    },
    {
      href: relocationHref,
      label: "설계단계",
      matchPath: "/relocation",
      requiresWorkspace: true,
    },
    {
      href: schedulesHref,
      label: "일정관리",
      matchPath: "/schedules",
      requiresWorkspace: true,
    },
    {
      href: devlogsHref,
      label: "개발일지",
      matchPath: "/devlogs",
      requiresWorkspace: true,
    },
    {
      href: communityHref,
      label: "게시판",
      matchPath: "/community",
      requiresWorkspace: false,
    },
    {
      href: myPageHref,
      label: "마이페이지",
      matchPath: "/my",
      requiresWorkspace: false,
    },
  ];

  const isNavItemActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (!pathname) return false;

    if (item.label === "HOME") {
      return pathname === "/main" || pathname.startsWith("/main/");
    }

    return pathname.startsWith(item.matchPath);
  };

  const handleGuardedNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    item: (typeof NAV_ITEMS)[number],
  ) => {
    if (!item.requiresWorkspace) return;
    if (hasSelectedWorkspace) return;

    /*
      프로젝트가 필요한 메뉴인데 아직 선택된 프로젝트가 없으면
      실제 기능 페이지로 들어가지 않고 /main에서 프로젝트를 선택하게 한다.
    */
    event.preventDefault();
    router.push("/main");
  };

  return (
    <header className="sticky top-0 z-[2000] border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2 text-xl">
        <Link href="/main" className="font-black tracking-tight">
          WEVAIS
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-gray-600 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item);

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={(event) => handleGuardedNavClick(event, item)}
                className={cn(
                  "transition hover:text-gray-900",
                  active && "font-semibold text-gray-900",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-xl p-2 text-gray-700 hover:bg-gray-100 md:hidden"
            onClick={() => setOpenMobileNav((v) => !v)}
            aria-label="메뉴 열기"
          >
            {openMobileNav ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {!isLoggedIn ? (
            <div className="hidden items-center gap-4 text-sm font-semibold md:flex">
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900"
              >
                로그인
              </Link>

              <Link
                href="/auth/signup"
                className="rounded-xl bg-gray-900 px-3 py-2 text-white transition hover:bg-black"
              >
                회원가입
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={onToggleBell}
                  className="relative rounded-xl p-2 text-gray-700 hover:bg-gray-100"
                  aria-label="알림"
                >
                  <Bell className="h-5 w-5" />

                  {unreadCount > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
                  ) : null}
                </button>

                {openNotif ? (
                  <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          알림
                        </p>

                        {unreadCount > 0 ? (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                            {unreadCount}개 읽지 않음
                          </span>
                        ) : null}
                      </div>

                      <Link
                        href="/notifications"
                        className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                        onClick={() => setOpenNotif(false)}
                      >
                        더보기
                      </Link>
                    </div>

                    <div className="max-h-80 overflow-auto">
                      {demoNotifs.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-500">
                          새 알림이 없어요.
                        </div>
                      ) : (
                        demoNotifs.slice(0, 5).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            className="w-full border-b border-gray-50 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
                            onClick={() => {
                              setOpenNotif(false);

                              if (n.href) {
                                router.push(n.href);
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {n.title}
                                  </p>

                                  {n.unread ? (
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                  ) : null}
                                </div>

                                <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                                  {n.body}
                                </p>
                              </div>

                              <span className="shrink-0 text-[11px] text-gray-400">
                                {n.time}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="border-t border-gray-100 px-4 py-3">
                      <Link
                        href="/notifications"
                        className="block w-full rounded-xl bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-black"
                        onClick={() => setOpenNotif(false)}
                      >
                        전체 알림 보기
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenNotif(false);
                    setOpenUserMenu((v) => !v);
                  }}
                  className="flex items-center gap-2 rounded-2xl px-2 py-1.5 transition hover:bg-gray-100"
                  aria-label="유저 메뉴"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                    {(user?.name?.trim()?.[0] ?? "U").toUpperCase()}
                  </div>

                  <span className="hidden text-sm font-semibold text-gray-800 sm:inline">
                    {user?.name ?? "사용자"}
                  </span>
                </button>

                {openUserMenu ? (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {user?.name ?? "사용자"}
                      </p>

                      <p className="text-xs text-gray-500">
                        {user?.email ?? ""}
                      </p>
                    </div>

                    <div className="p-2">
                      <Link
                        href={myPageHref}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setOpenUserMenu(false)}
                      >
                        <User className="h-4 w-4" />
                        마이페이지
                      </Link>

                      <button
                        type="button"
                        onClick={onLogout}
                        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" />
                        로그아웃
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {openMobileNav ? (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="flex flex-col gap-2 px-6 py-4">
            {NAV_ITEMS.map((item) => {
              const active = isNavItemActive(item);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(event) => handleGuardedNavClick(event, item)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            {!isLoggedIn ? (
              <div className="flex gap-2 pt-2">
                <Link
                  href="/auth/login"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50"
                >
                  로그인
                </Link>

                <Link
                  href="/auth/signup"
                  className="flex-1 rounded-xl bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-black"
                >
                  회원가입
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
              >
                로그아웃
              </button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
