import { FilePenLine, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import type { ScheduleOption } from "../devlog.types";
import { scheduleStatusLabel, statusStyle } from "../devlog.utils";
import { DevlogEmptyBox } from "./DevlogEmptyBox";

export function DevlogSupportPanel({
  isPinned,
  noDevlogSchedules,
  onCreateWithSchedule,
  onMouseEnter,
  onMouseLeave,
  onClose,
  onPin,
}: {
  isPinned: boolean;
  noDevlogSchedules: ScheduleOption[];
  onCreateWithSchedule: (scheduleId: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose: () => void;
  onPin: () => void;
}) {
  return (
    <aside
      className="fixed left-14 top-[60px] z-40 h-[calc(100vh-60px)] w-[300px] border-r border-slate-200 bg-white "
      onMouseEnter={onMouseEnter}
      onMouseLeave={isPinned ? undefined : onMouseLeave}
    >
      <div className="flex h-full flex-col overflow-y-auto p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">
              일지 미작성 일정
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              아직 개발일지가 연결되지 않은 일정입니다.
            </p>
          </div>

          <button
            type="button"
            onClick={isPinned ? onClose : onPin}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            title={isPinned ? "보조 패널 접기" : "보조 패널 고정"}
          >
            {isPinned ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={17} />
            )}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500">미작성 일정</p>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-600">
              {noDevlogSchedules.length}개
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {noDevlogSchedules.length === 0 ? (
            <DevlogEmptyBox text="모든 일정에 개발일지가 작성되었습니다." />
          ) : (
            noDevlogSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-2xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                      {schedule.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {schedule.projectName}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${
                      statusStyle[schedule.status]
                    }`}
                  >
                    {scheduleStatusLabel[schedule.status]}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onCreateWithSchedule(schedule.id)}
                  className="mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-xl bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  <FilePenLine size={14} />이 일정으로 일지 작성
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
