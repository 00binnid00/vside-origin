"use client";

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import { mergeProjectFiles } from "@/store/slices/fileSystemSlice";
import {
  setActiveBottomTab,
  toggleTerminal,
  writeToTerminal,
} from "@/store/slices/uiSlice";
import {
  fetchBranchListApi,
  fetchProjectFilesApi,
  fetchRemoteApi,
  pullFromRemoteApi,
  pushToRemoteApi,
} from "@/lib/ide/api";

export function useGitRemoteActions() {
  const dispatch = useDispatch();

  const { workspaceId, activeProject, activeBranch } = useSelector(
    (state) => state.fileSystem,
  );

  const { isTerminalVisible } = useSelector((state) => state.ui);

  const ensureTerminal = useCallback(() => {
    if (!isTerminalVisible) {
      dispatch(toggleTerminal());
    }

    dispatch(setActiveBottomTab("terminal"));
  }, [dispatch, isTerminalVisible]);

  const getCurrentContext = useCallback(() => {
    if (!workspaceId || !activeProject) {
      throw new Error("프로젝트를 먼저 선택해주세요.");
    }

    return {
      workspaceId,
      projectName: activeProject,
      branchName: activeBranch || "master",
    };
  }, [workspaceId, activeProject, activeBranch]);

  const handleGithubAuthRequired = useCallback((error) => {
    if (error?.code === "GITHUB_AUTH_REQUIRED") {
      alert(
        "GitHub 계정 연동이 필요합니다. 마이페이지에서 GitHub 연동을 먼저 진행해주세요.",
      );

      return true;
    }

    return false;
  }, []);

  const refreshCurrentProjectTree = useCallback(
    async ({ workspaceId, projectName, branchName }) => {
      const files = await fetchProjectFilesApi(
        workspaceId,
        projectName,
        branchName,
      );

      dispatch(
        mergeProjectFiles({
          projectName,
          files,
        }),
      );

      return files;
    },
    [dispatch],
  );

  /**
   * Fetch
   *
   * 원격 저장소의 최신 refs 정보를 가져오지만,
   * 현재 브랜치에 merge하지는 않습니다.
   */
  const fetchRemote = useCallback(async () => {
    let context;

    try {
      context = getCurrentContext();
    } catch (error) {
      alert(error.message);
      return;
    }

    ensureTerminal();
    dispatch(
      writeToTerminal(
        `[Git] Fetch 시작: ${context.projectName}/${context.branchName}\n`,
      ),
    );

    try {
      await fetchRemoteApi(
        context.workspaceId,
        context.projectName,
        context.branchName,
      );

      await fetchBranchListApi(context.workspaceId, context.projectName);

      dispatch(writeToTerminal("[Git] Fetch 완료. 원격 정보를 갱신했습니다.\n"));
    } catch (error) {
      handleGithubAuthRequired(error);

      dispatch(
        writeToTerminal(
          `[Git] Fetch 실패: ${error?.message || "알 수 없는 오류"}\n`,
        ),
      );
    }
  }, [
    getCurrentContext,
    ensureTerminal,
    dispatch,
    handleGithubAuthRequired,
  ]);

  const pullFromRemote = useCallback(async () => {
    let context;

    try {
      context = getCurrentContext();
    } catch (error) {
      alert(error.message);
      return;
    }

    ensureTerminal();
    dispatch(
      writeToTerminal(
        `[Git] Pull 시작: ${context.projectName}/${context.branchName}\n`,
      ),
    );

    try {
      await pullFromRemoteApi(
        context.workspaceId,
        context.projectName,
        context.branchName,
      );

      await refreshCurrentProjectTree(context);

      dispatch(writeToTerminal("[Git] Pull 완료. 파일 트리를 갱신했습니다.\n"));
    } catch (error) {
      handleGithubAuthRequired(error);

      dispatch(
        writeToTerminal(
          `[Git] Pull 실패: ${error?.message || "알 수 없는 오류"}\n`,
        ),
      );
    }
  }, [
    getCurrentContext,
    ensureTerminal,
    dispatch,
    refreshCurrentProjectTree,
    handleGithubAuthRequired,
  ]);

  const pushToRemote = useCallback(async () => {
    let context;

    try {
      context = getCurrentContext();
    } catch (error) {
      alert(error.message);
      return;
    }

    ensureTerminal();
    dispatch(
      writeToTerminal(
        `[Git] Push 시작: ${context.projectName}/${context.branchName}\n`,
      ),
    );

    try {
      await pushToRemoteApi(
        context.workspaceId,
        context.projectName,
        context.branchName,
      );

      dispatch(writeToTerminal("[Git] Push 완료.\n"));
    } catch (error) {
      handleGithubAuthRequired(error);

      dispatch(
        writeToTerminal(
          `[Git] Push 실패: ${error?.message || "알 수 없는 오류"}\n`,
        ),
      );
    }
  }, [
    getCurrentContext,
    ensureTerminal,
    dispatch,
    handleGithubAuthRequired,
  ]);

  return {
    fetchRemote,
    pullFromRemote,
    pushToRemote,
  };
}