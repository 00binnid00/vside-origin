import { apiJson } from "@/lib/api/apiClient";
export type MessageSource = { postId: string; title: string };
export type MessageRecipient = { id: string; name: string };
export type Conversation = {
  id: string;
  recipient: MessageRecipient;
  source: MessageSource | null;
  lastContent: string | null;
  updatedAt: string;
  unreadCount: number;
};
export type DirectMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  mine: boolean;
  readAt: string | null;
  clientId: string;
};
export type Slice<T> = { items: T[]; hasMore: boolean };
const base = "/api/messages";
export const listConversations = (page = 0): Promise<Slice<Conversation>> =>
  apiJson(`${base}/conversations?page=${page}`, { cache: "no-store" });
export const getConversation = (id: string): Promise<Conversation> =>
  apiJson(`${base}/conversations/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
export const startConversation = (
  recipientId: string,
  postId?: string,
): Promise<Conversation> =>
  apiJson(`${base}/conversations`, {
    method: "POST",
    body: JSON.stringify({ recipientId, postId: postId ?? null }),
  });
export const getUnread = (): Promise<{ count: number }> =>
  apiJson(`${base}/unread`, { cache: "no-store" });
export const getMessages = (
  id: string,
  before?: string,
): Promise<Slice<DirectMessage>> =>
  apiJson(
    `${base}/conversations/${encodeURIComponent(id)}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`,
    { cache: "no-store" },
  );
export const sendMessage = (
  id: string,
  content: string,
  clientId: string,
): Promise<DirectMessage> =>
  apiJson(`${base}/conversations/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, clientId }),
  });
export const markRead = (id: string, throughId: string): Promise<void> =>
  apiJson(`${base}/conversations/${encodeURIComponent(id)}/read`, {
    method: "POST",
    body: JSON.stringify({ throughId }),
  });
export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "요청 처리에 실패했습니다.";
export function newClientId() {
  // 사설 IP의 HTTP 접속에서도 동작합니다(randomUUID는 보안 컨텍스트에서만 지원).
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}