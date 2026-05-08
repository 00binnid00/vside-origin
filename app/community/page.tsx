"use client";

import { Search, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import CommunityHeader from "@/components/community/CommunityHeader";
import PostCard from "@/components/community/PostCard";
import { fetchPosts } from "@/lib/communityApi"; // 💡 방금 만든 API 함수 임포트!

// 💡 백엔드로 보낼 때 영어 Enum 값으로 변환하기 위한 맵
const categoryMap: Record<string, string> = {
  "전체": "All",
  "질문": "Question",
  "자유": "Free",
  "정보": "Info",
  "AI 도움": "AIHelp",
};

const categories = Object.keys(categoryMap);

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState(""); // 서버 부하 방지용
  
  // 💡 페이징 관련 상태 관리
  const [posts, setPosts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0); // Spring Boot는 0페이지부터 시작!
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // 1️⃣ 검색어 디바운싱 (타이핑 끝난 후 500ms 뒤에만 검색 실행)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setCurrentPage(0); // 검색어가 바뀌면 무조건 1페이지로 리셋
    }, 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  // 카테고리가 바뀌어도 1페이지로 리셋
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(0);
  };

  // 2️⃣ 실제 백엔드 API 호출 함수
  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const categoryValue = categoryMap[selectedCategory];
      
      // API 통신 (카테고리, 검색어, 페이지 번호, 한 페이지당 10개씩)
      const data = await fetchPosts(
        categoryValue === "All" ? undefined : categoryValue,
        debouncedKeyword || undefined,
        currentPage,
        10
      );

      setPosts(data.content);          // 게시글 배열
      setTotalPages(data.totalPages);  // 전체 페이지 수
    } catch (error) {
      console.error("게시글을 불러오는데 실패했습니다.", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, debouncedKeyword, currentPage]);

  // 검색 조건이나 페이지가 바뀔 때마다 다시 로드
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50/70 via-white to-white px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <CommunityHeader />

        {/* 🎛️ 상단 필터 및 검색바 */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => {
              const isActive = selectedCategory === item;
              return (
                <button
                  key={item}
                  onClick={() => handleCategoryChange(item)}
                  className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-[360px]">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="제목, 내용 검색"
              className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* 📝 게시글 목록 영역 */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-blue-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-4 text-sm font-bold text-slate-500">게시글을 불러오는 중입니다...</p>
            </div>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm">
              검색 조건에 맞는 게시글이 없습니다. 텅~ 💨
            </div>
          )}
        </div>

        {/* 🔢 하단 페이지네이션 UI */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-10 flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              이전
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`min-w-[32px] rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
                  currentPage === i
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}

      </div>
    </main>
  );
}