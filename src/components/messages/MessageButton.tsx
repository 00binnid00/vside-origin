"use client";
import { MessageSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMessages } from "@/contexts/MessageContext";
export default function MessageButton({ onOpen }: { onOpen?: () => void }) {
  const { enabled, openInbox, unreadCount } = useMessages();
  const path = usePathname();
  if (!enabled) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        openInbox();
      }}
      title="메시지"
      aria-label={`메시지${unreadCount ? `, 읽지 않은 메시지 ${unreadCount}개` : ""}`}
      aria-current={path === "/messages" ? "page" : undefined}
      className={`relative rounded-xl p-2 transition hover:bg-blue-50 hover:text-blue-600 ${path === "/messages" ? "bg-blue-50 text-blue-600" : "text-gray-700"}`}
    >
      <MessageSquare className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}