"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Client } from "@stomp/stompjs";
import { useAuth } from "@/contexts/AuthContext";
import { getViewerId } from "@/lib/messages/identity";
import { getAccessToken } from "@/lib/auth/tokenStore";
import * as api from "@/lib/messages/messageApi";
export type {
  MessageSource,
  MessageRecipient,
  Conversation,
} from "@/lib/messages/messageApi";

type Value = {
  enabled: boolean;
  conversations: api.Conversation[];
  unreadCount: number;
  loading: boolean;
  error: string;
  revision: number;
  hasMore: boolean;
  openInbox: () => void;
  select: (id: string) => void;
  back: () => void;
  start: (
    recipient: api.MessageRecipient,
    source?: api.MessageSource,
  ) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
};
const Context = createContext<Value | null>(null);
export function MessageProvider({ children }: { children: ReactNode }) {
  const { user, loading, isAuthenticated, isLoggedIn } = useAuth();
  const path = usePathname() || "/",
    owner = getViewerId(user),
    authed = Boolean(isAuthenticated || isLoggedIn);
 const enabled =
  !loading &&
  authed &&
  Boolean(owner) &&
  user?.role !== "ADMIN" &&
  !/^\/(admin|auth)(\/|$)/.test(path);
  return (
    <Session key={authed && owner ? owner : "out"} enabled={enabled}>
      {children}
    </Session>
  );
}
function Session({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState<api.Conversation[]>([]);
  const [unreadCount, setUnread] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [actionError, setActionError] = useState(""),
    [revision, setRevision] = useState(0),
    [hasMore, setHasMore] = useState(false);
  const pages = useRef(1),
    starting = useRef(false),
    lifetime = useRef(0),
    busy = useRef(false),
    again = useRef(false);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const active = useRef(enabled);
  active.current = enabled;
  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    const generation = lifetime.current;
    setLoading(true);
    try {
      const results = await Promise.all(
        Array.from({ length: pages.current }, (_, i) =>
          api.listConversations(i),
        ),
      );
      const unread = await api.getUnread();
      if (generation !== lifetime.current) return;
      const map = new Map(
        results.flatMap((r) => r.items).map((c) => [c.id, c]),
      );
      setConversations([...map.values()]);
      setHasMore(results[results.length - 1].hasMore);
      setUnread(unread.count);
      setError("");
      setRevision((v) => v + 1);
    } catch (e) {
      if (generation === lifetime.current) setError(api.errorText(e));
    } finally {
      busy.current = false;
      if (generation === lifetime.current) setLoading(false);
      if (again.current && active.current) {
        again.current = false;
        void refreshRef.current();
      }
    }
  }, [enabled]);
  refreshRef.current = refresh;
  useEffect(() => {
    lifetime.current++;
    active.current = enabled;
    if (!enabled) return;
    let disposed = false;
    void refresh();
    const raw =
      process.env.NEXT_PUBLIC_WS_BASE_URL ||
      (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080").replace(
        /^http/,
        "ws",
      );
    const client = new Client({
      brokerURL: `${raw.replace(/\/$/, "")}/ws/messages`,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: async () => {
        // 기존 apiClient를 거치며 필요하면 액세스 토큰을 갱신합니다.
        try {
          await api.getUnread();
        } catch {
          /* 서버가 CONNECT의 토큰을 검증합니다. */
        }
        if (disposed) return;
        const token = getAccessToken();
        client.connectHeaders = token
          ? { Authorization: `Bearer ${token}` }
          : {};
      },
      onConnect: () => {
        if (disposed) return;
        client.subscribe("/user/queue/dm", () => void refresh());
        void refresh();
      },
    });
    client.activate();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("focus", focus);
    return () => {
      disposed = true;
      active.current = false;
      lifetime.current++;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("focus", focus);
      void client.deactivate();
    };
  }, [enabled, refresh]);
  const select = (id: string) => {
    if (enabled)
      router.push(`/messages?conversation=${encodeURIComponent(id)}`);
  };
  const openInbox = () => {
    if (enabled) router.push("/messages");
  };
  const start = async (
    recipient: api.MessageRecipient,
    source?: api.MessageSource,
  ) => {
    if (!enabled || starting.current) return;
    starting.current = true;
    const generation = lifetime.current;
    setActionError("");
    try {
      const room = await api.startConversation(recipient.id, source?.postId);
      if (generation !== lifetime.current) return;
      select(room.id);
      void refresh();
    } catch (e) {
      if (generation === lifetime.current) setActionError(api.errorText(e));
    } finally {
      starting.current = false;
    }
  };
  const loadMore = async () => {
    if (!hasMore || busy.current) return;
    pages.current++;
    await refresh();
  };
  return (
    <Context.Provider
      value={{
        enabled,
        conversations,
        unreadCount,
        loading,
        error,
        revision,
        hasMore,
        openInbox,
        select,
        back: openInbox,
        start,
        refresh,
        loadMore,
      }}
    >
      {children}
      {actionError && (
        <div
          role="alert"
          className="fixed bottom-5 left-1/2 z-[2200] flex max-w-[90vw] -translate-x-1/2 items-center gap-4 rounded-xl border border-red-100 bg-white px-5 py-3 text-sm text-red-600 shadow-lg"
        >
          {actionError}
          <button
            type="button"
            onClick={() => setActionError("")}
            className="shrink-0 underline"
          >
            닫기
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useMessages() {
  const value = useContext(Context);
  if (!value) throw new Error("MessageProvider 안에서 사용해야 합니다.");
  return value;
}