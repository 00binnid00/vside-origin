"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  VscAdd,
  VscBeaker,
  VscCheck,
  VscChevronDown,
  VscClose,
  VscLock,
  VscRefresh,
  VscRocket,
  VscSourceControl,
  VscTrash,
} from "react-icons/vsc";

import {
  DEFAULT_BRANCH,
  isProtectedBranch,
  useGitBranches,
  validateBranchName,
} from "@/hooks/ide/useGitBranches";

export default function GitBranchControls({
  mode = "personal",
  workspaceId,
  activeProject,
  activeBranch,
  currentNickname = "dev",
  fileContents = {},
}) {
  const branchRef = useRef(null);

  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [isSandboxCreateModalOpen, setIsSandboxCreateModalOpen] =
    useState(false);
  const [sandboxTaskName, setSandboxTaskName] = useState("");
  const [isSandboxApplyModalOpen, setIsSandboxApplyModalOpen] = useState(false);
  const [mergeCommitMessage, setMergeCommitMessage] = useState("");
  const [fullScreenLoading, setFullScreenLoading] = useState({
    isOpen: false,
    text: "",
  });

  const {
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
    switchBranch,
    createBranch,
    deleteBranch,
    createSandbox,
    applySandbox,
  } = useGitBranches({
    workspaceId,
    activeProject,
    activeBranch,
    currentNickname,
    mode,
  });

  const branchNameError = useMemo(() => {
    if (!newBranchName.trim()) return "";
    return validateBranchName(newBranchName, branches);
  }, [newBranchName, branches]);

  const isBranchBusy =
    isLoadingBranches ||
    isSwitchingBranch ||
    isCreatingBranch ||
    Boolean(isDeletingBranchName);

  const isCreateDisabled =
    !newBranchName.trim() || Boolean(branchNameError) || isCreatingBranch;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (branchRef.current && !branchRef.current.contains(event.target)) {
        setIsBranchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key !== "Escape") return;

      setIsBranchOpen(false);
      setIsSandboxCreateModalOpen(false);
      setIsSandboxApplyModalOpen(false);
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const openBranchDropdown = () => {
    if (!activeProject) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }

    setIsBranchOpen((prev) => !prev);
  };

  const handleSelectBranch = async (branchName) => {
    if (!branchName || branchName === currentBranch || isBranchBusy) return;

    try {
      await switchBranch(branchName);
      setIsBranchOpen(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCreateBranch = async () => {
    if (isCreateDisabled) return;

    try {
      await createBranch(newBranchName);
      setNewBranchName("");
      setIsBranchOpen(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteBranch = async (event, branchName) => {
    event.stopPropagation();

    if (isProtectedBranch(branchName) || branchName === currentBranch) return;

    const confirmed = window.confirm(
      `정말 '${branchName}' 브랜치를 삭제하시겠습니까?\n삭제된 브랜치의 워크트리도 함께 제거됩니다.`,
    );

    if (!confirmed) return;

    try {
      await deleteBranch(branchName);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRefreshBranches = async (event) => {
    event.stopPropagation();

    try {
      await loadBranches();
    } catch (error) {
      alert(error.message);
    }
  };

  const executeCreateSandbox = async () => {
    if (!sandboxTaskName.trim()) {
      alert("작업명을 입력해주세요.");
      return;
    }

    setIsSandboxCreateModalOpen(false);
    setFullScreenLoading({
      isOpen: true,
      text: "격리된 샌드박스 환경을 구축하는 중입니다...",
    });

    try {
      await createSandbox(sandboxTaskName);
      setSandboxTaskName("");
    } catch (error) {
      alert(error.message);
    } finally {
      setTimeout(() => {
        setFullScreenLoading({ isOpen: false, text: "" });
      }, 500);
    }
  };

  const executeApplySandbox = async () => {
    if (!mergeCommitMessage.trim()) {
      alert("병합 전 남길 커밋 메시지를 입력해주세요.");
      return;
    }

    setIsSandboxApplyModalOpen(false);
    setFullScreenLoading({
      isOpen: true,
      text: "작업 내용을 저장하고 메인으로 합치는 중...",
    });

    try {
      const resultMessage = await applySandbox({
        fileContents,
        commitMessage: mergeCommitMessage,
      });

      setMergeCommitMessage("");
      alert(resultMessage || "성공적으로 메인(master) 코드에 반영되었습니다.");
    } catch (error) {
      alert(`병합 실패:\n${error.message}`);
    } finally {
      setTimeout(() => {
        setFullScreenLoading({ isOpen: false, text: "" });
      }, 500);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {mode === "team" && activeProject && currentBranch === DEFAULT_BRANCH && (
          <button
            onClick={() => setIsSandboxCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 active:scale-95 rounded-lg text-[12px] font-bold transition-all"
          >
            <VscLock size={14} /> 샌드박스 (개인작업)
          </button>
        )}

        {mode === "team" && activeProject && isSandboxMode && (
          <button
            onClick={() => setIsSandboxApplyModalOpen(true)}
            disabled={isApplyingSandbox}
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 active:scale-95 rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <VscRocket size={14} /> 메인 병합
          </button>
        )}

        <div className="relative" ref={branchRef}>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 h-8 border rounded-lg cursor-pointer transition-all text-[12px] font-bold ${
              isSandboxMode
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
            }`}
            onClick={openBranchDropdown}
          >
            <VscSourceControl
              size={14}
              className={isSandboxMode ? "text-indigo-500" : "text-blue-500"}
            />
            <span className="max-w-[120px] truncate">{currentBranch}</span>
            <VscChevronDown
              size={14}
              className={
                isBranchOpen
                  ? "rotate-180 transition-transform"
                  : "transition-transform text-gray-400"
              }
            />
          </button>

          {isBranchOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 shadow-xl rounded-xl py-2 z-[99999] animate-fade-in-up origin-top-right">
              <div className="px-4 pb-3 pt-1 border-b border-gray-100 mb-2 bg-gray-50/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                      <VscSourceControl /> Git Repository
                    </p>
                    <p className="text-[10px] text-gray-500 truncate mt-1 font-medium">
                      {activeProject}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRefreshBranches}
                    disabled={isLoadingBranches}
                    className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    title="브랜치 목록 새로고침"
                  >
                    <VscRefresh
                      size={14}
                      className={isLoadingBranches ? "animate-spin" : ""}
                    />
                  </button>
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto custom-scrollbar px-2 space-y-1">
                {visibleBranches.length === 0 && (
                  <div className="px-3 py-5 text-center text-[12px] text-gray-400">
                    표시할 브랜치가 없습니다.
                  </div>
                )}

                {visibleBranches.map((branch) => {
                  const isActive = branch === currentBranch;
                  const isProtected = isProtectedBranch(branch);
                  const isDeleting = isDeletingBranchName === branch;
                  const canDelete = !isActive && !isProtected && !isDeleting;

                  return (
                    <div
                      key={branch}
                      onClick={() => handleSelectBranch(branch)}
                      className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg font-medium transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : isBranchBusy
                            ? "text-gray-400 cursor-wait"
                            : "text-gray-600 hover:bg-gray-50 hover:text-blue-600 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <VscSourceControl
                          className={isActive ? "text-blue-500" : "text-gray-400"}
                        />
                        <span className="truncate">{branch}</span>
                        {isActive && <VscCheck size={13} className="shrink-0" />}
                      </div>

                      {!isProtected && (
                        <button
                          type="button"
                          onClick={(event) => handleDeleteBranch(event, branch)}
                          disabled={!canDelete}
                          className={`p-1 rounded transition-colors ${
                            canDelete
                              ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
                              : "text-gray-300 cursor-not-allowed"
                          }`}
                          title={
                            isActive
                              ? "현재 브랜치는 삭제할 수 없습니다."
                              : "브랜치 삭제"
                          }
                        >
                          {isDeleting ? (
                            <VscRefresh size={14} className="animate-spin" />
                          ) : (
                            <VscTrash size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100 px-3">
                <label className="block text-[10px] font-black text-gray-500 mb-1.5">
                  새 브랜치 생성
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBranchName}
                    onChange={(event) => setNewBranchName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreateBranch();
                      }

                      if (event.key === "Escape") {
                        setNewBranchName("");
                      }
                    }}
                    placeholder="feature/login-ui"
                    className="min-w-0 flex-1 h-8 px-3 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                  />

                  <button
                    type="button"
                    onClick={handleCreateBranch}
                    disabled={isCreateDisabled}
                    className="h-8 px-3 rounded-lg bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {isCreatingBranch ? (
                      <VscRefresh size={14} className="animate-spin" />
                    ) : (
                      <VscAdd size={14} />
                    )}
                  </button>
                </div>

                {branchNameError && (
                  <p className="mt-1.5 text-[10px] font-medium text-red-500">
                    {branchNameError}
                  </p>
                )}

                <p className="mt-1.5 text-[10px] text-gray-400">
                  예: feature/login, fix/sidebar-refresh, hotfix/build-error
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {fullScreenLoading.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center animate-fade-in">
          <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl flex flex-col items-center justify-center animate-pulse">
            <VscBeaker className="text-indigo-400 mb-4 animate-bounce" size={48} />
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {fullScreenLoading.text}
            </h2>
            <div className="w-48 h-1 bg-indigo-900/50 rounded-full mt-5 overflow-hidden">
              <div className="w-1/2 h-full bg-indigo-400 rounded-full animate-[ping_1.5s_ease-in-out_infinite]"></div>
            </div>
          </div>
        </div>
      )}

      {isSandboxCreateModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setIsSandboxCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[440px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-indigo-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-indigo-100 p-1.5 rounded-lg">
                    <VscLock className="text-indigo-600" size={20} />
                  </div>
                  <h2 className="text-xl font-black text-indigo-900 tracking-tight">
                    나만의 집중 공간 만들기
                  </h2>
                </div>
                <p className="text-[13px] text-indigo-700/80 font-medium">
                  다른 팀원에게 영향을 주지 않고 코드를 테스트해보세요.
                </p>
              </div>

              <button
                onClick={() => setIsSandboxCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-800 bg-white/50 hover:bg-white p-1.5 rounded-full transition-colors"
              >
                <VscClose size={20} />
              </button>
            </div>

            <div className="p-6 bg-white space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  어떤 작업을 진행하시나요?
                </label>

                <input
                  type="text"
                  value={sandboxTaskName}
                  onChange={(event) => setSandboxTaskName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") executeCreateSandbox();
                  }}
                  placeholder="예) 로그인 에러 수정, 헤더 UI 변경"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                  autoFocus
                />
              </div>

              <button
                onClick={executeCreateSandbox}
                disabled={!sandboxTaskName.trim() || isCreatingSandbox}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-[14px] font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isCreatingSandbox ? (
                  <>
                    <VscRefresh className="animate-spin" /> 생성 중
                  </>
                ) : (
                  "공간 생성 및 이동하기"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSandboxApplyModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setIsSandboxApplyModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-[460px] overflow-hidden flex flex-col animate-slide-up"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-8 pb-6 text-center flex flex-col items-center border-b border-gray-100">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-md relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-50"></span>
                <VscRocket className="text-emerald-600" size={32} />
              </div>

              <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">
                메인 코드로 병합 (Merge)
              </h2>
              <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                작업하신 내용을 안전하게 저장하고{" "}
                <strong className="text-emerald-600 font-black">master</strong>{" "}
                브랜치에 합칩니다.
              </p>
            </div>

            <div className="p-6 bg-gray-50 space-y-3">
              <label className="text-[12px] font-bold text-gray-700 flex items-center gap-1.5">
                <VscSourceControl /> 병합 커밋 메시지 작성
              </label>

              <input
                type="text"
                value={mergeCommitMessage}
                onChange={(event) => setMergeCommitMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") executeApplySandbox();
                }}
                placeholder="예) 로그인 화면 레이아웃 수정 완료"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[13px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-medium bg-white"
                autoFocus
              />
            </div>

            <div className="flex border-t border-gray-100 p-4 gap-3 bg-white">
              <button
                onClick={() => setIsSandboxApplyModalOpen(false)}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 rounded-xl text-[13px] font-bold transition-all shadow-sm"
              >
                취소
              </button>

              <button
                onClick={executeApplySandbox}
                disabled={!mergeCommitMessage.trim() || isApplyingSandbox}
                className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl text-[13px] font-bold shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
              >
                {isApplyingSandbox ? (
                  <>
                    <VscRefresh className="animate-spin" /> 병합 중
                  </>
                ) : (
                  <>
                    <VscCheck size={16} strokeWidth={1} /> 커밋 및 병합하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
