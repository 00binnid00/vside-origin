// src/lib/communityApi.ts
import { authFetch } from "@/lib/ide/api"; // 💡 만능 통신 함수 임포트!

// API_BASE_URL은 api.js와 동일한 규칙으로 환경변수 또는 localhost로 설정
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const COMMUNITY_API_BASE = `${BASE_URL}/api/posts`;

/**
 * 1. 게시글 목록 조회
 */
export const fetchPosts = async (category?: string, keyword?: string, page = 0, size = 10) => {
  const params = new URLSearchParams();
  if (category && category !== "전체") params.append("category", category);
  if (keyword) params.append("keyword", keyword);
  params.append("page", String(page));
  params.append("size", String(size));

  // GET 요청은 url만 넘기면 authFetch가 알아서 헤더를 세팅합니다.
  const response = await authFetch(`${COMMUNITY_API_BASE}?${params.toString()}`);
  return await response.json();
};

/**
 * 2. 게시글 상세 조회
 */
export const fetchPostDetail = async (postId: number) => {
  const response = await authFetch(`${COMMUNITY_API_BASE}/${postId}`);
  return await response.json();
};

/**
 * 3. 게시글 생성
 */
export const createPost = async (postData: any) => {
  const response = await authFetch(COMMUNITY_API_BASE, {
    method: "POST",
    body: JSON.stringify(postData),
  });
  return await response.json(); // 생성된 postId 반환
};

/**
 * 4. 게시글 수정
 */
export const updatePost = async (postId: number, updateData: any) => {
  await authFetch(`${COMMUNITY_API_BASE}/${postId}`, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });
  // 수정 API는 리턴값이 없으므로(ResponseEntity<Void>) 그냥 종료
};

/**
 * 5. 게시글 삭제
 */
export const deletePost = async (postId: number) => {
  await authFetch(`${COMMUNITY_API_BASE}/${postId}`, {
    method: "DELETE",
  });
};

/**
 * 6. 좋아요 토글
 */
export const toggleLike = async (postId: number) => {
  const response = await authFetch(`${COMMUNITY_API_BASE}/${postId}/like`, {
    method: "POST",
  });
  return await response.json();
};

/**
 * 7. 스크랩 토글
 */
export const toggleScrap = async (postId: number) => {
  const response = await authFetch(`${COMMUNITY_API_BASE}/${postId}/scrap`, {
    method: "POST",
  });
  return await response.json();
};

/**
 * 8. 댓글 목록 조회
 */
export const fetchComments = async (postId: number, page = 0) => {
  const response = await authFetch(`${COMMUNITY_API_BASE}/${postId}/comments?page=${page}`);
  return await response.json();
};

/**
 * 9. 댓글 작성
 */
export const createComment = async (postId: number, content: string) => {
  const response = await authFetch(`${COMMUNITY_API_BASE}/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return await response.json();
};

/**
 * 10. 파일 업로드 (multipart/form-data)
 */
export const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  // 💡 authFetch는 body가 FormData일 경우 Content-Type을 알아서 빼주도록(브라우저가 자동 설정하도록) 
  // 아주 스마트하게 짜여 있습니다! 그래서 그냥 던지기만 하면 됩니다.
  const response = await authFetch(`${BASE_URL}/api/files/upload`, {
    method: "POST",
    body: formData,
  });
  
  return await response.text(); // 서버가 String(URL)을 리턴하므로 text()로 받습니다.
};