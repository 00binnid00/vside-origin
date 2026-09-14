"use client";

// 경로: src/components/design/components/DoctorPanel.tsx
//
// 설계 점검 결과 패널.
//
// 문제를 알려 주는 것으로 끝나면 반쯤만 쓸모 있다. 항목을 누르면 그 자리로
// 데려다주는 것까지가 이 기능의 값어치다.

import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Wand2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type {
  DoctorReport,
  Finding,
  FindingSeverity,
  StageProgress,
} from "../api/designDoctorApi";
import { focusDesignTarget, useDesignUiStore } from "../store/designUiStore";
import { applyDoctorFix, describeFix } from "../doctor/applyFix";
import type { DesignMutations } from "../realtime/mutations";

const SEVERITY_ORDER: FindingSeverity[] = ["ERROR", "WARNING", "INFO"];

const SEVERITY_META: Record<
  FindingSeverity,
  { label: string; icon: typeof AlertCircle; tone: string; dot: string }
> = {
  ERROR: {
    label: "고쳐야 함",
    icon: AlertCircle,
    tone: "text-red-600",
    dot: "bg-red-500",
  },
  WARNING: {
    label: "확인 필요",
    icon: AlertTriangle,
    tone: "text-amber-600",
    dot: "bg-amber-500",
  },
  INFO: {
    label: "참고",
    icon: Info,
    tone: "text-[var(--waivs-text-sub)]",
    dot: "bg-[var(--waivs-text-muted)]",
  },
};

export interface DoctorPanelProps {
  report: DoctorReport;
  /** 없으면 "고치기" 버튼을 띄우지 않는다. */
  mutations: DesignMutations | null;
}

export function DoctorPanel({ report, mutations }: DoctorPanelProps) {
  const toggleDoctor = useDesignUiStore((s) => s.toggleDoctor);
  const setActiveTab = useDesignUiStore((s) => s.setActiveTab);

  /*
   * 오류만 펼쳐 둔다.
   *
   * 예전에는 셋을 다 펼쳐 놓았는데, 경고 대부분이 "아직 안 이었다"라서 목록이
   * 수십 줄이 되고 그 사이에 진짜 오류가 묻혔다. 그 "아직 안 했다"는 이제 위쪽
   * 진행률로 올라갔으므로, 아래 목록은 고쳐야 할 것부터 보여 준다.
   */
  const [expanded, setExpanded] = useState<FindingSeverity[]>(["ERROR"]);

  const toggleSeverity = (severity: FindingSeverity) =>
    setExpanded((prev) =>
      prev.includes(severity)
        ? prev.filter((item) => item !== severity)
        : [...prev, severity],
    );

  const grouped = useMemo(() => {
    const map = new Map<FindingSeverity, Finding[]>();
    SEVERITY_ORDER.forEach((severity) => map.set(severity, []));
    report.findings.forEach((finding) => map.get(finding.severity)?.push(finding));
    return map;
  }, [report.findings]);

  const progress = report.progress;

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-[var(--waivs-border)] bg-white">
      <div className="flex items-center justify-between border-b border-[var(--waivs-border-soft)] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--waivs-text)]">설계 현황</p>
          <p className="mt-0.5 text-xs text-[var(--waivs-text-sub)]">
            {progress.totalChecks === 0
              ? "아직 설계를 시작하지 않았습니다."
              : `진행 ${progress.percent}%${
                  report.errorCount > 0 ? ` · 고쳐야 할 것 ${report.errorCount}개` : ""
                }`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggleDoctor(false)}
          className="rounded-md p-1 text-[var(--waivs-text-muted)] transition hover:bg-[var(--waivs-surface-soft)] hover:text-[var(--waivs-text-sub)]"
          aria-label="점검 패널 닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {report.codegenBlocked ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          고쳐야 할 항목이 남아 있어 코드 생성이 막혀 있습니다.
        </div>
      ) : null}

      {/*
        진행률을 맨 위에 둔다. "아직 안 했다"는 틀린 것이 아니라 작업이 남은 것이라
        경고 목록이 아니라 여기 있어야 한다. 줄을 누르면 그 탭으로 간다.
      */}
      {progress.totalChecks > 0 ? (
        <div className="space-y-2 border-b border-[var(--waivs-border-soft)] px-4 py-3">
          <StageRow label="요구사항" stage={progress.requirements} onGo={() => setActiveTab("requirements")} />
          <StageRow label="화면" stage={progress.screens} onGo={() => setActiveTab("screens")} />
          <StageRow label="API" stage={progress.apis} onGo={() => setActiveTab("apis")} />
          <StageRow label="테이블" stage={progress.tables} onGo={() => setActiveTab("erd")} />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {report.findings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <p className="text-sm text-[var(--waivs-text-sub)]">지금은 짚어 드릴 것이 없습니다.</p>
            <p className="text-xs text-[var(--waivs-text-muted)]">
              요구사항과 화면, API, 테이블이 서로 잘 이어져 있습니다.
            </p>
          </div>
        ) : (
          SEVERITY_ORDER.map((severity) => {
            const items = grouped.get(severity) ?? [];
            if (items.length === 0) return null;

            const meta = SEVERITY_META[severity];
            const Icon = meta.icon;
            const isOpen = expanded.includes(severity);

            return (
              <section key={severity} className="border-b border-[var(--waivs-border-soft)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleSeverity(severity)}
                  className={cn(
                    "flex w-full items-center gap-1.5 px-4 py-2 text-xs font-semibold transition hover:bg-[var(--waivs-surface-soft)]",
                    meta.tone,
                  )}
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {meta.label}
                  <span className="text-[var(--waivs-text-muted)]">{items.length}</span>
                </button>

                <ul hidden={!isOpen}>
                  {items.map((finding, index) => (
                    <li key={`${finding.ruleId}-${finding.targetId}-${index}`}>
                      <button
                        type="button"
                        onClick={() => focusDesignTarget(finding.targetKind, finding.targetId)}
                        className="flex w-full gap-2 px-4 py-2 text-left transition hover:bg-[var(--waivs-surface-soft)]"
                      >
                        <span
                          className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)}
                        />

                        <span className="min-w-0 flex-1">
                          {finding.targetLabel ? (
                            <span className="block truncate text-xs font-medium text-[var(--waivs-text-sub)]">
                              {finding.targetLabel}
                            </span>
                          ) : null}

                          <span className="block text-xs text-[var(--waivs-text-sub)]">{finding.message}</span>

                          {finding.fixHint ? (
                            <span className="mt-0.5 block text-[11px] text-[var(--waivs-text-muted)]">
                              {finding.fixHint}
                            </span>
                          ) : null}
                        </span>
                      </button>

                      {finding.fix && mutations ? (
                        <div className="pb-2 pl-9 pr-4">
                          <button
                            type="button"
                            onClick={() => applyDoctorFix(mutations, finding.fix!)}
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--waivs-border)] px-2 py-1 text-[11px] font-medium text-[var(--waivs-text-sub)] transition hover:border-[var(--waivs-border)] hover:bg-[var(--waivs-surface-soft)]"
                          >
                            <Wand2 className="h-3 w-3" />
                            {describeFix(finding.fix)}
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}

/**
 * 한 단계의 진행 막대.
 *
 * 막대는 체크칸 비율로 채운다. 완료 항목 수만 쓰면 네 칸 중 세 칸을 채워도 화면이
 * 꿈쩍하지 않아 사람이 지친다. 옆의 숫자는 "몇 개가 완전히 끝났는가"를 알려 준다.
 */
function StageRow({
  label,
  stage,
  onGo,
}: {
  label: string;
  stage: StageProgress;
  onGo: () => void;
}) {
  const isEmpty = stage.itemCount === 0;

  return (
    <button
      type="button"
      onClick={onGo}
      className="block w-full rounded-lg px-1 py-0.5 text-left transition hover:bg-[var(--waivs-surface-soft)]"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-[var(--waivs-text-sub)]">{label}</span>
        <span className="text-[11px] tabular-nums text-[var(--waivs-text-muted)]">
          {isEmpty ? "아직 없음" : `${stage.itemCount}개 중 ${stage.itemsDone}개 완료`}
        </span>
      </span>

      <span className="mt-1 flex items-center gap-2">
        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--waivs-surface-soft)]">
          <span
            className="block h-full rounded-full bg-[#5873F9] transition-[width]"
            style={{ width: `${isEmpty ? 0 : stage.percent}%` }}
          />
        </span>
        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-[var(--waivs-text-sub)]">
          {isEmpty ? "—" : `${stage.percent}%`}
        </span>
      </span>
    </button>
  );
}
