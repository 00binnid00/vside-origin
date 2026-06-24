"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  VscAdd,
  VscArrowRight,
  VscBeaker,
  VscCheck,
  VscChevronDown,
  VscClose,
  VscFile,
  VscLock,
  VscRefresh,
  VscRocket,
  VscSourceControl,
  VscTrash,
  VscWarning,
} from "react-icons/vsc";

import { useDispatch } from "react-redux";
import { setActiveActivity } from "@/store/slices/uiSlice";

import {
  DEFAULT_BRANCH,
  DEVELOP_BRANCH,
  isProtectedBranch,
  isSandboxBranch,
  useGitBranches,
  validateBranchName,
} from "@/hooks/ide/useGitBranches";

const getBranchMeta = (branchName = "") => {
  const branch = String(branchName || "");
  const lower = branch.toLowerCase();

  if (lower === "master" || lower === "main") {
    return {
      label: "MAIN",
      dotClass: "bg-slate-500",
      badgeClass: "border-slate-200 bg-slate-50 text-slate-700",
      rowClass: "hover:bg-slate-50",
    };
  }

  if (lower === "develop") {
    return {
      label: "DEVELOP",
      dotClass: "bg-blue-500",
      badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
      rowClass: "hover:bg-blue-50",
    };
  }

  if (lower.startsWith("feature/")) {
    return {
      label: "FEATURE",
      dotClass: "bg-violet-500",
      badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
      rowClass: "hover:bg-violet-50",
    };
  }

  if (lower.startsWith("release/")) {
    return {
      label: "RELEASE",
      dotClass: "bg-amber-500",
      badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
      rowClass: "hover:bg-amber-50",
    };
  }

  if (lower.startsWith("hotfix/")) {
    return {
      label: "HOTFIX",
      dotClass: "bg-rose-500",
      badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
      rowClass: "hover:bg-rose-50",
    };
  }

  if (isSandboxBranch(branch)) {
    return {
      label: "SANDBOX",
      dotClass: "bg-indigo-500",
      badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-700",
      rowClass: "hover:bg-indigo-50",
    };
  }

  return {
    label: "BRANCH",
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rowClass: "hover:bg-emerald-50",
  };
};

function BranchBadge({ branch, compact = false }) {
  const meta = getBranchMeta(branch);

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 rounded-full border font-black ${meta.badgeClass} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dotClass}`} />
      <span className="truncate">{branch}</span>
    </span>
  );
}

function BranchTypeTag({ branch }) {
  const meta = getBranchMeta(branch);

  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black tracking-wide ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

const isMergeConflictError = (error) => {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.status === 409 ||
    error?.response?.status === 409 ||
    message.includes("merge conflict") ||
    message.includes("conflict") ||
    message.includes("충돌")
  );
};

const BRANCHES_CHANGED_EVENT = "waivs:branches-changed";

const notifyBranchesChanged = (detail = {}) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(BRANCHES_CHANGED_EVENT, {
      detail: {
        reason: "branch-changed",
        ...detail,
        requestedAt: Date.now(),
      },
    }),
  );
};

function BranchPicker({
  value,
  options = [],
  onChange,
  placeholder = "브랜치 선택",
  excludeValue = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);

  const visibleOptions = useMemo(() => {
    return options.filter((option) => option && option !== excludeValue);
  }, [options, excludeValue]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-left shadow-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
          open
            ? "border-blue-400 ring-4 ring-blue-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <span className="min-w-0 flex-1 truncate">
          {value ? (
            <BranchBadge branch={value} />
          ) : (
            <span className="text-[12px] font-bold text-gray-400">
              {placeholder}
            </span>
          )}
        </span>

        <VscChevronDown
          size={16}
          className={`ml-2 shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[10050] mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
          <div className="max-h-64 overflow-y-auto p-1.5">
            {visibleOptions.length === 0 && (
              <div className="px-3 py-4 text-center text-[12px] font-bold text-gray-400">
                선택할 브랜치가 없습니다.
              </div>
            )}

            {visibleOptions.map((option) => {
              const selected = option === value;
              const meta = getBranchMeta(option);

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                    selected
                      ? "bg-blue-50 text-blue-700"
                      : `text-gray-700 ${meta.rowClass}`
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${meta.dotClass}`}
                    />
                    <span className="truncate text-[12px] font-black">
                      {option}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <BranchTypeTag branch={option} />
                    {selected && (
                      <VscCheck size={14} className="text-blue-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GitBranchControls({
  mode = "personal",
  workspaceId,
  activeProject,
  activeBranch,
  currentNickname = "dev",
  fileContents = {},
}) {
  const dispatch = useDispatch();
  const branchRef = useRef(null);

  const [isBranchOpen, setIsBranchOpen] = useState(false);

  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);
  const [branchDraft, setBranchDraft] = useState({
    branchName: "",
    baseBranch: DEFAULT_BRANCH,
    checkoutAfterCreate: true,
  });

  const [isMergeBranchModalOpen, setIsMergeBranchModalOpen] = useState(false);
  const [mergeDraft, setMergeDraft] = useState({
    sourceBranch: "",
    targetBranch: DEFAULT_BRANCH,
    mergeMode: "NO_FF",
    deleteSourceAfterMerge: false,
    checkoutTargetAfterMerge: false,
  });

  const [isSandboxCreateModalOpen, setIsSandboxCreateModalOpen] =
    useState(false);
  const [sandboxTaskName, setSandboxTaskName] = useState("");
  const [sandboxBaseBranch, setSandboxBaseBranch] = useState(DEVELOP_BRANCH);

  const [isSandboxApplyModalOpen, setIsSandboxApplyModalOpen] = useState(false);
  const [mergeCommitMessage, setMergeCommitMessage] = useState("");
  const [sandboxTargetBranch, setSandboxTargetBranch] = useState(DEFAULT_BRANCH);
  const [sandboxConflictModal, setSandboxConflictModal] = useState(null);

  const [fullScreenLoading, setFullScreenLoading] = useState({
    isOpen: false,
    text: "",
  });

  const {
    branches,
    visibleBranches,
    currentBranch,
    defaultMergeTarget,
    isSandboxMode,

    isLoadingBranches,
    isSwitchingBranch,
    isCreatingBranch,
    isDeletingBranchName,
    isCreatingSandbox,
    isApplyingSandbox,
    isMergingBranches,

    loadBranches,
    switchBranch,
    createBranch,
    deleteBranch,
    mergeBranches,
    createSandbox,
    applySandbox,
  } = useGitBranches({
    workspaceId,
    activeProject,
    activeBranch,
    currentNickname,
    mode,
  });

    useEffect(() => {
    const handleBranchesChanged = async (event) => {
      const detail = event.detail || {};

      if (detail.workspaceId && detail.workspaceId !== workspaceId) return;
      if (detail.projectName && detail.projectName !== activeProject) return;

      try {
        await loadBranches();
      } catch (error) {
        console.error("브랜치 목록 동기화 실패:", error);
      }
    };

    window.addEventListener(BRANCHES_CHANGED_EVENT, handleBranchesChanged);

    return () => {
      window.removeEventListener(BRANCHES_CHANGED_EVENT, handleBranchesChanged);
    };
  }, [workspaceId, activeProject, loadBranches]);

  const normalBranches = useMemo(() => {
  const uniqueBranches = Array.from(
      new Set(
        (Array.isArray(branches) ? branches : [])
          .filter(Boolean)
          .filter((branch) => !isSandboxBranch(branch)),
      ),
    );

    const getPriority = (branch) => {
      const lower = branch.toLowerCase();

      if (lower === DEFAULT_BRANCH) return 0;
      if (lower === "main") return 1;
      if (lower === DEVELOP_BRANCH) return 2;
      if (lower.startsWith("feature/")) return 3;
      if (lower.startsWith("release/")) return 4;
      if (lower.startsWith("hotfix/")) return 5;

      return 10;
    };

    return uniqueBranches.sort((a, b) => {
      const priorityDiff = getPriority(a) - getPriority(b);

      if (priorityDiff !== 0) return priorityDiff;

      return a.localeCompare(b);
    });
  }, [branches]);

  const branchNameError = useMemo(() => {
    if (!branchDraft.branchName.trim()) return "";
    return validateBranchName(branchDraft.branchName, branches);
  }, [branchDraft.branchName, branches]);

  const isBranchBusy =
    isLoadingBranches ||
    isSwitchingBranch ||
    isCreatingBranch ||
    isMergingBranches ||
    Boolean(isDeletingBranchName);

  const isCreateDisabled =
    !branchDraft.branchName.trim() ||
    !branchDraft.baseBranch ||
    Boolean(branchNameError) ||
    isCreatingBranch;

  const isMergeDisabled =
    !mergeDraft.sourceBranch ||
    !mergeDraft.targetBranch ||
    mergeDraft.sourceBranch === mergeDraft.targetBranch ||
    isMergingBranches;

  const canCreateSandbox = mode === "team" && activeProject && !isSandboxMode;

  useEffect(() => {
    if (!defaultMergeTarget) return;

    setSandboxTargetBranch(defaultMergeTarget);

    setBranchDraft((prev) => ({
      ...prev,
      baseBranch:
        prev.baseBranch && branches.includes(prev.baseBranch)
          ? prev.baseBranch
          : currentBranch && branches.includes(currentBranch)
            ? currentBranch
            : defaultMergeTarget,
    }));

    setMergeDraft((prev) => ({
      ...prev,
      targetBranch:
        prev.targetBranch && branches.includes(prev.targetBranch)
          ? prev.targetBranch
          : defaultMergeTarget,
    }));
  }, [branches, currentBranch, defaultMergeTarget]);

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
      setIsCreateBranchModalOpen(false);
      setIsMergeBranchModalOpen(false);
      setIsSandboxCreateModalOpen(false);
      setIsSandboxApplyModalOpen(false);
      setSandboxConflictModal(null);
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

  const openCreateBranchModal = () => {
    const baseBranch =
      currentBranch && branches.includes(currentBranch)
        ? currentBranch
        : defaultMergeTarget || DEFAULT_BRANCH;

    setBranchDraft({
      branchName: "",
      baseBranch,
      checkoutAfterCreate: true,
    });

    setIsBranchOpen(false);
    setIsCreateBranchModalOpen(true);
  };

  const handleCreateBranch = async () => {
    if (isCreateDisabled) return;

    const createdBranchName = branchDraft.branchName.trim();

    try {
      await createBranch({
        branchName: createdBranchName,
        baseBranch: branchDraft.baseBranch,
        checkoutAfterCreate: branchDraft.checkoutAfterCreate,
      });

      notifyBranchesChanged({
        workspaceId,
        projectName: activeProject,
        reason: "branch-created",
        branchName: createdBranchName,
      });

      setBranchDraft({
        branchName: "",
        baseBranch: currentBranch || DEFAULT_BRANCH,
        checkoutAfterCreate: true,
      });

      setIsCreateBranchModalOpen(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const openMergeBranchModal = (sourceBranch = "") => {
    const fallbackTarget =
      currentBranch && !isSandboxBranch(currentBranch)
        ? currentBranch
        : defaultMergeTarget || DEFAULT_BRANCH;

    const fallbackSource =
      sourceBranch ||
      normalBranches.find((branch) => branch !== fallbackTarget) ||
      "";

    const targetBranch =
      fallbackSource === fallbackTarget
        ? normalBranches.find((branch) => branch !== fallbackSource) ||
          defaultMergeTarget ||
          DEFAULT_BRANCH
        : fallbackTarget;

    setMergeDraft({
      sourceBranch: fallbackSource,
      targetBranch,
      mergeMode: "NO_FF",
      deleteSourceAfterMerge: false,
      checkoutTargetAfterMerge: false,
    });

    setIsBranchOpen(false);
    setIsMergeBranchModalOpen(true);
  };

  const handleMergeBranches = async () => {
    if (isMergeDisabled) return;

    try {
      const resultMessage = await mergeBranches({
        sourceBranch: mergeDraft.sourceBranch,
        targetBranch: mergeDraft.targetBranch,
        mergeMode: mergeDraft.mergeMode,
        deleteSourceAfterMerge: mergeDraft.deleteSourceAfterMerge,
        checkoutTargetAfterMerge: mergeDraft.checkoutTargetAfterMerge,
      });

      notifyBranchesChanged({
        workspaceId,
        projectName: activeProject,
        reason: "branch-merged",
        sourceBranch: mergeDraft.sourceBranch,
        targetBranch: mergeDraft.targetBranch,
      });

      setIsMergeBranchModalOpen(false);
      alert(resultMessage || "브랜치 병합이 완료되었습니다.");
    } catch (error) {
      alert(`브랜치 병합 실패:\n${error.message}`);
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

      notifyBranchesChanged({
        workspaceId,
        projectName: activeProject,
        reason: "branch-deleted",
        branchName,
      });
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

  const openSandboxCreateModal = () => {
    const defaultBaseBranch =
      currentBranch &&
      currentBranch !== "No Project" &&
      normalBranches.includes(currentBranch) &&
      !isSandboxBranch(currentBranch)
        ? currentBranch
        : normalBranches.includes(DEVELOP_BRANCH)
          ? DEVELOP_BRANCH
          : normalBranches.includes(DEFAULT_BRANCH)
            ? DEFAULT_BRANCH
            : normalBranches[0] || DEFAULT_BRANCH;

    setSandboxBaseBranch(defaultBaseBranch);
    setSandboxTaskName("");
    setIsSandboxCreateModalOpen(true);
  };

  const executeCreateSandbox = async () => {
    if (!sandboxTaskName.trim()) {
      alert("작업명을 입력해주세요.");
      return;
    }

    if (!sandboxBaseBranch) {
      alert("샌드박스 기준 브랜치를 선택해주세요.");
      return;
    }

    setIsSandboxCreateModalOpen(false);
    setFullScreenLoading({
      isOpen: true,
      text: `${sandboxBaseBranch} 기준으로 샌드박스 환경을 구축하는 중입니다...`,
    });

    try {
      const sandboxBranchName = await createSandbox({
        taskName: sandboxTaskName,
        baseBranch: sandboxBaseBranch,
      });

      notifyBranchesChanged({
        workspaceId,
        projectName: activeProject,
        reason: "sandbox-created",
        branchName: sandboxBranchName,
        baseBranch: sandboxBaseBranch,
      });

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

    const targetBranch = sandboxTargetBranch || defaultMergeTarget || DEFAULT_BRANCH;
    let handledConflict = false;

    setIsSandboxApplyModalOpen(false);
    setFullScreenLoading({
      isOpen: true,
      text: `작업 내용을 저장하고 ${targetBranch} 브랜치로 합치는 중...`,
    });

    try {
      const resultMessage = await applySandbox({
        fileContents,
        commitMessage: mergeCommitMessage,
        targetBranch,
      });

      notifyBranchesChanged({
        workspaceId,
        projectName: activeProject,
        reason: "sandbox-applied",
        sourceBranch: currentBranch,
        targetBranch,
      });

      setMergeCommitMessage("");
      alert(resultMessage || `성공적으로 ${targetBranch} 브랜치에 반영되었습니다.`);
    } catch (error) {
      if (isMergeConflictError(error)) {
        handledConflict = true;

        setFullScreenLoading({ isOpen: false, text: "" });

        setSandboxConflictModal({
          sandboxBranch: currentBranch,
          targetBranch,
          message:
            error.message ||
            "샌드박스 병합 중 충돌이 발생했습니다. 샌드박스는 삭제되지 않고 보존되었습니다.",
        });

        return;
      }

      alert(`병합 실패:\n${error.message}`);
    } finally {
      if (!handledConflict) {
        setTimeout(() => {
          setFullScreenLoading({ isOpen: false, text: "" });
        }, 500);
      }
    }
  };

  const handleOpenSandboxConflictStatus = async () => {
    if (!sandboxConflictModal) return;

    const sandboxBranch = sandboxConflictModal.sandboxBranch;
    const targetBranch =
      sandboxConflictModal.targetBranch || defaultMergeTarget || DEFAULT_BRANCH;

    if (typeof window !== "undefined" && sandboxBranch) {
      window.sessionStorage.setItem(
        "wevaisPendingSandboxCleanup",
        JSON.stringify({
          workspaceId,
          projectName: activeProject,
          sandboxBranch,
          targetBranch,
          createdAt: Date.now(),
        }),
      );
    }

    setSandboxConflictModal(null);
    setFullScreenLoading({ isOpen: false, text: "" });

    try {
      await switchBranch(targetBranch);
    } catch (error) {
      console.error("충돌 대상 브랜치 이동 실패:", error);
    }

    dispatch(setActiveActivity("git"));

    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("waivs:open-git-status", {
          detail: {
            branchName: targetBranch,
            sandboxBranch,
            reason: "sandbox-conflict",
          },
        }),
      );
    }, 120);
  };



  return (
    <>
      <div className="flex items-center gap-2">
        {canCreateSandbox && (
          <button
            onClick={openSandboxCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 active:scale-95 rounded-lg text-[12px] font-bold transition-all"
          >
            <VscLock size={14} /> 샌드박스
          </button>
        )}

        {mode === "team" && activeProject && isSandboxMode && (
          <button
            onClick={() => {
              setSandboxTargetBranch(defaultMergeTarget || DEFAULT_BRANCH);
              setIsSandboxApplyModalOpen(true);
            }}
            disabled={isApplyingSandbox}
            className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 active:scale-95 rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <VscRocket size={14} /> 병합
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
            <span className="max-w-[160px] truncate">
              <BranchBadge branch={currentBranch} compact />
            </span>
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
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 shadow-xl rounded-xl py-2 z-[99999] animate-fade-in-up origin-top-right">
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
                  const canMerge = !isActive && !isSandboxBranch(branch);

                  return (
                    <div
                      key={branch}
                      onClick={() => handleSelectBranch(branch)}
                      className={`flex items-center justify-between px-3 py-2.5 text-xs rounded-xl font-medium transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-700 font-bold"
                          : isBranchBusy
                            ? "text-gray-400 cursor-wait"
                            : "text-gray-600 hover:bg-gray-50 hover:text-blue-600 cursor-pointer"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          getBranchMeta(branch).dotClass
                        }`}
                      />

                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[12px] font-black">{branch}</span>
                          {isActive && <VscCheck size={13} className="shrink-0 text-blue-600" />}
                        </div>

                        <div className="mt-0.5">
                          <BranchTypeTag branch={branch} />
                        </div>
                      </div>
                    </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canMerge && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openMergeBranchModal(branch);
                            }}
                            disabled={isBranchBusy}
                            className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                            title={`${branch} 브랜치를 다른 브랜치로 병합`}
                          >
                            <VscSourceControl size={14} />
                          </button>
                        )}

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
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100 px-3 space-y-2">
                <button
                  type="button"
                  onClick={openCreateBranchModal}
                  disabled={isCreatingBranch}
                  className="w-full h-9 rounded-lg bg-blue-600 text-white text-[12px] font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <VscAdd size={14} /> 새 브랜치 생성
                </button>

                <button
                  type="button"
                  onClick={() => openMergeBranchModal()}
                  disabled={normalBranches.length < 2 || isMergingBranches}
                  className="w-full h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[12px] font-bold hover:bg-emerald-100 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <VscSourceControl size={14} /> 브랜치 병합
                </button>
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

      {isCreateBranchModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setIsCreateBranchModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[460px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-50 to-sky-50 p-6 border-b border-blue-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-blue-100 p-1.5 rounded-lg">
                    <VscSourceControl className="text-blue-600" size={20} />
                  </div>
                  <h2 className="text-xl font-black text-blue-900 tracking-tight">
                    새 브랜치 생성
                  </h2>
                </div>
                <p className="text-[13px] text-blue-700/80 font-medium">
                  기준 브랜치를 선택한 뒤 새 작업 브랜치를 만듭니다.
                </p>
              </div>

              <button
                onClick={() => setIsCreateBranchModalOpen(false)}
                className="text-gray-400 hover:text-gray-800 bg-white/50 hover:bg-white p-1.5 rounded-full transition-colors"
              >
                <VscClose size={20} />
              </button>
            </div>

            <div className="p-6 bg-white space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  기준 브랜치
                </label>

                <BranchPicker
                    value={branchDraft.baseBranch}
                    options={normalBranches}
                    placeholder="기준 브랜치 선택"
                    onChange={(nextBaseBranch) =>
                      setBranchDraft((prev) => ({
                        ...prev,
                        baseBranch: nextBaseBranch,
                      }))
                    }
                  />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  새 브랜치명
                </label>

                <input
                  type="text"
                  value={branchDraft.branchName}
                  onChange={(event) =>
                    setBranchDraft((prev) => ({
                      ...prev,
                      branchName: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleCreateBranch();
                    }
                  }}
                  placeholder="예) feature/login-ui, hotfix/build-error"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[14px] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                  autoFocus
                />

                {branchNameError && (
                  <p className="text-[11px] font-medium text-red-500">
                    {branchNameError}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={branchDraft.checkoutAfterCreate}
                  onChange={(event) =>
                    setBranchDraft((prev) => ({
                      ...prev,
                      checkoutAfterCreate: event.target.checked,
                    }))
                  }
                  className="w-4 h-4"
                />
                생성 후 새 브랜치로 이동
              </label>

              <button
                onClick={handleCreateBranch}
                disabled={isCreateDisabled}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-[14px] font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isCreatingBranch ? (
                  <>
                    <VscRefresh className="animate-spin" /> 생성 중
                  </>
                ) : (
                  <>
                    <VscAdd size={16} /> 브랜치 생성
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isMergeBranchModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in"
          onClick={() => setIsMergeBranchModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[480px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-emerald-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-emerald-100 p-1.5 rounded-lg">
                    <VscSourceControl className="text-emerald-600" size={20} />
                  </div>
                  <h2 className="text-xl font-black text-emerald-900 tracking-tight">
                    브랜치 병합
                  </h2>
                </div>
                <p className="text-[13px] text-emerald-700/80 font-medium">
                  선택한 브랜치를 대상 브랜치로 병합합니다.
                </p>
              </div>

              <button
                onClick={() => setIsMergeBranchModalOpen(false)}
                className="text-gray-400 hover:text-gray-800 bg-white/50 hover:bg-white p-1.5 rounded-full transition-colors"
              >
                <VscClose size={20} />
              </button>
            </div>

            <div className="p-6 bg-white space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  병합할 브랜치
                </label>

                <BranchPicker
                  value={mergeDraft.sourceBranch}
                  options={normalBranches}
                  placeholder="병합할 브랜치 선택"
                  onChange={(nextSourceBranch) =>
                    setMergeDraft((prev) => ({
                      ...prev,
                      sourceBranch: nextSourceBranch,
                      targetBranch:
                        nextSourceBranch === prev.targetBranch
                          ? normalBranches.find((branch) => branch !== nextSourceBranch) ||
                            DEFAULT_BRANCH
                          : prev.targetBranch,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  병합 받을 브랜치
                </label>

                <BranchPicker
                  value={mergeDraft.targetBranch}
                  options={normalBranches}
                  excludeValue={mergeDraft.sourceBranch}
                  placeholder="병합 받을 브랜치 선택"
                  onChange={(nextTargetBranch) =>
                    setMergeDraft((prev) => ({
                      ...prev,
                      targetBranch: nextTargetBranch,
                    }))
                  }
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[12px] text-gray-600">
                <span className="font-black text-gray-800">
                  {mergeDraft.sourceBranch || "source"}
                </span>{" "}
                →{" "}
                <span className="font-black text-emerald-700">
                  {mergeDraft.targetBranch || "target"}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">
                  병합 방식
                </label>

                <select
                  value={mergeDraft.mergeMode}
                  onChange={(event) =>
                    setMergeDraft((prev) => ({
                      ...prev,
                      mergeMode: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[13px] outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all font-medium bg-white"
                >
                  <option value="NO_FF">No Fast-Forward (--no-ff)</option>
                  <option value="FF">Fast-Forward 허용</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={mergeDraft.checkoutTargetAfterMerge}
                    onChange={(event) =>
                      setMergeDraft((prev) => ({
                        ...prev,
                        checkoutTargetAfterMerge: event.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  병합 후 대상 브랜치로 이동
                </label>

                <label className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={mergeDraft.deleteSourceAfterMerge}
                    onChange={(event) =>
                      setMergeDraft((prev) => ({
                        ...prev,
                        deleteSourceAfterMerge: event.target.checked,
                      }))
                    }
                    className="w-4 h-4"
                  />
                  병합 성공 후 source 브랜치 삭제
                </label>
              </div>

              <button
                onClick={handleMergeBranches}
                disabled={isMergeDisabled}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-[14px] font-bold shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {isMergingBranches ? (
                  <>
                    <VscRefresh className="animate-spin" /> 병합 중
                  </>
                ) : (
                  <>
                    <VscCheck size={16} /> 병합 실행
                  </>
                )}
              </button>
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
            className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[460px] overflow-visible flex flex-col animate-slide-up ring-1 ring-black/5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rounded-t-2xl bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-indigo-100 flex justify-between items-start">
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

            <div className="rounded-b-2xl p-6 bg-white space-y-5">
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

            <div className="space-y-2">
              <label className="text-[13px] font-extrabold text-gray-800">
                기준 브랜치
              </label>

              <BranchPicker
                value={sandboxBaseBranch}
                options={normalBranches}
                placeholder="샌드박스 기준 브랜치 선택"
                onChange={setSandboxBaseBranch}
              />

              <p className="text-[11px] font-medium leading-relaxed text-gray-400">
                선택한 브랜치의 현재 커밋을 기준으로 개인 샌드박스 브랜치가 생성됩니다.
              </p>
            </div>

            <button
              onClick={executeCreateSandbox}
              disabled={
                !sandboxTaskName.trim() || !sandboxBaseBranch || isCreatingSandbox
              }
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
            className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-[460px] overflow-visible flex flex-col animate-slide-up"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-8 pb-6 text-center flex flex-col items-center border-b border-gray-100">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-md relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-50"></span>
                <VscRocket className="text-emerald-600" size={32} />
              </div>

              <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">
                샌드박스 병합
              </h2>

              <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                작업 내용을 저장하고 선택한 대상 브랜치에 병합합니다.
              </p>
            </div>

            <div className="p-6 bg-gray-50 space-y-3">
              <label className="text-[12px] font-bold text-gray-700 flex items-center gap-1.5">
                <VscSourceControl /> 병합 대상 브랜치
              </label>

              <BranchPicker
                value={sandboxTargetBranch}
                options={normalBranches}
                placeholder="병합 대상 브랜치 선택"
                onChange={setSandboxTargetBranch}
              />

              <label className="text-[12px] font-bold text-gray-700 flex items-center gap-1.5">
                <VscSourceControl /> 병합 커밋 메시지
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
                type="button"
                onClick={() => setIsSandboxApplyModalOpen(false)}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 rounded-xl text-[13px] font-bold transition-all shadow-sm"
              >
                취소
              </button>

              <button
                type="button"
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
                    <VscCheck size={16} /> 커밋 및 병합하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {sandboxConflictModal && (
        <div className="fixed left-0 top-0 z-[2147483647] flex h-screen w-screen items-center justify-center bg-slate-950/50 px-4 backdrop-blur-[3px]">
          <div className="w-full max-w-[560px] overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)] animate-slide-up">
            <div className="relative border-b border-rose-100 bg-gradient-to-br from-white via-rose-50 to-amber-50 px-7 py-6">
              <button
                type="button"
                onClick={() => setSandboxConflictModal(null)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-rose-100 bg-white/80 text-slate-400 shadow-sm transition-colors hover:bg-white hover:text-slate-700"
                title="닫기"
              >
                <VscClose size={16} />
              </button>

              <div className="flex items-start gap-4 pr-10">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600 shadow-sm">
                  <VscWarning size={28} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-700">
                      Merge Conflict
                    </span>
                    <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700">
                      Sandbox Preserved
                    </span>
                  </div>

                  <h2 className="text-[20px] font-black tracking-tight text-slate-950">
                    샌드박스 병합 충돌 발생
                  </h2>

                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                    샌드박스 브랜치는 삭제되지 않았습니다. 대상 브랜치의 File Status에서 충돌 파일을 해결해야 병합을 완료할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-white px-7 py-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
                  Merge Direction
                </div>

                <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black">
                  <span className="max-w-[200px] truncate rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs text-violet-700">
                    {sandboxConflictModal.sandboxBranch}
                  </span>

                  <VscArrowRight className="text-slate-400" size={17} />

                  <span className="max-w-[200px] truncate rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                    {sandboxConflictModal.targetBranch}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-bold leading-relaxed text-amber-800">
                <div className="mb-2 flex items-center gap-2 text-amber-900">
                  <VscFile size={15} />
                  해결 순서
                </div>
                1. 충돌 해결 화면으로 이동합니다.
                <br />
                2. 충돌 파일을 열고 <code>&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>,{" "}
                <code>=======</code>, <code>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>{" "}
                표시를 정리합니다.
                <br />
                3. 저장 후 해결 완료 처리합니다.
                <br />
                4. Merge 완료 커밋을 눌러 병합을 마무리합니다.
              </div>

              {sandboxConflictModal.message && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium leading-relaxed text-slate-500">
                  {sandboxConflictModal.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-7 py-5">
              <button
                type="button"
                onClick={() => setSandboxConflictModal(null)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              >
                나중에 보기
              </button>

              <button
                type="button"
                onClick={handleOpenSandboxConflictStatus}
                className="flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-5 text-xs font-black text-white shadow-lg shadow-rose-100 transition-colors hover:bg-rose-700"
              >
                충돌 해결 화면으로 이동
                <VscArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}