// 경로: src/hooks/ide/useWorkspaceEntry.ts
"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  closeAllFiles,
  mergeProjectFiles,
  setActiveBranch,
  setActiveProject,
  setExpandedFolders,
  setProjectList,
  setWorkspaceId,
  setWorkspaceTree,
} from "@/store/slices/fileSystemSlice";
import {
  fetchBranchListApi,
  fetchProjectFilesApi,
  fetchWorkspaceProjectsApi,
} from "@/lib/ide/api";

const DEFAULT_BRANCH = "master";

// 전부 펼치더라도 이 폴더들은 닫아 둔다. 파일이 수천 개라 펼치면
// 탐색기가 느려지고, 직접 고칠 일도 거의 없다.
const HEAVY_FOLDERS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".gradle",
  ".idea",
  "build",
  "dist",
  "out",
  "target",
  "bin",
  "__pycache__",
]);

type TreeNode = {
  id?: string;
  realPath?: string;
  name?: string;
  type?: string;
  children?: TreeNode[];
};

// Sidebar 의 FileTreeNode 가 펼침 여부를 node.id || node.realPath 로 판단하므로
// 같은 키를 모은다.
const collectFolderIds = (nodes: TreeNode[], ids: string[]) => {
  for (const node of nodes) {
    const type = String(node.type || "").toLowerCase();
    const isFolder = type === "folder" || Array.isArray(node.children);

    if (!isFolder || HEAVY_FOLDERS.has(String(node.name))) continue;

    const key = node.id || node.realPath;
    if (key) ids.push(key);

    collectFolderIds(node.children || [], ids);
  }
};

const toBranchName = (branch: unknown): string => {
  if (typeof branch === "string") return branch.trim();
  if (branch && typeof branch === "object") {
    const value = branch as { branchName?: string; name?: string };
    return String(value.branchName || value.name || "").trim();
  }
  return "";
};

// 워크스페이스에 들어올 때 시작 프로젝트와 브랜치를 자동으로 정한다.
//
// activeProject / activeBranch 는 Redux 에 있어서 다른 워크스페이스로 넘어가도
// 그대로 남는다. 예전에는 이전 워크스페이스의 브랜치(예: feature/x)로 새
// 워크스페이스의 트리를 요청해 탐색기가 열리지 않았고, 팀 모드는 시작
// 프로젝트를 매번 손으로 지정해야 했다.
//
// 그래서 들어오자마자 이전 값을 비우고, 프로젝트 목록을 받은 뒤
// "마지막에 쓰던 프로젝트(없으면 첫 프로젝트)" 와
// "그 프로젝트에 실제로 있는 브랜치(없으면 master)" 를 고른다.
export function useWorkspaceEntry(id: string | undefined) {
  const dispatch = useDispatch();
  const { workspaceId, activeProject, activeBranch } = useSelector(
    (state: {
      fileSystem: {
        workspaceId: string | null;
        activeProject: string | null;
        activeBranch: string | null;
      };
    }) => state.fileSystem,
  );

  useEffect(() => {
    if (!id) return undefined;

    // 늦게 도착한 응답이 이미 갈아탄 다른 워크스페이스에 쓰지 않게 한다.
    let cancelled = false;

    dispatch(closeAllFiles());
    dispatch(setWorkspaceId(id));
    dispatch(setActiveProject(null));
    dispatch(setActiveBranch(DEFAULT_BRANCH));
    dispatch(setExpandedFolders([]));

    const enter = async () => {
      const root = await fetchWorkspaceProjectsApi(id);
      if (cancelled) return;

      dispatch(setWorkspaceTree(root));

      const projects: Array<TreeNode & { name: string }> =
        root?.children || [];
      dispatch(setProjectList(projects));

      if (projects.length === 0) return;

      const savedProject = localStorage.getItem(`lastProject_${id}`);
      const savedBranch = localStorage.getItem(`lastBranch_${id}`);

      const restoredProject = projects.some((p) => p.name === savedProject);
      const targetProject = restoredProject
        ? (savedProject as string)
        : projects[0].name;

      // 저장된 브랜치는 저장된 프로젝트의 것이므로, 그 프로젝트를 복원했고
      // 브랜치가 아직 남아 있을 때만 쓴다.
      let targetBranch = DEFAULT_BRANCH;

      if (restoredProject && savedBranch && savedBranch !== DEFAULT_BRANCH) {
        try {
          const branches = await fetchBranchListApi(id, targetProject);
          if (cancelled) return;

          const exists = (Array.isArray(branches) ? branches : [])
            .map(toBranchName)
            .includes(savedBranch);

          if (exists) targetBranch = savedBranch;
        } catch (error) {
          console.error("브랜치 목록 확인 실패, master 로 엽니다:", error);
          if (cancelled) return;
        }
      }

      dispatch(setActiveProject(targetProject));
      dispatch(setActiveBranch(targetBranch));

      // 시작 프로젝트의 폴더를 처음부터 전부 펼쳐 둔다.
      // 들어올 때마다 폴더를 하나씩 눌러 여는 수고를 없애기 위해서다.
      try {
        const files = await fetchProjectFilesApi(
          id,
          targetProject,
          targetBranch,
        );
        if (cancelled) return;

        dispatch(mergeProjectFiles({ projectName: targetProject, files }));

        const projectNode = projects.find((p) => p.name === targetProject);
        const projectKey = projectNode?.id || projectNode?.realPath;
        const ids: string[] = projectKey ? [projectKey] : [];

        collectFolderIds(
          Array.isArray(files) ? files : files?.children || [],
          ids,
        );

        dispatch(setExpandedFolders(ids));
      } catch (error) {
        console.error("시작 프로젝트 폴더 펼치기 실패:", error);
      }
    };

    enter().catch((error) => {
      console.error("fetchWorkspaceProjectsApi error:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [id, dispatch]);

  // 다음에 들어올 때 복원할 값. 프로젝트가 정해지기 전(비우는 중)에는 쓰지 않는다.
  useEffect(() => {
    if (!workspaceId || !activeProject) return;

    localStorage.setItem(`lastProject_${workspaceId}`, activeProject);
    localStorage.setItem(
      `lastBranch_${workspaceId}`,
      activeBranch || DEFAULT_BRANCH,
    );
  }, [workspaceId, activeProject, activeBranch]);
}
