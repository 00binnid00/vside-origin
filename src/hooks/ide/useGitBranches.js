"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";

import {
  clearVirtualTree,
  closeAllFiles,
  mergeProjectFiles,
  setActiveBranch,
} from "@/store/slices/fileSystemSlice";
import { writeToTerminal } from "@/store/slices/uiSlice";
import {
  applySandboxApi,
  createBranchApi,
  createSandboxApi,
  deleteBranchApi,
  fetchBranchListApi,
  fetchProjectFilesApi,
  saveFileApi,
} from "@/lib/ide/api";

export const DEFAULT_BRANCH = "master";
export const PROTECTED_BRANCHES = ["master", "main"];

const RESERVED_BRANCH_NAMES = new Set(["head", "fetch_head", "orig_head"]);

const normalizeBranchValue = (branch) => {
  if (typeof branch === "string") {
    const value = branch.trim();
    return value === "[object Object]" ? "" : value;
  }

  if (branch && typeof branch === "object") {
    const value =
      branch.branchName ||
      branch.sandboxBranchName ||
      branch.sandboxBranch ||
      branch.branch ||
      branch.name ||
      branch.currentBranch ||
      branch.data?.branchName ||
      branch.data?.sandboxBranchName ||
      branch.data?.sandboxBranch ||
      branch.result?.branchName ||
      branch.result?.sandboxBranchName ||
      branch.result?.sandboxBranch ||
      "";

    return normalizeBranchValue(value);
  }

  return "";
};

const extractSandboxBranchName = (payload) => {
  const branchName = normalizeBranchValue(payload);

  if (!branchName) {
    throw new Error(
      "서버가 샌드박스 브랜치명을 올바르게 반환하지 않았습니다.",
    );
  }

  if (!isSandboxBranch(branchName)) {
    throw new Error(
      `샌드박스 브랜치명이 올바르지 않습니다: ${branchName}`,
    );
  }

  return branchName;
};

const getSandboxResultMessage = (payload, fallbackMessage) => {
  if (!payload) return fallbackMessage;

  if (typeof payload === "string") {
    return payload || fallbackMessage;
  }

  if (typeof payload === "object") {
    return (
      payload.message ||
      payload.resultMessage ||
      payload.result ||
      payload.status ||
      fallbackMessage
    );
  }

  return fallbackMessage;
};

export const isProtectedBranch = (branchName) => {
  const normalized = normalizeBranchValue(branchName).toLowerCase();
  return PROTECTED_BRANCHES.includes(normalized);
};

export const isSandboxBranch = (branchName) => {
  const normalized = normalizeBranchValue(branchName);
  return normalized.startsWith("focus-") || normalized.startsWith("focus/");
};

const normalizeBranchList = (branches) => {
  const uniqueBranches = Array.from(
    new Set(
      (Array.isArray(branches) ? branches : [])
        .map(normalizeBranchValue)
        .filter(Boolean),
    ),
  );

  const getPriority = (branch) => {
    const lowerBranch = branch.toLowerCase();

    if (lowerBranch === "master") return 0;
    if (lowerBranch === "main") return 1;

    return 2;
  };

  return uniqueBranches.sort((a, b) => {
    const priorityDiff = getPriority(a) - getPriority(b);

    if (priorityDiff !== 0) return priorityDiff;

    return a.localeCompare(b);
  });
};

export const validateBranchName = (rawBranchName, branches = []) => {
  const branchName = normalizeBranchValue(rawBranchName);

  if (!branchName) return "브랜치명을 입력해주세요.";
  if (branchName.length > 120) return "브랜치명은 120자 이하로 입력해주세요.";

  const lowerBranchName = branchName.toLowerCase();

  if (isProtectedBranch(branchName)) {
    return "master/main 브랜치는 새로 만들 수 없습니다.";
  }

  if (RESERVED_BRANCH_NAMES.has(lowerBranchName)) {
    return "Git 예약어는 브랜치명으로 사용할 수 없습니다.";
  }

  const normalizedBranches = normalizeBranchList(branches);

  if (
    normalizedBranches.some(
      (branch) => branch.toLowerCase() === lowerBranchName,
    )
  ) {
    return "이미 존재하는 브랜치입니다.";
  }

  if (branchName.startsWith("/") || branchName.endsWith("/")) {
    return "브랜치명은 / 로 시작하거나 끝날 수 없습니다.";
  }

  if (branchName.includes("//")) {
    return "브랜치명에는 연속된 / 를 사용할 수 없습니다.";
  }

  if (branchName.includes("..")) {
    return "브랜치명에는 연속된 점(..)을 사용할 수 없습니다.";
  }

  if (branchName.includes("@{")) {
    return "브랜치명에는 @{ 를 사용할 수 없습니다.";
  }

  if (branchName.endsWith(".") || branchName.endsWith(".lock")) {
    return "브랜치명은 . 또는 .lock 으로 끝날 수 없습니다.";
  }

  if (/[\s]/.test(branchName)) {
    return "브랜치명에는 공백을 사용할 수 없습니다.";
  }

  if (/[\x00-\x1f\x7f]/.test(branchName)) {
    return "브랜치명에는 제어 문자를 사용할 수 없습니다.";
  }

  if (/[~^:?*\[\]\\]/.test(branchName)) {
    return "브랜치명에는 ~ ^ : ? * [ ] \\ 문자를 사용할 수 없습니다.";
  }

  const invalidSegment = branchName
    .split("/")
    .some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment.startsWith(".") ||
        segment.endsWith("."),
    );

  if (invalidSegment) {
    return "브랜치 경로의 각 구간은 비어 있거나 점(.)으로 시작/종료할 수 없습니다.";
  }

  return "";
};

const sanitizeSandboxTaskName = (taskName) => {
  return String(taskName || "")
    .trim()
    .replace(/[\s/\\]+/g, "-")
    .replace(/[~^:?*\[\]@{}]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export function useGitBranches({
  workspaceId,
  activeProject,
  activeBranch,
  currentNickname = "dev",
  mode = "personal",
}) {
  const dispatch = useDispatch();

  const [branches, setBranches] = useState([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isSwitchingBranch, setIsSwitchingBranch] = useState(false);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [isDeletingBranchName, setIsDeletingBranchName] = useState("");
  const [isCreatingSandbox, setIsCreatingSandbox] = useState(false);
  const [isApplyingSandbox, setIsApplyingSandbox] = useState(false);

  const activeBranchName = normalizeBranchValue(activeBranch);

  const currentBranch = activeProject
    ? activeBranchName || DEFAULT_BRANCH
    : "No Project";

  const isTeamMode = mode === "team";

  const isSandboxMode =
    isTeamMode && Boolean(activeProject) && isSandboxBranch(currentBranch);

  const visibleBranches = useMemo(() => {
    const normalizedBranches = normalizeBranchList(branches);

    return normalizedBranches.filter((branch) => {
      if (!isSandboxBranch(branch)) {
        return true;
      }

      if (!isTeamMode) {
        return false;
      }

      const nickname = String(currentNickname || "dev");

      return (
        branch.startsWith(`focus-${nickname}-`) ||
        branch.startsWith(`focus/${nickname}/`)
      );
    });
  }, [branches, currentNickname, isTeamMode]);

  useEffect(() => {
    if (!activeProject) return;
    if (!activeBranch) return;

    const normalized = normalizeBranchValue(activeBranch);

    if (!normalized) {
      dispatch(setActiveBranch(DEFAULT_BRANCH));
    }
  }, [activeProject, activeBranch, dispatch]);

  const loadBranches = useCallback(async () => {
    if (!workspaceId || !activeProject) {
      setBranches([]);
      return [];
    }

    setIsLoadingBranches(true);

    try {
      const fetchedBranches = await fetchBranchListApi(
        workspaceId,
        activeProject,
      );

      const normalizedBranches = normalizeBranchList(fetchedBranches);

      setBranches(normalizedBranches);

      return normalizedBranches;
    } finally {
      setIsLoadingBranches(false);
    }
  }, [workspaceId, activeProject]);

  const refreshProjectTree = useCallback(
    async (branchName) => {
      if (!workspaceId || !activeProject) return null;

      const targetBranch = normalizeBranchValue(branchName) || DEFAULT_BRANCH;

      const files = await fetchProjectFilesApi(
        workspaceId,
        activeProject,
        targetBranch,
      );

      dispatch(
        mergeProjectFiles({
          projectName: activeProject,
          files,
        }),
      );

      return files;
    },
    [workspaceId, activeProject, dispatch],
  );

  const switchBranch = useCallback(
    async (nextBranchName) => {
      const nextBranch = normalizeBranchValue(nextBranchName);

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      if (!nextBranch) {
        throw new Error("올바르지 않은 브랜치명입니다.");
      }

      if (nextBranch === currentBranch) return;

      const previousBranch =
        normalizeBranchValue(activeBranch) || DEFAULT_BRANCH;

      setIsSwitchingBranch(true);

      try {
        dispatch(closeAllFiles());
        dispatch(clearVirtualTree());
        dispatch(setActiveBranch(nextBranch));

        await refreshProjectTree(nextBranch);

        dispatch(writeToTerminal(`[Git] 브랜치 전환 완료: ${nextBranch}\n`));
      } catch (error) {
        dispatch(setActiveBranch(previousBranch));

        try {
          await refreshProjectTree(previousBranch);
        } catch {
          // rollback 중 파일 트리 갱신 실패는 무시
        }

        throw new Error(
          `브랜치 전환 실패: ${
            error?.message || "알 수 없는 오류가 발생했습니다."
          }`,
        );
      } finally {
        setIsSwitchingBranch(false);
      }
    },
    [
      workspaceId,
      activeProject,
      currentBranch,
      activeBranch,
      dispatch,
      refreshProjectTree,
    ],
  );

  const createBranch = useCallback(
    async (rawBranchName) => {
      const branchName = normalizeBranchValue(rawBranchName);
      const validationMessage = validateBranchName(branchName, branches);

      if (validationMessage) {
        throw new Error(validationMessage);
      }

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      setIsCreatingBranch(true);

      try {
        await createBranchApi(workspaceId, activeProject, branchName);

        setBranches((prev) => normalizeBranchList([...prev, branchName]));

        await switchBranch(branchName);

        dispatch(writeToTerminal(`[Git] 브랜치 생성 완료: ${branchName}\n`));

        return branchName;
      } finally {
        setIsCreatingBranch(false);
      }
    },
    [workspaceId, activeProject, branches, switchBranch, dispatch],
  );

  const deleteBranch = useCallback(
    async (branchName) => {
      const targetBranch = normalizeBranchValue(branchName);

      if (!targetBranch) return;

      if (isProtectedBranch(targetBranch)) {
        throw new Error("master/main 브랜치는 삭제할 수 없습니다.");
      }

      if (targetBranch === currentBranch) {
        throw new Error(
          "현재 체크아웃 중인 브랜치는 삭제할 수 없습니다. 다른 브랜치로 이동한 뒤 삭제하세요.",
        );
      }

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      setIsDeletingBranchName(targetBranch);

      try {
        await deleteBranchApi(workspaceId, activeProject, targetBranch);

        setBranches((prev) =>
          normalizeBranchList(prev.filter((branch) => branch !== targetBranch)),
        );

        dispatch(writeToTerminal(`[Git] 브랜치 삭제 완료: ${targetBranch}\n`));
      } finally {
        setIsDeletingBranchName("");
      }
    },
    [workspaceId, activeProject, currentBranch, dispatch],
  );

  const createSandbox = useCallback(
    async (rawTaskName) => {
      if (!isTeamMode) {
        throw new Error("샌드박스는 팀 모드에서만 사용할 수 있습니다.");
      }

      if (currentBranch !== DEFAULT_BRANCH) {
        throw new Error("샌드박스는 master 브랜치에서만 생성할 수 있습니다.");
      }

      const taskName = sanitizeSandboxTaskName(rawTaskName);

      if (!taskName) {
        throw new Error("작업명을 입력해주세요.");
      }

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      setIsCreatingSandbox(true);

      try {
        const sandboxResponse = await createSandboxApi(
          workspaceId,
          activeProject,
          currentNickname || "dev",
          taskName,
        );

        const sandboxBranchName = extractSandboxBranchName(sandboxResponse);

        setBranches((prev) => normalizeBranchList([...prev, sandboxBranchName]));

        await switchBranch(sandboxBranchName);

        dispatch(
          writeToTerminal(`[Git] 샌드박스 생성 완료: ${sandboxBranchName}\n`),
        );

        return sandboxBranchName;
      } finally {
        setIsCreatingSandbox(false);
      }
    },
    [
      isTeamMode,
      currentBranch,
      workspaceId,
      activeProject,
      currentNickname,
      switchBranch,
      dispatch,
    ],
  );

  const applySandbox = useCallback(
    async ({ fileContents = {}, commitMessage }) => {
      if (!isTeamMode) {
        throw new Error("샌드박스 병합은 팀 모드에서만 사용할 수 있습니다.");
      }

      const sandboxBranch = normalizeBranchValue(activeBranch);

      if (!isSandboxBranch(sandboxBranch)) {
        throw new Error("샌드박스 브랜치에서만 메인 병합을 실행할 수 있습니다.");
      }

      const message = String(commitMessage || "").trim();

      if (!message) {
        throw new Error("병합 전 남길 커밋 메시지를 입력해주세요.");
      }

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      setIsApplyingSandbox(true);

      try {
        const entries = Object.entries(fileContents || {}).filter(
          ([path]) => path && !String(path).startsWith("virtual:"),
        );

        if (entries.length > 0) {
          await Promise.all(
            entries.map(([path, content]) =>
              saveFileApi(
                workspaceId,
                activeProject,
                sandboxBranch,
                path,
                content || "",
              ),
            ),
          );
        }

        const resultPayload = await applySandboxApi(
          workspaceId,
          activeProject,
          sandboxBranch,
          DEFAULT_BRANCH,
          message,
          currentNickname || "dev",
        );

        const resultMessage = getSandboxResultMessage(
          resultPayload,
          "성공적으로 메인(master) 코드에 반영되었습니다.",
        );

        dispatch(closeAllFiles());
        dispatch(clearVirtualTree());
        dispatch(setActiveBranch(DEFAULT_BRANCH));

        await refreshProjectTree(DEFAULT_BRANCH);
        await loadBranches();

        dispatch(
          writeToTerminal(
            "[Git] 샌드박스 병합 완료. master 브랜치로 이동했습니다.\n",
          ),
        );

        return resultMessage;
      } finally {
        setIsApplyingSandbox(false);
      }
    },
    [
      isTeamMode,
      workspaceId,
      activeProject,
      activeBranch,
      currentNickname,
      dispatch,
      refreshProjectTree,
      loadBranches,
    ],
  );

  useEffect(() => {
    loadBranches().catch((error) => {
      console.error("브랜치 목록 로드 실패:", error);
    });
  }, [loadBranches]);

  return {
    branches,
    visibleBranches,
    currentBranch,
    isSandboxMode,

    isLoadingBranches,
    isSwitchingBranch,
    isCreatingBranch,
    isDeletingBranchName,
    isCreatingSandbox,
    isApplyingSandbox,

    loadBranches,
    refreshProjectTree,
    switchBranch,
    createBranch,
    deleteBranch,
    createSandbox,
    applySandbox,
  };
}