"use client";

// 경로: src/components/design/impact/ImpactSummary.tsx
//
// 상세 패널 안에 들어가는 짧은 영향 범위 요약.
//
// 제목을 기능 이름("영향 범위")이 아니라 질문으로 쓴 것은 의도한 것이다. 처음 보는
// 사람이 이 칸이 무엇에 쓰는 것인지 설명 없이 알아야 하기 때문이다.
//
// 연결이 하나도 없을 때 숫자 0 을 보여 주는 대신 안내를 띄운다. 여기가 사용자가
// "왜 연결해야 하는가"를 처음으로 납득하는 자리다.

import { useMemo, useState } from "react";
import { GitBranch } from "lucide-react";

import type { DesignModel } from "../model/schema";
import { DetailSection } from "../components/DetailPanel";
import { buildImpact, type ImpactItem, type ImpactKind } from "./buildImpact";
import { ImpactDialog } from "./ImpactDialog";

/** 요약에 이름을 몇 개까지 보여 줄지. 넘치면 "외 n개" 로 접는다. */
const PREVIEW_LIMIT = 3;

export function ImpactSummary({
  model,
  kind,
  id,
}: {
  model: DesignModel;
  kind: ImpactKind;
  id: string | null;
}) {
  const [open, setOpen] = useState(false);
  const impact = useMemo(() => buildImpact(model, kind, id), [model, kind, id]);

  const isEmpty = impact.affectedCount === 0 && impact.requirements.length === 0;

  const preview: ImpactItem[] = [
    ...impact.apis,
    ...impact.screens,
    ...impact.tables,
  ].slice(0, PREVIEW_LIMIT);

  const hiddenCount = impact.affectedCount - preview.length;

  return (
    <>
      <DetailSection
        title="이걸 바꾸면 무엇이 흔들리나"
        action={
          isEmpty ? null : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="text-[11px] font-bold text-[#5873F9] transition hover:underline"
            >
              전체 보기
            </button>
          )
        }
      >
        {isEmpty ? (
          <p className="text-[11px] leading-5 text-[var(--waivs-text-muted)]">
            아직 연결된 것이 없어 영향 범위를 알 수 없습니다. 화면·API·테이블을 이어
            두면, 나중에 이것을 고칠 때 <b className="font-bold">어디를 함께 손봐야
            하는지</b> 여기에 나타납니다.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Count label="API" value={impact.apis.length} />
              <Count label="화면" value={impact.screens.length} />
              <Count label="테이블" value={impact.tables.length} />
            </div>

            {preview.length > 0 ? (
              <p className="text-[11px] leading-5 text-[var(--waivs-text-sub)]">
                {preview.map((item) => item.label).join(" · ")}
                {hiddenCount > 0 ? ` 외 ${hiddenCount}개` : ""}
              </p>
            ) : null}

            {impact.requirements.length > 0 ? (
              <p className="flex items-start gap-1.5 text-[11px] leading-5 text-[var(--waivs-text-muted)]">
                <GitBranch className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  왜 필요한가 —{" "}
                  {impact.requirements.map((item) => item.label).join(", ")}
                </span>
              </p>
            ) : null}
          </div>
        )}
      </DetailSection>

      <ImpactDialog open={open} onOpenChange={setOpen} impact={impact} />
    </>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
        value === 0
          ? "bg-[var(--waivs-surface-soft)] text-[var(--waivs-text-muted)]"
          : "bg-[#EEF3FF] text-[#3B4FD8]"
      }`}
    >
      {label}
      <span className="tabular-nums">{value}</span>
    </span>
  );
}
