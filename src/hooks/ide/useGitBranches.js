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

export const isProtectedBranch = (branchName) => {
  return PROTECTED_BRANCHES.includes(String(branchName || "").toLowerCase());
};

export const isSandboxBranch = (branchName) => {
  const normalized = String(branchName || "");
  return normalized.startsWith("focus-") || normalized.startsWith("focus/");
};

const normalizeBranchList = (branches) => {
  const uniqueBranches = Array.from(
    new Set(
      (Array.isArray(branches) ? branches : [])
        .map((branch) => String(branch || "").trim())
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
  const branchName = String(rawBranchName || "").trim();

  if (!branchName) return "브랜치명을 입력해주세요.";
  if (branchName.length > 120) return "브랜치명은 120자 이하로 입력해주세요.";

  const lowerBranchName = branchName.toLowerCase();

  if (isProtectedBranch(branchName)) {
    return "master/main 브랜치는 새로 만들 수 없습니다.";
  }

  if (RESERVED_BRANCH_NAMES.has(lowerBranchName)) {
    return "Git 예약어는 브랜치명으로 사용할 수 없습니다.";
  }

  if (
    branches.some(
      (branch) => String(branch || "").toLowerCase() === lowerBranchName,
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

  const currentBranch = activeProject
    ? activeBranch || DEFAULT_BRANCH
    : "No Project";

  const isSandboxMode = Boolean(activeProject) && isSandboxBranch(currentBranch);

  const visibleBranches = useMemo(() => {
    if (mode !== "team") return branches;

    const nickname = String(currentNickname || "dev");

    return branches.filter((branch) => {
      if (isSandboxBranch(branch)) {
        return (
          branch.startsWith(`focus-${nickname}-`) ||
          branch.startsWith(`focus/${nickname}/`)
        );
      }

      return true;
    });
  }, [branches, currentNickname, mode]);

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

      const files = await fetchProjectFilesApi(
        workspaceId,
        activeProject,
        branchName || DEFAULT_BRANCH,
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
      const nextBranch = String(nextBranchName || "").trim();

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      if (!nextBranch || nextBranch === currentBranch) return;

      const previousBranch = activeBranch || DEFAULT_BRANCH;

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
      const branchName = String(rawBranchName || "").trim();
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
      const targetBranch = String(branchName || "").trim();

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
      const taskName = sanitizeSandboxTaskName(rawTaskName);

      if (!taskName) {
        throw new Error("작업명을 입력해주세요.");
      }

      if (!workspaceId || !activeProject) {
        throw new Error("프로젝트를 먼저 선택해주세요.");
      }

      setIsCreatingSandbox(true);

      try {
        const sandboxBranchName = await createSandboxApi(
          workspaceId,
          activeProject,
          currentNickname || "dev",
          taskName,
        );

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
    [workspaceId, activeProject, currentNickname, switchBranch, dispatch],
  );

  const applySandbox = useCallback(
    async ({ fileContents = {}, commitMessage }) => {
      const message = String(commitMessage || "").trim();

      if (!isSandboxMode) {
        throw new Error("샌드박스 브랜치에서만 메인 병합을 실행할 수 있습니다.");
      }

      if (!message) {
        throw new Error("병합 전 남길 커밋 메시지를 입력해주세요.");
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
                activeBranch || DEFAULT_BRANCH,
                path,
                content || "",
              ),
            ),
          );
        }

        const resultMessage = await applySandboxApi(
          workspaceId,
          activeProject,
          activeBranch,
          message,
          currentNickname || "dev",
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
      workspaceId,
      activeProject,
      activeBranch,
      currentNickname,
      isSandboxMode,
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