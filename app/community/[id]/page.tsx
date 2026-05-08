"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchPostDetail, deletePost, toggleLike, toggleScrap } from "@/lib/communityApi"; // 💡 통신 함수 임포트
import CommentSection from "@/components/community/CommentSection";
import {
  Bookmark,
  Heart,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/components/community/CommunityUtil";

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentUser = getCurrentUser(); // 로그인 유저 정보

  // 1️⃣ 백엔드에서 상세 데이터 불러오기
  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    fetchPostDetail(Number(id))
      .then((data) => {
        setPost(data);
      })
      .catch((error) => {
        console.error("게시글 상세 조회 실패:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  // 2️⃣ 게시글 삭제 로직
  const handleDelete = async () => {
    if (!window.confirm("정말 이 게시글을 삭제하시겠습니까?")) return;
    
    try {
      await deletePost(Number(id));
      alert("게시글이 깔끔하게 삭제되었습니다! 🗑️");
      router.push("/community");
    } catch (error) {
      alert("삭제 권한이 없거나 오류가 발생했습니다.");
    }
  };

  // 💡 3️⃣ 좋아요 토글 로직
  const handleLike = async () => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    try {
      const result = await toggleLike(Number(id));
      // 백엔드에서 받은 새로운 상태(active)와 카운트로 화면 즉시 업데이트!
      setPost((prev: any) => ({ ...prev, liked: result.active, likeCount: result.count }));
    } catch (error) {
      alert("좋아요 처리에 실패했습니다.");
    }
  };

  // 💡 4️⃣ 스크랩 토글 로직
  const handleScrap = async () => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    try {
      const result = await toggleScrap(Number(id));
      // 백엔드에서 받은 새로운 상태로 업데이트
      setPost((prev: any) => ({ ...prev, scrapped: result.active, scrapCount: result.count }));
    } catch (error) {
      alert("스크랩 처리에 실패했습니다.");
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </main>
    );
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-blue-100 bg-white p-10 text-center text-slate-500">
          게시글을 찾을 수 없습니다.
        </div>
      </main>
    );
  }

  // 작성자 판별 (현재는 닉네임, 이름, 이메일 중 하나로 대조)
  const isMyPost = post.authorName === (currentUser?.nickname || currentUser?.name || currentUser?.email || "사용자");

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/community"
          className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={14} />
          목록으로
        </Link>

        <div className="rounded-3xl border border-blue-100 bg-white p-7 shadow-[0_18px_45px_rgba(37,99,235,0.08)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">
                  {post.category}
                </span>
                <span className="text-sm text-slate-500">
                  {post.authorName} · {post.createdAt?.split("T").join(" ").substring(0, 16)}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-950">{post.title}</h1>
            </div>

            {isMyPost && (
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/community/${post.id}/edit`}
                  className="inline-flex items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                >
                  <Pencil size={15} /> 수정
                </Link>
                <button 
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-100"
                >
                  <Trash2 size={15} /> 삭제
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {post.content}
          </p>

          {post.attachments && post.attachments.length > 0 && (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">첨부 자료</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {post.attachments.map((file: any) => (
                  <div key={file.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
                    {file.type === "image" ? (
                      <img src={file.url} alt={file.name} className="h-48 w-full object-cover" />
                    ) : (
                      <div className="p-4 text-sm text-slate-600">📁 {file.name}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags?.map((tag: string) => (
              <span key={tag} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                #{tag}
              </span>
            ))}
          </div>

          <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
            <div className="text-sm text-slate-500">
              조회 {post.views} · 좋아요 {post.likeCount} · 스크랩 {post.scrapCount}
            </div>

            <div className="flex gap-2">
              {/* 💡 onClick 이벤트 바인딩! */}
              <button 
                onClick={handleLike}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  post.liked ? "border-red-200 bg-red-50 text-red-600" : "border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <Heart size={17} className={post.liked ? "fill-current" : ""} /> 좋아요
              </button>

              <button 
                onClick={handleScrap}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  post.scrapped ? "border-amber-200 bg-amber-50 text-amber-600" : "border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                }`}
              >
                <Bookmark size={17} className={post.scrapped ? "fill-current" : ""} /> 스크랩
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <CommentSection />
        </div>
      </div>
    </main>
  );
}