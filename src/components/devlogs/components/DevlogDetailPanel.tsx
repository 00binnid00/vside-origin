import { Sparkles, X } from "lucide-react";

import type { DevlogItem } from "../devlog.types";
import { scheduleStatusLabel, statusStyle } from "../devlog.utils";
import { DevlogEmptyBox } from "./DevlogEmptyBox";

export function DevlogDetailPanel({
  selectedDevlog,
  onClose,
}: {
  selectedDevlog: DevlogItem | null;
  onClose: () => void;
}) {
  return (
    <aside className="min-w-0 border-l border-slate-200 bg-white">
      <div className="sticky top-[72px] flex h-[calc(100vh-72px)] flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-blue-600">
              Selected Devlog
            </p>
            <h2 className="truncate text-sm font-black text-slate-900">
              개발일지 상세
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <Sparkles size={16} />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              title="상세 패널 닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!selectedDevlog ? (
            <DevlogEmptyBox text="선택한 개발일지가 없습니다." />
          ) : (
            <div className="space-y-3">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-blue-600">
                  {selectedDevlog.projectName}
                </p>

                <h3 className="mt-2 break-keep text-lg font-black leading-7 text-slate-950">
                  {selectedDevlog.title}
                </h3>

                <p className="mt-2 text-xs font-medium text-slate-500">
                  작업한 날짜: {selectedDevlog.date}
                </p>

                {selectedDevlog.status && (
                  <span
                    className={`mt-4 inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                      statusStyle[selectedDevlog.status]
                    }`}
                  >
                    {scheduleStatusLabel[selectedDevlog.status]}
                  </span>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-xs font-black text-slate-800">연결 일정</h3>

                <p className="mt-3 break-keep text-xs leading-5 text-slate-500">
                  {selectedDevlog.scheduleTitle ?? "연결 없이 작성된 일반 일지"}
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-xs font-black text-slate-800">작성 내용</h3>

                <p className="mt-3 whitespace-pre-wrap break-keep text-xs leading-6 text-slate-600">
                  {selectedDevlog.content}
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-xs font-black text-slate-800">태그</h3>

                {selectedDevlog.tags.length === 0 ? (
                  <p className="mt-3 text-xs text-slate-400">
                    등록된 태그가 없습니다.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedDevlog.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
