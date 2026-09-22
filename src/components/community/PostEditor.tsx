"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Paperclip, Tag, X, UploadCloud, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/components/community/CommunityUtil";
import { createPost, updatePost, uploadFile } from "@/lib/communityApi";

interface PostEditorProps {
  mode: "create" | "edit";
  initialData?: any;
  postId?: number;
}

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) {
    return "요청 처리 중 오류가 발생했습니다.";
  }

  try {
    const data = JSON.parse(error.message);

    for (const value of [data?.message, data?.detail, data?.error]) {
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  } catch {
    // JSON이 아닌 오류 메시지는 그대로 표시합니다.
  }

  return error.message;
}

export default function PostEditor({
  mode,
  initialData,
  postId,
}: PostEditorProps) {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<string>(
    initialData?.category || "Question",
  );
  const [title, setTitle] = useState<string>(initialData?.title || "");
  const [content, setContent] = useState<string>(initialData?.content || "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [files, setFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submitLock = useRef(false);

  const addTag = () => {
    const value = tagInput.trim();

    if (!value || tags.includes(value)) return;

    setTags((prev) => [...prev, value]);
    setTagInput("");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    setFiles((prev) => [...prev, ...selectedFiles]);

    // 같은 파일을 제거한 뒤 다시 선택할 수 있도록 초기화
    event.target.value = "";
  };

  const handleSubmit = async () => {
    if (submitLock.current) return;

    const user = getCurrentUser();

    if (!user) {
      return alert("로그인이 필요합니다.");
    }

    if (!title.trim() || !content.trim()) {
      return alert("제목과 내용을 입력해주세요.");
    }

    if (title.trim().length > 200) {
      return alert("제목은 200자 이하로 입력해주세요.");
    }

    if (
      mode === "edit" &&
      (!postId || !Number.isSafeInteger(postId) || postId <= 0)
    ) {
      return alert("수정할 게시글 번호가 올바르지 않습니다.");
    }

    submitLock.current = true;
    setIsSubmitting(true);

    try {
      const attachmentRequests = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          type: file.type.startsWith("image/") ? "image" : "file",
          url: await uploadFile(file),
        })),
      );

      const existingAttachments = initialData?.attachments || [];
      const finalAttachments = [
        ...existingAttachments,
        ...attachmentRequests,
      ];

      const postData = {
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
        attachments:
          finalAttachments.length > 0 ? finalAttachments : undefined,
      };

      if (mode === "create") {
        // 서버는 번호 하나가 아니라 DetailResponse 객체를 반환합니다.
        const createdPost = (await createPost(postData)) as {
          id: number;
        } | null;

        if (
          !createdPost ||
          !Number.isSafeInteger(createdPost.id) ||
          createdPost.id <= 0
        ) {
          alert(
            "서버 응답에서 게시글 번호를 확인하지 못했습니다. 목록에서 등록 여부를 확인해주세요.",
          );
          router.push("/community");
          return;
        }

        alert("성공적으로 등록되었습니다!");
        router.push(`/community/${createdPost.id}`);
      } else {
        await updatePost(postId!, postData);

        alert("성공적으로 수정되었습니다!");
        router.push(`/community/${postId}`);
      }
    } catch (error) {
      console.error("게시글 저장 오류:", error);
      alert(getErrorMessage(error));
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-7 shadow-[0_18px_45px_rgba(37,99,235,0.08)]">
      <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
        {/* 카테고리 */}
        <div>
          <label
            htmlFor="post-category"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            카테고리
          </label>

          <select
            id="post-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 md:w-48"
          >
            <option value="Question">질문</option>
            <option value="Free">자유</option>
            <option value="Info">정보</option>
            <option value="AIHelp">AI 도움</option>
            <option value="TeamRecruit">팀원 모집</option>
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label
            htmlFor="post-title"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            제목
          </label>

          <input
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="제목을 입력하세요"
            className="w-full rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {/* 태그 */}
        <div>
          <label
            htmlFor="post-tag"
            className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
          >
            <Tag size={16} className="text-blue-600" />
            태그
          </label>

          <div className="flex gap-2">
            <input
              id="post-tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="예: React, 오류해결, AI"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />

            <button
              type="button"
              onClick={addTag}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              추가
            </button>
          </div>

          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700"
                >
                  #{tag}

                  <button
                    type="button"
                    aria-label={`${tag} 태그 삭제`}
                    onClick={() =>
                      setTags((prev) => prev.filter((item) => item !== tag))
                    }
                    className="rounded-full hover:bg-blue-200"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 내용 */}
        <div>
          <label
            htmlFor="post-content"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            내용
          </label>

          <textarea
            id="post-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요. 코드나 에러 메시지도 함께 적어보세요."
            className="min-h-[300px] w-full resize-none rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {/* 첨부 파일 */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Paperclip size={16} className="text-blue-600" />
            첨부 파일
          </label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50"
          >
            <UploadCloud size={32} className="mb-2 text-blue-600" />

            <span className="text-sm font-semibold text-slate-700">
              클릭해서 파일 업로드
            </span>

            <span className="mt-1 text-xs text-slate-500">
              이미지, 문서, 코드 파일 등을 첨부할 수 있어요
            </span>
          </button>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm"
                >
                  <span className="truncate text-slate-700">
                    {file.name}
                  </span>

                  <button
                    type="button"
                    aria-label={`${file.name} 첨부 취소`}
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
          >
            취소
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting && (
              <Loader2 size={16} className="animate-spin" />
            )}

            {isSubmitting
              ? mode === "create"
                ? "등록 중..."
                : "수정 중..."
              : mode === "create"
                ? "등록"
                : "수정"}
          </button>
        </div>
      </fieldset>
    </div>
  );
}