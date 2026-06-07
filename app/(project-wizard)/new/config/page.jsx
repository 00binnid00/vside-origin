"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Folder,
  Github,
  Link2,
  PlusCircle,
  RefreshCw,
  Rocket,
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
  createProjectApi,
  updateGitUrlApi,
} from "@/lib/ide/api";

const WORKSPACE_CREATE_ENTRY_KEY = "workspace_create_entry";

const OAUTH_RESULT_STORAGE_KEY = "wevaisGithubOAuthResult";
const OAUTH_PENDING_STORAGE_KEY = "wevaisPendingGitRemoteAction";
const OAUTH_RETURN_URL_STORAGE_KEY = "wevaisGithubOAuthReturnUrl";

const normalizeBaseUrl = (url = "") => {
  return String(url || "").replace(/\/+$/, "");
};

const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
);

const normalizeGitHubRepoUrl = (rawUrl = "") => {
  const value = String(rawUrl || "").trim();

  if (!value) return "";

  if (value.startsWith("git@github.com:")) {
    const repoPath = value.replace("git@github.com:", "").replace(/\.git$/, "");
    return `https://github.com/${repoPath}.git`;
  }

  if (value.startsWith("http://github.com/")) {
    return value.replace("http://github.com/", "https://github.com/");
  }

  return value;
};

const isValidGitHubRepoUrl = (rawUrl = "") => {
  const url = normalizeGitHubRepoUrl(rawUrl);

  if (!url) return true;

  return /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(
    url,
  );
};

const getStoredAccessToken = () => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken") ||
    ""
  );
};

const getGithubAccountName = (status) => {
  return status?.username || status?.login || status?.githubUsername || "";
};

async function fetchGithubStatusApi() {
  const token = getStoredAccessToken();

  const response = await fetch(`${API_BASE_URL}/api/github/status`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 404 || response.status === 500) {
    return {
      connected: false,
    };
  }

  if (!response.ok) {
    throw new Error("GitHub 계정 연결 상태를 확인하지 못했습니다.");
  }

  const data = await response.json();

  return {
    connected: Boolean(data.connected ?? data.linked ?? data.githubLinked),
    username: data.username ?? data.githubUsername ?? data.login ?? null,
    login: data.login ?? null,
    email: data.email ?? data.githubEmail ?? null,
    avatarUrl: data.avatarUrl ?? data.githubAvatarUrl ?? null,
    connectedAt: data.connectedAt ?? data.updatedAt ?? null,
  };
}

function openGithubAccountOAuth() {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

  if (!clientId) {
    alert(
      "GitHub OAuth 설정이 없습니다.\n.env.local에 NEXT_PUBLIC_GITHUB_CLIENT_ID를 추가해주세요.",
    );
    return;
  }

  const statePayload = {
    source: "project-create",
    action: "account-link",
    requestedAt: Date.now(),
  };

  window.sessionStorage.setItem(
    OAUTH_PENDING_STORAGE_KEY,
    JSON.stringify(statePayload),
  );

  window.sessionStorage.setItem(
    OAUTH_RETURN_URL_STORAGE_KEY,
    window.location.href,
  );

  const authUrl = new URL("https://github.com/login/oauth/authorize");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "repo");
  authUrl.searchParams.set(
    "redirect_uri",
    `${window.location.origin}/auth/github/callback`,
  );
  authUrl.searchParams.set("state", JSON.stringify(statePayload));

  window.location.assign(authUrl.toString());
}

export default function Page() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [isCreating, setIsCreating] = useState(false);
  const [gitUrl, setGitUrl] = useState("");
  const [githubStatus, setGithubStatus] = useState(null);
  const [githubLoading, setGithubLoading] = useState(true);
  const [githubError, setGithubError] = useState("");
  const [gitConnectMode, setGitConnectMode] = useState("later");

  const mode = useWorkspaceWizard((s) => s.mode);
  const language = useWorkspaceWizard((s) => s.language);

  const projectName = useWorkspaceWizard((s) => s.projectName);
  const projectDescription = useWorkspaceWizard((s) => s.projectDescription);

  const templateName = useWorkspaceWizard((s) => s.templateName);
  const setTemplateName = useWorkspaceWizard((s) => s.setTemplateName);

  const templateDescription = useWorkspaceWizard((s) => s.templateDescription);
  const setTemplateDescription = useWorkspaceWizard(
    (s) => s.setTemplateDescription,
  );

  const teamMembers = useWorkspaceWizard((s) => s.teamMembers);
  const path = useWorkspaceWizard((s) => s.path);
  const setPath = useWorkspaceWizard((s) => s.setPath);

  const githubName = getGithubAccountName(githubStatus);
  const isGithubConnected = Boolean(githubStatus?.connected);

  const loadGithubStatus = async () => {
    try {
      setGithubLoading(true);
      setGithubError("");

      const status = await fetchGithubStatusApi();
      setGithubStatus(status);

      if (!status.connected) {
        setGitConnectMode("later");
      }
    } catch (error) {
      setGithubStatus({
        connected: false,
      });

      setGithubError(
        error instanceof Error
          ? error.message
          : "GitHub 연결 상태를 확인하지 못했습니다.",
      );

      setGitConnectMode("later");
    } finally {
      setGithubLoading(false);
    }
  };

  useEffect(() => {
    if (!mode) {
      router.replace("/new/workspace");
      return;
    }

    if (!language) {
      router.replace("/new/language");
    }
  }, [mode, language, router]);

  useEffect(() => {
    loadGithubStatus();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawResult = window.sessionStorage.getItem(OAUTH_RESULT_STORAGE_KEY);
    if (!rawResult) return;

    window.sessionStorage.removeItem(OAUTH_RESULT_STORAGE_KEY);

    try {
      const result = JSON.parse(rawResult);

      if (result.status === "success") {
        setGithubError("");
        loadGithubStatus();
        return;
      }

      if (result.status === "error") {
        setGithubError(
          result.message || "GitHub 인증 처리 중 문제가 발생했습니다.",
        );
      }
    } catch {
      setGithubError("GitHub 인증 결과를 확인하지 못했습니다.");
    }
  }, []);

  const goBack = () => {
    router.push("/new/language");
  };

  const goCreate = async () => {
    if (
      !mode ||
      !language ||
      !projectName.trim() ||
      !templateName.trim() ||
      !path.trim()
    ) {
      return;
    }

    if (isCreating) return;

    const normalizedGitUrl =
      gitConnectMode === "repo" ? normalizeGitHubRepoUrl(gitUrl) : "";

    if (normalizedGitUrl && !isValidGitHubRepoUrl(normalizedGitUrl)) {
      alert(
        "GitHub 저장소 주소 형식이 올바르지 않습니다.\n\n예시: https://github.com/username/repository.git",
      );
      return;
    }

    if (gitConnectMode === "repo" && !isGithubConnected) {
      alert("GitHub 계정 연결 후 저장소를 연결할 수 있습니다.");
      return;
    }

    if (gitConnectMode === "repo" && !normalizedGitUrl) {
      alert("연결할 GitHub 저장소 URL을 입력해주세요.");
      return;
    }

    try {
      setIsCreating(true);

      const createdWorkspace = await createWorkspaceApi({
        mode,
        name: projectName,
        description: projectDescription,
        path,
        teamName: mode === "team" ? projectName : null,
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
            inviteWorkspaceMemberApi({ workspaceId, email }),
          ),
        );
      }

      const storedTemplateType =
        typeof window !== "undefined"
          ? sessionStorage.getItem("wizard_template_type") ||
            localStorage.getItem("wizard_template_type") ||
            "CONSOLE"
          : "CONSOLE";

      await createProjectApi({
        workspaceId,
        projectName: templateName,
        description: templateDescription,
        language,
        gitUrl: normalizedGitUrl || null,
        templateType: storedTemplateType,
      });

      if (normalizedGitUrl) {
        await updateGitUrlApi(workspaceId, templateName, normalizedGitUrl);
      }

      const isCreatedFromDashboard =
        typeof window !== "undefined" &&
        sessionStorage.getItem(WORKSPACE_CREATE_ENTRY_KEY) === "dashboard";

      if (typeof window !== "undefined") {
        sessionStorage.removeItem("wizard_template_type");
        localStorage.removeItem("wizard_template_type");

        sessionStorage.removeItem(WORKSPACE_CREATE_ENTRY_KEY);
        localStorage.removeItem(WORKSPACE_CREATE_ENTRY_KEY);
      }

      dispatch(setWorkspaceId(workspaceId));

      dispatch(
        setProjectList([
          {
            name: templateName,
            projectName: templateName,
            language,
            description: templateDescription,
            gitUrl: normalizedGitUrl,
            templateType: storedTemplateType,
            branchName: "master",
          },
        ]),
      );

      dispatch(setWorkspaceTree(null));
      dispatch(setActiveProject(templateName));

      if (isCreatedFromDashboard) {
        router.replace("/main");
        return;
      }

      if (mode === "personal") {
        router.replace(`/ide/personal/${workspaceId}`);
        return;
      }

      router.replace(`/ide/team/${workspaceId}`);
    } catch (error) {
      console.error("생성 실패:", error);

      alert(
        error instanceof Error
          ? error.message
          : "프로젝트 생성에 실패했습니다.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (!mode || !language) return null;

  const normalizedGitUrl = normalizeGitHubRepoUrl(gitUrl);
  const isGitUrlInvalid =
    gitConnectMode === "repo" &&
    Boolean(normalizedGitUrl) &&
    !isValidGitHubRepoUrl(normalizedGitUrl);

  const isRepoModeInvalid =
    gitConnectMode === "repo" && (!isGithubConnected || !normalizedGitUrl);

  const isDisabled =
    isCreating ||
    !projectName.trim() ||
    !templateName.trim() ||
    !path.trim() ||
    isGitUrlInvalid ||
    isRepoModeInvalid;

  return (
    <WizardShell>
      <div className="mx-auto max-w-6xl px-4">
        <section className="rounded-[26px] border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-50 px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                  Package Create
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  작업 공간 구성
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                 작업 공간 정보와 GitHub 저장소 연결 방식을 설정하세요.
                </p>
              </div>

              <StepIndicator current={3} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_0.95fr]">
            <main className="border-b border-blue-50 p-5 lg:border-b-0 lg:border-r">
              <section className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700">
                    {language}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                    {mode === "team" ? "팀 프로젝트" : "개인 프로젝트"}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                    프로젝트: {projectName}
                  </span>
                </div>
              </section>

              <div className="space-y-4">
                <label className="block">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-700">
                      작업 이름
                    </span>
                    <span className="text-[11px] font-black text-blue-600">
                      Required
                    </span>
                  </div>
                  <input
                    className="h-11 w-full rounded-2xl border border-blue-100 bg-blue-50/50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="예: backend-auth-server"
                  />
                </label>

                <label className="block">
                  <div className="mb-1.5 text-sm font-black text-slate-700">
                    작업 설명
                  </div>
                  <textarea
                    className="min-h-[82px] w-full resize-none rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="이 프로젝트에서 구현할 기능을 입력하세요."
                  />
                </label>

                <label className="block">
                  <div className="mb-1.5 text-sm font-black text-slate-700">
                    저장 위치
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="h-11 flex-1 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder="C:\\WebIDE\\workspaces"
                    />
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-slate-500">
                      <Folder size={18} />
                    </div>
                  </div>
                </label>
              </div>
            </main>

            <aside className="p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black tracking-tight text-slate-950">
                    GitHub 저장소 연결
                  </h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    GitHub 계정은 사용자 단위, 저장소는 프로젝트 단위로
                    연결합니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadGithubStatus}
                  disabled={githubLoading}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-blue-100 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-blue-50 disabled:opacity-50"
                >
                  <RefreshCw
                    size={13}
                    className={githubLoading ? "animate-spin" : ""}
                  />
                  확인
                </button>
              </div>

              <div
                className={[
                  "mb-4 rounded-2xl border p-4",
                  isGithubConnected
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isGithubConnected
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700",
                    ].join(" ")}
                  >
                    {isGithubConnected ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <AlertCircle size={20} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">
                      {githubLoading
                        ? "GitHub 계정 연결 상태 확인 중"
                        : isGithubConnected
                          ? `GitHub 계정: ${githubName || "연결됨"}`
                          : "GitHub 계정 연결이 필요합니다"}
                    </p>

                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                      {isGithubConnected
                        ? "현재 프로젝트에 저장소 URL을 연결할 수 있습니다."
                        : "연결하지 않아도 프로젝트 생성은 가능합니다."}
                    </p>

                    {githubError && (
                      <p className="mt-2 text-xs font-black text-amber-700">
                        {githubError}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {isGithubConnected ? (
                <div className="grid grid-cols-1 gap-2">
                  <GithubOptionCard
                    selected={gitConnectMode === "repo"}
                    icon={Link2}
                    title="기존 저장소 연결"
                    description="Repository URL을 입력해 생성 즉시 연결합니다."
                    onClick={() => setGitConnectMode("repo")}
                  />

                  <GithubOptionCard
                    selected={false}
                    disabled
                    icon={PlusCircle}
                    title="새 저장소 생성"
                    description="GitHub Repository 자동 생성 기능입니다."
                    badge="추후"
                    onClick={() => {}}
                  />

                  <GithubOptionCard
                    selected={gitConnectMode === "later"}
                    icon={Github}
                    title="나중에 연결"
                    description="IDE의 Source Control에서 나중에 연결합니다."
                    onClick={() => {
                      setGitConnectMode("later");
                      setGitUrl("");
                    }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <GithubOptionCard
                    selected={false}
                    icon={Github}
                    title="GitHub 연결하기"
                    description="GitHub 인증 후 이 화면으로 돌아옵니다."
                    onClick={openGithubAccountOAuth}
                  />

                  <GithubOptionCard
                    selected={gitConnectMode === "later"}
                    icon={Link2}
                    title="나중에 연결"
                    description="저장소 없이 프로젝트를 먼저 생성합니다."
                    onClick={() => {
                      setGitConnectMode("later");
                      setGitUrl("");
                    }}
                  />
                </div>
              )}

              {gitConnectMode === "repo" && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <label className="block">
                    <div className="mb-1.5 text-sm font-black text-slate-700">
                      Repository URL
                    </div>

                    <input
                      className={`h-11 w-full rounded-2xl px-4 font-mono text-sm font-bold outline-none transition ${
                        isGitUrlInvalid
                          ? "border border-red-300 bg-red-50 text-red-700 focus:ring-4 focus:ring-red-50"
                          : "border border-blue-100 bg-white text-slate-800 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                      }`}
                      placeholder="https://github.com/username/repository.git"
                      value={gitUrl}
                      onChange={(e) => setGitUrl(e.target.value)}
                      onBlur={(e) =>
                        setGitUrl(normalizeGitHubRepoUrl(e.target.value))
                      }
                    />
                  </label>

                  {isGitUrlInvalid ? (
                    <p className="mt-2 text-xs font-bold text-red-600">
                      GitHub 저장소 주소는
                      https://github.com/username/repository.git 형식이어야
                      합니다.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      SSH 주소를 입력하면 가능한 경우 HTTPS 주소로 자동
                      변환합니다.
                    </p>
                  )}
                </div>
              )}
            </aside>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-blue-50 bg-slate-50/80 px-6 py-4">
            <button
              type="button"
              onClick={goBack}
              disabled={isCreating}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              뒤로
            </button>

            <button
              type="button"
              onClick={goCreate}
              disabled={isDisabled}
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

function StepIndicator({ current }) {
  const steps = ["기본 정보", "템플릿 선택", "작업 공간 구성"];

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === current;
        const isDone = stepNumber < current;

        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-black",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : isDone
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-400",
              ].join(" ")}
            >
              {isDone ? <CheckCircle2 size={13} /> : <span>{stepNumber}</span>}
              <span>{step}</span>
            </div>

            {index < steps.length - 1 && (
              <div className="hidden h-px w-5 bg-slate-200 sm:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function GithubOptionCard({
  selected,
  disabled = false,
  icon: Icon,
  title,
  description,
  badge,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all",
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
          : selected
            ? "border-blue-500 bg-blue-50 shadow-sm ring-4 ring-blue-100"
            : "border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50/60",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          selected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700",
        ].join(" ")}
      >
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-slate-950">{title}</p>
          {badge && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-500">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
          {description}
        </p>
      </div>

      {selected && (
        <div className="absolute right-3 top-3 text-blue-600">
          <CheckCircle2 size={17} />
        </div>
      )}
    </button>
  );
}