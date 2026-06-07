"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  VscCollapseAll,
  VscEdit,
  VscChevronDown,
  VscChevronRight,
  VscChevronLeft,
  VscFile,
  VscFolder,
  VscNewFile,
  VscNewFolder,
  VscRefresh,
  VscRepo,
  VscRocket,
  VscSparkle,
  VscTrash,
  VscSymbolClass,
  VscSymbolMisc,
} from "react-icons/vsc";
import {
  DiJava,
  DiJsBadge,
  DiMarkdown,
  DiPython,
  DiReact,
} from "react-icons/di";

import {
  openFile,
  closeFilesByPath,
  updateFileContent,
  setActiveProject,
  setWorkspaceTree,
  mergeProjectFiles,
  clearVirtualTree,
  collapseAllFolders,
} from "@/store/slices/fileSystemSlice";

import {
  startCreation,
  endCreation,
  writeToTerminal,
  toggleSidebar,
} from "@/store/slices/uiSlice";

import {
  createFileApi,
  fetchProjectFilesApi,
  deleteFileApi,
  fetchFileContentApi,
  fetchWorkspaceProjectsApi,
  deactivateVirtualViewApi,
  saveFileApi,
} from "@/lib/ide/api";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

const getFileIcon = (name) => {
  if (!name) return <VscFile className="text-gray-400" />;

  const ext = name.split(".").pop().toLowerCase();

  switch (ext) {
    case "java":
      return <DiJava className="text-orange-500 text-lg" />;
    case "py":
      return <DiPython className="text-blue-500 text-lg" />;
    case "js":
      return <DiJsBadge className="text-yellow-400 text-lg" />;
    case "jsx":
    case "tsx":
      return <DiReact className="text-blue-400 text-lg" />;
    case "md":
      return <DiMarkdown className="text-gray-500 text-lg" />;
    default:
      return <VscFile className="text-gray-500 text-lg" />;
  }
};

const FileTreeItem = ({
  node,
  depth,
  projectName,
  onExpandProject,
  onFileClick,
  onContextMenu,
  pendingCreation,
  handleInputKeyDown,
  confirmInput,
}) => {
  const { activeFileId, activeProject, expandedFolders } = useSelector(
    (state) => state.fileSystem,
  );

  const isExpanded = expandedFolders.includes(node.id || node.realPath);
  const inlineInputRef = useRef(null);
  const dispatch = useDispatch();

  const currentProjectName = node.type === "project" ? node.name : projectName;
  const nodeType = (node.type || "file").toLowerCase();

  const isProject = nodeType === "project";
  const isFolder = nodeType === "folder" || nodeType === "virtual_folder";
  const isFile = nodeType === "file" || (!isProject && !isFolder && !node.children);

  const isCreatingHere =
    pendingCreation && pendingCreation.parentId === (node.realPath || node.id);

  useEffect(() => {
    if (isCreatingHere && inlineInputRef.current) {
      inlineInputRef.current.focus();

      if (!isExpanded && (isFolder || isProject)) {
        dispatch({
          type: "fileSystem/toggleFolder",
          payload: node.id || node.realPath,
        });
      }
    }
  }, [
    isCreatingHere,
    isExpanded,
    isFolder,
    isProject,
    node.id,
    node.realPath,
    dispatch,
  ]);

  const getIcon = () => {
    if (isProject) return <VscRepo className="text-blue-600" />;
    if (isFolder) return <VscFolder className="text-yellow-500" />;
    return getFileIcon(node.name);
  };

  const handleClick = async (e) => {
    e.stopPropagation();

    if (isProject) {
      if (!isExpanded && (!node.children || node.children.length === 0)) {
        await onExpandProject(node.name);
      }

      dispatch({
        type: "fileSystem/toggleFolder",
        payload: node.id || node.realPath,
      });
    } else if (isFolder) {
      dispatch({
        type: "fileSystem/toggleFolder",
        payload: node.id || node.realPath,
      });
    } else {
      onFileClick(node, currentProjectName);
    }
  };

  const isSelected = activeFileId === (node.realPath || node.id);
  const isStartupProject = isProject && activeProject === node.name;

  return (
    <div className="select-none font-sans mt-[1px]">
      <div
        className={`flex items-center justify-between py-1.5 px-3 cursor-pointer text-[13px] transition-all duration-200 border-l-[3px] 
          ${
            isSelected
              ? "bg-blue-50 text-blue-700 border-blue-500 font-extrabold shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]"
              : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
          }
          ${isStartupProject && !isSelected ? "bg-slate-50 border-slate-200" : ""}
        `}
        style={{ paddingLeft: `${depth * 12 + 10}px` }}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu(e, node, currentProjectName)}
      >
        <div className="flex items-center overflow-hidden group">
          <span className="mr-1.5 opacity-60 text-gray-500 shrink-0">
            {(isFolder || isProject) &&
              (isExpanded ? (
                <VscChevronDown size={14} />
              ) : (
                <VscChevronRight size={14} />
              ))}
            {isFile && <span className="w-[14px] inline-block" />}
          </span>

          <span className="mr-2 shrink-0">{getIcon()}</span>

          <span
            className={`truncate tracking-wide ${
              node.name?.startsWith(".") ? "opacity-50" : ""
            } ${isStartupProject ? "font-bold text-blue-700" : ""}`}
          >
            {node.name}
          </span>

          {node.realPath && (
            <span className="ml-2 text-[10px] text-gray-400 font-mono opacity-0 group-hover:opacity-100 truncate max-w-[120px]">
              {node.realPath}
            </span>
          )}
        </div>

        {isStartupProject && (
          <span className="shrink-0 ml-2 text-[9px] font-black text-blue-500 bg-blue-100/50 px-1.5 py-0.5 rounded border border-blue-100">
            시작 프로젝트
          </span>
        )}
      </div>

      {isCreatingHere && (
        <div
          className="py-1 pr-4"
          style={{ paddingLeft: `${(depth + 1) * 12 + 28}px` }}
        >
          <input
            ref={inlineInputRef}
            className="bg-white text-gray-800 border-2 border-blue-400 focus:border-blue-600 outline-none w-full h-8 px-2 text-xs font-bold rounded shadow-sm transition-colors"
            onKeyDown={(e) => handleInputKeyDown(e, pendingCreation.parentId)}
            onBlur={(e) =>
              confirmInput(e.target.value.trim(), pendingCreation.parentId)
            }
            placeholder={
              pendingCreation.type === "package"
                ? "예: domain.user.dto"
                : pendingCreation.type === "java"
                  ? "클래스명 (예: UserController)"
                  : "이름을 입력하세요..."
            }
          />
        </div>
      )}

      {isExpanded && Array.isArray(node.children) && (
        <div>
          {node.children
            .filter(
              (child) =>
                child.name !== "$$codemap$$" &&
                !child.name?.includes("$$codemap$$"),
            )
            .map((child, idx) => (
              <FileTreeItem
                key={child.id || child.realPath || idx}
                node={child}
                depth={depth + 1}
                projectName={currentProjectName}
                onExpandProject={onExpandProject}
                onFileClick={onFileClick}
                onContextMenu={onContextMenu}
                pendingCreation={pendingCreation}
                handleInputKeyDown={handleInputKeyDown}
                confirmInput={confirmInput}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default function Sidebar() {
  const dispatch = useDispatch();

  const {
    tree,
    virtualTree,
    workspaceId,
    activeProject,
    activeBranch,
  } = useSelector((state) => state.fileSystem);

  const { isSidebarVisible, pendingCreation } = useSelector(
    (state) => state.ui,
  );

  const isVirtualMode = virtualTree !== null && virtualTree !== undefined;
  const inputRef = useRef(null);
  const fileTreeRefreshTimerRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);

  const handleExpandProject = useCallback(
    async (projectName) => {
      if (isVirtualMode) return;
      if (!workspaceId || !projectName) return;

      try {
        const branchToFetch =
          projectName === activeProject && activeBranch
            ? activeBranch
            : "master";

        const files = await fetchProjectFilesApi(
          workspaceId,
          projectName,
          branchToFetch,
        );

        dispatch(mergeProjectFiles({ projectName, files }));
      } catch (e) {
        console.error("파일 로드 실패:", e);
      }
    },
    [workspaceId, activeProject, activeBranch, isVirtualMode, dispatch],
  );

  useEffect(() => {
    if (workspaceId && activeProject && !isVirtualMode) {
      handleExpandProject(activeProject);
    }
  }, [activeBranch, workspaceId, activeProject, isVirtualMode, handleExpandProject]);

  const handleFileClick = async (node, realProjectName) => {
    let targetProject = realProjectName || activeProject;
    let targetFilePath = node.id || node.name;

    if (isVirtualMode && node.realPath) {
      const pathParts = node.realPath.split("/");
      targetProject = pathParts[0];
      targetFilePath = pathParts.slice(1).join("/");
    }

    const fileToOpen = {
      ...node,
      id: isVirtualMode ? node.realPath : node.id,
      type: "file",
    };

    dispatch(openFile(fileToOpen));

    try {
      const branchToFetch =
        targetProject === activeProject && activeBranch
          ? activeBranch
          : "master";

      const content = await fetchFileContentApi(
        workspaceId,
        targetProject,
        branchToFetch,
        targetFilePath,
      );

      dispatch(
        updateFileContent({
          filePath: fileToOpen.id,
          content,
        }),
      );
    } catch (e) {
      console.error("파일 내용 로드 실패:", e);
    }
  };

  const refreshWorkspace = useCallback(async () => {
    if (!workspaceId || isVirtualMode) return;

    try {
      const rootNode = await fetchWorkspaceProjectsApi(workspaceId);
      dispatch(setWorkspaceTree(rootNode));

      if (activeProject) {
        await handleExpandProject(activeProject);
      }
    } catch (e) {
      console.error("워크스페이스 새로고침 실패:", e);
    }
  }, [
    workspaceId,
    isVirtualMode,
    activeProject,
    dispatch,
    handleExpandProject,
  ]);

  useEffect(() => {
    if (!workspaceId || !activeProject || isVirtualMode) return;

    const branchName = activeBranch || "master";
    const room = `workspace:${workspaceId}:project:${activeProject}:branch:${branchName}`;

    const ws = new WebSocket(
      `${WS_BASE}/ws/workspace-events?room=${encodeURIComponent(room)}`,
    );

    ws.onopen = () => {
      console.log("📁 [WorkspaceEvents] 연결됨:", room);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type !== "FILE_TREE_CHANGED") return;

        const sameWorkspace = String(message.workspaceId) === String(workspaceId);
        const sameProject = message.projectName === activeProject;
        const sameBranch = (message.branchName || "master") === branchName;

        if (!sameWorkspace || !sameProject || !sameBranch) return;

        console.log("🔄 [WorkspaceEvents] 파일 트리 변경 감지:", message);

        if (fileTreeRefreshTimerRef.current) {
          clearTimeout(fileTreeRefreshTimerRef.current);
        }

        fileTreeRefreshTimerRef.current = setTimeout(() => {
          handleExpandProject(message.projectName);
        }, 100);
      } catch (error) {
        console.error("WorkspaceEvents 메시지 처리 실패:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ [WorkspaceEvents] 오류:", error);
    };

    ws.onclose = () => {
      console.log("👋 [WorkspaceEvents] 연결 종료:", room);
    };

    return () => {
      if (fileTreeRefreshTimerRef.current) {
        clearTimeout(fileTreeRefreshTimerRef.current);
      }

      ws.close();
    };
  }, [
    workspaceId,
    activeProject,
    activeBranch,
    isVirtualMode,
    handleExpandProject,
  ]);

  const handleDeactivateVirtualView = async () => {
    if (!window.confirm("가상 뷰를 해제하고 원본 파일 구조로 돌아가시겠습니까?")) {
      return;
    }

    try {
      await deactivateVirtualViewApi(workspaceId, activeBranch);
      dispatch(clearVirtualTree());
    } catch (error) {
      alert("가상 뷰 해제에 실패했습니다: " + error.message);
    }
  };

  useEffect(() => {
    if (
      pendingCreation &&
      pendingCreation.parentId === "root-folder" &&
      inputRef.current
    ) {
      inputRef.current.focus();
    }
  }, [pendingCreation]);

  const confirmInput = async (name, parentId) => {
    if (!name) {
      dispatch(endCreation());
      return;
    }

    try {
      let finalName = name;
      let apiType = pendingCreation.type;
      let skeletonCode = "";

      if (apiType === "package") {
        finalName = name.replace(/\./g, "/");
        apiType = "folder";
      } else if (apiType === "java") {
        finalName = name.endsWith(".java") ? name : `${name}.java`;
        apiType = "file";

        const className = finalName.replace(".java", "");

        let packageName = "";
        if (parentId && parentId.includes("src/main/java/")) {
          packageName = parentId.split("src/main/java/")[1].replace(/\//g, ".");
        } else if (parentId && parentId !== "root-folder") {
          packageName = parentId.replace(/\//g, ".");
        }

        skeletonCode = packageName
          ? `package ${packageName};\n\npublic class ${className} {\n    \n}\n`
          : `public class ${className} {\n    \n}\n`;
      }

      let path = finalName;

      if (parentId !== "root-folder" && parentId !== "") {
        path = parentId + "/" + finalName;
      }

      await createFileApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        path,
        apiType,
      );

      if (parentId === "root-folder" && apiType === "folder") {
        dispatch(setActiveProject(finalName));
        dispatch(
          writeToTerminal(
            `[System] 새 프로젝트 '${finalName}' 이(가) 시작 프로젝트로 자동 지정되었습니다.\n`,
          ),
        );
        handleExpandProject(finalName);
      } else {
        handleExpandProject(activeProject);
      }

      if (apiType === "file") {
        dispatch(
          openFile({
            id: path,
            name: finalName,
            type: "file",
          }),
        );

        if (skeletonCode) {
          dispatch(
            updateFileContent({
              filePath: path,
              content: skeletonCode,
            }),
          );

          try {
            await saveFileApi(
              workspaceId,
              activeProject,
              activeBranch || "master",
              path,
              skeletonCode,
            );

            dispatch(
              writeToTerminal(
                `[System] ${finalName} 템플릿 생성 및 자동 저장 완료!\n`,
              ),
            );
          } catch (saveError) {
            console.error("자동 저장 에러:", saveError);
            dispatch(
              writeToTerminal(
                `[System] 파일은 생성되었으나 자동 저장에 실패했습니다. (직접 저장해주세요)\n`,
              ),
            );
          }
        }
      }
    } catch (e) {
      alert(e.message);
    }

    dispatch(endCreation());
  };

  const handleInputKeyDown = (e, parentId) => {
    if (e.key === "Enter") {
      confirmInput(e.target.value.trim(), parentId);
    }

    if (e.key === "Escape") {
      dispatch(endCreation());
    }
  };

  const handleContextMenu = (e, node, projectName) => {
    e.preventDefault();
    e.stopPropagation();

    if (isVirtualMode) return;

    const targetProj = projectName || activeProject;

    const isJavaEnv =
      targetProj?.toLowerCase().includes("스프링") ||
      targetProj?.toLowerCase().includes("java") ||
      targetProj?.toLowerCase().includes("demo");

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      fileId: node.id,
      path: node.id,
      type: node.type,
      isRoot: node.type === "project",
      isJavaEnv,
    });
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);

    window.addEventListener("click", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, []);

  const handleDelete = async () => {
    if (!contextMenu) return;

    if (!window.confirm(`정말 '${contextMenu.path}'을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteFileApi(
        workspaceId,
        activeProject,
        activeBranch || "master",
        contextMenu.path,
      );

      dispatch(closeFilesByPath(contextMenu.path));
      handleExpandProject(activeProject);
      setContextMenu(null);
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  };

  const startRename = () => {
    alert("이름 변경은 아직 지원하지 않습니다.");
  };

  const handleSetStartup = () => {
    if (!contextMenu) return;

    const targetProject = contextMenu.fileId;

    dispatch(setActiveProject(targetProject));
    dispatch(
      writeToTerminal(`[System] 시작 프로젝트가 변경되었습니다: ${targetProject}\n`),
    );

    setContextMenu(null);
  };

  const handleContextMenuNew = (creationType) => {
    if (!contextMenu) return;

    let parentId = contextMenu.path;

    if (contextMenu.type === "project") {
      parentId = "";
    } else if (contextMenu.type === "file") {
      const pathParts = parentId.split("/");
      pathParts.pop();
      parentId = pathParts.join("/");
    }

    dispatch(
      startCreation({
        type: creationType,
        parentId,
      }),
    );

    setContextMenu(null);
  };

  if (!isSidebarVisible) return null;

  const displayTreeChildren = isVirtualMode
    ? virtualTree.children
    : tree?.children || [];

  return (
    <div className="h-full w-full bg-white flex flex-col font-sans">
      <div className="flex items-center justify-between px-4 h-[44px] border-b border-gray-100 shrink-0 bg-white">
        <span className="text-[12px] font-black text-gray-800 tracking-wider ">
          <span className="min-w-0 truncate whitespace-nowrap">탐색기</span>
          
        </span>

        <div className="flex items-center gap-1 text-gray-500">
          {!isVirtualMode && (
            <>
              <button
                className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-blue-600"
                onClick={refreshWorkspace}
                title="새로고침"
              >
                <VscRefresh size={15} />
              </button>

              <button
                className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(
                    startCreation({
                      type: "file",
                      parentId: activeProject ? "" : "root-folder",
                    }),
                  );
                }}
                title="새 파일"
              >
                <VscNewFile size={15} />
              </button>

              <button
                className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch(
                    startCreation({
                      type: "folder",
                      parentId: activeProject ? "" : "root-folder",
                    }),
                  );
                }}
                title="새 폴더"
              >
                <VscNewFolder size={15} />
              </button>

              <div className="w-[1px] h-3 bg-gray-200 mx-1" />
            </>
          )}

          <button
            onClick={() => dispatch(collapseAllFolders())}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-gray-800"
            title="폴더 모두 접기"
          >
            <VscCollapseAll size={15} />
          </button>

          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400 hover:text-gray-800 ml-0.5"
            title="탐색기 닫기"
          >
            <VscChevronLeft size={16} />
          </button>
        </div>
      </div>

      {isVirtualMode && (
        <div className="flex flex-col px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 shrink-0 gap-2 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-extrabold text-indigo-700 flex items-center gap-1.5">
              <VscSparkle size={14} className="animate-pulse" /> AI 뷰 적용 중
            </span>

            <button
              onClick={handleDeactivateVirtualView}
              className="text-[10px] font-bold bg-white text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-md hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
            >
              원본 복구
            </button>
          </div>

          <span
            className="text-[11px] text-indigo-500 font-bold truncate"
            title={virtualTree.name}
          >
            적용된 뷰: {virtualTree.name}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar bg-[#fafafa]">
        {displayTreeChildren.length > 0 ? (
          displayTreeChildren.map((node, idx) => (
            <FileTreeItem
              key={node.id || node.realPath || node.name || idx}
              node={node}
              depth={0}
              projectName={isVirtualMode ? "" : node.name}
              onExpandProject={handleExpandProject}
              onFileClick={handleFileClick}
              onContextMenu={handleContextMenu}
              pendingCreation={pendingCreation}
              handleInputKeyDown={handleInputKeyDown}
              confirmInput={confirmInput}
            />
          ))
        ) : (
          <div className="p-4 text-xs font-bold text-gray-400 text-center mt-4 border-2 border-dashed border-gray-200 bg-white mx-4 rounded-xl">
            {isVirtualMode
              ? "가상 뷰에 파일이 없습니다."
              : "프로젝트가 없습니다. 상단에서 생성해주세요."}
          </div>
        )}

        {pendingCreation && pendingCreation.parentId === "root-folder" && (
          <div className="pl-6 pr-4 py-1.5 mt-2">
            <input
              ref={inputRef}
              autoFocus
              className="bg-white text-gray-800 border-2 border-blue-400 focus:border-blue-600 outline-none w-full h-8 px-2 text-xs font-bold rounded shadow-sm transition-colors"
              onKeyDown={(e) =>
                handleInputKeyDown(e, pendingCreation.parentId)
              }
              onBlur={(e) =>
                confirmInput(e.target.value.trim(), pendingCreation.parentId)
              }
              placeholder="이름을 입력하세요..."
            />
          </div>
        )}
      </div>

      {contextMenu && !isVirtualMode && (
        <div
          className="fixed bg-white border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.15)] rounded-xl py-2 w-56 z-[9999]"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          {contextMenu.isJavaEnv ? (
            <>
              <div
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
                onClick={() => handleContextMenuNew("java")}
              >
                <VscSymbolClass size={16} className="text-orange-500" />
                Java 클래스 (Class)
              </div>

              <div
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
                onClick={() => handleContextMenuNew("package")}
              >
                <VscSymbolMisc size={16} className="text-yellow-600" />
                패키지 (Package)
              </div>
            </>
          ) : (
            <>
              <div
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
                onClick={() => handleContextMenuNew("file")}
              >
                <VscNewFile size={16} className="text-gray-500" />
                새 파일 (New File)
              </div>

              <div
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
                onClick={() => handleContextMenuNew("folder")}
              >
                <VscNewFolder size={16} className="text-gray-500" />
                새 폴더 (New Folder)
              </div>
            </>
          )}

          <div className="h-[1px] bg-gray-100 my-1.5 mx-3" />

          {contextMenu.isRoot && (
            <>
              <div
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-[13px] flex items-center gap-2 text-blue-700 font-black transition-colors"
                onClick={handleSetStartup}
              >
                <VscRocket size={16} className="text-blue-500" />
                시작 프로젝트로 설정
              </div>

              <div className="h-[1px] bg-gray-100 my-1.5 mx-3" />
            </>
          )}

          <div
            className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-[13px] flex items-center gap-2 text-gray-700 font-bold transition-colors"
            onClick={startRename}
          >
            <VscEdit size={16} className="text-gray-500" />
            이름 변경
          </div>

          <div
            className="px-4 py-2 hover:bg-red-50 cursor-pointer text-[13px] flex items-center gap-2 text-red-600 font-bold transition-colors"
            onClick={handleDelete}
          >
            <VscTrash size={16} />
            삭제하기
          </div>
        </div>
      )}
    </div>
  );
}