"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PostEditor from "@/components/community/PostEditor";
import { fetchPostDetail } from "@/lib/communityApi"; // 💡 백엔드 통신 API
import { Loader2 } from "lucide-react";

export default function CommunityEditPage() {
  // 💡 클라이언트 컴포넌트에서는 useParams 훅을 사용하여 URL의 파라미터(id)를 가져옵니다.
  const params = useParams();
  const id = params?.id as string;

  const [initialData, setInitialData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // 1️⃣ 백엔드에서 수정할 게시글의 기존 데이터 불러오기
  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    fetchPostDetail(Number(id))
      .then((data) => {
        setInitialData(data); // 기존 제목, 내용, 태그 등 세팅
      })
      .catch((err) => {
        console.error("게시글 정보를 불러오는 데 실패했습니다.", err);
        setError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  // ⏳ 데이터를 불러오는 동안 보여줄 로딩 화면
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </main>
    );
  }

  // ❌ 데이터를 찾을 수 없거나 에러가 났을 때 보여줄 화면
  if (error || !initialData) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-3xl border border-blue-100 bg-white p-10 text-center text-slate-500 shadow-sm">
          수정할 게시글을 찾을 수 없습니다. 삭제되었거나 잘못된 접근입니다.
        </div>
      </main>
    );
  }

  // ✨ 정상적으로 데이터를 불러왔을 때 렌더링
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            게시글 수정
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            작성하신 게시글의 내용을 수정할 수 있습니다.
          </p>
        </div>

        {/* 💡 핵심 연동 부분! 
          기존의 CommunityEditForm 대신 우리가 만든 PostEditor를 사용합니다.
          mode="edit"를 넘겨주어 수정 모드로 작동하게 만들고, 
          불러온 initialData와 수정할 글의 postId를 넘겨줍니다.
        */}
        <PostEditor 
          mode="edit" 
          initialData={initialData} 
          postId={Number(id)} 
        />
        
      </div>
    </main>
  );
}