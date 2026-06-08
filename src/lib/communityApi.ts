// src/lib/communityApi.ts
import { apiFetch, apiJson } from "@/lib/api/apiClient";

const COMMUNITY_API_BASE = "/api/posts";

async function readResponseText(response: Response) {
  return await response.text().catch(() => "");
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  fallbackMessage = "요청 처리 중 오류가 발생했습니다.",
): Promise<T> {
  const response = await apiFetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await readResponseText(response);

  if (!response.ok) {
    throw new Error(text || fallbackMessage);
  }

  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

async function requestVoid(
  path: string,
  options: RequestInit = {},
  fallbackMessage = "요청 처리 중 오류가 발생했습니다.",
): Promise<void> {
  const response = await apiFetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await readResponseText(response);

  if (!response.ok) {
    throw new Error(text || fallbackMessage);
  }
}

/**
 * 1. 게시글 목록 조회
 */
export const fetchPosts = async (
  category?: string,
  keyword?: string,
  page = 0,
  size = 10,
) => {
  const params = new URLSearchParams();

  if (category && category !== "전체") {
    params.append("category", category);
  }

  if (keyword) {
    params.append("keyword", keyword);
  }

  params.append("page", String(page));
  params.append("size", String(size));

  return await apiJson(`${COMMUNITY_API_BASE}?${params.toString()}`, {
    cache: "no-store",
  });
};

/**
 * 2. 게시글 상세 조회
 */
export const fetchPostDetail = async (postId: number) => {
  return await apiJson(`${COMMUNITY_API_BASE}/${postId}`, {
    cache: "no-store",
  });
};

/**
 * 3. 게시글 생성
 */
export const createPost = async (postData: any) => {
  return await requestJson(
    COMMUNITY_API_BASE,
    {
      method: "POST",
      body: JSON.stringify(postData),
    },
    "게시글 생성 실패",
  );
};

/**
 * 4. 게시글 수정
 */
export const updatePost = async (postId: number, updateData: any) => {
  await requestVoid(
    `${COMMUNITY_API_BASE}/${postId}`,
    {
      method: "PUT",
      body: JSON.stringify(updateData),
    },
    "게시글 수정 실패",
  );
};

/**
 * 5. 게시글 삭제
 */
export const deletePost = async (postId: number) => {
  await requestVoid(
    `${COMMUNITY_API_BASE}/${postId}`,
    {
      method: "DELETE",
    },
    "게시글 삭제 실패",
  );
};

/**
 * 6. 좋아요 토글
 */
export const toggleLike = async (postId: number) => {
  return await requestJson(
    `${COMMUNITY_API_BASE}/${postId}/like`,
    {
      method: "POST",
    },
    "좋아요 처리 실패",
  );
};

/**
 * 7. 스크랩 토글
 */
export const toggleScrap = async (postId: number) => {
  return await requestJson(
    `${COMMUNITY_API_BASE}/${postId}/scrap`,
    {
      method: "POST",
    },
    "스크랩 처리 실패",
  );
};

/**
 * 8. 댓글 목록 조회
 */
export const fetchComments = async (postId: number, page = 0) => {
  return await apiJson(`${COMMUNITY_API_BASE}/${postId}/comments?page=${page}`, {
    cache: "no-store",
  });
};

/**
 * 9. 댓글 작성
 */
export const createComment = async (postId: number, content: string) => {
  return await requestJson(
    `${COMMUNITY_API_BASE}/${postId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
    "댓글 작성 실패",
  );
};

/**
 * 10. 파일 업로드
 */
export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch("/api/files/upload", {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const text = await readResponseText(response);

  if (!response.ok) {
    throw new Error(text || "파일 업로드 실패");
  }

  return text;
};