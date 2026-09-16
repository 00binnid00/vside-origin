"use client";

import Link from "next/link";
import {
  Search,
  Loader2,
  Flame,
  Eye,
  Heart,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Megaphone,
  ArrowUpDown,
} from "lucide-react";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

import CommunityHeader from "@/components/community/CommunityHeader";
import PostCard from "@/components/community/PostCard";

import { fetchPosts } from "@/lib/communityApi";
import { apiJson } from "@/lib/api/apiClient";


/* ==========================================
   카테고리
========================================== */

const categoryMap: Record<string, string> = {
  전체: "All",
  질문: "Question",
  자유: "Free",
  정보: "Info",
  "AI 도움": "AIHelp",
  "팀원 모집": "TeamRecruit",
};

const categories =
  Object.keys(categoryMap);


const categoryLabel: Record<string, string> = {
  Question: "질문",
  Free: "자유",
  Info: "정보",
  AIHelp: "AI 도움",
  TeamRecruit: "팀원 모집",
  Showcase: "쇼케이스",
  NOTICE: "공지",
};


const categoryStyle: Record<string, string> = {
  Question:
    "bg-blue-50 text-blue-600",

  Free:
    "bg-violet-50 text-violet-600",

  Info:
    "bg-emerald-50 text-emerald-600",

  AIHelp:
    "bg-amber-50 text-amber-600",

  TeamRecruit:
    "bg-cyan-50 text-cyan-600",

  Showcase:
    "bg-pink-50 text-pink-600",

  NOTICE:
    "bg-red-50 text-red-600",
};


/* ==========================================
   타입
========================================== */

type SortOption =
  | "latest"
  | "oldest"
  | "recommended";


interface NoticeItem {
  id: number;

  title: string;

  contentSnippet?: string;

  category?: string;

  postType?: string;

  authorId?: number;

  authorName?: string;

  views?: number;

  likeCount?: number;

  scrapCount?: number;

  createdAt?: string;
}


interface PageResponse<T> {
  content: T[];

  totalElements: number;

  totalPages: number;

  number: number;

  size: number;
}


/* ==========================================
   공지 여부 확인
========================================== */

function isNotice(post: any) {
  return (
    post?.postType === "NOTICE" ||
    post?.category === "NOTICE"
  );
}


/* ==========================================
   날짜
========================================== */

function formatNoticeDate(
  value?: string | null,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}


/* ==========================================
   페이지
========================================== */

export default function CommunityPage() {

  /* ========================================
     카테고리 / 검색
  ======================================== */

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState("전체");


  const [
    keyword,
    setKeyword,
  ] =
    useState("");


  const [
    debouncedKeyword,
    setDebouncedKeyword,
  ] =
    useState("");


  /* ========================================
     정렬
  ======================================== */

  const [
    sortOption,
    setSortOption,
  ] =
    useState<SortOption>(
      "latest",
    );


  /* ========================================
     일반 게시글
  ======================================== */

  const [
    posts,
    setPosts,
  ] =
    useState<any[]>([]);


  /* ========================================
     공지사항
  ======================================== */

  const [
    notices,
    setNotices,
  ] =
    useState<NoticeItem[]>(
      [],
    );


  const [
    isNoticeLoading,
    setIsNoticeLoading,
  ] =
    useState(false);


  /* ========================================
     페이지네이션
  ======================================== */

  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(0);


  const [
    totalPages,
    setTotalPages,
  ] =
    useState(0);


  const [
    totalElements,
    setTotalElements,
  ] =
    useState(0);


  /* ========================================
     로딩
  ======================================== */

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);


  /* ========================================
     검색 debounce
  ======================================== */

  useEffect(() => {

    const timer =
      setTimeout(
        () => {

          setDebouncedKeyword(
            keyword,
          );

          setCurrentPage(
            0,
          );

        },
        500,
      );


    return () => {

      clearTimeout(
        timer,
      );

    };

  }, [
    keyword,
  ]);


  /* ========================================
     카테고리 변경
  ======================================== */

  const handleCategoryChange = (
    category: string,
  ) => {

    setSelectedCategory(
      category,
    );

    setCurrentPage(
      0,
    );

  };


  /* ========================================
     정렬 변경
  ======================================== */

  const handleSortChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {

    setSortOption(
      e.target
        .value as SortOption,
    );

    setCurrentPage(
      0,
    );

  };


  /* ========================================
     관리자 공지 조회

     GET /api/posts?category=NOTICE

     관리자 전용 API를 호출하는 게 아니라
     일반 사용자 게시판 API에서 NOTICE만 가져온다.
  ======================================== */

  const loadNotices =
    useCallback(
      async () => {

        setIsNoticeLoading(
          true,
        );

        try {

          const data =
            (await apiJson(
              "/api/posts?category=NOTICE&page=0&size=10",
            )) as PageResponse<NoticeItem>;


          const loaded =
            Array.isArray(
              data?.content,
            )
              ? data.content
              : [];


          /*
           * 백엔드에서 NOTICE만 다시 걸러준다.
           *
           * searchBoard 쿼리 구조상
           * 안전하게 한 번 더 확인.
           */
          const noticePosts =
            loaded
              .filter(
                (
                  post,
                ) =>
                  isNotice(
                    post,
                  ),
              )
              .sort(
                (
                  a,
                  b,
                ) => {

                  const aTime =
                    a.createdAt
                      ? new Date(
                          a.createdAt,
                        ).getTime()
                      : 0;


                  const bTime =
                    b.createdAt
                      ? new Date(
                          b.createdAt,
                        ).getTime()
                      : 0;


                  return (
                    bTime -
                    aTime
                  );

                },
              );


          console.log(
            "[공지 API 응답]",
            data,
          );


          console.log(
            "[분리된 공지]",
            noticePosts,
          );


          setNotices(
            noticePosts,
          );

        } catch (
          error
        ) {

          console.error(
            "공지사항을 불러오는데 실패했습니다.",
            error,
          );

          setNotices(
            [],
          );

        } finally {

          setIsNoticeLoading(
            false,
          );

        }

      },
      [],
    );


  /* ========================================
     일반 게시글 조회
  ======================================== */

  const loadPosts =
    useCallback(
      async () => {

        setIsLoading(
          true,
        );

        try {

          const categoryValue =
            categoryMap[
              selectedCategory
            ];


          const data =
            await fetchPosts(

              categoryValue ===
                "All"
                ? undefined
                : categoryValue,

              debouncedKeyword ||
                undefined,

              currentPage,

              10,

            );


          const loadedPosts =
            Array.isArray(
              data?.content,
            )
              ? data.content
              : [];


          /*
           * 백엔드 /api/posts는
           * NOTICE를 함께 반환할 수 있음.
           *
           * 일반 게시글 영역에서는 공지를 제거한다.
           */
          const normalPosts =
            loadedPosts.filter(
              (
                post: any,
              ) =>
                !isNotice(
                  post,
                ),
            );


          console.log(
            "[전체 게시글 API 응답]",
            data,
          );


          console.log(
            "[일반 게시글]",
            normalPosts,
          );


          setPosts(
            normalPosts,
          );


          setTotalPages(
            data?.totalPages ??
              0,
          );


          /*
           * 현재 백엔드 전체 개수에는
           * NOTICE가 포함될 수 있음.
           *
           * 첫 페이지에 포함된 공지만큼은
           * 화면 숫자에서 제외한다.
           */
          const noticeCountInPage =
            loadedPosts.filter(
              (
                post: any,
              ) =>
                isNotice(
                  post,
                ),
            ).length;


          const backendTotal =
            Number(
              data?.totalElements ??
                loadedPosts.length,
            ) || 0;


          setTotalElements(
            Math.max(
              0,
              backendTotal -
                noticeCountInPage,
            ),
          );

        } catch (
          error
        ) {

          console.error(
            "게시글을 불러오는데 실패했습니다.",
            error,
          );

          setPosts(
            [],
          );

          setTotalPages(
            0,
          );

          setTotalElements(
            0,
          );

        } finally {

          setIsLoading(
            false,
          );

        }

      },
      [
        selectedCategory,
        debouncedKeyword,
        currentPage,
      ],
    );


  /* ========================================
     최초 조회
  ======================================== */

  useEffect(
    () => {

      loadPosts();

    },
    [
      loadPosts,
    ],
  );


  useEffect(
    () => {

      loadNotices();

    },
    [
      loadNotices,
    ],
  );


  /* ========================================
     화면 다시 돌아왔을 때 새로고침

     관리자가 다른 탭에서 공지를 만들거나
     게시글 작성 후 돌아오는 경우 반영
  ======================================== */

  useEffect(
    () => {

      const refreshPosts =
        () => {

          loadPosts();

          loadNotices();

        };


      window.addEventListener(
        "pageshow",
        refreshPosts,
      );


      window.addEventListener(
        "focus",
        refreshPosts,
      );


      return () => {

        window.removeEventListener(
          "pageshow",
          refreshPosts,
        );


        window.removeEventListener(
          "focus",
          refreshPosts,
        );

      };

    },
    [
      loadPosts,
      loadNotices,
    ],
  );


  /* ========================================
     게시글 날짜값
  ======================================== */

  const getPostTime = (
    post: any,
  ) => {

    const dateValue =
      post.createdAt ??
      post.createdDate ??
      post.date ??
      post.updatedAt;


    if (
      !dateValue
    ) {
      return 0;
    }


    const time =
      new Date(
        dateValue,
      ).getTime();


    return Number.isNaN(
      time,
    )
      ? 0
      : time;

  };


  /* ========================================
     게시글 정렬
  ======================================== */

  const sortedPosts =
    useMemo(
      () => {

        const copiedPosts = [
          ...posts,
        ];


        return copiedPosts.sort(
          (
            a,
            b,
          ) => {

            /* 최신순 */
            if (
              sortOption ===
              "latest"
            ) {

              return (
                getPostTime(
                  b,
                ) -
                getPostTime(
                  a,
                )
              );

            }


            /* 오래된순 */
            if (
              sortOption ===
              "oldest"
            ) {

              return (
                getPostTime(
                  a,
                ) -
                getPostTime(
                  b,
                )
              );

            }


            /* 추천순 */
            if (
              sortOption ===
              "recommended"
            ) {

              const aLikes =
                Number(
                  a.likeCount ??
                    a.likes ??
                    a.recommendCount ??
                    0,
                ) || 0;


              const bLikes =
                Number(
                  b.likeCount ??
                    b.likes ??
                    b.recommendCount ??
                    0,
                ) || 0;


              /*
               * 좋아요 같으면
               * 조회수 높은 글 우선
               */
              if (
                bLikes ===
                aLikes
              ) {

                const aViews =
                  Number(
                    a.viewCount ??
                      a.views ??
                      0,
                  ) || 0;


                const bViews =
                  Number(
                    b.viewCount ??
                      b.views ??
                      0,
                  ) || 0;


                /*
                 * 조회수까지 같으면 최신순
                 */
                if (
                  bViews ===
                  aViews
                ) {

                  return (
                    getPostTime(
                      b,
                    ) -
                    getPostTime(
                      a,
                    )
                  );

                }


                return (
                  bViews -
                  aViews
                );

              }


              return (
                bLikes -
                aLikes
              );

            }


            return 0;

          },
        );

      },
      [
        posts,
        sortOption,
      ],
    );


  /* ========================================
     HOT 게시글

     posts에는 NOTICE가 제거되어 있기 때문에
     공지는 HOT에 포함되지 않는다.
  ======================================== */

  const hotPosts =
    useMemo(
      () => {

        return [
          ...posts,
        ]
          .sort(
            (
              a,
              b,
            ) => {

              const aViews =
                a.viewCount ??
                a.views ??
                0;


              const bViews =
                b.viewCount ??
                b.views ??
                0;


              const aLikes =
                a.likeCount ??
                a.likes ??
                0;


              const bLikes =
                b.likeCount ??
                b.likes ??
                0;


              const aScraps =
                a.scrapCount ??
                a.scraps ??
                0;


              const bScraps =
                b.scrapCount ??
                b.scraps ??
                0;


              const aScore =
                Number(
                  aViews,
                ) +
                Number(
                  aLikes,
                ) *
                  4 +
                Number(
                  aScraps,
                ) *
                  5;


              const bScore =
                Number(
                  bViews,
                ) +
                Number(
                  bLikes,
                ) *
                  4 +
                Number(
                  bScraps,
                ) *
                  5;


              return (
                bScore -
                aScore
              );

            },
          )
          .slice(
            0,
            5,
          );

      },
      [
        posts,
      ],
    );


  /* ========================================
     상세 페이지 이동 전 조회수 저장
  ======================================== */

  const savePostInfo = (
    post: any,
  ) => {

    const views =
      post.viewCount ??
      post.views ??
      0;


    sessionStorage.setItem(
      `community-view-${post.id}`,
      String(
        views,
      ),
    );

  };


  /* ========================================
     화면
  ======================================== */

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-5 pb-10 pt-6 text-slate-900 md:px-8">

      <div className="mx-auto max-w-[1240px]">

        <CommunityHeader />


        {/* ====================================
            카테고리 + 정렬 + 검색
        ==================================== */}

        <div className="mb-4 mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          {/* 카테고리 */}

          <div className="flex flex-wrap gap-2">

            {categories.map(
              (
                item,
              ) => {

                const active =
                  selectedCategory ===
                  item;


                return (
                  <button
                    key={
                      item
                    }
                    type="button"
                    onClick={() =>
                      handleCategoryChange(
                        item,
                      )
                    }
                    className={`min-w-[68px] rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200/60"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
                    }`}
                  >
                    {
                      item
                    }
                  </button>
                );

              },
            )}

          </div>


          {/* 정렬 + 검색 */}

          <div className="flex w-full items-center gap-2 lg:w-auto">

            {/* 정렬 */}

            <div className="relative shrink-0">

              <ArrowUpDown
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />


              <select
                value={
                  sortOption
                }
                onChange={
                  handleSortChange
                }
                className="h-[42px] appearance-none rounded-full border border-slate-200 bg-white py-0 pl-9 pr-9 text-sm font-medium text-slate-600 outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100/60"
              >

                <option value="latest">
                  최신순
                </option>

                <option value="oldest">
                  오래된순
                </option>

                <option value="recommended">
                  추천순
                </option>

              </select>


              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

            </div>


            {/* 검색 */}

            <div className="relative min-w-0 flex-1 lg:w-[330px] lg:flex-none">

              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />


              <input
                value={
                  keyword
                }
                onChange={(
                  e,
                ) =>
                  setKeyword(
                    e.target
                      .value,
                  )
                }
                placeholder="제목, 내용 검색"
                className="h-[42px] w-full rounded-full border border-slate-200 bg-white pl-10 pr-5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100/60"
              />

            </div>

          </div>

        </div>


        {/* ====================================
            공지사항
        ==================================== */}

        <section className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

          {/* 공지 헤더 */}

          <div className="flex items-center justify-between px-6 pb-3 pt-4">

            <div className="flex items-center gap-2">

              <Megaphone
                size={19}
                className="text-blue-600"
              />


              <span className="text-[17px] font-bold text-gray-900">
                공지사항
              </span>

            </div>


            {!isNoticeLoading &&
              notices.length >
                0 && (

                <span className="text-xs font-medium text-gray-400">
                  {
                    notices.length
                  }
                  개
                </span>

              )}

          </div>


          {/* 공지 로딩 */}

          {isNoticeLoading ? (

            <div className="mx-5 mb-4 flex min-h-[54px] items-center justify-center rounded-xl border border-blue-100 bg-blue-50/40">

              <Loader2
                size={18}
                className="animate-spin text-blue-500"
              />

              <span className="ml-2 text-sm text-gray-400">
                공지사항을 불러오는 중입니다...
              </span>

            </div>

          ) : notices.length >
            0 ? (

            /* 실제 공지 목록 */

            <div className="mx-5 mb-4 overflow-hidden rounded-xl border border-blue-100 bg-blue-50/40">

              {notices.map(
                (
                  notice,
                  index,
                ) => (

                  <Link
                    key={
                      notice.id
                    }
                    href={`/community/${notice.id}`}
                    onClick={() =>
                      savePostInfo(
                        notice,
                      )
                    }
                    className={`flex items-center justify-between gap-5 px-5 py-3 transition hover:bg-blue-50 ${
                      index !==
                      notices.length -
                        1
                        ? "border-b border-blue-100"
                        : ""
                    }`}
                  >

                    {/* 왼쪽 */}

                    <div className="flex min-w-0 items-center gap-3">

                      <span className="shrink-0 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                        공지
                      </span>


                      <div className="min-w-0">

                        <p className="truncate font-semibold text-gray-900">
                          {
                            notice.title
                          }
                        </p>

                      </div>

                    </div>


                    {/* 오른쪽 */}

                    <div className="flex shrink-0 items-center gap-4">

                      <span className="text-sm font-medium text-gray-700">
                        {notice.authorName ||
                          "관리자"}
                      </span>


                      <span className="text-sm text-gray-400">
                        {formatNoticeDate(
                          notice.createdAt,
                        )}
                      </span>

                    </div>

                  </Link>

                ),
              )}

            </div>

          ) : (

            /* 공지 없음 */

            <div className="mx-5 mb-4 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 text-center text-sm text-gray-400">
              등록된 공지사항이 없습니다.
            </div>

          )}

        </section>


        {/* ====================================
            게시글 + HOT
        ==================================== */}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">

          {/* ==================================
              게시글 목록
          ================================== */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* 목록 헤더 */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

              <div className="flex items-center gap-2">

                <h2 className="text-[17px] font-bold">

                  {selectedCategory ===
                  "전체"
                    ? "전체 게시글"
                    : `${selectedCategory} 게시글`}

                </h2>


                {!isLoading && (

                  <span className="text-sm font-bold text-blue-600">
                    {
                      totalElements
                    }
                    개
                  </span>

                )}

              </div>

            </div>


            {/* 로딩 */}

            {isLoading ? (

              <div className="flex min-h-[220px] flex-col items-center justify-center">

                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />


                <p className="mt-3 text-sm text-slate-400">
                  게시글을 불러오는 중입니다...
                </p>

              </div>

            ) : sortedPosts.length >
              0 ? (

              /* 게시글 */

              <div>

                {sortedPosts.map(
                  (
                    post,
                    index,
                  ) => (

                    <PostCard
                      key={
                        post.id
                      }
                      post={
                        post
                      }
                      isLast={
                        index ===
                        sortedPosts.length -
                          1
                      }
                    />

                  ),
                )}

              </div>

            ) : (

              /* 게시글 없음 */

              <div className="flex min-h-[220px] flex-col items-center justify-center text-center">

                <p className="font-semibold text-slate-600">
                  게시글을 찾을 수 없습니다.
                </p>


                <p className="mt-1 text-sm text-slate-400">
                  다른 검색어나 카테고리를 선택해보세요.
                </p>

              </div>

            )}

          </section>


          {/* ==================================
              HOT 게시글
          ================================== */}

          <aside className="hidden lg:block">

            <div className="sticky top-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">

                <Flame
                  size={19}
                  className="text-orange-500"
                />


                <h2 className="text-[17px] font-bold">
                  HOT 게시글
                </h2>

              </div>


              <div className="px-3 py-1">

                {hotPosts.length >
                0 ? (

                  hotPosts.map(
                    (
                      post,
                      index,
                    ) => {

                      const views =
                        post.viewCount ??
                        post.views ??
                        0;


                      const likes =
                        post.likeCount ??
                        post.likes ??
                        0;


                      const scraps =
                        post.scrapCount ??
                        post.scraps ??
                        0;


                      const rankStyle =
                        index ===
                        0
                          ? "bg-orange-500 text-white"

                          : index ===
                              1
                            ? "bg-blue-400 text-white"

                            : index ===
                                2
                              ? "bg-violet-400 text-white"

                              : "bg-slate-100 text-slate-500";


                      return (

                        <Link
                          key={
                            post.id
                          }
                          href={`/community/${post.id}`}
                          onClick={() =>
                            savePostInfo(
                              post,
                            )
                          }
                          className="group flex gap-3 rounded-xl px-2 py-3.5 transition hover:bg-slate-50"
                        >

                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${rankStyle}`}
                          >
                            {
                              index +
                              1
                            }
                          </span>


                          <div className="min-w-0 flex-1">

                            <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-800 group-hover:text-blue-600">
                              {
                                post.title
                              }
                            </p>


                            <span
                              className={`mt-1.5 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                categoryStyle[
                                  post
                                    .category
                                ] ??
                                "bg-slate-100 text-slate-500"
                              }`}
                            >

                              {categoryLabel[
                                post
                                  .category
                              ] ??
                                post.category}

                            </span>


                            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">

                              <span className="flex items-center gap-1">

                                <Eye
                                  size={
                                    12
                                  }
                                />

                                {
                                  views
                                }

                              </span>


                              <span className="flex items-center gap-1">

                                <Heart
                                  size={
                                    12
                                  }
                                />

                                {
                                  likes
                                }

                              </span>


                              <span className="flex items-center gap-1">

                                <Bookmark
                                  size={
                                    12
                                  }
                                />

                                {
                                  scraps
                                }

                              </span>

                            </div>

                          </div>

                        </Link>

                      );

                    },
                  )

                ) : (

                  <div className="flex min-h-[200px] items-center justify-center px-4 text-center text-xs text-slate-400">
                    아직 인기 게시글이 없습니다.
                  </div>

                )}

              </div>

            </div>

          </aside>

        </div>


        {/* ====================================
            페이지네이션
        ==================================== */}

        {!isLoading &&
          totalPages >
            1 && (

            <div className="mt-7 flex items-center justify-center gap-1.5 lg:pr-[300px]">

              {/* 이전 */}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    (
                      page,
                    ) =>
                      Math.max(
                        0,
                        page -
                          1,
                      ),
                  )
                }
                disabled={
                  currentPage ===
                  0
                }
                className="mr-2 flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
              >

                <ChevronLeft
                  size={16}
                />

                이전

              </button>


              {/* 페이지 번호 */}

              {Array.from(
                {
                  length:
                    totalPages,
                },
                (
                  _,
                  index,
                ) => (

                  <button
                    key={
                      index
                    }
                    type="button"
                    onClick={() =>
                      setCurrentPage(
                        index,
                      )
                    }
                    className={`flex h-9 min-w-9 items-center justify-center rounded-lg text-sm font-semibold ${
                      currentPage ===
                      index
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-500 hover:bg-blue-50"
                    }`}
                  >
                    {
                      index +
                      1
                    }
                  </button>

                ),
              )}


              {/* 다음 */}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    (
                      page,
                    ) =>
                      Math.min(
                        totalPages -
                          1,
                        page +
                          1,
                      ),
                  )
                }
                disabled={
                  currentPage ===
                  totalPages -
                    1
                }
                className="ml-2 flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
              >

                다음

                <ChevronRight
                  size={16}
                />

              </button>

            </div>

          )}

      </div>

    </main>
  );
}