"use client";

import React, {
  useEffect,
  useMemo,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import TopNav from "@/components/landing/TopNav";
import { useAuth } from "@/contexts/AuthContext";


export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();


  const {
    user,
    loading,
    isAuthenticated,
    isLoggedIn,
  } = useAuth();


  /* ==========================================
     로그인 여부
  ========================================== */

  const isAuthed =
    Boolean(
      isAuthenticated ||
      isLoggedIn,
    );


  /* ==========================================
     관리자 여부
  ========================================== */

  const isAdmin =
    user?.role === "ADMIN";


  /* ==========================================
     공개 경로
  ========================================== */

  const publicPaths =
    useMemo(
      () => [
        "/",
        "/auth/login",
        "/auth/signup",
      ],
      [],
    );


  const isPublicPath =
    useMemo(() => {
      if (!pathname) {
        return false;
      }

      if (
        publicPaths.includes(
          pathname,
        )
      ) {
        return true;
      }

      if (
        pathname.startsWith(
          "/auth/github",
        )
      ) {
        return true;
      }

      return false;
    }, [
      pathname,
      publicPaths,
    ]);


  /* ==========================================
     관리자 경로 여부
  ========================================== */

  const isAdminPath =
    Boolean(
      pathname?.startsWith(
        "/admin",
      ),
    );


  /* ==========================================
     TopNav 숨김 여부
  ========================================== */

  const hideTopNav =
    pathname === "/auth/login" ||
    pathname === "/auth/signup" ||
    pathname?.startsWith(
      "/auth/github",
    ) ||
    pathname?.startsWith(
      "/admin",
    );


  /* ==========================================
     1. 비로그인 사용자 보호

     로그인 안 된 사용자가
     보호된 페이지에 접근하면 로그인으로 이동
  ========================================== */

  useEffect(() => {
    if (loading) {
      return;
    }

    if (isPublicPath) {
      return;
    }

    if (isAuthed) {
      return;
    }


    const currentPath =
      typeof window !==
      "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : pathname || "/";


    router.replace(
      `/auth/login?next=${encodeURIComponent(
        currentPath,
      )}`,
    );

  }, [
    loading,
    isPublicPath,
    isAuthed,
    pathname,
    router,
  ]);


  /* ==========================================
     2. 로그인 페이지에서 로그인 완료 후 이동

     USER  → /main
     ADMIN → /admin
  ========================================== */

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthed) {
      return;
    }

    if (!user) {
      return;
    }


    const isAuthPage =
      pathname === "/auth/login" ||
      pathname === "/auth/signup";


    if (!isAuthPage) {
      return;
    }


    /* 관리자 */
    if (isAdmin) {
      console.log(
        "[AppShell] 관리자 인증 → /admin",
      );

      router.replace(
        "/admin",
      );

      return;
    }


    /* 일반 사용자 */
    console.log(
      "[AppShell] 일반 사용자 인증 → /main",
    );

    router.replace(
      "/main",
    );

  }, [
    loading,
    isAuthed,
    user,
    isAdmin,
    pathname,
    router,
  ]);


  /* ==========================================
     3. 일반 사용자의 관리자 페이지 접근 차단

     USER가 주소창에
     /admin 직접 입력해도 /main으로 이동
  ========================================== */

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthed) {
      return;
    }

    if (!user) {
      return;
    }

    if (!isAdminPath) {
      return;
    }


    if (!isAdmin) {
      console.warn(
        "[AppShell] 관리자 권한 없음 → /main",
      );

      router.replace(
        "/main",
      );
    }

  }, [
    loading,
    isAuthed,
    user,
    isAdmin,
    isAdminPath,
    router,
  ]);


  /* ==========================================
     인증 확인 중
  ========================================== */

  if (loading) {
    return null;
  }


  /* ==========================================
     비로그인 상태에서 보호된 페이지
  ========================================== */

  if (
    !isPublicPath &&
    !isAuthed
  ) {
    return null;
  }


  /* ==========================================
     USER가 /admin 진입한 경우

     redirect 하는 동안 관리자 화면이
     잠깐 보이지 않도록 렌더링 차단
  ========================================== */

  if (
    isAdminPath &&
    isAuthed &&
    user &&
    !isAdmin
  ) {
    return null;
  }


  /* ==========================================
     화면
  ========================================== */

  return (
    <div className="flex min-h-dvh flex-col bg-[#F7F8FA]">

      {!hideTopNav && (
        <TopNav />
      )}


      <div className="flex min-h-0 flex-1 flex-col">
        {children}
      </div>

    </div>
  );
}