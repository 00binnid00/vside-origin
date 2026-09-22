"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  Send,
  X,
} from "lucide-react";

import {
  useMessages,
  type Conversation,
} from "@/contexts/MessageContext";

export default function MessagePanel() {
  const {
    open,
    close,
    activeId,
    conversations,
    back,
    select,
  } = useMessages();

  const panelRef =
    useRef<HTMLDivElement>(null);

  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    panelRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }

      if (event.key !== "Tab") {
        return;
      }

      const nodes =
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], textarea:not([disabled]), input:not([disabled])',
        );

      if (!nodes?.length) {
        event.preventDefault();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (
        event.shiftKey &&
        (
          document.activeElement === first ||
          document.activeElement === panelRef.current
        )
      ) {
        event.preventDefault();
        last.focus();
      }

      if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    const overflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);

      if (previous?.isConnected) {
        previous.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const active = conversations.find(
    (conversation) =>
      conversation.recipient.id === activeId,
  );

  return (
    <div className="fixed inset-0 z-[2100]">
      <div
        className="absolute inset-0 bg-slate-950/20"
        onClick={close}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="message-panel-title"
        id="personal-message-panel"
        className="absolute bottom-0 right-0 top-0 flex w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl outline-none"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          {active && (
            <button
              type="button"
              onClick={back}
              aria-label="대화 목록으로"
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <ArrowLeft size={19} />
            </button>
          )}

          <h2
            id="message-panel-title"
            className="min-w-0 flex-1 truncate text-lg font-bold text-slate-900"
          >
            {active?.recipient.name || "메시지"}
          </h2>

          <button
            type="button"
            onClick={close}
            aria-label="메시지 닫기"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <p className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs leading-5 text-amber-800">
          화면 테스트 중 · 상대에게 전송되지 않습니다.
          새로고침하거나 로그아웃하면 테스트 대화가 사라집니다.
        </p>

        {active ? (
          <ConversationView
            key={active.recipient.id}
            conversation={active}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="px-8 py-20 text-center">
                <MessageSquare
                  className="mx-auto mb-4 text-blue-300"
                  size={36}
                />

                <p className="font-semibold text-slate-700">
                  아직 대화가 없어요
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  게시글이나 댓글의 메시지 버튼으로
                  <br />
                  대화를 시작해 보세요.
                </p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.recipient.id}
                  type="button"
                  onClick={() =>
                    select(conversation.recipient.id)
                  }
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-4 text-left hover:bg-blue-50"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-600">
                    {conversation.recipient.name.slice(0, 1)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">
                      {conversation.recipient.name}
                    </span>

                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {conversation.messages.at(-1)?.content ||
                        "새 대화를 시작해 보세요"}
                    </span>
                  </span>

                  <span className="text-[10px] text-slate-400">
                    테스트
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationView({
  conversation,
}: {
  conversation: Conversation;
}) {
  const {
    sendPreview,
    close,
  } = useMessages();

  const [draft, setDraft] = useState("");

  const bottomRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      block: "end",
    });
  }, [conversation.messages.length]);

  const submit = () => {
    if (sendPreview(draft)) {
      setDraft("");
    }
  };

  return (
    <>
      {conversation.source && (
        <Link
          href={`/community/${encodeURIComponent(
            conversation.source.postId,
          )}`}
          onClick={close}
          className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-5 py-3 text-xs text-blue-700"
        >
          <span className="min-w-0 flex-1 truncate">
            관련 글 · {conversation.source.title}
          </span>

          <ExternalLink size={14} />
        </Link>
      )}

      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-5"
        role="log"
        aria-label="대화 내용"
        aria-live="polite"
      >
        {conversation.messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            첫 메시지를 입력해 보세요.
          </p>
        )}

        {conversation.messages.map((message) => (
          <div
            key={message.id}
            className="flex flex-col items-end"
          >
            <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2.5 text-sm leading-6 text-white">
              {message.content}
            </p>

            <span className="mt-1 text-[10px] text-slate-400">
              {new Date(message.createdAt).toLocaleTimeString(
                "ko-KR",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
              {" · "}
              미전송 / 테스트
            </span>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="border-t border-slate-200 bg-white p-4"
      >
        <label
          htmlFor="personal-message-input"
          className="sr-only"
        >
          메시지 내용
        </label>

        <div className="flex items-end gap-2">
          <textarea
            id="personal-message-input"
            value={draft}
            maxLength={2000}
            rows={3}
            onChange={(event) =>
              setDraft(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="메시지를 입력하세요"
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-900 outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={!draft.trim()}
            title="테스트 메시지 추가"
            aria-label="테스트 메시지 추가"
            className="rounded-xl bg-blue-600 p-3 text-white disabled:bg-slate-300"
          >
            <Send size={18} />
          </button>
        </div>

        <p className="mt-2 text-right text-[10px] text-slate-400">
          Shift+Enter 줄바꿈 · {draft.length}/2000
        </p>
      </form>
    </>
  );
}