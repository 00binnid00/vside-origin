"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  FileText,
  Loader2,
  MessageSquare,
  Search,
  Send,
} from "lucide-react";
import { useMessages } from "@/contexts/MessageContext";
import * as api from "@/lib/messages/messageApi";
const time = (s: string) =>
  new Date(s).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
function merge(a: api.DirectMessage[], b: api.DirectMessage[]) {
  const map = new Map([...a, ...b].map((m) => [m.id, m]));
  return [...map.values()].sort(
    (x, y) => x.id.length - y.id.length || x.id.localeCompare(y.id),
  );
}
export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-slate-500">메시지를 불러오는 중...</div>
      }
    >
      <Inbox />
    </Suspense>
  );
}
function Inbox() {
  const search = useSearchParams(),
    id = search.get("conversation");
  const {
    enabled,
    conversations,
    select,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useMessages();
  const [keyword, setKeyword] = useState("");
  const filtered = conversations.filter((c) =>
    c.recipient.name
      .toLocaleLowerCase()
      .includes(keyword.trim().toLocaleLowerCase()),
  );
  if (!enabled)
    return (
      <div className="p-8 text-sm text-slate-500">
        로그인 사용자 정보를 확인해 주세요.
      </div>
    );
  return (
    <main className="flex-1 bg-[#F7F8FA] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1280px]">
        <h1 className="text-2xl font-bold text-slate-950">메시지</h1>
        <p className="mb-5 mt-2 text-sm text-slate-500">
          대화를 확인하고 이야기를 이어가세요.
        </p>
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600"
          >
            {error}{" "}
            <button onClick={() => void refresh()} className="underline">
              다시 조회
            </button>
          </div>
        )}
        <div className="flex h-[calc(100dvh-220px)] min-h-[460px] max-h-[850px] overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <aside
            className={`w-full shrink-0 flex-col border-slate-100 md:flex md:w-[320px] md:border-r ${id ? "hidden" : "flex"}`}
            aria-label="대화 목록"
          >
            <div className="border-b border-slate-100 p-5">
              <h2 className="mb-4 text-sm font-bold">
                대화 목록{" "}
                {loading && (
                  <Loader2 size={14} className="ml-2 inline animate-spin" />
                )}
              </h2>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-3 text-slate-400"
                />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  aria-label="불러온 대화 상대 검색"
                  placeholder="불러온 대화 상대 검색"
                  className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!filtered.length && !loading && (
                <p className="px-4 py-16 text-center text-sm text-slate-400">
                  {keyword
                    ? "불러온 대화 중 검색 결과가 없어요."
                    : "아직 대화가 없어요."}
                </p>
              )}
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c.id)}
                  aria-pressed={c.id === id}
                  className={`mb-1 flex w-full gap-3 rounded-2xl p-3 text-left ${c.id === id ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500">
                    {c.recipient.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2 text-sm font-semibold">
                      <span className="truncate">{c.recipient.name}</span>
                      {c.unreadCount > 0 && (
                        <span className="rounded-full bg-blue-600 px-1.5 text-xs text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {c.lastContent || "아직 메시지가 없습니다"}
                    </span>
                    <span className="mt-1 block text-[10px] text-slate-400">
                      {time(c.updatedAt)}
                    </span>
                  </span>
                </button>
              ))}
              {hasMore && (
                <button
                  disabled={loading}
                  onClick={() => void loadMore()}
                  className="w-full p-3 text-sm text-blue-600"
                >
                  대화 더 보기
                </button>
              )}
            </div>
          </aside>
          <section
            className={`min-w-0 flex-1 flex-col md:flex ${id ? "flex" : "hidden"}`}
            aria-label="대화 내용"
          >
            {id ? (
              <Thread key={id} id={id} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageSquare size={32} className="mb-5 text-blue-300" />
                <h2 className="font-bold">대화를 선택해 주세요</h2>
                <p className="mt-2 text-sm text-slate-400">
                  왼쪽 목록에서 확인할 대화를 선택하세요.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
function Thread({ id }: { id: string }) {
  const { revision, back, refresh } = useMessages();
  const [room, setRoom] = useState<api.Conversation | null>(null),
    [messages, setMessages] = useState<api.DirectMessage[]>([]);
  const [error, setError] = useState(""),
    [draft, setDraft] = useState(""),
    [sending, setSending] = useState(false),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(false),
    [olderLoading, setOlderLoading] = useState(false);
  const scroll = useRef<HTMLDivElement>(null),
    alive = useRef(true),
    busy = useRef(false),
    queued = useRef(false),
    known = useRef<api.DirectMessage[]>([]),
    sendLock = useRef(false);
  const pending = useRef<{ text: string; clientId: string } | null>(null);
  const readCursor = useRef("");
  const publish = (items: api.DirectMessage[]) => {
    known.current = items;
    setMessages(items);
  };
  const sync = useCallback(async (): Promise<void> => {
    if (busy.current) {
      queued.current = true;
      return;
    }
    busy.current = true;
    try {
      const [detail, latest] = await Promise.all([
        api.getConversation(id),
        api.getMessages(id),
      ]);
      if (!alive.current) return;
      // 소켓이 끊긴 사이 50개 이상 쌓인 경우 기존 최신 메시지까지의 간격을 모두 가져옵니다.
      const oldLast = known.current[known.current.length - 1]?.id;
      let incoming = latest.items,
        part = latest;
      while (
        oldLast &&
        part.hasMore &&
        part.items.length &&
        BigInt(part.items[0].id) > BigInt(oldLast)
      ) {
        part = await api.getMessages(id, part.items[0].id);
        if (!alive.current) return;
        incoming = merge(part.items, incoming);
      }
      const element = scroll.current,
        atBottom =
          !element ||
          element.scrollHeight - element.scrollTop - element.clientHeight < 100;
      const first = known.current.length === 0;
      setRoom(detail);
      publish(merge(known.current, incoming));
      if (first) setMore(latest.hasMore);
      setError("");
      if (first || atBottom)
        requestAnimationFrame(() => {
          if (alive.current && scroll.current)
            scroll.current.scrollTop = scroll.current.scrollHeight;
        });
      const last = incoming[incoming.length - 1];
      if (
        document.visibilityState === "visible" &&
        last &&
        incoming.some((m) => !m.mine && !m.readAt) &&
        readCursor.current !== last.id
      ) {
        await api.markRead(id, last.id);
        if (!alive.current) return;
        readCursor.current = last.id;
        void refresh();
      }
    } catch (e) {
      if (alive.current) setError(api.errorText(e));
    } finally {
      busy.current = false;
      if (alive.current) {
        setLoading(false);
        if (queued.current) {
          queued.current = false;
          void sync();
        }
      }
    }
  }, [id, refresh]);
  useEffect(() => {
    alive.current = true;
    const visible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive.current = false;
      document.removeEventListener("visibilitychange", visible);
    };
  }, [sync]);
  useEffect(() => {
    void sync();
  }, [revision, sync]);
  const older = async () => {
    if (olderLoading || !messages.length) return;
    setOlderLoading(true);
    try {
      const part = await api.getMessages(id, messages[0].id);
      if (!alive.current) return;
      const el = scroll.current,
        oldHeight = el?.scrollHeight || 0,
        oldTop = el?.scrollTop || 0;
      publish(merge(part.items, known.current));
      setMore(part.hasMore);
      requestAnimationFrame(() => {
        if (el && alive.current)
          el.scrollTop = oldTop + el.scrollHeight - oldHeight;
      });
    } catch (e) {
      if (alive.current) setError(api.errorText(e));
    } finally {
      if (alive.current) setOlderLoading(false);
    }
  };
  const send = async () => {
    const text = draft.trim();
    if (!text || text.length > 2000 || sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    setError("");
    if (!pending.current || pending.current.text !== text)
      pending.current = { text, clientId: api.newClientId() };
    try {
      const m = await api.sendMessage(id, text, pending.current.clientId);
      if (!alive.current) return;
      pending.current = null;
      setDraft("");
      publish(merge(known.current, [m]));
      requestAnimationFrame(() => {
        if (scroll.current)
          scroll.current.scrollTop = scroll.current.scrollHeight;
      });
      void refresh();
    } catch (e) {
      if (alive.current) setError(api.errorText(e));
    } finally {
      sendLock.current = false;
      if (alive.current) setSending(false);
    }
  };
  return (
    <>
      <div className="flex min-h-[82px] items-center gap-3 border-b border-slate-100 px-5 py-4">
        <button
          onClick={back}
          aria-label="대화 목록으로"
          className="rounded-lg p-2 md:hidden"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold">
            {room?.recipient.name || "대화 불러오는 중"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">개인 메시지</p>
        </div>
      </div>
      {room?.source && (
        <Link
          href={`/community/${room.source.postId}`}
          className="mx-5 my-3 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500"
        >
          <FileText size={16} />
          <span className="min-w-0 flex-1 truncate">
            관련 글 · {room.source.title}
          </span>
          <ArrowUpRight size={16} />
        </Link>
      )}
      {error && (
        <div
          role="alert"
          className="mx-4 my-2 rounded-lg bg-red-50 p-3 text-sm text-red-600"
        >
          {error}{" "}
          <button onClick={() => void sync()} className="underline">
            다시 조회
          </button>
        </div>
      )}
      <div
        ref={scroll}
        role="log"
        aria-live="polite"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#FBFCFE] p-5"
      >
        {more && (
          <button
            disabled={olderLoading}
            onClick={() => void older()}
            className="block w-full py-2 text-xs text-blue-600"
          >
            {olderLoading ? "불러오는 중..." : "이전 메시지 보기"}
          </button>
        )}
        {loading ? (
          <Loader2 className="mx-auto animate-spin text-blue-400" />
        ) : (
          !messages.length && (
            <p className="py-12 text-center text-sm text-slate-400">
              첫 메시지를 남겨보세요.
            </p>
          )
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}
          >
            <p
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${m.mine ? "rounded-tr-md bg-blue-600 text-white" : "rounded-tl-md border border-slate-100 bg-white text-slate-700"}`}
            >
              {m.content}
            </p>
            <span className="mt-1 text-[10px] text-slate-400">
              {time(m.createdAt)}
            </span>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t border-slate-100 p-4"
      >
        <div className="rounded-2xl border border-slate-200 p-3 focus-within:border-blue-300">
          <textarea
            aria-label="메시지 내용"
            value={draft}
            disabled={sending || !room}
            maxLength={2000}
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="메시지를 입력하세요"
            className="w-full resize-none bg-transparent text-sm outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {draft.length}/2000 · Shift+Enter 줄바꿈
            </span>
            <button
              disabled={sending || !room || !draft.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white disabled:bg-slate-200"
            >
              {sending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              보내기
            </button>
          </div>
        </div>
      </form>
    </>
  );
}