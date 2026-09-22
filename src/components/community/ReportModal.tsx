"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import {
  reportPost,
  reportComment,
  type ReportReason,
} from "@/lib/communityApi";

type ReportModalProps = {
  open: boolean;
  postId: number;
  commentId?: number;
  onClose: () => void;
  onSuccess?: () => void;
};

const REPORT_REASONS: {
  value: ReportReason;
  label: string;
}[] = [
  { value: "ABUSE", label: "욕설 및 비방" },
  { value: "SPAM", label: "광고 및 도배" },
  { value: "OBSCENE", label: "음란하거나 부적절한 내용" },
  { value: "PERSONAL_INFO", label: "개인정보 노출" },
  { value: "ETC", label: "기타" },
];

export default function ReportModal(props: ReportModalProps) {
  if (!props.open) {
    return null;
  }

  return (
    <ReportModalContent
      key={`${props.postId}-${props.commentId ?? "post"}`}
      {...props}
    />
  );
}

function ReportModalContent({
  postId,
  commentId,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitLock = useRef(false);
  const mounted = useRef(false);

  const [reason, setReason] = useState<ReportReason | "">("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isComment = commentId !== undefined;
  const targetName = isComment ? "댓글" : "게시글";

  useEffect(() => {
    mounted.current = true;

    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      mounted.current = false;
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleClose = () => {
    if (submitLock.current) return;

    onClose();
  };

  const handleSubmit = async () => {
    if (submitLock.current) return;

    if (!reason) {
      setError("신고 사유를 선택해주세요.");
      return;
    }

    submitLock.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const request = {
        reason,
        content: content.trim(),
      };

      if (commentId !== undefined) {
        await reportComment(postId, commentId, request);
      } else {
        await reportPost(postId, request);
      }
    } catch (error) {
      if (mounted.current) {
        setError(
          error instanceof Error && error.message
            ? error.message
            : "신고 접수에 실패했습니다. 다시 시도해주세요.",
        );
      }

      return;
    } finally {
      submitLock.current = false;

      if (mounted.current) {
        setIsSubmitting(false);
      }
    }

    if (!mounted.current) return;

    alert("신고가 접수되었습니다.");
    onSuccess?.();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="report-modal-title"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      onClick={(event) => {
        // 팝업 바깥 배경을 클릭한 경우에만 닫습니다.
        if (event.target !== event.currentTarget) return;

        const rect = event.currentTarget.getBoundingClientRect();

        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          handleClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        margin: "auto",
        width: "calc(100% - 32px)",
        maxWidth: "448px",
        maxHeight: "calc(100dvh - 32px)",
      }}
      className="overflow-y-auto rounded-3xl border-0 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-black/40"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2
          id="report-modal-title"
          className="text-xl font-bold text-slate-900"
        >
          {targetName} 신고
        </h2>

        <button
          type="button"
          aria-label="신고 창 닫기"
          onClick={handleClose}
          disabled={isSubmitting}
          className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <fieldset
          disabled={isSubmitting}
          className="space-y-3"
        >
          <legend className="sr-only">신고 사유</legend>

          {REPORT_REASONS.map((item) => (
            <label
              key={item.value}
              className={[
                "flex items-center gap-3 rounded-xl border p-3 transition",
                reason === item.value
                  ? "border-red-300 bg-red-50"
                  : "border-slate-200 hover:border-red-200 hover:bg-red-50",
                isSubmitting
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer",
              ].join(" ")}
            >
              <input
                type="radio"
                name="reportReason"
                value={item.value}
                checked={reason === item.value}
                onChange={() => {
                  setReason(item.value);
                  setError("");
                }}
                className="h-4 w-4 shrink-0 accent-red-500"
              />

              <span className="text-sm text-slate-700">
                {item.label}
              </span>
            </label>
          ))}
        </fieldset>

        <textarea
          aria-label="상세 신고 사유 (선택)"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="상세 사유를 입력해주세요. (선택)"
          maxLength={500}
          disabled={isSubmitting}
          className="mt-5 block min-h-[120px] w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-red-300 focus:ring-2 focus:ring-red-100 disabled:bg-slate-50"
        />

        <div className="mt-2 text-right text-xs text-slate-400">
          {content.length}/500
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isSubmitting ? "신고 중..." : "신고하기"}
          </button>
        </div>
      </form>
    </dialog>
  );
}