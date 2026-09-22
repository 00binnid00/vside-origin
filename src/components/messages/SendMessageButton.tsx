"use client";

import { MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMessages,
  type MessageSource,
} from "@/contexts/MessageContext";
import {
  getViewerId,
  normalizeUserId,
} from "@/lib/messages/identity";

type SendMessageButtonProps = {
  authorId: unknown;
  authorName: string;
  source?: MessageSource;
  compact?: boolean;
};

export default function SendMessageButton({
  authorId,
  authorName,
  source,
  compact = false,
}: SendMessageButtonProps) {
  const { user } = useAuth();
  const { enabled, start } = useMessages();

  const recipientId = normalizeUserId(authorId);

  if (
    !enabled ||
    !recipientId ||
    recipientId === getViewerId(user)
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() =>
        void start(
          {
            id: recipientId,
            name: authorName || "사용자",
          },
          source,
        )
      }
      aria-label={`${authorName || "작성자"}님에게 메시지 보내기`}
      className={[
        "inline-flex shrink-0 items-center justify-center",
        "whitespace-nowrap transition",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-blue-400 focus-visible:ring-offset-2",
        compact
          ? "gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-600"
          : "gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600",
      ].join(" ")}
    >
      <MessageSquare
        size={compact ? 14 : 18}
        className="shrink-0"
      />
      메시지 보내기
    </button>
  );
}