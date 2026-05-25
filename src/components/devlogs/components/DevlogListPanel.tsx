import type { DevlogItem } from "../devlog.types";
import { scheduleStatusLabel, statusStyle } from "../devlog.utils";
import { DevlogEmptyBox } from "./DevlogEmptyBox";

export function DevlogListPanel({
  filteredDevlogs,
  selectedDevlog,
  onSelectDevlog,
}: {
  filteredDevlogs: DevlogItem[];
  selectedDevlog: DevlogItem | null;
  onSelectDevlog: (id: string) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3">
        {filteredDevlogs.length === 0 ? (
          <DevlogEmptyBox text="조건에 맞는 개발일지가 없습니다." />
        ) : (
          filteredDevlogs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectDevlog(item.id)}
              className={`rounded-2xl border p-5 text-left transition hover:border-blue-300 ${
                selectedDevlog?.id === item.id
                  ? "border-blue-300 bg-blue-50/40"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-bold">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.projectName} · {item.date}
                  </p>
                </div>

                {item.status && (
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${statusStyle[item.status]}`}
                  >
                    {scheduleStatusLabel[item.status]}
                  </span>
                )}
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                {item.content}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {item.type === "linked" ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    연결 일정: {item.scheduleTitle}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    일반 개발일지
                  </span>
                )}

                {/* {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"
                  >
                    #{tag}
                  </span>
                ))} */}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
