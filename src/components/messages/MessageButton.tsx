"use client";

import { MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMessages } from "@/contexts/MessageContext";

export default function MessageButton({
  onOpen,
}: {
  onOpen?: () => void;
}) {
  const {
    enabled,
    openInbox,
    unreadCount,
  } = useMessages();

  const path = usePathname();

  if (!enabled) {
    return null;
  }

  const isActive = path === "/messages";

  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        openInbox();
      }}
      title="메시지"
      aria-label={`메시지${
        unreadCount
          ? `, 읽지 않은 메시지 ${unreadCount}개`
          : ""
      }`}
      aria-current={
        isActive ? "page" : undefined
      }
      className={`
        relative grid h-8 w-8 shrink-0 place-items-center
        rounded-lg transition
        ${
          isActive
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
        }
      `}
    >
      <MessageSquare className="h-[18px] w-[18px]" />

      {unreadCount > 0 ? (
        <span
          className="
            absolute -right-1 -top-1
            flex min-h-[16px] min-w-[16px]
            items-center justify-center
            rounded-full bg-blue-600
            px-1 text-[9px] font-bold
            leading-none text-white
            ring-2 ring-white
          "
        >
          {unreadCount > 99
            ? "99+"
            : unreadCount}
        </span>
      ) : null}
    </button>
  );
}