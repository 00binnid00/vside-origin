"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Bell, Menu, X, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  NotificationResponse,
} from "@/lib/notification/notificationApi";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type WorkspaceMode = "personal" | "team";

type NavItemKey =
  | "dashboard"
  | "project"
  | "aivs"
  | "design"
  | "schedules"
  | "devlogs"
  | "archive"
  | "community"
  | "my";

function normalizeMode(value: string | null): WorkspaceMode {
  return value === "team" ? "team" : "personal";
}

function withModeQuery(href: string, mode: WorkspaceMode) {
  return `${href}?mode=${mode}`;
}

function getDisplayName(user: any) {
  if (!user) return "사용자";

  return user.nickname || user.name || user.username || user.email || "사용자";
}

function getDisplayEmail(user: any) {
  if (!user) return "";

  return user.email || "";
}

function getInitial(user: any) {
  const displayName = getDisplayName(user);

  return displayName.trim().charAt(0).toUpperCase() || "U";
}

function formatRelativeTime(value: string) {
  if (!value) return "";

  const created = new Date(value);
  const now = new Date();

  if (Number.isNaN(created.getTime())) {
    return value;
  }

  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return created.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
}

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { user, isAuthenticated, loading, logout } = useAuth();

  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [openMobileNav, setOpenMobileNav] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);

  const [latestNotifications, setLatestNotifications] = useState<
    NotificationResponse[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const [rememberedWorkspaceId, setRememberedWorkspaceId] = useState<
    string | null
  >(null);

  const [rememberedWorkspaceMode, setRememberedWorkspaceMode] =
    useState<WorkspaceMode>("personal");

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

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
      "rearrange",
      "archive",
      "design",
    ];

    if (workspaceSections.includes(parts[0]) && parts[1]) {
      return parts[1];
    }

    return null;
  }, [pathname]);

  const workspaceIdFromQuery =
    searchParams.get("workspaceId") ??
    searchParams.get("workspaceid") ??
    searchParams.get("workspace");

  const workspaceIdFromUrl = workspaceIdFromPath || workspaceIdFromQuery;

  const modeFromUrl = normalizeMode(
    searchParams.get("mode") ?? searchParams.get("view"),
  );

  const currentWorkspaceId = workspaceIdFromUrl || rememberedWorkspaceId;

  const currentMode = workspaceIdFromUrl
    ? modeFromUrl
    : rememberedWorkspaceMode;

  const hasSelectedWorkspace = Boolean(currentWorkspaceId);

  useEffect(() => {
    const savedWorkspaceId = localStorage.getItem("currentWorkspaceId");

    const savedWorkspaceMode = normalizeMode(
      localStorage.getItem("currentWorkspaceMode"),
    );

    if (savedWorkspaceId) {
      setRememberedWorkspaceId(savedWorkspaceId);
    }

    setRememberedWorkspaceMode(savedWorkspaceMode);
  }, []);

  useEffect(() => {
    if (!workspaceIdFromUrl) return;

    localStorage.setItem("currentWorkspaceId", workspaceIdFromUrl);
    localStorage.setItem("currentWorkspaceMode", modeFromUrl);

    setRememberedWorkspaceId(workspaceIdFromUrl);
    setRememberedWorkspaceMode(modeFromUrl);
  }, [workspaceIdFromUrl, modeFromUrl]);

  const projectHref = hasSelectedWorkspace
    ? withModeQuery(`/main/${currentWorkspaceId}`, currentMode)
    : "/main";

  const aivsHref = hasSelectedWorkspace
    ? withModeQuery(`/projects/${currentWorkspaceId}`, currentMode)
    : "/main";

  const designHref = hasSelectedWorkspace
    ? `/design?workspaceId=${currentWorkspaceId}&mode=${currentMode}`
    : "/main";

  const schedulesHref = hasSelectedWorkspace
    ? `/schedules?view=${currentMode}&workspaceId=${currentWorkspaceId}`
    : "/main";

  const devlogsHref = hasSelectedWorkspace
    ? `/devlogs?workspaceId=${currentWorkspaceId}&mode=${currentMode}`
    : "/main";

  const archiveHref = hasSelectedWorkspace
    ? `/archive?workspaceId=${currentWorkspaceId}&mode=${currentMode}`
    : "/main";

  const communityHref = "/community";
  const myPageHref = "/my";

  const fetchHeaderNotifications = async () => {
    if (!isAuthenticated) {
      setLatestNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setNotificationLoading(true);

      const [pageResponse, unreadResponse] = await Promise.all([
        getNotifications({
          page: 0,
          size: 4,
        }),
        getUnreadNotificationCount(),
      ]);

      setLatestNotifications(pageResponse.content ?? []);
      setUnreadCount(unreadResponse.unreadCount ?? 0);
    } catch (error) {
      console.error("헤더 알림 조회 실패:", error);
      setLatestNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    fetchHeaderNotifications();
  }, [loading, isAuthenticated, pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const timer = window.setInterval(() => {
      fetchHeaderNotifications();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [isAuthenticated]);

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
    await logout();

    localStorage.removeItem("currentWorkspaceId");
    localStorage.removeItem("currentWorkspaceMode");

    setRememberedWorkspaceId(null);
    setRememberedWorkspaceMode("personal");
    setLatestNotifications([]);
    setUnreadCount(0);

    router.replace("/");
  };

  const onToggleBell = () => {
    setOpenUserMenu(false);
    setOpenNotif((value) => !value);

    if (!openNotif) {
      fetchHeaderNotifications();
    }
  };

  const handleNotificationClick = async (notification: NotificationResponse) => {
    setOpenNotif(false);

    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);

        setLatestNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );

        setUnreadCount((prev) => Math.max(prev - 1, 0));
      } catch (error) {
        console.error("알림 읽음 처리 실패:", error);
      }
    }

    if (notification.targetUrl) {
      router.push(notification.targetUrl);
      return;
    }

    router.push("/notifications");
  };

  const NAV_ITEMS: Array<{
    key: NavItemKey;
    href: string;
    label: string;
    requiresWorkspace: boolean;
  }> = [
    {
      key: "dashboard",
      href: "/main",
      label: "프로젝트",
      requiresWorkspace: false,
    },
    {
      key: "project",
      href: projectHref,
      label: "대시보드",
      requiresWorkspace: true,
    },
    {
      key: "design",
      href: designHref,
      label: "설계관리",
      requiresWorkspace: true,
    },
    {
      key: "schedules",
      href: schedulesHref,
      label: "일정관리",
      requiresWorkspace: true,
    },
    {
      key: "aivs",
      href: aivsHref,
      label: "AIVS",
      requiresWorkspace: true,
    },
    {
      key: "devlogs",
      href: devlogsHref,
      label: "개발일지",
      requiresWorkspace: true,
    },
    {
      key: "archive",
      href: archiveHref,
      label: "자료실",
      requiresWorkspace: true,
    },
    {
      key: "community",
      href: communityHref,
      label: "게시판",
      requiresWorkspace: false,
    },
    {
      key: "my",
      href: myPageHref,
      label: "마이페이지",
      requiresWorkspace: false,
    },
  ];

  const isNavItemActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (!pathname) return false;

    switch (item.key) {
      case "dashboard":
        return pathname === "/main";

      case "project":
        return /^\/main\/[^/]+/.test(pathname);

      case "aivs":
        return pathname.startsWith("/projects");

      case "design":
        return pathname.startsWith("/design");

      case "schedules":
        return pathname.startsWith("/schedules");

      case "devlogs":
        return pathname.startsWith("/devlogs");

      case "archive":
        return pathname.startsWith("/archive");

      case "community":
        return pathname.startsWith("/community");

      case "my":
        return pathname.startsWith("/my");

      default:
        return false;
    }
  };

  const handleGuardedNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    item: (typeof NAV_ITEMS)[number],
  ) => {
    if (!item.requiresWorkspace) return;
    if (hasSelectedWorkspace) return;

    event.preventDefault();
    router.push("/main");
  };

  return (
    <header className="sticky top-0 z-[2000] border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1650px] items-center justify-between px-6 py-2 text-xl 2xl:px-12 3xl:max-w-[1920px]">
        <Link
          href="/"
          className="bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 bg-clip-text px-2 text-[22px] font-extrabold text-transparent"
        >
          WAIVS
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-gray-600 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item);

            return (
              <Link
                key={item.key}
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
            onClick={() => setOpenMobileNav((value) => !value)}
            aria-label="메뉴 열기"
          >
            {openMobileNav ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {loading ? (
            <div className="hidden h-8 w-36 animate-pulse rounded-xl bg-gray-100 md:block" />
          ) : !isAuthenticated ? (
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
                      {notificationLoading ? (
                        <div className="px-4 py-6 text-sm text-gray-500">
                          알림을 불러오는 중...
                        </div>
                      ) : latestNotifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-500">
                          새 알림이 없어요.
                        </div>
                      ) : (
                        latestNotifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            className="w-full border-b border-gray-50 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {notification.title}
                                  </p>

                                  {!notification.read ? (
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                  ) : null}
                                </div>

                                <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                                  {notification.body}
                                </p>
                              </div>

                              <span className="shrink-0 text-[11px] text-gray-400">
                                {formatRelativeTime(notification.createdAt)}
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
                    setOpenUserMenu((value) => !value);
                  }}
                  className="flex items-center gap-2 rounded-2xl px-2 py-1.5 transition hover:bg-gray-100"
                  aria-label="유저 메뉴"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                    {getInitial(user)}
                  </div>

                  <span className="hidden max-w-[160px] truncate text-sm font-semibold text-gray-800 sm:inline">
                    {getDisplayName(user)}
                  </span>
                </button>

                {openUserMenu ? (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {getDisplayName(user)}
                      </p>

                      <p className="truncate text-xs text-gray-500">
                        {getDisplayEmail(user)}
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
                  key={item.key}
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

            {loading ? (
              <div className="mt-2 h-10 animate-pulse rounded-xl bg-gray-100" />
            ) : !isAuthenticated ? (
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