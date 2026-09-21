"use client";

// 경로: src/components/design/components/DesignHeader.tsx
//
// 저장 버튼이 없다. 자동 저장이라 누를 것이 없기 때문이다.
// 대신 지금 상태가 어떤지(저장됐는지, 연결돼 있는지, 몇 명이 보고 있는지)를
// 항상 보이게 둔다. 사용자가 저장을 신경 쓰지 않아도 되려면, 저장되고 있다는
// 사실이 눈에 보여야 한다.

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CloudOff,
  FileCode,
  History,
  Loader2,
  Printer,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { ConnectionStatus, DesignDocState } from "../realtime/designDocProvider";
import type { DesignMutations } from "../realtime/mutations";
import { useDesignUiStore, type DesignTab } from "../store/designUiStore";
import { DesignTabToolbar } from "./DesignTabToolbar";

const TABS: { id: DesignTab; label: string }[] = [
  { id: "requirements", label: "요구사항" },
  { id: "screens", label: "화면 흐름" },
  { id: "erd", label: "ERD" },
  { id: "apis", label: "API 명세" },
];

function relativeTime(savedAt: number | null, now: number): string {
  if (!savedAt) return "";

  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 10) return "방금 저장됨";
  if (seconds < 60) return `${seconds}초 전 저장됨`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}분 전 저장됨`;

  return `${Math.round(minutes / 60)}시간 전 저장됨`;
}

function SaveIndicator({ state }: { state: DesignDocState }) {
  const [now, setNow] = useState(() => Date.now());

  // "3분 전 저장됨" 이 3분 전 그대로 멈춰 있으면 오히려 불안하다.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  if (state.status === "offline") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-600">
        <CloudOff className="h-3.5 w-3.5" />
        오프라인 · 저장은 됩니다
      </span>
    );
  }

  if (state.saveState === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[var(--waivs-text-sub)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        저장 중
      </span>
    );
  }

  if (state.saveState === "failed") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-600">
        <AlertTriangle className="h-3.5 w-3.5" />
        저장 실패 · 곧 다시 시도합니다
      </span>
    );
  }

  if (state.saveState === "pending") {
    return <span className="text-xs text-[var(--waivs-text-muted)]">변경사항 저장 대기 중</span>;
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--waivs-text-sub)]">
      <Check className="h-3.5 w-3.5 text-emerald-500" />
      {state.savedAt ? relativeTime(state.savedAt, now) : "모든 변경사항 저장됨"}
    </span>
  );
}

export interface DesignHeaderProps {
  workspaceName: string;
  state: DesignDocState;
  /** 빨간 배지는 "고쳐야 하는 것"만 센다. 경고와 참고를 합치면 숫자가 수십이 되어 아무도 안 본다. */
  errorCount: number;
  /** "아직 안 했다"는 경고가 아니라 진행률로 보여 준다. */
  progressPercent: number;
  /** 탭에 함께 보여 줄 항목 수. 어떤 산출물이 비었는지 탭을 열지 않고도 보이게 한다. */
  counts: Record<DesignTab, number>;
  /** 탭 줄 오른쪽 끝의 검색·추가가 쓴다. 문서를 여는 중에는 아직 null 이다. */
  mutations: DesignMutations | null;
  onOpenAiDraft: () => void;
  onOpenCodegen: () => void;
  onPrint: () => void;
  printing: boolean;
  onOpenHistory: () => void;
}

export function DesignHeader({
  workspaceName,
  state,
  errorCount,
  progressPercent,
  counts,
  mutations,
  onOpenAiDraft,
  onOpenCodegen,
  onPrint,
  printing,
  onOpenHistory,
}: DesignHeaderProps) {
  const activeTab = useDesignUiStore((s) => s.activeTab);
  const setActiveTab = useDesignUiStore((s) => s.setActiveTab);
  const doctorOpen = useDesignUiStore((s) => s.doctorOpen);
  const toggleDoctor = useDesignUiStore((s) => s.toggleDoctor);

  // 제목 줄 아래에 탭을 깐다. 일정 관리 화면이 "제목 → 얇은 구분선 → 아랫줄"
  // 리듬을 쓰기 때문에, 두 화면을 오갈 때 같은 문법으로 읽히게 맞춘 것이다.
  //
  // 한 줄일 때보다 헤더가 40px 남짓 높아진다. 화면 흐름도와 ERD 는 주어진
  // 높이를 채우는 캔버스라 그 손해가 그대로 캔버스에 간다. 그래서 여백을
  // 일정 관리와 같은 값(py-3 + mt-3/pt-2.5)으로 좁게 잡고, 자주 누르지 않는
  // 두 버튼은 아이콘만 남겨 둔다. 여기를 넉넉하게 바꾸지 말 것.
  return (
    <header className="shrink-0 border-b border-[var(--waivs-border-soft)] px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-xl font-black tracking-tight text-[var(--waivs-text)]">
            {workspaceName || "설계 관리"}
          </h1>
          <SaveIndicator state={state} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {state.peerCount > 1 ? (
            <span
              title={`${state.peerCount}명이 함께 보는 중`}
              className="flex items-center gap-1 rounded-full bg-[#EEF3FF] px-2 py-1 text-xs font-bold text-[#5873F9]"
            >
              <Users className="h-3.5 w-3.5" />
              {state.peerCount}
            </span>
          ) : null}

          <Button variant="outline" size="sm" onClick={onOpenAiDraft} className="gap-1.5">
            <Sparkles className="h-4 w-4 text-[#5873F9]" />
            AI 초안
          </Button>

          {/* 아래 둘은 가끔 쓰는 것이라 아이콘만 남긴다. 이름은 툴팁으로 뜬다. */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenHistory}
            title="기록"
            aria-label="기록"
            className="px-2"
          >
            <History className="h-4 w-4 text-[var(--waivs-text-sub)]" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            disabled={printing}
            title="PDF / 인쇄"
            aria-label="PDF / 인쇄"
            className="px-2"
          >
            {printing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 text-[var(--waivs-text-sub)]" />
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={onOpenCodegen} className="gap-1.5">
            <FileCode className="h-4 w-4 text-[var(--waivs-text-sub)]" />
            코드 생성
          </Button>

          {/*
            진행률과 오류를 나눠 보여 준다.
            예전에는 오류와 경고를 합친 숫자가 빨갛게 떠서, 요구사항 한 줄만 적어도
            빨간 4 가 뜨고 사람이 그 배지를 아예 안 보게 됐다. 진행률은 회색 글씨로,
            빨간 배지는 정말 고쳐야 할 것에만 쓴다.
          */}
          <Button
            variant={doctorOpen ? "default" : "outline"}
            size="sm"
            onClick={() => toggleDoctor()}
            className="gap-1.5"
          >
            <Stethoscope className="h-4 w-4" />
            설계 현황
            <span
              className={cn(
                "ml-0.5 text-[11px] font-semibold tabular-nums",
                doctorOpen ? "text-white/80" : "text-[var(--waivs-text-muted)]",
              )}
            >
              {progressPercent}%
            </span>
            {errorCount > 0 ? (
              <span className="ml-0.5 rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                {errorCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {/*
        일정 관리의 뷰 전환 탭(보드/캘린더/간트/리스트)과 같은 세그먼티드
        컨트롤이다. 회색 트랙 위에 눌린 것만 흰 알약으로 떠오르는 형태라,
        배경 없이 글자만 두는 것보다 "눌러서 바꾸는 것"이라는 신호가 세다.
        className 을 일부러 그쪽과 똑같이 맞췄으니 한쪽만 바꾸지 말 것.

        라벨 옆 숫자는 어느 산출물이 비어 있는지 탭을 열어 보지 않고도
        알게 한다. tabular-nums 는 한 자리에서 두 자리로 늘 때 탭 너비가
        흔들리지 않게 한다.
      */}
      <nav className="mt-3 flex items-center gap-3 border-t border-[var(--waivs-border-soft)] pt-2.5">
        <div className="flex w-fit shrink-0 items-center gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-black transition",
                activeTab === tab.id
                  ? "bg-white text-[#5873F9] shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "tabular-nums",
                  activeTab === tab.id ? "text-[#5873F9]/70" : "text-slate-400",
                )}
              >
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        <DesignTabToolbar mutations={mutations} />
      </nav>
    </header>
  );
}

export function ConnectionNotice({ status, message }: { status: ConnectionStatus; message: string }) {
  if (status !== "error") return null;

  return (
    <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p className="font-medium">설계 문서를 불러오지 못했습니다.</p>
      <p className="mt-1 text-red-600">{message}</p>
      <p className="mt-2 text-xs text-red-500">
        편집을 열지 않은 이유는, 서버에 있는 실제 내용을 빈 문서로 덮어쓸 수 있기 때문입니다.
        새로고침해 주세요.
      </p>
    </div>
  );
}
