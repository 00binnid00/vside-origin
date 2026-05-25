"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  VscAdd,
  VscCheck,
  VscChevronDown,
  VscRefresh,
  VscSourceControl,
  VscTrash,
} from "react-icons/vsc";
import {
  isProtectedBranch,
  isSandboxBranch,
  useGitBranches,
} from "@/hooks/ide/useGitBranches";

export default function BranchSelector({
  mode = "personal",
  currentNickname = "dev",
}) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [draftName, setDraftName] = useState("");

  const {
    activeProject,
    activeBranch,
    currentBranch,
    visibleBranches,
    error,
    operation,
    isBusy,
    refreshBranches,
    switchBranch,
    createBranch,
    deleteBranch,
    validateBranchName,
  } = useGitBranches({
    mode,
    currentNickname,
  });

  const branchNameError = useMemo(() => {
    if (!draftName.trim()) return "";
    return validateBranchName(draftName);
  }, [draftName, validateBranchName]);

  const currentBranchIsSandbox = isSandboxBranch(currentBranch);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!rootRef.current || rootRef.current.contains(event.target)) return;
      setIsOpen(false);
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    refreshBranches();
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen, refreshBranches]);

  const handleToggle = () => {
    if (!activeProject) {
      alert("프로젝트를 먼저 선택해주세요.");
      return;
    }

    setIsOpen((prev) => !prev);
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();

    if (branchNameError || isBusy) return;

    const success = await createBranch(draftName);

    if (success) {
      setDraftName("");
      setIsOpen(false);
    }
  };

  const handleSwitch = async (branchName) => {
    if (branchName === currentBranch || isBusy) return;

    const success = await switchBranch(branchName);

    if (success) {
      setIsOpen(false);
    }
  };

  const handleDelete = async (event, branchName) => {
    event.preventDefault();
    event.stopPropagation();

    if (branchName === activeBranch || branchName === currentBranch) {
      alert("현재 체크아웃 중인 브랜치는 삭제할 수 없습니다.");
      return;
    }

    if (isProtectedBranch(branchName)) {
      alert("master/main 브랜치는 삭제할 수 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      `'${branchName}' 브랜치를 삭제하시겠습니까?\n\n삭제된 브랜치의 워크트리도 함께 제거됩니다.`,
    );

    if (!confirmed) return;

    await deleteBranch(branchName);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all ${
          currentBranchIsSandbox
            ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        }`}
        onClick={handleToggle}
      >
        <VscSourceControl
          size={14}
          className={currentBranchIsSandbox ? "text-indigo-500" : "text-blue-500"}
        />
        <span className="max-w-[120px] truncate">{currentBranch}</span>
        <VscChevronDown
          size={14}
          className={
            isOpen
              ? "rotate-180 transition-transform"
              : "text-gray-400 transition-transform"
          }
        />
      </button>

      {isOpen && (
        <div className="animate-fade-in-up absolute right-0 top-full z-[99999] mt-2 w-80 origin-top-right rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
          <div className="mb-2 border-b border-gray-100 bg-gray-50/40 px-4 pb-3 pt-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-black text-gray-800">
                  <VscSourceControl />
                  Git Repository
                </p>
                <p className="mt-1 truncate text-[10px] font-medium text-gray-500">
                  {activeProject}
                </p>
              </div>

              <button
                type="button"
                onClick={refreshBranches}
                disabled={isBusy}
                className="rounded-md p-1.5 text-gray-400 hover:bg-white hover:text-blue-600 disabled:opacity-50"
                title="브랜치 목록 새로고침"
              >
                <VscRefresh
                  size={14}
                  className={operation === "refresh" ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleCreateSubmit}
            className="mb-2 border-b border-gray-100 px-3 pb-3"
          >
            <label className="mb-1 block text-[10px] font-bold text-gray-500">
              새 브랜치 생성
            </label>

            <div className="flex gap-1.5">
              <input
                ref={inputRef}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="feature/login"
                disabled={isBusy}
                className="h-8 flex-1 rounded-lg border border-gray-200 px-2 text-xs outline-none focus:border-blue-400 disabled:bg-gray-50"
              />

              <button
                type="submit"
                disabled={isBusy || !draftName.trim() || Boolean(branchNameError)}
                className="flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                title="현재 기준 브랜치에서 새 브랜치 생성"
              >
                <VscAdd size={14} />
                생성
              </button>
            </div>

            {draftName.trim() && branchNameError && (
              <p className="mt-1.5 text-[10px] font-medium text-red-500">
                {branchNameError}
              </p>
            )}

            {error && (
              <p className="mt-1.5 text-[10px] font-medium text-red-500">
                {error}
              </p>
            )}
          </form>

          <div className="custom-scrollbar max-h-56 space-y-1 overflow-y-auto px-2">
            {visibleBranches.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                표시할 브랜치가 없습니다.
              </div>
            ) : (
              visibleBranches.map((branch) => {
                const isActive = branch === currentBranch;
                const isProtected = isProtectedBranch(branch);
                const isDeleting = operation === `delete:${branch}`;
                const canDelete = !isProtected && !isActive && !isBusy;

                return (
                  <div
                    key={branch}
                    className={`flex w-full items-center justify-between rounded-lg transition-all ${
                      isActive
                        ? "bg-blue-50 font-bold text-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSwitch(branch)}
                      disabled={isBusy || isActive}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-xs font-medium disabled:cursor-default"
                    >
                      <VscSourceControl
                        className={isActive ? "text-blue-500" : "text-gray-400"}
                      />
                      <span className="truncate">{branch}</span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1 pr-2">
                      {isActive && <VscCheck size={14} className="text-blue-500" />}

                      {!isProtected && (
                        <button
                          type="button"
                          onClick={(event) => handleDelete(event, branch)}
                          disabled={!canDelete || isDeleting}
                          className={`rounded p-1 transition-colors ${
                            canDelete
                              ? "text-gray-400 hover:bg-red-50 hover:text-red-500"
                              : "cursor-not-allowed text-gray-200"
                          }`}
                          title={
                            isActive
                              ? "현재 브랜치는 삭제할 수 없습니다."
                              : "브랜치 삭제"
                          }
                        >
                          <VscTrash
                            size={14}
                            className={isDeleting ? "animate-pulse" : ""}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
