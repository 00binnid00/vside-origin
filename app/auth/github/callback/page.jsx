// 경로: src/app/auth/github/callback/page.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VscGithubInverted, VscCheck, VscError } from "react-icons/vsc";
import { authFetch } from "@/lib/ide/api"; // authFetch 사용을 위해 import

export default function GithubCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [errorMessage, setErrorMessage] = useState("");
  const hasRequested = useRef(false);

  useEffect(() => {
    // 1. 코드가 없으면 에러 처리
    if (!code) {
      setStatus("error");
      setErrorMessage("깃허브 인증 코드가 없습니다.");
      return;
    }

    // 2. 두 번 요청되는 것(React Strict Mode) 방지
    if (hasRequested.current) return;
    hasRequested.current = true;

    // 3. 백엔드로 코드 전송 (어제 백엔드에 만든 그 API 찌르기!)
    const sendCodeToBackend = async () => {
      try {
        const response = await authFetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/api/github/link`,
          {
            method: "POST",
            body: JSON.stringify({ code }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || "백엔드 연동 처리 실패");
        }

        // 성공!
        setStatus("success");

        // 2초 뒤에 원래 작업하던 마이페이지나 IDE 화면으로 닫거나 돌려보내기
        setTimeout(() => {
          // 창이 팝업으로 열렸다면 창 닫기 시도
          if (window.opener) {
            window.close();
          } else {
            // 그냥 페이지 이동으로 왔다면 이전 페이지로 돌아가기
            router.back(); 
          }
        }, 2000);

      } catch (error) {
        setStatus("error");
        setErrorMessage(error.message);
      }
    };

    sendCodeToBackend();
  }, [code, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center w-[400px] text-center animate-fade-in-up">
        
        {/* 상태에 따른 아이콘 렌더링 */}
        {status === "loading" && (
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-gray-800 mb-6"></div>
        )}
        {status === "success" && (
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <VscCheck size={48} className="text-green-600" />
          </div>
        )}
        {status === "error" && (
          <div className="bg-red-100 p-4 rounded-full mb-4">
            <VscError size={48} className="text-red-600" />
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {status === "loading" && "GitHub 연동 중..."}
          {status === "success" && "연동 완료!"}
          {status === "error" && "연동 실패"}
        </h2>

        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          {status === "loading" && "안전하게 토큰을 받아오고 있습니다. 잠시만 기다려주세요."}
          {status === "success" && "성공적으로 GitHub 계정이 연동되었습니다. 곧 원래 화면으로 돌아갑니다."}
          {status === "error" && `문제가 발생했습니다: ${errorMessage}`}
        </p>

        {status === "error" && (
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-black font-bold transition-colors"
          >
            돌아가기
          </button>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-gray-400 font-bold">
          <VscGithubInverted size={20} /> WEVAIS IDE
        </div>
      </div>
    </div>
  );
}