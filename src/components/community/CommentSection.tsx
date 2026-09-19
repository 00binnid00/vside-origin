"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Flag, Heart, Loader2, Send, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getViewerId, normalizeUserId } from "@/lib/messages/identity";
import ReportModal from "@/components/community/ReportModal";
import SendMessageButton from "@/components/messages/SendMessageButton";
import {
  fetchComments,
  createComment,
  toggleCommentLike,
  reportComment,
  type CommentResponse,
  type ReportReason,
} from "@/lib/communityApi";
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "요청 처리에 실패했습니다.";
const date = (s: string) => s?.replace("T", " ").slice(0, 16);
export default function CommentSection({
  postAuthorId,
  postTitle = "게시글",
}: {
  postAuthorId?: unknown;
  postTitle?: string;
}) {
  const params = useParams(),
    raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const postId = Number(raw);
  // 경로가 바뀌면 진행 중이던 댓글 요청/입력 상태와 분리합니다.
  return (
    <Comments
      key={raw}
      postId={postId}
      postAuthorId={postAuthorId}
      postTitle={postTitle}
    />
  );
}
function Comments({
  postId,
  postAuthorId,
  postTitle,
}: {
  postId: number;
  postAuthorId: unknown;
  postTitle: string;
}) {
  const { user } = useAuth(),
    viewer = getViewerId(user),
    author = normalizeUserId(postAuthorId);
  const [comments, setComments] = useState<CommentResponse[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(-1),
    [last, setLast] = useState(true);
  const [fetching, setFetching] = useState(true),
    [sending, setSending] = useState(false),
    [content, setContent] = useState(""),
    [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set()),
    [target, setTarget] = useState<CommentResponse | null>(null);
  const alive = useRef(true),
    loading = useRef(false),
    submitLock = useRef(false),
    likes = useRef(new Set<number>());
  const load = async (next: number) => {
    if (loading.current) return;
    if (!Number.isSafeInteger(postId) || postId <= 0) {
      setError("게시글 번호가 올바르지 않습니다.");
      setFetching(false);
      return;
    }
    loading.current = true;
    setFetching(true);
    setError("");
    try {
      const data = await fetchComments(postId, next);
      if (!alive.current) return;
      setComments((prev) => {
        const map = new Map(
          (next === 0 ? data.content : [...prev, ...data.content]).map((c) => [
            c.id,
            c,
          ]),
        );
        return [...map.values()];
      });
      setTotal(data.totalElements);
      setPage(data.number);
      setLast(data.last);
    } catch (e) {
      if (alive.current) setError(errorText(e));
    } finally {
      loading.current = false;
      if (alive.current) setFetching(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    void load(0);
    return () => {
      alive.current = false;
    };
  }, [postId]);
  const send = async () => {
    const text = content.trim();
    if (!text || text.length > 2000 || submitLock.current || loading.current)
      return;
    submitLock.current = true;
    setSending(true);
    setError("");
    try {
      const c = await createComment(postId, text);
      if (!alive.current) return;
      // 오래된 순으로 페이지를 보는 중이면 최신 댓글을 중간에 끼워 넣지 않습니다.
      if (last)
        setComments((prev) =>
          prev.some((item) => item.id === c.id) ? prev : [...prev, c],
        );
      setTotal((v) => v + 1);
      setContent("");
      if (!last) await load(0);
    } catch (e) {
      if (alive.current) setError(errorText(e));
    } finally {
      submitLock.current = false;
      if (alive.current) setSending(false);
    }
  };
  const like = async (id: number) => {
    if (likes.current.has(id)) return;
    likes.current.add(id);
    setBusyIds(new Set(likes.current));
    setError("");
    try {
      const result = await toggleCommentLike(postId, id);
      if (alive.current)
        setComments((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, liked: result.active, likeCount: result.count }
              : c,
          ),
        );
    } catch (e) {
      if (alive.current) setError(errorText(e));
    } finally {
      likes.current.delete(id);
      if (alive.current) setBusyIds(new Set(likes.current));
    }
  };
  return (
    <section className="mt-8 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-slate-950">
        댓글 <span className="text-blue-600">{total}</span>
      </h2>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600"
        >
          {error}{" "}
          <button
            type="button"
            onClick={() => void load(Math.max(0, page))}
            className="underline"
          >
            다시 조회
          </button>
        </p>
      )}
      <div className="my-4 divide-y divide-slate-100">
        {!comments.length && !fetching && (
          <p className="py-10 text-center text-sm text-slate-400">
            아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
          </p>
        )}
        {comments.map((c) => {
          const own = normalizeUserId(c.authorId) === viewer;
          const isAuthor =
            author !== null && normalizeUserId(c.authorId) === author;
          return (
            <article key={c.id} className="py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {c.authorName}
                  </span>
                  {isAuthor ? (
                    <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                      작성자
                    </span>
                  ) : own ? (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      나
                    </span>
                  ) : null}
                  <time className="text-xs text-slate-400">
                    {date(c.createdAt)}
                  </time>
                </div>
                {!own && viewer && (
                  <button
                    type="button"
                    disabled={c.reported}
                    onClick={() => setTarget(c)}
                    className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                  >
                    <Flag size={12} />
                    {c.reported ? "신고 완료" : "신고하기"}
                  </button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                {c.content}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={c.liked}
                  disabled={!viewer || busyIds.has(c.id)}
                  onClick={() => void like(c.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition hover:bg-blue-50 disabled:opacity-50 ${c.liked ? "text-blue-600" : "text-slate-500"}`}
                >
                  <Heart size={14} fill={c.liked ? "currentColor" : "none"} />
                  좋아요 {c.likeCount || 0}
                </button>
                <SendMessageButton
                  authorId={c.authorId}
                  authorName={c.authorName}
                  source={{ postId: String(postId), title: postTitle }}
                  compact
                />
              </div>
            </article>
          );
        })}
      </div>
      {fetching && (
        <Loader2
          aria-label="댓글 불러오는 중"
          className="mx-auto my-5 animate-spin text-blue-500"
        />
      )}
      {!last && (
        <button
          type="button"
          disabled={fetching || sending}
          onClick={() => void load(page + 1)}
          className="mb-5 w-full rounded-xl border border-slate-100 py-3 text-sm text-slate-500 disabled:opacity-50"
        >
          댓글 더 보기
        </button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="mt-4 flex items-end gap-2"
      >
        <textarea
          aria-label="댓글 내용"
          value={content}
          maxLength={2000}
          rows={2}
          disabled={sending || !viewer}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글을 입력하세요"
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
          className="min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
        />
        <button
          disabled={!viewer || sending || fetching || !content.trim()}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-200"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          등록
        </button>
      </form>
   {target && (
  <ReportModal
    open={true}
    postId={postId}
    commentId={target.id}
    onClose={() => setTarget(null)}
    onSuccess={() => {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === target.id
            ? { ...comment, reported: true }
            : comment,
        ),
      );
    }}
  />
)}
    </section>
  );
}
