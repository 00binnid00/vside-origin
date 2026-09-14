"use client";

// 경로: src/components/design/components/CompletionChecklist.tsx
//
// 지금 고른 항목이 완성까지 무엇이 남았는지 보여 준다.
//
// 왜 이 화면이 필요한가
// -------------------
// 연결(요구사항 ↔ 화면 ↔ API ↔ 테이블)은 손으로 이어야 하는데, 이어도 돌아오는 것이
// "경고 하나가 사라짐" 뿐이면 사용자에게는 그냥 숙제다. 같은 작업을 체크리스트 안에
// 넣으면 "이 요구사항을 완성하는 네 칸 중 두 칸" 으로 읽힌다. 작업은 같은데 의미가
// 달라진다.
//
// 판정을 다시 계산하지 않는다
// ------------------------
// 서버가 보내 준 점검 결과(findings)를 항목 단위로 다시 묶기만 한다. 프론트에서
// 조건을 새로 구현하면 위쪽 진행률과 이 체크리스트가 서로 어긋난다. 여기서 하는 일은
// "이 항목에 이 규칙이 걸렸는가" 를 보는 것뿐이다.

import { Check, Circle } from "lucide-react";

import type { Finding } from "../api/designDoctorApi";
import { DetailSection } from "./DetailPanel";

export type ChecklistKind = "requirement" | "screen" | "api" | "table";

interface CheckSpec {
  /** 이 규칙이 걸려 있으면 아직 안 채운 것이다. */
  ruleId: string;
  label: string;
  /** 어떻게 채우는지. 안 채운 칸에만 보여 준다. */
  todo: string;
}

const SPECS: Record<ChecklistKind, CheckSpec[]> = {
  requirement: [
    { ruleId: "REQ_EMPTY_NAME", label: "기능명", todo: "무엇을 할 수 있어야 하는지 적어 주세요." },
    { ruleId: "REQ_EMPTY_DESC", label: "설명", todo: "코드 주석에 그대로 쓰입니다. 한 문장이면 충분합니다." },
    { ruleId: "REQ_NO_SCREEN", label: "화면 연결", todo: "아래 '연결' 에서 이 기능이 나타나는 화면을 이어 주세요." },
    { ruleId: "REQ_NO_API", label: "API 연결", todo: "아래 '연결' 에서 이 기능을 담당하는 API 를 이어 주세요." },
  ],
  screen: [
    { ruleId: "SCR_NO_ROUTE", label: "라우트 경로", todo: "/login 처럼 주소를 정해 주세요. React 코드 생성의 입력이 됩니다." },
    { ruleId: "SCR_NO_REQ", label: "요구사항 연결", todo: "이 화면이 왜 필요한지 요구사항을 이어 주세요." },
    { ruleId: "SCR_UNREACHABLE", label: "시작 화면에서 도달 가능", todo: "다른 화면에서 이 화면으로 오는 화살표를 그려 주세요." },
  ],
  api: [
    { ruleId: "API_NO_ENDPOINT", label: "경로", todo: "/api/... 형태로 적어 주세요." },
    { ruleId: "API_NO_REQ", label: "요구사항 연결", todo: "이 API 가 왜 필요한지 요구사항을 이어 주세요." },
    { ruleId: "API_NO_TABLE", label: "테이블 연결", todo: "이 API 가 다루는 테이블을 이어 주세요. 이어 두면 코드 생성 때 몸통을 채울 수 있습니다." },
    { ruleId: "API_NO_RESPONSE", label: "응답 예시", todo: "JSON 예시를 적으면 그대로 DTO 필드가 됩니다." },
  ],
  table: [
    { ruleId: "TBL_NO_COLUMN", label: "컬럼", todo: "왼쪽 스키마 글에서 컬럼을 적어 주세요." },
    { ruleId: "TBL_NO_PK", label: "기본키", todo: "id 같은 기본키가 없으면 엔티티를 만들 수 없습니다." },
    { ruleId: "TBL_ORPHAN", label: "이 테이블을 쓰는 API", todo: "API 탭에서 이 테이블을 쓰는 API 에 연결해 주세요." },
  ],
};

export function CompletionChecklist({
  findings,
  kind,
  id,
}: {
  findings: Finding[];
  kind: ChecklistKind;
  id: string | null;
}) {
  if (!id) return null;

  const specs = SPECS[kind];

  const failed = new Set(
    findings.filter((finding) => finding.targetId === id).map((finding) => finding.ruleId),
  );

  const doneCount = specs.filter((spec) => !failed.has(spec.ruleId)).length;
  const isComplete = doneCount === specs.length;

  return (
    <DetailSection
      tone="soft"
      title="완성까지"
      action={
        <span
          className={`text-[11px] font-bold tabular-nums ${
            isComplete ? "text-emerald-600" : "text-[var(--waivs-text-sub)]"
          }`}
        >
          {doneCount}/{specs.length}
        </span>
      }
    >
      <ul className="space-y-1.5">
        {specs.map((spec) => {
          const done = !failed.has(spec.ruleId);

          return (
            <li key={spec.ruleId} className="flex items-start gap-2">
              {done ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--waivs-text-muted)]" />
              )}

              <span className="min-w-0 flex-1">
                <span
                  className={`block text-[11px] font-semibold ${
                    done
                      ? "text-[var(--waivs-text-muted)] line-through"
                      : "text-[var(--waivs-text)]"
                  }`}
                >
                  {spec.label}
                </span>

                {done ? null : (
                  <span className="mt-0.5 block text-[11px] leading-4 text-[var(--waivs-text-muted)]">
                    {spec.todo}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </DetailSection>
  );
}
