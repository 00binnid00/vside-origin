"use client";

// 경로: src/components/design/impact/ImpactDialog.tsx
//
// 영향 범위 전체 보기.
//
// 상세 패널의 요약은 좁아서 이름 몇 개만 보여 준다. 실제로 "무엇을 손봐야 하나"를
// 확인할 때는 목록 전체가 필요하므로 넓은 창을 따로 둔다.
//
// 줄을 누르면 그 항목으로 건너간다. 사슬을 따라 걸을 수 있어야 이 화면이 값을 한다.

import {
  Braces,
  ListChecks,
  MonitorSmartphone,
  Table2,
  type LucideIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { focusDesignTarget } from "../store/designUiStore";
import type { ImpactItem, ImpactResult } from "./buildImpact";

const ICONS: Record<ImpactItem["kind"], LucideIcon> = {
  requirement: ListChecks,
  screen: MonitorSmartphone,
  api: Braces,
  table: Table2,
};

export function ImpactDialog({
  open,
  onOpenChange,
  impact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impact: ImpactResult;
}) {
  const go = (item: ImpactItem) => {
    onOpenChange(false);
    focusDesignTarget(item.kind, item.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-base font-black text-[var(--waivs-text)]">
            {impact.origin?.label ?? "영향 범위"} 을(를) 바꾸면
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--waivs-text-sub)]">
            아래 항목들이 함께 흔들립니다. 줄을 누르면 그 항목으로 이동합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[420px] space-y-4 overflow-y-auto">
          <Group title="손봐야 할 API" items={impact.apis} onPick={go} />
          <Group title="손봐야 할 화면" items={impact.screens} onPick={go} />
          <Group title="손봐야 할 테이블" items={impact.tables} onPick={go} />

          {impact.requirements.length > 0 ? (
            <Group
              title="왜 필요한가 (요구사항)"
              note="이건 고쳐야 하는 대상이 아니라, 이 기능이 왜 있는지 알려 주는 맥락입니다."
              items={impact.requirements}
              onPick={go}
            />
          ) : null}

          {impact.affectedCount === 0 && impact.requirements.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--waivs-border)] bg-[var(--waivs-surface-soft)] p-4 text-center text-xs leading-5 text-[var(--waivs-text-muted)]">
              연결된 것이 없어 영향 범위를 알 수 없습니다.
              <br />
              화면과 API, 테이블을 이어 두면 여기에 나타납니다.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({
  title,
  note,
  items,
  onPick,
}: {
  title: string;
  note?: string;
  items: ImpactItem[];
  onPick: (item: ImpactItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-1.5 flex items-baseline gap-2">
        <h3 className="text-xs font-black text-[var(--waivs-text)]">{title}</h3>
        <span className="text-[11px] tabular-nums text-[var(--waivs-text-muted)]">
          {items.length}개
        </span>
      </div>

      {note ? (
        <p className="mb-1.5 text-[11px] leading-4 text-[var(--waivs-text-muted)]">{note}</p>
      ) : null}

      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = ICONS[item.kind];

          return (
            <li key={`${item.kind}-${item.id}`}>
              <button
                type="button"
                onClick={() => onPick(item)}
                className="flex w-full items-center gap-2 rounded-lg border border-[var(--waivs-border)] bg-white px-3 py-2 text-left transition hover:border-[#5873F9] hover:bg-[#EEF3FF]"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-[#5873F9]" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--waivs-text)]">
                  {item.label}
                </span>
                {item.hint ? (
                  <span className="max-w-[160px] shrink-0 truncate text-[11px] text-[var(--waivs-text-muted)]">
                    {item.hint}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
