
"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import TopNav from "@/components/landing/TopNav";
import { useAuth } from "@/contexts/AuthContext";
import { MessageProvider } from "@/contexts/MessageContext";

export default function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const {
    user,
    loading,
    isAuthenticated,
    isLoggedIn,
  } = useAuth();

  const isAuthed = Boolean(isAuthenticated || isLoggedIn);
  const isAdmin = user?.role === "ADMIN";

  // 관리자 경로
  const isAdminPath = /^\/admin(\/|$)/.test(pathname);

  // 로그인 및 회원가입 경로
  const isAuthPage =
    pathname === "/auth/login" ||
    pathname === "/auth/signup";

  // GitHub 인증 경로
  const isGithubAuth = /^\/auth\/github(\/|$)/.test(pathname);

  // 공개 경로
  const isPublicPath =
    pathname === "/" ||
    isAuthPage ||
    isGithubAuth;

  // 일반 사용자 전용 경로
  const isUserOnlyPath =
    /^\/(projects|dashboard|design|schedules|aivs|devlogs|archive|messages|main)(\/|$)/.test(
      pathname
    );

  // 관리자 접근 차단 대상
  const isAdminBlocked =
    isAdmin &&
    isUserOnlyPath;

  // 상단 네비게이션 숨김
  const hideTopNav =
    isAuthPage ||
    isGithubAuth ||
    isAdminPath;

  // 워크스페이스 화면 여부
  const isWorkspacePage =
    /^\/(dashboard|design|schedules|aivs|devlogs|archive)(\/|$)/.test(
      pathname
    );

  // 인증 및 권한에 따른 경로 이동
  useEffect(() => {
    if (loading) return;

    // 비로그인 사용자의 보호 페이지 접근
    if (!isPublicPath && !isAuthed) {
      const currentPath =
        `${window.location.pathname}${window.location.search}`;

      router.replace(
        `/auth/login?next=${encodeURIComponent(currentPath)}`
      );
      return;
    }

    if (!isAuthed || !user) return;

    // 로그인된 사용자가 인증 페이지 접근
    if (isAuthPage) {
      router.replace(isAdmin ? "/admin" : "/projects");
      return;
    }

    // 일반 사용자의 관리자 페이지 접근 차단
    if (isAdminPath && !isAdmin) {
      router.replace("/projects");
      return;
    }

    // 관리자의 일반 사용자 페이지 접근 차단
    if (isAdminBlocked) {
      router.replace("/admin");
      return;
    }
  }, [
    loading,
    isPublicPath,
    isAuthed,
    user,
    isAuthPage,
    isAdmin,
    isAdminPath,
    isAdminBlocked,
    pathname,
    router,
  ]);

  // 인증 및 권한 확인 중 화면 차단
  if (
    loading ||
    (!isPublicPath && !isAuthed) ||
    (isAdminPath && (!isAuthed || !user || !isAdmin)) ||
    (isAuthPage && isAuthed && !!user) ||
    isAdminBlocked
  ) {
    return null;
  }

  return (
    <MessageProvider>
      <div
        className={
          isWorkspacePage
            ? "flex h-dvh min-h-0 flex-col overflow-hidden bg-[#F7F8FA]"
            : "flex min-h-dvh flex-col bg-[#F7F8FA]"
        }
      >
        {!hideTopNav && <TopNav />}

        <div
          className={
            isWorkspacePage
              ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
              : "flex min-h-0 min-w-0 flex-1 flex-col"
          }
        >
          {children}
        </div>
      </div>
    </MessageProvider>
  );
}
