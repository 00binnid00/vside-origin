import { apiFetch, apiJson } from "@/lib/api/apiClient";
const BASE = "/api/posts";
export type ReportReason =
  | "ABUSE"
  | "SPAM"
  | "OBSCENE"
  | "PERSONAL_INFO"
  | "ETC";
export type ReportPostRequest = { reason: ReportReason; content: string };
export type CommentResponse = {
  id: number;
  postId: number;
  content: string;
  authorId: number;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  likeCount: number;
  liked: boolean;
  reported: boolean;
};
export type CommentPage = {
  content: CommentResponse[];
  last: boolean;
  number: number;
  totalElements: number;
};
export const fetchPosts = (
  category?: string,
  keyword?: string,
  page = 0,
  size = 10,
) => {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  if (category && category !== "전체") params.set("category", category);
  if (keyword) params.set("keyword", keyword);
  return apiJson(`${BASE}?${params}`, { cache: "no-store" });
};
export const fetchPostDetail = (id: number) =>
  apiJson(`${BASE}/${id}`, { cache: "no-store" });
export const createPost = (data: any) =>
  apiJson(BASE, { method: "POST", body: JSON.stringify(data) });
export const updatePost = async (id: number, data: any): Promise<void> => {
  await apiJson(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) });
};
export const deletePost = async (id: number): Promise<void> => {
  await apiJson(`${BASE}/${id}`, { method: "DELETE" });
};
export const toggleLike = (
  id: number,
): Promise<{ active: boolean; count: number }> =>
  apiJson(`${BASE}/${id}/like`, { method: "POST" });
export const toggleScrap = (
  id: number,
): Promise<{ active: boolean; count: number }> =>
  apiJson(`${BASE}/${id}/scrap`, { method: "POST" });
export const fetchComments = async (
  id: number,
  page = 0,
): Promise<CommentPage> => {
  const result = await apiJson(`${BASE}/${id}/comments?page=${page}&size=20`, {
    cache: "no-store",
  });
  const comments = result.content ?? [];
  if (!comments.length) return result;
  const states: Array<{
    id: number;
    likeCount: number;
    liked: boolean;
    reported: boolean;
  }> = await apiJson(
    `${BASE}/${id}/comments/interactions?ids=${comments.map((c: CommentResponse) => c.id).join(",")}`,
    { cache: "no-store" },
  );
  const byId = new Map(states.map((s) => [s.id, s]));
  return {
    ...result,
    content: comments.map((c: CommentResponse) => ({
      ...c,
      ...byId.get(c.id),
    })),
  };
};
export const createComment = async (
  id: number,
  content: string,
): Promise<CommentResponse> => {
  const c = await apiJson(`${BASE}/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return { ...c, likeCount: 0, liked: false, reported: false };
};
export const toggleCommentLike = (
  postId: number,
  commentId: number,
): Promise<{ active: boolean; count: number }> =>
  apiJson(`${BASE}/${postId}/comments/${commentId}/like`, { method: "POST" });
export const reportComment = (
  postId: number,
  commentId: number,
  data: ReportPostRequest,
) =>
  apiJson(`${BASE}/${postId}/comments/${commentId}/reports`, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const reportPost = (id: number, data: ReportPostRequest) =>
  apiJson(`${BASE}/${id}/reports`, {
    method: "POST",
    body: JSON.stringify(data),
  });
export const uploadFile = async (file: File): Promise<string> => {
  const body = new FormData();
  body.append("file", file);
  const response = await apiFetch("/api/files/upload", {
    method: "POST",
    body,
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || "파일 업로드 실패");
  return text;
};