"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowRight,
  Check,
  Code2,
  Eye,
  EyeOff,
  FileText,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/authClient";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function SignupPage() {
  const [form, setForm] = useState({
    nickname: "",
    email: "",
    password: "",
    password2: "",
  });

  const [agree, setAgree] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });

  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const nicknameOk = useMemo(() => {
    return form.nickname.trim().length >= 2;
  }, [form.nickname]);

  const emailOk = useMemo(() => {
    return isEmail(form.email);
  }, [form.email]);

  const passwordOk = useMemo(() => {
    return form.password.length >= 8;
  }, [form.password]);

  const passwordMatch = useMemo(() => {
    return form.password2.length > 0 && form.password === form.password2;
  }, [form.password, form.password2]);

  const requiredAgreed = useMemo(() => {
    return agree.terms && agree.privacy;
  }, [agree.terms, agree.privacy]);

  const canSubmit = useMemo(() => {
    return (
      nicknameOk &&
      emailOk &&
      passwordOk &&
      passwordMatch &&
      requiredAgreed &&
      !loading
    );
  }, [nicknameOk, emailOk, passwordOk, passwordMatch, requiredAgreed, loading]);

  const setAllAgree = (checked: boolean) => {
    setAgree({
      all: checked,
      terms: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  const setAgreeItem = (
    key: "terms" | "privacy" | "marketing",
    checked: boolean,
  ) => {
    const next = { ...agree, [key]: checked };
    const allChecked = next.terms && next.privacy && next.marketing;

    setAgree({ ...next, all: allChecked });
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canSubmit) return;

    try {
      setLoading(true);
      setError("");

      await authClient.register({
        email: form.email.trim(),
        password: form.password,
        nickname: form.nickname.trim(),
      });

      router.replace("/auth/login");
    } catch (err) {
      console.error("회원가입 실패:", err);
      setError(
        err instanceof Error ? err.message : "회원가입 중 오류가 발생했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh overflow-hidden bg-[#f8fbff] text-slate-950">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-50 via-sky-50 to-white px-14 py-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-blue-200/45 blur-3xl" />
          <div className="absolute bottom-16 left-10 h-60 w-60 rounded-full bg-sky-200/45 blur-3xl" />
          <div className="absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-200">
                V
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

            <div className="mt-16 max-w-xl">
              <p className="mb-4 inline-flex rounded-full border border-blue-100 bg-white/70 px-4 py-2 text-sm font-bold text-blue-600 shadow-sm">
                New Developer Project
              </p>

              <h1 className="text-5xl font-extrabold leading-[1.12] tracking-[-0.05em] text-slate-950">
                계정을 만들고
                <br />
                프로젝트 작업을
                <br />
                시작하세요.
              </h1>

              <p className="mt-5 max-w-md text-[15px] leading-7 text-slate-600">
                개인 프로젝트와 팀 프로젝트를 생성하고, 템플릿 선택부터 코드
                작성, Git, 문서화까지 한 흐름으로 진행할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-2.5">
            <InfoRow icon={<Code2 size={17} />} text="Monaco 기반 코드 에디터" />
            <InfoRow icon={<GitBranch size={17} />} text="프로젝트별 Git 연동" />
            <InfoRow icon={<FileText size={17} />} text="개발일지와 보고서 관리" />
            <InfoRow icon={<Sparkles size={17} />} text="AI 코드 보조 및 문서 초안" />
          </div>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-6 py-5 sm:px-10 lg:px-14">
          <div className="w-full max-w-[520px]">
            <div className="mb-6 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-base font-black text-white shadow-lg shadow-blue-200">
                  W
                </div>

                <div>
                  <p className="text-lg font-extrabold tracking-tight text-slate-950">
                    WAIVS
                  </p>
                  <p className="text-xs text-slate-500">
                    AI Collaborative IDE Platform
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-blue-600">
                새 프로젝트를 시작해요
              </p>

              <h2 className="mt-1.5 text-3xl font-extrabold tracking-[-0.045em] text-slate-950">
                회원가입
              </h2>

              <p className="mt-2 text-sm leading-5 text-slate-500">
                WAIVS에서 사용할 계정 정보를 입력해주세요.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              <Field
                label="닉네임"
                value={form.nickname}
                placeholder="예) mongki"
                onChange={(v) => setForm((p) => ({ ...p, nickname: v }))}
                hint="2글자 이상 입력해주세요."
                ok={nicknameOk}
              />

              <Field
                label="아이디"
                value={form.email}
                placeholder="you@example.com"
                onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                hint="이메일 형식으로 입력해주세요."
                ok={emailOk}
                type="email"
              />

              <PasswordField
                label="비밀번호"
                value={form.password}
                placeholder="8자 이상"
                visible={showPw}
                onVisibleChange={() => setShowPw((s) => !s)}
                onChange={(v) => setForm((p) => ({ ...p, password: v }))}
                ok={passwordOk}
                emptyHint="비밀번호는 8자 이상을 권장해요."
                invalidHint="비밀번호는 8자 이상이어야 해요."
                validHint="사용 가능한 비밀번호예요."
              />

              <PasswordField
                label="비밀번호 확인"
                value={form.password2}
                placeholder="비밀번호 다시 입력"
                visible={showPw2}
                onVisibleChange={() => setShowPw2((s) => !s)}
                onChange={(v) => setForm((p) => ({ ...p, password2: v }))}
                ok={passwordMatch}
                emptyHint="비밀번호를 한 번 더 입력해주세요."
                invalidHint="비밀번호가 일치하지 않아요."
                validHint="비밀번호가 일치해요."
              />

              <div className="rounded-2xl border border-blue-100 bg-white/80 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <label className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                    <input
                      type="checkbox"
                      checked={agree.all}
                      onChange={(e) => setAllAgree(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                    />
                    전체 동의
                  </label>

                  <span className="text-xs font-semibold text-slate-400">
                    선택 포함
                  </span>
                </div>

                <div className="mt-2 space-y-1.5">
                  <AgreeRow
                    checked={agree.terms}
                    onChange={(v) => setAgreeItem("terms", v)}
                    label="(필수) 이용약관 동의"
                  />

                  <AgreeRow
                    checked={agree.privacy}
                    onChange={(v) => setAgreeItem("privacy", v)}
                    label="(필수) 개인정보 처리방침 동의"
                  />

                  <AgreeRow
                    checked={agree.marketing}
                    onChange={(v) => setAgreeItem("marketing", v)}
                    label="(선택) 마케팅 정보 수신 동의"
                  />
                </div>

                {!requiredAgreed ? (
                  <p className="mt-2 text-xs font-semibold text-rose-600">
                    필수 약관에 동의해야 회원가입을 진행할 수 있어요.
                  </p>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "group flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-extrabold transition",
                  canSubmit
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                    : "cursor-not-allowed bg-slate-200 text-slate-500",
                )}
              >
                {loading ? "가입 중..." : "회원가입 완료"}
                {!loading && canSubmit ? (
                  <ArrowRight
                    size={17}
                    className="transition group-hover:translate-x-0.5"
                  />
                ) : null}
              </button>

              <div className="flex items-center justify-center gap-2 pt-0.5 text-sm">
                <span className="text-slate-500">이미 계정이 있어요?</span>

                <Link
                  href="/auth/login"
                  className="font-extrabold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  로그인
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  hint,
  ok,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  hint: string;
  ok: boolean;
  type?: string;
}) {
  const filled = value.trim().length > 0;

  return (
    <div>
      <LabelRow label={label} ok={ok} show={filled} />

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "mt-1.5 h-11 w-full rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
          "shadow-[0_10px_30px_rgba(15,23,42,0.04)]",
          filled
            ? ok
              ? "border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              : "border-rose-300 bg-rose-50/50 focus:ring-4 focus:ring-rose-100"
            : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
        )}
      />

      <p
        className={cn(
          "mt-1 text-[11px] font-semibold",
          filled ? (ok ? "text-slate-400" : "text-rose-600") : "text-slate-400",
        )}
      >
        {filled ? (ok ? "입력 완료" : hint) : hint}
      </p>
    </div>
  );
}

function PasswordField({
  label,
  value,
  placeholder,
  visible,
  onVisibleChange,
  onChange,
  ok,
  emptyHint,
  invalidHint,
  validHint,
}: {
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onVisibleChange: () => void;
  onChange: (v: string) => void;
  ok: boolean;
  emptyHint: string;
  invalidHint: string;
  validHint: string;
}) {
  const filled = value.length > 0;

  return (
    <div>
      <LabelRow label={label} ok={ok} show={filled} />

      <div className="relative mt-1.5">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-11 w-full rounded-2xl border bg-white px-4 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
            "shadow-[0_10px_30px_rgba(15,23,42,0.04)]",
            filled
              ? ok
                ? "border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                : "border-rose-300 bg-rose-50/50 focus:ring-4 focus:ring-rose-100"
              : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100",
          )}
        />

        <button
          type="button"
          onClick={onVisibleChange}
          className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
          aria-label={`${label} 보기 토글`}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>

      <p
        className={cn(
          "mt-1 text-[11px] font-semibold",
          filled ? (ok ? "text-slate-400" : "text-rose-600") : "text-slate-400",
        )}
      >
        {filled ? (ok ? validHint : invalidHint) : emptyHint}
      </p>
    </div>
  );
}

function LabelRow({
  label,
  ok,
  show,
}: {
  label: string;
  ok: boolean;
  show: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-bold text-slate-800">{label}</label>

      {show ? (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-extrabold",
            ok ? "text-blue-600" : "text-rose-600",
          )}
        >
          {ok ? (
            <>
              <Check size={12} />
              OK
            </>
          ) : (
            "CHECK"
          )}
        </span>
      ) : null}
    </div>
  );
}

function AgreeRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 transition hover:border-blue-200 hover:bg-blue-50/40">
      <span className="text-xs font-semibold text-slate-700">{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
      />
    </label>
  );
}

function InfoRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl border border-blue-100 bg-white/70 px-4 py-3 shadow-[0_12px_30px_rgba(37,99,235,0.08)] backdrop-blur">
      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-700">{text}</p>
    </div>
  );
}