import { apiJson } from "@/lib/api/apiClient";

export type MyCommunityPostResponse = {
  id: number;
  title: string;
  category: string;
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

export type MyCommunityCommentResponse = {
  id: number;
  content: string;
  postId: number;
  postTitle: string;
  createdAt: string;
};

export type MyCommunityActivityResponse = {
  posts: MyCommunityPostResponse[];
  comments: MyCommunityCommentResponse[];
  likes: MyCommunityPostResponse[];
  scraps: MyCommunityPostResponse[];
};

const EMPTY_COMMUNITY_ACTIVITY: MyCommunityActivityResponse = {
  posts: [],
  comments: [],
  likes: [],
  scraps: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizePost(value: unknown): MyCommunityPostResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = toNumber(value.id);

  if (id <= 0) {
    return null;
  }

  return {
    id,
    title: String(value.title ?? "제목 없는 게시글"),
    category: String(value.category ?? "GENERAL"),
    createdAt: String(value.createdAt ?? ""),
    viewCount: toNumber(value.viewCount),
    likeCount: toNumber(value.likeCount),
    commentCount: toNumber(value.commentCount),
  };
}

function normalizeComment(value: unknown): MyCommunityCommentResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = toNumber(value.id);
  const postId = toNumber(value.postId);

  if (id <= 0 || postId <= 0) {
    return null;
  }

  return {
    id,
    content: String(value.content ?? ""),
    postId,
    postTitle: String(value.postTitle ?? "삭제된 게시글"),
    createdAt: String(value.createdAt ?? ""),
  };
}

function normalizePostArray(value: unknown): MyCommunityPostResponse[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizePost)
    .filter((item): item is MyCommunityPostResponse => item !== null);
}

function normalizeCommentArray(value: unknown): MyCommunityCommentResponse[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeComment)
    .filter((item): item is MyCommunityCommentResponse => item !== null);
}

export async function fetchMyCommunityActivityApi(): Promise<MyCommunityActivityResponse> {
  const data = await apiJson("/api/users/me/community", {
    cache: "no-store",
  });

  if (!isRecord(data)) {
    return EMPTY_COMMUNITY_ACTIVITY;
  }

  return {
    posts: normalizePostArray(data.posts),
    comments: normalizeCommentArray(data.comments),
    likes: normalizePostArray(data.likes),
    scraps: normalizePostArray(data.scraps),
  };
}
