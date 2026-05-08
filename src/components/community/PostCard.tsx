"use client";

import Link from "next/link";
import { FileText, ImageIcon } from "lucide-react";
import { CommunityPost } from "./CommunityTypes";

type Props = {
  post: any;
};

export default function PostCard({ post }: Props) {
  // 💡 [디버깅용] 개발자 도구(F12)의 콘솔창에서 백엔드가 주는 실제 데이터를 확인해 보세요!
  // console.log("백엔드에서 온 데이터:", post); 

  const preview = post.attachments?.[0];
  const imageUrl = post.previewImageUrl || preview?.url;
  const isImage = post.previewImageUrl || preview?.type === "image";

  // 🚀 [핵심] 만능 날짜 포맷팅 함수 (배열이든 문자열이든 무조건 변환)
  let formattedDate = "";
  if (post.createdAt) {
    if (typeof post.createdAt === "string") {
      // 1. 문자열로 올 때 (예: "2026-05-08T14:30:00")
      formattedDate = post.createdAt.split("T")[0];
    } else if (Array.isArray(post.createdAt)) {
      // 2. 배열로 올 때 (예: [2026, 5, 8, 14, 30])
      const year = post.createdAt[0];
      const month = String(post.createdAt[1]).padStart(2, "0"); // 5 -> 05
      const day = String(post.createdAt[2]).padStart(2, "0");   // 8 -> 08
      formattedDate = `${year}-${month}-${day}`;
    }
  }

  return (
    <Link
      href={`/community/${post.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-[0_12px_35px_rgba(37,99,235,0.10)]"
    >
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-600">
              {post.category}
            </span>

            {post.tags?.map((tag: string) => (
              <span key={tag} className="text-sm text-slate-500">
                #{tag}
              </span>
            ))}
          </div>

          <h2 className="text-xl font-bold text-slate-950 group-hover:text-blue-700">
            {post.title}
          </h2>

          <p className="mt-3 line-clamp-2 text-sm text-slate-500">
            {post.contentSnippet || post.content}
          </p>
        </div>

        {imageUrl || preview ? (
          <div className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 md:block">
            {isImage ? (
              <img
                src={imageUrl}
                alt={preview?.name || post.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-blue-600">
                <FileText size={28} />
                <span className="max-w-[110px] truncate text-xs">
                  {preview?.name}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden h-24 w-32 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-300 md:flex">
            <ImageIcon size={30} />
          </div>
        )}
      </div>

      <div className="mt-7 flex items-center justify-between text-sm text-slate-500">
        <span>
          {post.authorName} · {formattedDate}
        </span>

        <span className="text-right">
          조회 {post.views || 0} · 좋아요 {post.likeCount ?? post.likes ?? 0}
        </span>
      </div>
    </Link>
  );
}