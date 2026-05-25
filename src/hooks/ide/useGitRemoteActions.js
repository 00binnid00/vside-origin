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
  fetchProjectFilesApi,
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

  const pullFromRemote = useCallback(async () => {
    if (!workspaceId || !activeProject) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }

    const branchName = activeBranch || "master";

    ensureTerminal();
    dispatch(writeToTerminal(`[Git] Pull 시작: ${activeProject}/${branchName}\n`));

    try {
      await pullFromRemoteApi(workspaceId, activeProject, branchName);

      const files = await fetchProjectFilesApi(
        workspaceId,
        activeProject,
        branchName,
      );

      dispatch(
        mergeProjectFiles({
          projectName: activeProject,
          files,
        }),
      );

      dispatch(writeToTerminal("[Git] Pull 완료. 파일 트리를 갱신했습니다.\n"));
    } catch (error) {
      if (error?.code === "GITHUB_AUTH_REQUIRED") {
        alert(
          "GitHub 계정 연동이 필요합니다. 마이페이지에서 GitHub 연동을 먼저 진행해주세요.",
        );
      }

      dispatch(
        writeToTerminal(
          `[Git] Pull 실패: ${error?.message || "알 수 없는 오류"}\n`,
        ),
      );
    }
  }, [workspaceId, activeProject, activeBranch, ensureTerminal, dispatch]);

  const pushToRemote = useCallback(async () => {
    if (!workspaceId || !activeProject) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }

    const branchName = activeBranch || "master";

    ensureTerminal();
    dispatch(writeToTerminal(`[Git] Push 시작: ${activeProject}/${branchName}\n`));

    try {
      await pushToRemoteApi(workspaceId, activeProject, branchName);
      dispatch(writeToTerminal("[Git] Push 완료.\n"));
    } catch (error) {
      if (error?.code === "GITHUB_AUTH_REQUIRED") {
        alert(
          "GitHub 계정 연동이 필요합니다. 마이페이지에서 GitHub 연동을 먼저 진행해주세요.",
        );
      }

      dispatch(
        writeToTerminal(
          `[Git] Push 실패: ${error?.message || "알 수 없는 오류"}\n`,
        ),
      );
    }
  }, [workspaceId, activeProject, activeBranch, ensureTerminal, dispatch]);

  return {
    pullFromRemote,
    pushToRemote,
  };
}