"use client";

// 경로: src/components/ide/SafeRunStatusBar.tsx
//
// 팀 화면 맨 아래의 상태바. 실행을 누르기 전에 "지금 실행하면 어떤 파일이 어떤
// 버전으로 돌아가는지"를 문장으로 보여 준다.
//
//   ▶ 지금 실행하면 | 🕘 지영 님이 작성 중인 파일 1개는 2분 전 정상 버전으로 | ✅ 나머지는 최신 코드로
//
// 예전에는 "정상 버전: 2분 전 | 지영 수정 중" 처럼 상태만 늘어놓았는데, 그것이 내
// 실행에 무슨 영향을 주는지가 화면에 없어서 읽어도 뜻을 알 수 없었다. 그래서 상태가
// 아니라 결과("이 파일은 이 버전으로 실행된다")를 적는다.
//
// 어느 파일이 어느 버전으로 들어가는지는 서버 규칙(RunAssembler.wantsLive)을 그대로
// 옮긴 것이다. 서버 규칙이 바뀌면 planRun 도 같이 바꿔야 한다. 여기 적는 것은 실행
// 전의 예상이다. 실제로 누구 변경이 빠졌는지는 실행할 때 출력 창의 [System] 줄에 나온다.
//
// 값은 전부 서버가 준 것이다. 여기서는 처음 한 번 조회하고, 그 뒤로는 Sidebar 가
// 파일 트리 소켓(/ws/workspace-events)으로 받은 알림을 Redux 에 넣어 주는 것을 그린다.
// 알림은 바뀔 때만 오므로, 브랜치를 바꾸면 다시 조회해야 한다.

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getCurrentUserId } from "@/lib/auth/tokenStore";
import { fetchSafeRunStatusApi, type SafeRunStatus } from "@/lib/ide/safeRun";
import { setSafeRunStatus, type SafeRunState } from "@/store/slices/safeRunSlice";
import { setActiveBottomTab, toggleTerminal } from "@/store/slices/uiSlice";

interface RootState {
  safeRun: SafeRunState;
  fileSystem: { workspaceId: string | null; activeProject: string | null; activeBranch: string | null };
  ui: { isTerminalVisible: boolean };
}

/** "2분 전" 같은 표시. 시각은 서버가 주고, 얼마나 지났는지는 여기서 센다. */
function formatElapsed(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (seconds < 60) return "방금 전";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}분 전`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}시간 전`;
  return `${Math.floor(seconds / 86400)}일 전`;
}

function fileNameOf(path: string): string {
  return path.split("/").pop() || path;
}

/** 정상 버전 이후 누군가 고친 파일 하나가 이번 실행에 어떤 버전으로 들어가는지. */
interface PlannedFile {
  path: string;
  /** 고친 사람들의 이름. 나는 "나"로 적는다. */
  authorNames: string[];
  /** 아직 문법 오류가 있는(작성 중인) 다른 사람들의 이름. */
  editingNames: string[];
  /**
   * 실행할 때 내 파일로 치는지. 내가 고쳤더라도 그 뒤에 다른 사람이 이어서 고쳤으면
   * 그 사람의 파일로 본다(서버의 EditLedger.snapshotFor).
   */
  isMine: boolean;
  /** 지금 문법 오류가 있는 파일인지. */
  isBroken: boolean;
}

interface RunPlan {
  /** 최신 코드 대신 정상 버전으로 바뀌어 실행되는 파일. */
  staleFiles: PlannedFile[];
  /** 누군가 고쳤고, 최신 코드 그대로 실행되는 파일. */
  latestFiles: PlannedFile[];
}

/**
 * 지금 실행하면 파일마다 어떤 버전이 들어갈지.
 *
 * 서버의 첫 빌드 규칙과 같다: 내가 마지막으로 고친 파일은 언제나 최신, 그 밖의 파일은
 * 고친 사람이 전부 준비됨(READY)일 때만 최신이고 한 명이라도 수정 중이면 정상 버전으로
 * 바뀐다. 내가 고친 뒤 팀원이 이어서 고친 파일도 "그 밖의 파일"이다.
 * 정상 버전이 아직 없으면 바꿔 넣을 것이 없어 전부 최신 그대로다.
 */
function planRun(status: SafeRunStatus, myUserId: string | null): RunPlan {
  const files = new Map<string, PlannedFile>();
  // 예전 서버는 이 목록을 주지 않는다.
  const brokenFiles = new Set(status.brokenFiles ?? []);
  const lastEditors = status.lastEditors ?? {};

  for (const author of status.authors) {
    const isMe = myUserId !== null && String(author.userId) === myUserId;
    const isEditing = author.status === "EDITING";

    for (const path of author.files) {
      const file = files.get(path) ?? {
        path,
        authorNames: [],
        editingNames: [],
        isMine: false,
        isBroken: brokenFiles.has(path),
      };

      file.authorNames.push(isMe ? "나" : author.nickname);
      if (isEditing && !isMe) file.editingNames.push(author.nickname);
      // 마지막으로 고친 사람을 모르면(예전 서버) 예전 규칙대로 내 파일로 본다.
      const lastEditor = lastEditors[path];
      if (isMe && (lastEditor == null || String(lastEditor) === myUserId)) file.isMine = true;

      files.set(path, file);
    }
  }

  const staleFiles: PlannedFile[] = [];
  const latestFiles: PlannedFile[] = [];

  for (const file of files.values()) {
    const isStale = status.greenUpdatedAt !== null && !file.isMine && file.editingNames.length > 0;
    (isStale ? staleFiles : latestFiles).push(file);
  }

  return { staleFiles, latestFiles };
}

function VersionBadge({ isLatest, label }: { isLatest: boolean; label: string }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${
        isLatest ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
      }`}
    >
      {label}
    </span>
  );
}

function FileRow({ file, isLatest, label }: { file: PlannedFile; isLatest: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 py-1" title={file.path}>
      <VersionBadge isLatest={isLatest} label={label} />
      <span className="min-w-0 flex-1 truncate font-mono text-slate-800">{fileNameOf(file.path)}</span>
      {isLatest && file.isBroken && (
        <span className="shrink-0 rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">
          문법 오류
        </span>
      )}
      <span className="shrink-0 text-[11px] text-slate-500">
        {isLatest
          ? `${file.authorNames.join(", ")} 수정`
          : `${file.editingNames.join(", ")} 님 작성 중${
              // 파일 단위로만 바꿔 넣을 수 있어서, 내가 먼저 넣어 둔 수정도 같이 빠진다.
              file.authorNames.includes("나") ? " · 내 수정도 함께 빠져요" : ""
            }`}
      </span>
    </li>
  );
}

export default function SafeRunStatusBar() {
  const dispatch = useDispatch();

  const { workspaceId, activeProject, activeBranch } = useSelector(
    (state: RootState) => state.fileSystem,
  );
  const status = useSelector((state: RootState) => state.safeRun.status);

  const branchName = activeBranch || "master";

  // "몇 분 전"이 저절로 넘어가게 30초마다 다시 그린다.
  const [now, setNow] = useState(() => Date.now());
  const isTerminalVisible = useSelector((state: RootState) => state.ui.isTerminalVisible);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!workspaceId || !activeProject) return undefined;

    // 응답이 오기 전에 브랜치를 또 바꿨다면 늦게 온 옛 브랜치의 상태를 버린다.
    let cancelled = false;

    fetchSafeRunStatusApi(workspaceId, activeProject, branchName)
      .then((next) => {
        if (!cancelled) dispatch(setSafeRunStatus(next));
      })
      .catch(() => {
        // 못 받아 왔으면 옛 브랜치의 상태를 계속 보여 주지 않는다.
        if (!cancelled) dispatch(setSafeRunStatus(null));
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, activeProject, branchName, dispatch]);

  if (!workspaceId || !activeProject) return null;

  // 다른 브랜치의 상태가 잠깐 남아 있을 수 있다. 지금 브랜치의 것만 그린다.
  const current =
    status && status.projectName === activeProject && status.branchName === branchName
      ? status
      : null;

  const hasGreen = current?.greenUpdatedAt != null;
  const plan = current ? planRun(current, getCurrentUserId()) : null;
  const staleLabel = current?.greenUpdatedAt
    ? `${formatElapsed(current.greenUpdatedAt, now)} 정상 버전`
    : "정상 버전";
  const staleNames = plan
    ? Array.from(new Set(plan.staleFiles.flatMap((file) => file.editingNames)))
    : [];
  // 문법 오류가 있는데도 최신 코드로 들어가는 파일. 내가 함께 고쳤거나 정상 버전이
  // 아직 없어서 바꿔 넣지 못하는 것이라, 이대로 실행하면 컴파일이 실패한다.
  //
  // 정상 버전으로 바뀌는 파일의 오류는 알리지 않는다. 팀원이 쓰는 중이라 깨져 있는 것이
  // 당연하고, 어차피 실행에 들어가지 않는다.
  const brokenLatestFiles = plan ? plan.latestFiles.filter((file) => file.isBroken) : [];

  const openDetails = () => {
    if (!isTerminalVisible) dispatch(toggleTerminal());
    dispatch(setActiveBottomTab("run-version"));
  };

  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-t border-gray-200 bg-gray-50 px-3 text-[12px] font-medium text-gray-600">
      <span className="shrink-0 font-semibold text-slate-700">▶ 실행 버전</span>
      {!current && <span className="truncate text-gray-400">실행 상태 확인 중…</span>}
      {current && (
        <>
          <span className="truncate text-gray-600">
            {!hasGreen
              ? "정상 버전 없음 · 최신 코드로 실행"
              : plan && plan.staleFiles.length > 0
                ? `정상 버전 대체 ${plan.staleFiles.length}개 · 나머지 최신 코드`
                : "모든 파일 최신 코드로 실행"}
          </span>
          {brokenLatestFiles.length > 0 && (
            <span className="shrink-0 rounded bg-rose-50 px-2 py-0.5 text-rose-700">
              문법 오류 {brokenLatestFiles.length}개
            </span>
          )}
        </>
      )}
      <button
        type="button"
        onClick={openDetails}
        className="ml-auto shrink-0 rounded border border-gray-200 bg-white px-2 py-0.5 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
        title="하단 실행 버전 탭 열기"
      >
        자세히 보기 ↑
      </button>
    </div>
  );
}

/** 하단 패널의 실행 버전 탭. 상태바가 조회한 동일 Redux 데이터를 사용한다. */
export function SafeRunVersionPanel() {
  const { workspaceId, activeProject, activeBranch } = useSelector((state: RootState) => state.fileSystem);
  const status = useSelector((state: RootState) => state.safeRun.status);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const branchName = activeBranch || "master";
  const current = workspaceId && activeProject && status?.projectName === activeProject && status?.branchName === branchName
    ? status : null;
  const plan = current ? planRun(current, getCurrentUserId()) : null;
  const hasGreen = current?.greenUpdatedAt != null;
  const staleLabel = current?.greenUpdatedAt
    ? `${formatElapsed(current.greenUpdatedAt, now)} 정상 버전` : "정상 버전";
  const brokenLatestFiles = plan?.latestFiles.filter((file) => file.isBroken) || [];

  return (
    <div className="h-full overflow-y-auto bg-white px-4 py-3 text-[12px] text-slate-700">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[13px] font-bold text-slate-900">실행에 쓰이는 코드 버전</h3>
          <p className="mt-1.5 max-w-[820px] text-[12px] leading-relaxed text-slate-600">
            팀원이 아직 작성 중이라 오류가 있는 파일은, 마지막으로 실행에 성공했던 버전(
            <b className="text-slate-700">정상 버전</b>)으로 바꿔서 실행해요. 그래서 팀원이 작업
            중이어도 내 코드를 바로 테스트할 수 있어요. 팀원의 파일 자체는 바뀌지 않아요.
          </p>
        </div>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px]">{branchName}</span>
      </div>
      <div className="mb-2 mt-3 font-bold text-slate-900">▶ 지금 실행하면</div>
      {!current && <p className="py-4 text-slate-500">실행 상태를 불러오는 중이거나 확인할 수 없습니다.</p>}
      {current && plan && (
        <>
          {!hasGreen && (
            <p className="mb-2 rounded bg-slate-100 px-3 py-2 text-slate-600">
              아직 실행에 성공한 적이 없어 정상 버전이 없어요. 이번에는 모든 파일을 최신
              그대로 실행하고, 한 번 성공하면 그때부터 정상 버전이 만들어져요.
            </p>
          )}
          {brokenLatestFiles.length > 0 && (
            <p className="mb-2 rounded border border-rose-100 bg-rose-50 px-3 py-2 text-rose-700">
              <span className="font-mono">{brokenLatestFiles.map((file) => fileNameOf(file.path)).join(", ")}</span>{" "}
              에 문법 오류가 있는데 최신 코드로 실행돼요
              {hasGreen ? " (내가 마지막으로 고친 파일은 이전 버전으로 바꾸지 않아요)" : ""}.
              이대로 실행하면 컴파일 오류가 나요.
            </p>
          )}
          {hasGreen && plan.staleFiles.length > 0 && (
            <p className="mb-2 rounded border border-amber-100 bg-amber-50 px-3 py-2 text-amber-800">
              작성 중인 파일 {plan.staleFiles.length}개는 {staleLabel}으로 대체해 실행합니다.
            </p>
          )}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[480px] text-left text-[12px]">
              <thead className="bg-gray-50 text-[11px] font-bold text-slate-500">
                <tr><th className="px-3 py-2">파일명</th><th className="px-3 py-2">실행 버전</th><th className="px-3 py-2">상태</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plan.staleFiles.map((file) => (
                  <tr key={file.path} title={file.path}>
                    <td className="max-w-[240px] truncate px-3 py-2 font-mono">{fileNameOf(file.path)}</td>
                    <td className="px-3 py-2"><VersionBadge isLatest={false} label={staleLabel} /></td>
                    <td className="px-3 py-2 text-slate-500">{file.editingNames.join(", ")} 님 작성 중{file.authorNames.includes("나") ? " · 내 수정도 함께 제외" : ""}</td>
                  </tr>
                ))}
                {plan.latestFiles.map((file) => (
                  <tr key={file.path} title={file.path}>
                    <td className="max-w-[240px] truncate px-3 py-2 font-mono">{fileNameOf(file.path)}</td>
                    <td className="px-3 py-2"><VersionBadge isLatest label="최신 코드" /></td>
                    <td className="px-3 py-2">
                      {file.isBroken && <span className="mr-2 rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-700">문법 오류</span>}
                      <span className="text-slate-500">{file.authorNames.join(", ")} 수정</span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-3 py-2 text-slate-500">그 밖의 모든 파일</td>
                  <td className="px-3 py-2"><VersionBadge isLatest label="최신 코드" /></td>
                  <td className="px-3 py-2 text-slate-400">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
