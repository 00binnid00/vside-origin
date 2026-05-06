"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, X } from "lucide-react";
import { CommunityPost } from "./CommunityTypes";

type Props = {
  post: CommunityPost;
};

export default function CommunityEditForm({ post }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(post.tags ?? []);

  const addTag = () => {
    const value = tagInput.trim();

    if (!value) return;
    if (tags.includes(value)) return;

    setTags((prev) => [...prev, value]);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };

  const handleSubmit = () => {
    const editedPost = {
      ...post,
      title,
      content,
      tags,
      updatedAt: new Date().toISOString(),
    };

    console.log("수정된 게시글:", editedPost);
    alert("현재는 mock 단계라 콘솔에만 출력됩니다.");

    router.push(`/community/${post.id}`);
  };

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-blue-600"
      >
        <ArrowLeft size={14} />
        돌아가기
      </button>

      <div className="rounded-3xl border border-blue-100 bg-white p-7 shadow-[0_18px_45px_rgba(37,99,235,0.08)]">
        <div className="mb-7">
          <span className="mb-3 inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            게시글 수정
          </span>

          <h1 className="text-3xl font-bold text-slate-950">
            게시글 수정
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            작성한 게시글 내용을 수정할 수 있습니다.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              제목
            </label>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              내용
            </label>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요"
              className="min-h-[320px] w-full resize-none rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              태그
            </label>

            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="태그를 입력하세요"
                className="flex-1 rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={addTag}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                추가
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-400 hover:text-red-500"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
            >
              취소
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700"
            >
              <Save size={16} />
              수정 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}