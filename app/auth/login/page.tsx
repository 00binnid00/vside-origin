"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  ArrowRight,
  Eye,
  EyeOff,
  FolderKanban,
  GitBranch,
  Sparkles,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/contexts/AuthContext";


function cn(
  ...classes: Array<
    | string
    | false
    | null
    | undefined
  >
) {
  return classes
    .filter(Boolean)
    .join(" ");
}


function isEmail(
  v: string,
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    v.trim(),
  );
}


export default function LoginPage() {
  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    showPw,
    setShowPw,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");


  const {
    login,
  } =
    useAuth();


  const router =
    useRouter();


  const canSubmit =
    useMemo(() => {
      return (
        isEmail(email) &&
        password.length > 0 &&
        !loading
      );
    }, [
      email,
      password,
      loading,
    ]);


  /* ========================================
     로그인
  ======================================== */

  const onSubmit =
    async (
      e: FormEvent<HTMLFormElement>,
    ) => {
      e.preventDefault();

      if (!canSubmit) {
        return;
      }

      try {
        setLoading(true);

        setError("");

        /*
         * AuthContext.login()이
         * /login → /me까지 확인한
         * 최신 사용자 정보를 반환한다.
         */
        const loggedInUser =
          await login(
            email.trim(),
            password,
          );


        console.log(
          "[로그인 완료 사용자]",
          loggedInUser,
        );

        console.log(
          "[로그인 완료 role]",
          loggedInUser.role,
        );


        /* ==================================
           관리자
        ================================== */

        if (
          loggedInUser.role ===
          "ADMIN"
        ) {
          console.log(
            "[관리자 로그인] /admin 이동",
          );

          router.replace(
            "/admin",
          );

          return;
        }


        /* ==================================
           일반 사용자
        ================================== */

        console.log(
          "[일반 사용자 로그인] /main 이동",
        );

        router.replace(
          "/main",
        );

      } catch (err) {
        console.error(
          "로그인 실패:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "로그인 중 오류가 발생했습니다.",
        );
      } finally {
        setLoading(
          false,
        );
      }
    };


  return (
    <main className="min-h-dvh overflow-hidden bg-[#f8fbff] text-slate-950">

      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1fr_1fr]">

        {/* ====================================
            왼쪽 소개
        ==================================== */}

        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-50 via-sky-50 to-white px-14 py-10 lg:flex lg:flex-col lg:justify-between">

          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-blue-200/45 blur-3xl" />

          <div className="absolute bottom-16 left-10 h-60 w-60 rounded-full bg-sky-200/45 blur-3xl" />

          <div className="absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />


          <div className="relative z-10">

            <div className="flex items-center gap-3">

              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-200">
                W
              </div>


              <div>

                <p className="text-xl font-extrabold tracking-tight text-slate-950">
                  WAIVS
                </p>

                <p className="text-sm font-medium text-slate-500">
                  AI Collaborative IDE Platform
                </p>

              </div>

            </div>


            <div className="mt-20 max-w-xl">

              <p className="mb-4 inline-flex rounded-full border border-blue-100 bg-white/70 px-4 py-2 text-sm font-bold text-blue-600 shadow-sm">
                Project · Editor · Git · Documentation
              </p>


              <h1 className="text-5xl font-extrabold leading-[1.12] tracking-[-0.05em] text-slate-950">

                개발 프로젝트를

                <br />

                하나의 흐름으로

                <br />

                이어가세요.

              </h1>


              <p className="mt-5 max-w-md text-[15px] leading-7 text-slate-600">

                코드 작성, 일정 관리, 개발일지, Git 작업,
                AI 문서화를 하나의 워크스페이스 안에서 관리할 수 있습니다.

              </p>

            </div>

          </div>


          <div className="relative z-10 grid grid-cols-3 gap-3">

            <BlueInfoCard
              icon={
                <FolderKanban
                  size={18}
                />
              }
              title="Project"
              text="프로젝트 관리"
            />


            <BlueInfoCard
              icon={
                <GitBranch
                  size={18}
                />
              }
              title="Git"
              text="버전 관리"
            />


            <BlueInfoCard
              icon={
                <Sparkles
                  size={18}
                />
              }
              title="AI"
              text="코드 보조"
            />

          </div>

        </section>


        {/* ====================================
            로그인
        ==================================== */}

        <section className="flex min-h-dvh items-center justify-center px-6 py-8 sm:px-10 lg:px-14">

          <div className="w-full max-w-[420px]">

            {/* 모바일 로고 */}

            <div className="mb-8 lg:hidden">

              <div className="flex items-center gap-3">

                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-200">
                  W
                </div>


                <div>

                  <p className="text-xl font-extrabold tracking-tight text-slate-950">
                    WAIVS
                  </p>

                  <p className="text-sm text-slate-500">
                    AI Collaborative IDE Platform
                  </p>

                </div>

              </div>

            </div>


            {/* 제목 */}

            <div>

              <p className="text-sm font-bold text-blue-600">
                다시 만나서 반가워요
              </p>


              <h2 className="mt-2 text-4xl font-extrabold tracking-[-0.045em] text-slate-950">
                로그인
              </h2>


              <p className="mt-3 text-[15px] leading-6 text-slate-500">

                진행 중인 프로젝트와 워크스페이스를 계속 사용하려면
                로그인해주세요.

              </p>

            </div>


            {/* 폼 */}

            <form
              onSubmit={
                onSubmit
              }
              className="mt-9 space-y-4"
            >

              {/* 이메일 */}

              <div>

                <label className="text-sm font-bold text-slate-800">
                  아이디
                </label>


                <input
                  type="email"
                  value={
                    email
                  }
                  onChange={(
                    e,
                  ) =>
                    setEmail(
                      e.target.value,
                    )
                  }
                  placeholder="you@example.com"
                  className={cn(
                    "mt-2 h-13 w-full rounded-2xl border bg-white px-4 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400",
                    "shadow-[0_10px_30px_rgba(15,23,42,0.04)]",

                    email
                      ? isEmail(
                          email,
                        )
                        ? "border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        : "border-rose-300 bg-rose-50/50 focus:ring-4 focus:ring-rose-100"
                      : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
                  )}
                />


                {email &&
                !isEmail(
                  email,
                ) ? (

                  <p className="mt-2 text-xs font-semibold text-rose-600">
                    이메일 형식으로 입력해주세요.
                  </p>

                ) : null}

              </div>


              {/* 비밀번호 */}

              <div>

                <label className="text-sm font-bold text-slate-800">
                  비밀번호
                </label>


                <div className="relative mt-2">

                  <input
                    type={
                      showPw
                        ? "text"
                        : "password"
                    }
                    value={
                      password
                    }
                    onChange={(
                      e,
                    ) =>
                      setPassword(
                        e.target.value,
                      )
                    }
                    placeholder="비밀번호"
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-[15px] text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />


                  <button
                    type="button"
                    onClick={() =>
                      setShowPw(
                        (
                          previous,
                        ) =>
                          !previous,
                      )
                    }
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                    aria-label="비밀번호 보기 토글"
                  >

                    {showPw ? (
                      <EyeOff
                        size={18}
                      />
                    ) : (
                      <Eye
                        size={18}
                      />
                    )}

                  </button>

                </div>

              </div>


              {/* 에러 */}

              {error ? (

                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                  {
                    error
                  }
                </div>

              ) : null}


              {/* 로그인 */}

              <button
                type="submit"
                disabled={
                  !canSubmit
                }
                className={cn(
                  "group flex h-13 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold transition",

                  canSubmit
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                    : "cursor-not-allowed bg-slate-200 text-slate-500",
                )}
              >

                {loading
                  ? "로그인 중..."
                  : "로그인"}


                {!loading &&
                canSubmit ? (

                  <ArrowRight
                    size={18}
                    className="transition group-hover:translate-x-0.5"
                  />

                ) : null}

              </button>


              {/* 회원가입 */}

              <div className="flex items-center justify-center gap-2 pt-1 text-sm">

                <span className="text-slate-500">
                  아직 계정이 없어요?
                </span>


                <Link
                  href="/auth/signup"
                  className="font-extrabold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  회원가입
                </Link>

              </div>

            </form>

          </div>

        </section>

      </div>

    </main>
  );
}


/* ==========================================
   왼쪽 카드
========================================== */

function BlueInfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white/70 p-4 shadow-[0_12px_30px_rgba(37,99,235,0.08)] backdrop-blur">

      <div className="mb-3 grid h-9 w-9 place-items-center rounded-2xl bg-blue-50 text-blue-600">
        {
          icon
        }
      </div>


      <p className="text-sm font-extrabold text-slate-900">
        {
          title
        }
      </p>


      <p className="mt-1 text-xs font-semibold text-slate-500">
        {
          text
        }
      </p>

    </div>
  );
}