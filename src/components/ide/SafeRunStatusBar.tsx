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

interface RootState {
  safeRun: SafeRunState;
  fileSystem: { workspaceId: string | null; activeProject: string | null; activeBranch: string | null };
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
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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

  return (
    <div className="relative shrink-0">
      {isDetailOpen && (
        <div className="absolute bottom-full left-3 z-50 mb-1 w-[440px] max-w-[calc(100vw-24px)] rounded-lg border border-slate-200 bg-white p-4 text-[12px] text-slate-700 shadow-xl">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[13px] font-bold text-slate-900">실행에 쓰이는 코드 버전</span>
            <button
              type="button"
              onClick={() => setIsDetailOpen(false)}
              className="rounded px-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          <p className="mb-3 leading-relaxed text-slate-500">
            팀원이 아직 작성 중이라 오류가 있는 파일은, 마지막으로 실행에 성공했던 버전(
            <b className="text-slate-700">정상 버전</b>)으로 바꿔서 실행해요. 그래서 팀원이 작업
            중이어도 내 코드를 바로 테스트할 수 있어요. 팀원의 파일 자체는 바뀌지 않아요.
          </p>

          <div className="mb-1 font-bold text-slate-900">▶ 지금 실행하면</div>

          {!current && <p className="text-slate-500">상태를 불러오지 못했어요.</p>}

          {current && plan && (
            <>
              {!hasGreen && (
                <p className="mb-2 rounded bg-slate-100 px-2 py-1.5 leading-relaxed text-slate-600">
                  아직 실행에 성공한 적이 없어 정상 버전이 없어요. 이번에는 모든 파일을 최신
                  그대로 실행하고, 한 번 성공하면 그때부터 정상 버전이 만들어져요.
                </p>
              )}

              {brokenLatestFiles.length > 0 && (
                <p className="mb-2 rounded bg-rose-50 px-2 py-1.5 leading-relaxed text-rose-700">
                  <span className="font-mono">
                    {brokenLatestFiles.map((file) => fileNameOf(file.path)).join(", ")}
                  </span>{" "}
                  에 문법 오류가 있는데 최신 코드로 실행돼요
                  {hasGreen ? " (내가 마지막으로 고친 파일은 이전 버전으로 바꾸지 않아요)" : ""}. 이대로 실행하면
                  컴파일 오류가 나요.
                </p>
              )}

              <ul className="max-h-52 overflow-y-auto">
                {plan.staleFiles.map((file) => (
                  <FileRow key={file.path} file={file} isLatest={false} label={staleLabel} />
                ))}
                {plan.latestFiles.map((file) => (
                  <FileRow key={file.path} file={file} isLatest label="최신 코드" />
                ))}
                <li className="flex items-center gap-2 py-1">
                  <VersionBadge isLatest label="최신 코드" />
                  <span className="text-slate-500">
                    {plan.staleFiles.length + plan.latestFiles.length > 0
                      ? "그 밖의 모든 파일"
                      : "모든 파일 (정상 버전 이후 고친 사람이 없어요)"}
                  </span>
                </li>
              </ul>
            </>
          )}

        </div>
      )}

      <div className="flex h-8 items-center gap-2 overflow-x-auto border-t border-gray-200 bg-gray-50 px-3 text-[12px] font-medium text-gray-600">
        <span className="shrink-0 font-semibold text-gray-500">▶ 지금 실행하면</span>

        {!current && <span className="shrink-0 text-gray-400">상태를 불러오는 중…</span>}

        {current && !hasGreen && (
          <span className="shrink-0 rounded border border-gray-200 bg-white px-2 py-0.5 text-gray-600">
            모든 파일을 최신 그대로 실행해요 (아직 실행에 성공한 정상 버전이 없어요)
          </span>
        )}

        {current && hasGreen && plan && plan.staleFiles.length === 0 && (
          <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
            ✅ 모든 파일이 최신 코드로 실행돼요
          </span>
        )}

        {current && hasGreen && plan && plan.staleFiles.length > 0 && (
          <>
            <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
              🕘 {staleNames.join(", ")} 님이 작성 중인 파일 {plan.staleFiles.length}개는 {staleLabel}으로
            </span>
            <span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
              ✅ 나머지는 최신 코드로
            </span>
          </>
        )}

        {brokenLatestFiles.length > 0 && (
          <span
            className="shrink-0 rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700"
            title={brokenLatestFiles.map((file) => file.path).join("\n")}
          >
            ⚠ 문법 오류:{" "}
            {brokenLatestFiles
              .slice(0, 3)
              .map((file) => fileNameOf(file.path))
              .join(", ")}
            {brokenLatestFiles.length > 3 ? ` 외 ${brokenLatestFiles.length - 3}개` : ""}
          </span>
        )}

        <button
          type="button"
          onClick={() => setIsDetailOpen((open) => !open)}
          className="ml-auto shrink-0 rounded border border-gray-200 bg-white px-2 py-0.5 text-gray-600 hover:bg-gray-100"
        >
          {isDetailOpen ? "닫기" : "파일별로 보기"}
        </button>
      </div>
    </div>
  );
}
