"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Search,
  Check,
  Trash2,
  CalendarDays,
  MessageSquare,
  GitCommit,
  Flag,
  AlertTriangle,
  Settings,
  ArrowLeft,
  Filter,
  FileText,
  UserPlus,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import {
  BackendNotificationType,
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationResponse,
  NotificationTypeFilter,
} from "@/lib/notification/notificationApi";

type TabType = "all" | "unread";

type DateFilter = "all" | "today" | "7d" | "30d" | "custom";

const TYPE_OPTIONS: Array<{
  value: NotificationTypeFilter;
  label: string;
}> = [
  { value: "ALL", label: "모든 알림" },
  { value: "SCHEDULE", label: "일정 알림" },
  { value: "CHAT", label: "팀 채팅" },
  { value: "GIT_COMMIT", label: "커밋 알림" },
  { value: "GIT_PUSH", label: "푸쉬 알림" },
  { value: "BOARD_POST", label: "게시글 알림" },
  { value: "BOARD_COMMENT", label: "댓글 알림" },
  { value: "DEVLOG", label: "개발일지 알림" },
  { value: "INVITE", label: "초대 알림" },
  { value: "ERROR", label: "오류 알림" },
  { value: "SYSTEM", label: "시스템 알림" },
];

const TYPE_LABEL: Record<BackendNotificationType, string> = {
  SCHEDULE: "일정 알림",
  CHAT: "팀 채팅",
  GIT_COMMIT: "커밋 알림",
  GIT_PUSH: "푸쉬 알림",
  BOARD_POST: "게시글 알림",
  BOARD_COMMENT: "댓글 알림",
  DEVLOG: "개발일지 알림",
  INVITE: "초대 알림",
  SYSTEM: "시스템 알림",
  ERROR: "오류 알림",
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateRange(filter: DateFilter, customFrom: string, customTo: string) {
  if (filter === "all") {
    return { from: undefined, to: undefined };
  }

  if (filter === "custom") {
    return {
      from: customFrom || undefined,
      to: customTo || undefined,
    };
  }

  const today = new Date();
  const to = toDateInputValue(today);

  if (filter === "today") {
    return { from: to, to };
  }

  const fromDate = new Date();

  if (filter === "7d") {
    fromDate.setDate(today.getDate() - 6);
  }

  if (filter === "30d") {
    fromDate.setDate(today.getDate() - 29);
  }

  return {
    from: toDateInputValue(fromDate),
    to,
  };
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
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function typeIcon(type: BackendNotificationType) {
  const cls = "h-5 w-5";

  switch (type) {
    case "SCHEDULE":
      return <CalendarDays className={cls} />;
    case "CHAT":
      return <MessageSquare className={cls} />;
    case "GIT_COMMIT":
    case "GIT_PUSH":
      return <GitCommit className={cls} />;
    case "BOARD_POST":
      return <FileText className={cls} />;
    case "BOARD_COMMENT":
      return <MessageCircle className={cls} />;
    case "DEVLOG":
      return <Flag className={cls} />;
    case "INVITE":
      return <UserPlus className={cls} />;
    case "ERROR":
      return <AlertTriangle className={cls} />;
    case "SYSTEM":
      return <Settings className={cls} />;
    default:
      return <Bell className={cls} />;
  }
}

function pill(type: BackendNotificationType) {
  const base = "rounded-full px-2 py-0.5 text-[11px] font-semibold";

  switch (type) {
    case "SCHEDULE":
      return `${base} bg-blue-50 text-blue-700`;
    case "CHAT":
      return `${base} bg-green-50 text-green-700`;
    case "GIT_COMMIT":
    case "GIT_PUSH":
      return `${base} bg-purple-50 text-purple-700`;
    case "BOARD_POST":
    case "BOARD_COMMENT":
      return `${base} bg-sky-50 text-sky-700`;
    case "DEVLOG":
    case "INVITE":
      return `${base} bg-orange-50 text-orange-700`;
    case "ERROR":
      return `${base} bg-rose-50 text-rose-700`;
    case "SYSTEM":
    default:
      return `${base} bg-gray-100 text-gray-700`;
  }
}

export default function NotificationsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabType>("all");
  const [type, setType] = useState<NotificationTypeFilter>("ALL");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [openTypeMenu, setOpenTypeMenu] = useState(false);
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const selectedTypeLabel =
    TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "모든 알림";

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const dateRange = getDateRange(dateFilter, customFrom, customTo);

      const [pageResponse, unreadResponse] = await Promise.all([
        getNotifications({
          page: 0,
          size: 50,
          type,
          read: tab === "unread" ? false : undefined,
          from: dateRange.from,
          to: dateRange.to,
        }),
        getUnreadNotificationCount(),
      ]);

      setItems(pageResponse.content ?? []);
      setTotalCount(pageResponse.totalElements ?? 0);
      setUnreadCount(unreadResponse.unreadCount ?? 0);
    } catch (error) {
      console.error("알림 조회 실패:", error);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [tab, type, dateFilter, customFrom, customTo]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return items;

    return items.filter((item) => {
      const hay = `${item.title} ${item.body} ${item.workspaceName ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();

      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("전체 읽음 처리 실패:", error);
    }
  };

  const markRead = async (id: number) => {
    try {
      await markNotificationAsRead(id);

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );

      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.error("읽음 처리 실패:", error);
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteNotification(id);

      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((prev) => Math.max(prev - 1, 0));
    } catch (error) {
      console.error("알림 삭제 실패:", error);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/main"
              className="rounded-xl p-2 text-gray-700 hover:bg-gray-100"
              aria-label="뒤로"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-800" />
              <h1 className="text-lg font-black text-gray-900">알림</h1>

              {unreadCount > 0 ? (
                <span className="ml-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                  {unreadCount}개 읽지 않은 알림
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Check className="h-4 w-4" />
            모두 읽음 처리
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="알림 검색..."
                className="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-400"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenTypeMenu((prev) => !prev)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 lg:w-auto"
              >
                <Filter className="h-4 w-4" />
                {selectedTypeLabel}
              </button>

              {openTypeMenu ? (
                <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setType(option.value);
                        setOpenTypeMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                tab === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              모든 알림 ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setTab("unread")}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                tab === "unread"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              읽지 않음 ({unreadCount})
            </button>

            {(["all", "today", "7d", "30d", "custom"] as DateFilter[]).map(
              (value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDateFilter(value)}
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    dateFilter === value
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  {value === "all"
                    ? "전체 기간"
                    : value === "today"
                      ? "오늘"
                      : value === "7d"
                        ? "최근 7일"
                        : value === "30d"
                          ? "최근 30일"
                          : "직접 선택"}
                </button>
              ),
            )}

            <button
              type="button"
              onClick={fetchNotifications}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              새로고침
            </button>
          </div>

          {dateFilter === "custom" ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
              />

              <span className="text-sm text-gray-400">~</span>

              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
            {loading ? "알림을 불러오는 중..." : `${filtered.length}개 표시됨`}
          </div>

          <div className="divide-y divide-gray-100 bg-white">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 px-4 py-4 ${
                  item.read ? "bg-white" : "bg-blue-50/30"
                }`}
              >
                <div className="mt-1 grid h-10 w-10 place-items-center rounded-2xl bg-gray-100 text-gray-700">
                  {typeIcon(item.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">
                      {item.title}
                    </p>

                    <span className={pill(item.type)}>
                      {TYPE_LABEL[item.type]}
                    </span>

                    {!item.read ? (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-gray-700">{item.body}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{formatRelativeTime(item.createdAt)}</span>
                    {item.workspaceName ? <span>· {item.workspaceName}</span> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!item.read ? (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      className="rounded-xl p-2 text-gray-700 hover:bg-gray-100"
                      aria-label="읽음"
                      title="읽음 처리"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="rounded-xl p-2 text-rose-600 hover:bg-rose-50"
                    aria-label="삭제"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {!loading && filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                조건에 맞는 알림이 없어요.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}