"use client";

import { useEffect } from "react";
import { Loader2, NotebookPen, X } from "lucide-react";

import type { ScheduleOption } from "../devlog.types";
import { scheduleStatusLabel } from "../devlog.utils";
import { StatusOptionButton } from "./StatusOptionButton";

export function CreateDevlogModal({
  selectedProjectName,
  visibleSchedules,
  formTitle,
  formContent,
  formDate,
  formScheduleId,
  formStatusChange,
  saving = false,
  onChangeTitle,
  onChangeContent,
  onChangeDate,
  onChangeScheduleId,
  onChangeStatus,
  onClose,
  onSubmit,
}: {
  selectedProjectName: string;
  visibleSchedules: ScheduleOption[];
  formTitle: string;
  formContent: string;
  formDate: string;
  formScheduleId: string;
  formStatusChange: "none" | "progress" | "done";
  saving?: boolean;
  onChangeTitle: (value: string) => void;
  onChangeContent: (value: string) => void;
  onChangeDate: (value: string) => void;
  onChangeScheduleId: (value: string) => void;
  onChangeStatus: (value: "none" | "progress" | "done") => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 p-4">
      <div className="flex max-h-[calc(100vh-32px)] w-full max-w-[900px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              New Devlog
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              새 개발일지 작성
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="개발일지 작성 모달 닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  프로젝트
                </label>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
                  {selectedProjectName}
                </div>
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold text-slate-700">
                  작업한 날짜
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(event) => onChangeDate(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold text-slate-700">
                  연결할 일정
                </label>
                <select
                  value={formScheduleId}
                  onChange={(event) => onChangeScheduleId(event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400"
                >
                  <option value="">연결 없이 일반 일지 작성</option>
                  {visibleSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.title} · {scheduleStatusLabel[schedule.status]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold text-slate-700">
                  진행 상태 변경
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <StatusOptionButton
                    active={formStatusChange === "none"}
                    label="변경 없음"
                    onClick={() => onChangeStatus("none")}
                  />
                  <StatusOptionButton
                    active={formStatusChange === "progress"}
                    label="진행 중"
                    onClick={() => onChangeStatus("progress")}
                  />
                  <StatusOptionButton
                    active={formStatusChange === "done"}
                    label="완료"
                    onClick={() => onChangeStatus("done")}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-5">
              <div>
                <label className="text-sm font-bold text-slate-700">제목</label>
                <input
                  value={formTitle}
                  onChange={(event) => onChangeTitle(event.target.value)}
                  placeholder="예: 로그인 API 오류 수정"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold text-slate-700">내용</label>
                <textarea
                  value={formContent}
                  onChange={(event) => onChangeContent(event.target.value)}
                  placeholder="오늘 수행한 작업, 오류 원인, 해결 방법 등을 작성하세요."
                  className="mt-2 h-52 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-blue-400"
                />
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            취소
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <NotebookPen size={17} />
            )}
            개발일지 저장
          </button>
        </div>
      </div>
    </div>
  );
}
