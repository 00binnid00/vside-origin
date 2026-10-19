
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Flag,
  ShieldCheck,
  Loader2,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  {
    name: "대시보드",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "회원 관리",
    href: "/admin/users",
    icon: Users,
  },
  {
    name: "게시판 관리",
    href: "/admin/posts",
    icon: FileText,
  },
  {
    name: "신고 관리",
    href: "/admin/reports",
    icon: Flag,
  },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    loading,
    isAuthenticated,
    logout,
  } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // 관리자 접근 제어
  useEffect(() => {
    if (loading || loggingOut) return;

    if (!isAuthenticated || !user) {
      router.replace("/auth/login");
      return;
    }

    if (user.role !== "ADMIN") {
      router.replace("/projects");
    }
  }, [loading, loggingOut, isAuthenticated, user, router]);

  // 관리자 로그아웃
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await logout();
      router.replace("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("관리자 로그아웃 실패:", error);
      setLoggingOut(false);
      alert("로그아웃 처리에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  // 메뉴 활성화
  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  // 인증 확인
  if (loading || loggingOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-gray-500" />
          <p className="text-sm text-gray-500">
            {loggingOut
              ? "로그아웃 처리 중입니다."
              : "관리자 권한을 확인하고 있습니다."}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== "ADMIN") {
    return null;
  }

  const adminName = user.nickname || user.name || "관리자";
  const adminInitial = adminName.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* 관리자 사이드바 */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[250px] flex-col border-r border-gray-200 bg-white">
        {/* 로고 */}
        <div className="flex h-[72px] items-center border-b border-gray-200 px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827]">
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div>
              <p className="text-[18px] font-bold tracking-tight text-gray-900">
                WAIVS
              </p>
              <p className="text-[11px] font-medium tracking-[0.18em] text-gray-400">
                ADMIN
              </p>
            </div>
          </Link>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-3 py-5">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            Management
          </p>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-[46px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                    active
                      ? "bg-[#111827] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    size={19}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={active ? "text-white" : "text-gray-500"}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 관리자 정보 및 로그아웃 */}
        <div className="border-t border-gray-200 p-3">
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                {adminInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800">
                  {adminName}
                </p>
                <p className="truncate text-xs text-gray-400">
                  Administrator
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-2 flex h-[42px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* 오른쪽 관리자 콘텐츠 */}
      <div className="ml-[250px] min-h-screen">
        {/* 헤더 */}
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-gray-200 bg-white/95 px-8 backdrop-blur">
          <div>
            <p className="text-sm font-medium text-gray-400">
              WAIVS Administration
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">
                {adminName}
              </p>
              <p className="text-[11px] text-gray-400">
                ADMIN
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-xs font-bold text-white">
              {adminInitial}
            </div>
          </div>
        </header>

        {/* 관리자 페이지 */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
