import { Sparkles } from "lucide-react";

import type { DevlogItem } from "../devlog.types";
import { scheduleStatusLabel, statusStyle } from "../devlog.utils";
import { DevlogEmptyBox } from "./DevlogEmptyBox";

export function DevlogDetailPanel({
  selectedDevlog,
}: {
  selectedDevlog: DevlogItem | null;
}) {
  return (
    <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">상세 보기</h2>
        <Sparkles size={20} className="text-blue-500" />
      </div>

      {!selectedDevlog ? (
        <DevlogEmptyBox text="선택한 개발일지가 없습니다." />
      ) : (
        <div className="mt-5">
          <p className="text-sm font-semibold text-blue-600">
            {selectedDevlog.projectName}
          </p>

          <h3 className="mt-1 text-xl font-black leading-8">
            {selectedDevlog.title}
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            작업한 날짜: {selectedDevlog.date}
          </p>

          <div className="mt-5 rounded-2xl bg-white p-4">
            <p className="text-sm font-bold text-slate-700">연결 일정</p>
            <p className="mt-2 text-sm text-slate-500">
              {selectedDevlog.scheduleTitle ?? "연결 없이 작성된 일반 일지"}
            </p>
          </div>

          {selectedDevlog.status && (
            <span
              className={`mt-4 inline-block rounded-full border px-3 py-1 text-xs font-bold ${statusStyle[selectedDevlog.status]}`}
            >
              {scheduleStatusLabel[selectedDevlog.status]}
            </span>
          )}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-700">작성 내용</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {selectedDevlog.content}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {selectedDevlog.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
