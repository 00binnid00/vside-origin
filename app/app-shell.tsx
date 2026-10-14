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
  const isAdminPath = /^\/admin(\/|$)/.test(pathname);
  const isAuthPage =
    pathname === "/auth/login" ||
    pathname === "/auth/signup";
  const isGithubAuth = /^\/auth\/github(\/|$)/.test(pathname);
  const isPublicPath =
    pathname === "/" ||
    isAuthPage ||
    isGithubAuth;
  const hideTopNav =
    isAuthPage ||
    isGithubAuth ||
    isAdminPath;

  const isWorkspacePage =
    /^\/(dashboard|design|schedules|aivs|devlogs|archive)(\/|$)/.test(pathname);

  useEffect(() => {
    if (loading) return;

    if (!isPublicPath && !isAuthed) {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      router.replace(
        `/auth/login?next=${encodeURIComponent(currentPath)}`
      );
      return;
    }

    if (!isAuthed || !user) return;

    if (isAuthPage) {
      router.replace(isAdmin ? "/admin" : "/projects");
    } else if (isAdminPath && !isAdmin) {
      router.replace("/projects");
    }
  }, [
    loading,
    isPublicPath,
    isAuthed,
    user,
    isAuthPage,
    isAdmin,
    isAdminPath,
    pathname,
    router,
  ]);

  if (
    loading ||
    (!isPublicPath && !isAuthed) ||
    (isAdminPath && (!user || !isAdmin))
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