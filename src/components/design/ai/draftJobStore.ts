"use client";

// 경로: src/components/design/ai/draftJobStore.ts
//
// 서버가 만들고 있는 AI 초안의 진행 상태.
//
// 다이얼로그의 state 가 아니라 여기에 두는 이유가 있다. 다이얼로그를 닫거나
// 다른 페이지로 가면 컴포넌트는 사라지는데, 그때도 "끝났는지"를 계속
// 물어봐야 화면 구석 알림을 띄울 수 있다. 그래서 물어보는 타이머도
// 컴포넌트가 아니라 이 모듈이 든다.
//
// 문서 데이터를 복제하는 것이 아니다. 여기 담기는 것은 아직 문서에 들어가지
// 않은 초안뿐이고, 사용자가 검토해 넣는 순간 Y.Doc 으로 넘어가며 비워진다.

import { create } from "zustand";

import {
  discardDraftJobApi,
  fetchDraftJobApi,
  startDraftJobApi,
  type DraftJob,
} from "../api/designAiApi";
import type { DoctorReport } from "../api/designDoctorApi";
import type { DesignModel, TechStack } from "../model/schema";

const POLL_INTERVAL_MS = 2000;

export type DraftJobStatus = "idle" | "running" | "done" | "failed";

interface DraftJobState {
  /** 어느 워크스페이스의 초안인지. 다른 워크스페이스 화면은 이것을 자기 것으로 보면 안 된다. */
  workspaceId: string | null;
  status: DraftJobStatus;
  stage: number;
  draft: DesignModel | null;
  report: DoctorReport | null;
  errorMessage: string;

  /**
   * 초안 다이얼로그가 열려 있는지.
   *
   * 열려 있으면 결과가 이미 눈앞에 있으므로 구석 알림을 또 띄우지 않는다.
   * 구석 알림의 [확인하기] 가 다이얼로그를 여는 데에도 쓴다.
   */
  dialogOpen: boolean;

  start: (
    workspaceId: string,
    summary: string,
    techStack: TechStack,
    instruction: string,
    existing: DesignModel | null,
  ) => Promise<void>;
  /** 설계 화면에 들어올 때 서버에 남아 있는 작업을 되살린다. */
  resume: (workspaceId: string) => Promise<void>;
  /** 문서에 넣었거나 버렸을 때. 서버에 남은 것도 치운다. */
  discard: () => void;
  /** 실패 안내를 본 뒤 화면만 비운다. */
  clear: () => void;
  setDialogOpen: (open: boolean) => void;
}

const EMPTY = {
  workspaceId: null,
  status: "idle" as DraftJobStatus,
  stage: 1,
  draft: null,
  report: null,
  errorMessage: "",
};

let pollTimer: ReturnType<typeof setTimeout> | null = null;

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

export const useDraftJobStore = create<DraftJobState>((set, get) => {
  const fail = (workspaceId: string, message: string) => {
    set({ ...EMPTY, workspaceId, status: "failed", errorMessage: message });
  };

  /**
   * 서버가 알려 준 상태를 받아들인다.
   *
   * 그 사이 다른 워크스페이스로 갈아탔거나 버렸으면 무시한다. 늦게 도착한
   * 응답이 지금 보고 있는 것을 덮으면 안 된다.
   */
  const accept = (workspaceId: string, job: DraftJob) => {
    if (get().workspaceId !== workspaceId) return;

    if (job.status === "DONE" && job.model) {
      set({ status: "done", stage: 2, draft: job.model, report: job.report, errorMessage: "" });
      return;
    }

    if (job.status === "RUNNING") {
      set({ status: "running", stage: job.stage, draft: null, report: null, errorMessage: "" });
      schedulePoll(workspaceId);
      return;
    }

    fail(workspaceId, job.errorMessage || "초안을 만들지 못했습니다.");
    // 실패한 것을 서버가 들고 있을 이유가 없다. 이유는 이미 받아 왔다.
    void discardDraftJobApi(workspaceId);
  };

  const schedulePoll = (workspaceId: string) => {
    stopPolling();

    pollTimer = setTimeout(async () => {
      pollTimer = null;

      const current = get();
      if (current.workspaceId !== workspaceId || current.status !== "running") return;

      let job: DraftJob | null;

      try {
        job = await fetchDraftJobApi(workspaceId);
      } catch {
        // 잠깐 끊긴 것일 수 있다. 작업은 서버에서 계속 돌고 있으므로 다시 물어본다.
        const latest = get();
        if (latest.workspaceId === workspaceId && latest.status === "running") {
          schedulePoll(workspaceId);
        }
        return;
      }

      if (!job) {
        // 작업은 서버 메모리에만 있어서, 서버가 다시 켜지면 사라진다.
        if (get().workspaceId === workspaceId) {
          fail(workspaceId, "서버가 다시 시작되어 초안 생성이 중단되었습니다. 다시 시도해 주세요.");
        }
        return;
      }

      accept(workspaceId, job);
    }, POLL_INTERVAL_MS);
  };

  return {
    ...EMPTY,
    dialogOpen: false,

    start: async (workspaceId, summary, techStack, instruction, existing) => {
      stopPolling();
      set({ ...EMPTY, workspaceId, status: "running" });

      try {
        accept(
          workspaceId,
          await startDraftJobApi(workspaceId, summary, techStack, instruction, existing),
        );
      } catch (error) {
        if (get().workspaceId !== workspaceId) return;

        fail(
          workspaceId,
          error instanceof Error ? error.message : "초안을 만들지 못했습니다.",
        );
      }
    },

    resume: async (workspaceId) => {
      const current = get();
      if (current.workspaceId === workspaceId && current.status !== "idle") return;

      let job: DraftJob | null;

      try {
        job = await fetchDraftJobApi(workspaceId);
      } catch {
        return;
      }

      // 남은 것이 없으면 지금 지켜보던 것(다른 워크스페이스의 작업)을 그대로 둔다.
      if (!job) return;

      stopPolling();
      set({ ...EMPTY, workspaceId });
      accept(workspaceId, job);
    },

    discard: () => {
      const { workspaceId } = get();

      stopPolling();
      set(EMPTY);

      if (workspaceId) void discardDraftJobApi(workspaceId);
    },

    clear: () => {
      stopPolling();
      set(EMPTY);
    },

    setDialogOpen: (open) => set({ dialogOpen: open }),
  };
});
