"use client";

// 경로: src/app/auth/github/callback/page.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  VscArrowLeft,
  VscCheck,
  VscCloudUpload,
  VscError,
  VscGithubInverted,
  VscLoading,
  VscShield,
} from "react-icons/vsc";
import { apiFetch } from "@/lib/api/apiClient";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const OAUTH_RESULT_MESSAGE = "WEVAIS_GITHUB_OAUTH_RESULT";
const OAUTH_RESULT_STORAGE_KEY = "wevaisGithubOAuthResult";
const OAUTH_RETURN_URL_STORAGE_KEY = "wevaisGithubOAuthReturnUrl";

const parseOAuthState = (rawState) => {
  if (!rawState) return null;

  try {
    return JSON.parse(rawState);
  } catch {
    return null;
  }
};

export default function GithubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get("code");
  const rawState = searchParams.get("state");
  const state = useMemo(() => parseOAuthState(rawState), [rawState]);

  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const hasRequested = useRef(false);

  const getReturnUrl = () => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem(OAUTH_RETURN_URL_STORAGE_KEY);
  };

  const goBackToIde = () => {
    const returnUrl = getReturnUrl();

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(OAUTH_RETURN_URL_STORAGE_KEY);
    }

    if (returnUrl) {
      window.location.replace(returnUrl);
      return;
    }

    router.replace("/");
  };

  const notifyResult = (payload) => {
    const message = {
      type: OAUTH_RESULT_MESSAGE,
      ...payload,
    };

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(message, window.location.origin);
      return;
    }

    window.sessionStorage.setItem(OAUTH_RESULT_STORAGE_KEY, JSON.stringify(message));
  };

  useEffect(() => {
    if (error) {
      const message =
        errorDescription || "GitHub 인증이 취소되었거나 승인되지 않았습니다.";

      setStatus("error");
      setErrorMessage(message);
      notifyResult({ status: "error", message, state });
      return;
    }

    if (!code) {
      const message =
        "GitHub 인증 코드가 없습니다. IDE에서 다시 연동을 시도해주세요.";

      setStatus("error");
      setErrorMessage(message);
      notifyResult({ status: "error", message, state });
      return;
    }

    if (hasRequested.current) return;
    hasRequested.current = true;

    const sendCodeToBackend = async () => {
      try {
        const response = await apiFetch(`${API_BASE_URL}/api/github/link`, {
          method: "POST",
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errText = await response.text();

          if (response.status === 401) {
            throw new Error(
              errText ||
                "로그인 인증이 만료되었거나 GitHub 인증 코드가 유효하지 않습니다. IDE에서 다시 연동해주세요.",
            );
          }

          throw new Error(errText || "백엔드 GitHub 연동 처리에 실패했습니다.");
        }

        setStatus("success");
        notifyResult({ status: "success", state });

        setTimeout(() => {
          goBackToIde();
        }, 1200);
      } catch (requestError) {
        const message =
          requestError?.message ||
          "GitHub 계정 연동 중 알 수 없는 오류가 발생했습니다.";

        setStatus("error");
        setErrorMessage(message);
        notifyResult({ status: "error", message, state });
      }
    };

    sendCodeToBackend();
  }, [code, error, errorDescription, router, state]);

  const ui = useMemo(() => {
    if (status === "success") {
      return {
        badge: "연동 완료",
        title: "GitHub 계정이 연결되었습니다",
        description:
          "이제 Push/Pull 요청은 별도 토큰 입력 없이 서버에 저장된 인증 정보로 처리됩니다.",
        icon: <VscCheck size={34} />,
        iconClass: "bg-emerald-50 text-emerald-600 border-emerald-100",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
      };
    }

    if (status === "error") {
      return {
        badge: "연동 실패",
        title: "GitHub 계정을 연결하지 못했습니다",
        description:
          errorMessage ||
          "인증 코드가 만료되었거나 로그인 정보가 확인되지 않았습니다.",
        icon: <VscError size={34} />,
        iconClass: "bg-red-50 text-red-600 border-red-100",
        badgeClass: "bg-red-50 text-red-700 border-red-100",
      };
    }

    return {
      badge: "인증 처리 중",
      title: "GitHub 계정을 연결하는 중입니다",
      description:
        "GitHub에서 받은 인증 코드를 서버로 전달하고 있습니다. 잠시만 기다려주세요.",
      icon: <VscLoading size={34} className="animate-spin" />,
      iconClass: "bg-blue-50 text-blue-600 border-blue-100",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-100",
    };
  }, [status, errorMessage]);

  return (
    <div className="min-h-screen w-screen bg-[#f5f7fb] font-sans text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-160px] h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[12%] h-[360px] w-[460px] rounded-full bg-indigo-100/70 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
          <div className="border-b border-slate-100 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 px-8 py-7">
            <div className="mb-7 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-blue-600">
                  WEVAIS
                </span>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                  IDE
                </span>
              </div>

              <VscGithubInverted size={22} className="text-slate-800" />
            </div>

            <div className="flex items-start gap-5">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border shadow-sm ${ui.iconClass}`}
              >
                {ui.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${ui.badgeClass}`}
                  >
                    GitHub OAuth
                  </span>
                  <span className="rounded-full border border-slate-100 bg-white px-2.5 py-1 text-[10px] font-black text-slate-500">
                    {ui.badge}
                  </span>
                </div>

                <h1 className="text-2xl font-black tracking-tight text-slate-950">
                  {ui.title}
                </h1>

                <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">
                  {ui.description}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 px-8 py-6">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                <VscShield size={17} />
              </div>
              <p className="text-xs font-bold leading-relaxed text-slate-600">
                인증이 완료되면 access token은 브라우저가 아니라 서버 DB에 저장됩니다.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <VscCloudUpload size={17} />
              </div>
              <p className="text-xs font-bold leading-relaxed text-slate-600">
                이후 Pull/Push는 토큰 입력 없이 현재 로그인 계정 기준으로 처리됩니다.
              </p>
            </div>

            {status === "error" && (
              <div className="whitespace-pre-line rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold leading-relaxed text-red-700">
                {errorMessage}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-8 py-5">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Secure OAuth Flow
            </span>

            {status === "error" ? (
              <button
                type="button"
                onClick={goBackToIde}
                className="flex h-11 items-center gap-2 rounded-2xl bg-slate-950 px-5 text-xs font-black text-white shadow-sm transition-colors hover:bg-slate-800"
              >
                <VscArrowLeft size={15} />
                IDE로 돌아가기
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex h-11 items-center gap-2 rounded-2xl bg-slate-200 px-5 text-xs font-black text-slate-500"
              >
                {status === "success" ? "곧 돌아갑니다" : "처리 중"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
