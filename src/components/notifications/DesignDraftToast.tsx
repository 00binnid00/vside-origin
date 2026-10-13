"use client";

// 경로: src/components/notifications/DesignDraftToast.tsx
//
// AI 설계 초안이 끝났다는 것을 어느 페이지에서든 알린다.
//
// 초안은 서버가 만들고, 사용자는 그동안 다른 페이지에 가 있을 수 있다.
// 종 아이콘 알림은 서버가 남기지만 30초 주기로만 갱신되므로, 끝난 그 순간에
// 화면 구석에도 띄운다. 초안 다이얼로그를 보고 있었다면 띄우지 않는다.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VscBellDot, VscClose } from "react-icons/vsc";

import { useDraftJobStore } from "@/components/design/ai/draftJobStore";

interface Shown {
  workspaceId: string;
  failed: boolean;
  message: string;
}

export function DesignDraftToast() {
  const router = useRouter();
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(
    () =>
      useDraftJobStore.subscribe((state, previous) => {
        if (state.dialogOpen) {
          setShown(null);
          return;
        }

        // 만들던 것이 방금 끝났을 때만 알린다. 설계 화면에 들어와 이미 끝난
        // 초안을 되살린 경우에는 다이얼로그가 바로 열리므로 알릴 필요가 없다.
        if (previous.status !== "running" || !state.workspaceId) return;

        if (state.status === "done") {
          setShown({
            workspaceId: state.workspaceId,
            failed: false,
            message: "설계 초안이 준비되었습니다. 확인하고 문서에 넣어 주세요.",
          });
        } else if (state.status === "failed") {
          setShown({
            workspaceId: state.workspaceId,
            failed: true,
            message: state.errorMessage,
          });
        }
      }),
    [],
  );

  if (!shown) return null;

  const open = () => {
    useDraftJobStore.getState().setDialogOpen(true);
    router.push(`/design/${encodeURIComponent(shown.workspaceId)}`);
  };

  return (
    // 팀 초대 알림과 같은 자리(오른쪽 아래)에 띄운다.
    <div className="pointer-events-none fixed bottom-6 right-6 z-[9999]">
      <div className="pointer-events-auto w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div
            className={
              shown.failed
                ? "shrink-0 rounded-full bg-red-100 p-2 text-red-600"
                : "shrink-0 rounded-full bg-indigo-100 p-2 text-indigo-600"
            }
          >
            <VscBellDot size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-extrabold text-gray-900">
              {shown.failed ? "AI 초안을 만들지 못했습니다" : "AI 초안 생성이 끝났습니다"}
            </h4>
            <p className="mt-1 break-keep text-xs leading-relaxed text-gray-600">{shown.message}</p>

            <button
              onClick={open}
              className="mt-3 w-full rounded-lg bg-indigo-600 py-2 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              {shown.failed ? "다시 시도하기" : "확인하기"}
            </button>
          </div>

          <button
            onClick={() => setShown(null)}
            aria-label="닫기"
            className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
          >
            <VscClose size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
