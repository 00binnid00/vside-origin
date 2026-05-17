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
      className="fixed left-[84px] top-[72px] z-40 h-[calc(100vh-72px)] w-[300px] border-r border-slate-200 bg-[#f5f6fa] pb-6 pr-0 pt-4"
      onMouseEnter={onMouseEnter}
      onMouseLeave={isPinned ? undefined : onMouseLeave}
    >
      <div className="flex h-full overflow-hidden rounded-r-[24px] border border-l-0 border-slate-200 bg-white shadow-sm">
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wide text-blue-600">
                  DEVLOG
                </p>
                <h2 className="mt-1 text-sm font-black text-slate-950">
                  일지 미작성 일정
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  아직 개발일지가 연결되지 않은 일정입니다.
                </p>
              </div>

              <button
                type="button"
                onClick={isPinned ? onClose : onPin}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title={isPinned ? "보조 패널 접기" : "보조 패널 고정"}
              >
                {isPinned ? (
                  <PanelLeftClose size={17} />
                ) : (
                  <PanelLeftOpen size={17} />
                )}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-500">미작성 일정</p>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-700 shadow-sm">
                  {noDevlogSchedules.length}개
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {noDevlogSchedules.length === 0 ? (
              <DevlogEmptyBox text="모든 일정에 개발일지가 작성되었습니다." />
            ) : (
              <div className="flex flex-col gap-2">
                {noDevlogSchedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-black leading-5 text-slate-900">
                          {schedule.title}
                        </p>
                        <p className="mt-1 truncate text-xs font-medium text-slate-500">
                          {schedule.projectName}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">
                          {schedule.startDate} ~ {schedule.endDate}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
