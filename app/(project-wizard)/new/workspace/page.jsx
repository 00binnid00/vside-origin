"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  CheckCircle2,
  Copy,
  Folder,
  Rocket,
  UsersRound,
  UserRound,
} from "lucide-react";

import WizardShell from "@/components/new/WizardShell";
import { useWorkspaceWizard } from "@/store/workspaceWizardStore";

import {
  setWorkspaceId,
  setProjectList,
  setWorkspaceTree,
  setActiveProject,
} from "@/store/slices/fileSystemSlice";

import {
  createWorkspaceApi,
  inviteWorkspaceMemberApi,
 
} from "@/lib/ide/api";



export default function Page() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [memberInput, setMemberInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const mode = useWorkspaceWizard((s) => s.mode);
  const setMode = useWorkspaceWizard((s) => s.setMode);

  const projectName = useWorkspaceWizard((s) => s.projectName);
  const setProjectName = useWorkspaceWizard((s) => s.setProjectName);

  const projectDescription = useWorkspaceWizard((s) => s.projectDescription);
  const setProjectDescription = useWorkspaceWizard(
    (s) => s.setProjectDescription,
  );

  const path = useWorkspaceWizard((s) => s.path);
  const setPath = useWorkspaceWizard((s) => s.setPath);

  const teamMembers = useWorkspaceWizard((s) => s.teamMembers);
  const addTeamMember = useWorkspaceWizard((s) => s.addTeamMember);
  const removeTeamMember = useWorkspaceWizard((s) => s.removeTeamMember);

  const projectKey = useWorkspaceWizard((s) => s.projectKey);
  const setProjectKey = useWorkspaceWizard((s) => s.setProjectKey);

  const generatedProjectKey = useMemo(() => {
    if (projectKey) return projectKey;
    return "PROJ-4K9L-M2X7";
  }, [projectKey]);

  const canCreate = Boolean(mode && projectName.trim() && path.trim());

  const goBack = () => {
    router.push("/main");
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(generatedProjectKey);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMember = () => {
    const email = memberInput.trim();
    if (!email) return;

    addTeamMember(email);
    setMemberInput("");
  };

  const handleSelectMode = (selectedMode) => {
    setMode(selectedMode);

    if (selectedMode === "team" && !projectKey) {
      setProjectKey(generatedProjectKey);
    }
  };

 const handleCreateProject = async () => {
  if (!canCreate || isCreating) return;

  const trimmedProjectName = projectName.trim();
  const trimmedDescription = projectDescription.trim();
  const trimmedPath = path.trim();

  try {
    setIsCreating(true);

    const createdWorkspace = await createWorkspaceApi({
      mode,
      name: trimmedProjectName,
      description: trimmedDescription,
      path: trimmedPath,
      teamName: mode === "team" ? trimmedProjectName : null,
    });

    const workspaceId =
      createdWorkspace?.uuid ||
      createdWorkspace?.id ||
      createdWorkspace?.workspaceId;

    if (!workspaceId) {
      throw new Error("생성 응답에 workspaceId(uuid)가 없습니다.");
    }

    if (mode === "team" && teamMembers.length > 0) {
      await Promise.all(
        teamMembers.map((email) =>
          inviteWorkspaceMemberApi({
            workspaceId,
            email,
          }),
        ),
      );
    }

    dispatch(setWorkspaceId(workspaceId));

    // 대시보드에서 만든 프로젝트는 하위 프로젝트를 자동 생성하지 않음
    dispatch(setProjectList([]));
    dispatch(setWorkspaceTree(null));
    dispatch(setActiveProject(null));

    router.replace("/main");
  } catch (error) {
    console.error("프로젝트 생성 실패:", error);

    alert(
      error instanceof Error
        ? error.message
        : "프로젝트 생성에 실패했습니다.",
    );
  } finally {
    setIsCreating(false);
  }
};

  return (
    <WizardShell>
      <div className="mx-auto max-w-5xl px-4">
        <section className="rounded-[26px] border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-50 px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                  Project Create
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  새 프로젝트 생성
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  프로젝트 이름, 설명, 저장 위치, 생성 방식을 입력하면 바로
                  대시보드에 프로젝트가 생성됩니다.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">
                <CheckCircle2 size={15} />
                단일 생성 단계
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-[1fr_300px]">
            <main className="space-y-4">
              <section className="grid grid-cols-1 gap-4">
                <label className="block">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-700">
                      프로젝트 이름
                    </span>
                    <span className="text-[11px] font-black text-blue-600">
                      Required
                    </span>
                  </div>

                  <input
                    className="h-11 w-full rounded-2xl border border-blue-100 bg-blue-50/50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="예: AIVS 협업 IDE"
                    disabled={isCreating}
                  />
                </label>

                <label className="block">
                  <div className="mb-1.5 text-sm font-black text-slate-700">
                    프로젝트 설명
                  </div>

                  <textarea
                    className="min-h-[78px] w-full resize-none rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="프로젝트 목적이나 주요 기능을 간단히 입력하세요."
                    disabled={isCreating}
                  />
                </label>

                <label className="block">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-700">
                      저장 위치
                    </span>
                    <span className="text-[11px] font-black text-slate-400">
                      Local path
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      className="h-11 flex-1 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder="C:\\WebIDE\\workspaces"
                      disabled={isCreating}
                    />

                    <button
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-slate-500 transition hover:bg-blue-50 disabled:opacity-50"
                      type="button"
                      disabled={isCreating}
                    >
                      <Folder size={18} />
                    </button>
                  </div>
                </label>
              </section>

              <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-black text-slate-900">
                    생성 방식
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    개인 프로젝트 또는 팀 협업 프로젝트 중 하나를 선택합니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <ModeCard
                    selected={mode === "personal"}
                    icon={UserRound}
                    title="개인 프로젝트"
                    description="혼자 빠르게 개발하고 기록을 관리합니다."
                    badge="Solo"
                    disabled={isCreating}
                    onClick={() => handleSelectMode("personal")}
                  />

                  <ModeCard
                    selected={mode === "team"}
                    icon={UsersRound}
                    title="팀 프로젝트"
                    description="팀원 초대, 협업 편집, 공유 일정을 사용합니다."
                    badge="Team"
                    disabled={isCreating}
                    onClick={() => handleSelectMode("team")}
                  />
                </div>
              </section>

              {mode === "team" && (
                <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        팀원 초대
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        이메일을 입력하거나 프로젝트 키를 공유하세요.
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                      {teamMembers.length}명
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      className="h-10 flex-1 rounded-xl border border-blue-100 bg-blue-50/50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 focus:bg-white"
                      placeholder="team@email.com"
                      value={memberInput}
                      disabled={isCreating}
                      onChange={(e) => setMemberInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddMember();
                      }}
                    />

                    <button
                      type="button"
                      onClick={handleAddMember}
                      disabled={isCreating}
                      className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      추가
                    </button>
                  </div>

                  {teamMembers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {teamMembers.map((email) => (
                        <div
                          key={email}
                          className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-slate-600"
                        >
                          <span>{email}</span>

                          <button
                            type="button"
                            onClick={() => removeTeamMember(email)}
                            disabled={isCreating}
                            className="text-slate-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr_auto] md:items-center">
                    <div className="text-xs font-black text-slate-500">
                      프로젝트 키
                    </div>

                    <input
                      className="h-10 rounded-xl border border-blue-100 bg-blue-50/50 px-3 font-mono text-sm font-black text-slate-700 outline-none"
                      value={generatedProjectKey}
                      readOnly
                    />

                    <button
                      type="button"
                      onClick={copyKey}
                      disabled={isCreating}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-slate-500 transition hover:bg-blue-50 disabled:opacity-50"
                      aria-label="copy project key"
                    >
                      <Copy size={17} />
                    </button>
                  </div>
                </section>
              )}
            </main>

            <aside className="space-y-3">
              <InfoCard
                title="생성 방식"
                value={
                  mode === "team"
                    ? "팀 프로젝트"
                    : mode === "personal"
                      ? "개인 프로젝트"
                      : "미선택"
                }
                description="개인 또는 팀 프로젝트를 선택하면 생성할 수 있습니다."
              />

              <InfoCard
                title="필수 입력"
                value="이름 / 저장 위치"
                description="프로젝트 이름과 저장 위치는 반드시 입력해야 합니다."
              />

              <InfoCard
                title="생성 후 이동"
                value="대시보드"
                description="언어 선택과 작업 공간 구성 없이 바로 대시보드로 이동합니다."
              />
            </aside>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-blue-50 bg-slate-50/80 px-6 py-4">
            <button
              type="button"
              onClick={goBack}
              disabled={isCreating}
              className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              취소
            </button>

            <button
              type="button"
              onClick={handleCreateProject}
              disabled={!canCreate || isCreating}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isCreating ? "생성 중..." : "프로젝트 만들기"}
              <Rocket size={16} />
            </button>
          </div>
        </section>
      </div>
    </WizardShell>
  );
}

function ModeCard({
  selected,
  icon: Icon,
  title,
  description,
  badge,
  disabled = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative rounded-2xl border p-4 text-left transition-all",
        disabled ? "cursor-not-allowed opacity-70" : "",
        selected
          ? "border-blue-500 bg-white shadow-sm ring-4 ring-blue-100"
          : "border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50/70",
      ].join(" ")}
    >
      <div className="mb-3 flex items-start justify-between">
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl",
            selected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700",
          ].join(" ")}
        >
          <Icon size={21} />
        </div>

        <span
          className={[
            "rounded-full px-2.5 py-1 text-[11px] font-black",
            selected ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500",
          ].join(" ")}
        >
          {badge}
        </span>
      </div>

      <h3 className="text-sm font-black text-slate-950">{title}</h3>

      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {description}
      </p>

      {selected && (
        <div className="absolute bottom-3 right-3 text-blue-600">
          <CheckCircle2 size={18} />
        </div>
      )}
    </button>
  );
}

function InfoCard({ title, value, description }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <p className="text-[11px] font-black uppercase tracking-wider text-blue-500">
        {title}
      </p>

      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>

      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}