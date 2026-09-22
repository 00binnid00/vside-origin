"use client";

import {
  useEffect,
  type ReactNode,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

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

  const isAuthed = Boolean(
    isAuthenticated || isLoggedIn,
  );

  const isAdmin =
    user?.role === "ADMIN";

  const isAdminPath =
    /^\/admin(\/|$)/.test(pathname);

  const isAuthPage =
    pathname === "/auth/login" ||
    pathname === "/auth/signup";

  const isGithubAuth =
    /^\/auth\/github(\/|$)/.test(pathname);

  const isPublicPath =
    pathname === "/" ||
    isAuthPage ||
    isGithubAuth;

  const hideTopNav =
    isAuthPage ||
    isGithubAuth ||
    isAdminPath;

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isPublicPath && !isAuthed) {
      const currentPath =
        `${window.location.pathname}${window.location.search}`;

      router.replace(
        `/auth/login?next=${encodeURIComponent(
          currentPath,
        )}`,
      );

      return;
    }

    if (!isAuthed || !user) {
      return;
    }

    if (isAuthPage) {
      router.replace(
        isAdmin ? "/admin" : "/main",
      );
    } else if (
      isAdminPath &&
      !isAdmin
    ) {
      router.replace("/main");
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
      <div className="flex min-h-dvh flex-col bg-[#F7F8FA]">
        {!hideTopNav && <TopNav />}

        <div className="flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </MessageProvider>
  );
}