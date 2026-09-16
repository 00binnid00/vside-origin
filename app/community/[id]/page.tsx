"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import Link from "next/link";

import {
  Bookmark,
  Heart,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
  Flag,
  ChevronUp,
  ChevronDown,
  Megaphone,
} from "lucide-react";

import {
  fetchPostDetail,
  fetchPosts,
  deletePost,
  toggleLike,
  toggleScrap,
} from "@/lib/communityApi";

import CommentSection from "@/components/community/CommentSection";

import {
  getCurrentUser,
} from "@/components/community/CommunityUtil";

import ReportModal from "@/components/community/ReportModal";


/* ==========================================
   카테고리
========================================== */

const categoryLabel: Record<string, string> = {
  Question: "질문",
  Free: "자유",
  Info: "정보",
  AIHelp: "AI 도움",
  TeamRecruit: "팀원 모집",
  NOTICE: "공지",
};


/* ==========================================
   페이지
========================================== */

export default function CommunityDetailPage() {

  const params =
    useParams();

  const router =
    useRouter();


  const id =
    params?.id as string;


  const [
    post,
    setPost,
  ] =
    useState<any>(null);


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);


  const [
    reportOpen,
    setReportOpen,
  ] =
    useState(false);


  const [
    displayViews,
    setDisplayViews,
  ] =
    useState<number | null>(
      null,
    );


  const [
    prevPost,
    setPrevPost,
  ] =
    useState<any>(
      null,
    );


  const [
    nextPost,
    setNextPost,
  ] =
    useState<any>(
      null,
    );


  const fetchedPostId =
    useRef<string | null>(
      null,
    );


  const currentUser =
    getCurrentUser();


  /* ==========================================
     상세 진입 시 맨 위
  ========================================== */

  useEffect(
    () => {

      window.scrollTo(
        0,
        0,
      );

    },
    [
      id,
    ],
  );


  /* ==========================================
     목록에서 저장한 조회수
  ========================================== */

  useEffect(
    () => {

      if (!id) {
        return;
      }


      const savedViews =
        sessionStorage.getItem(
          `community-view-${id}`,
        );


      if (
        savedViews !== null
      ) {

        setDisplayViews(
          Number(
            savedViews,
          ),
        );

      } else {

        setDisplayViews(
          null,
        );

      }

    },
    [
      id,
    ],
  );


  /* ==========================================
     상세 조회
  ========================================== */

  useEffect(
    () => {

      if (!id) {
        return;
      }


      if (
        fetchedPostId.current ===
        id
      ) {
        return;
      }


      fetchedPostId.current =
        id;


      setIsLoading(
        true,
      );


      fetchPostDetail(
        Number(
          id,
        ),
      )
        .then(
          (
            data,
          ) => {

            setPost(
              data,
            );

          },
        )

        .catch(
          (
            error,
          ) => {

            console.error(
              "게시글 상세 조회 실패:",
              error,
            );


            fetchedPostId.current =
              null;

          },
        )

        .finally(
          () => {

            setIsLoading(
              false,
            );

          },
        );

    },
    [
      id,
    ],
  );


  /* ==========================================
     이전 글 / 다음 글 조회
  ========================================== */

  useEffect(
    () => {

      if (!id) {
        return;
      }


      const loadAdjacentPosts =
        async () => {

          try {

            const data =
              await fetchPosts(
                undefined,
                undefined,
                0,
                1000,
              );


            const posts =
              data.content ??
              [];


            const currentIndex =
              posts.findIndex(
                (
                  item: any,
                ) =>
                  Number(
                    item.id,
                  ) ===
                  Number(
                    id,
                  ),
              );


            if (
              currentIndex ===
              -1
            ) {

              setPrevPost(
                null,
              );

              setNextPost(
                null,
              );

              return;
            }


            /*
             * 목록이 최신순
             */

            setPrevPost(
              currentIndex <
                posts.length -
                  1
                ? posts[
                    currentIndex +
                      1
                  ]
                : null,
            );


            setNextPost(
              currentIndex >
                0
                ? posts[
                    currentIndex -
                      1
                  ]
                : null,
            );

          } catch (
            error
          ) {

            console.error(
              "이전/다음 게시글 조회 실패:",
              error,
            );


            setPrevPost(
              null,
            );

            setNextPost(
              null,
            );

          }

        };


      loadAdjacentPosts();

    },
    [
      id,
    ],
  );


  /* ==========================================
     이전 / 다음 글 클릭
  ========================================== */

  const handleAdjacentClick =
    (
      targetPost: any,
    ) => {

      if (!targetPost) {
        return;
      }


      const targetViews =
        targetPost.viewCount ??
        targetPost.views ??
        0;


      sessionStorage.setItem(
        `community-view-${targetPost.id}`,
        String(
          targetViews,
        ),
      );

    };


  /* ==========================================
     삭제
  ========================================== */

  const handleDelete =
    async () => {

      /*
       * 공지는 일반 사용자 API에서 삭제하지 않음
       */
      if (
        post?.postType ===
          "NOTICE" ||
        post?.category ===
          "NOTICE"
      ) {

        alert(
          "공지사항은 관리자 페이지에서 관리할 수 있습니다.",
        );

        return;
      }


      if (
        !window.confirm(
          "정말 이 게시글을 삭제하시겠습니까?",
        )
      ) {
        return;
      }


      try {

        await deletePost(
          Number(
            id,
          ),
        );


        sessionStorage.removeItem(
          `community-view-${id}`,
        );


        alert(
          "게시글이 삭제되었습니다.",
        );


        router.push(
          "/community",
          {
            scroll: true,
          },
        );

      } catch (
        error
      ) {

        console.error(
          error,
        );


        alert(
          "삭제 권한이 없거나 오류가 발생했습니다.",
        );

      }

    };


  /* ==========================================
     좋아요
  ========================================== */

  const handleLike =
    async () => {

      /*
       * 공지는 좋아요 사용 안 함
       */
      if (
        post?.postType ===
          "NOTICE" ||
        post?.category ===
          "NOTICE"
      ) {
        return;
      }


      if (!currentUser) {

        alert(
          "로그인이 필요합니다.",
        );

        return;
      }


      const beforeLiked =
        Boolean(
          post?.liked,
        );


      const beforeCount =
        Number(
          post?.likeCount ??
            0,
        );


      setPost(
        (
          prev: any,
        ) => ({
          ...prev,

          liked:
            !beforeLiked,

          likeCount:
            Math.max(
              0,

              beforeCount +
                (
                  beforeLiked
                    ? -1
                    : 1
                ),
            ),
        }),
      );


      try {

        const result: any =
          await toggleLike(
            Number(
              id,
            ),
          );


        setPost(
          (
            prev: any,
          ) => ({
            ...prev,

            liked:
              typeof result?.active ===
              "boolean"
                ? result.active
                : prev.liked,

            likeCount:
              result?.count ??
              result?.likeCount ??
              prev.likeCount,
          }),
        );

      } catch (
        error
      ) {

        console.error(
          "좋아요 처리 실패:",
          error,
        );


        setPost(
          (
            prev: any,
          ) => ({
            ...prev,

            liked:
              beforeLiked,

            likeCount:
              beforeCount,
          }),
        );


        alert(
          "좋아요 처리에 실패했습니다.",
        );

      }

    };


  /* ==========================================
     스크랩
  ========================================== */

  const handleScrap =
    async () => {

      /*
       * 공지는 스크랩 사용 안 함
       */
      if (
        post?.postType ===
          "NOTICE" ||
        post?.category ===
          "NOTICE"
      ) {
        return;
      }


      if (!currentUser) {

        alert(
          "로그인이 필요합니다.",
        );

        return;
      }


      const beforeScrapped =
        Boolean(
          post?.scrapped,
        );


      const beforeCount =
        Number(
          post?.scrapCount ??
            0,
        );


      setPost(
        (
          prev: any,
        ) => ({
          ...prev,

          scrapped:
            !beforeScrapped,

          scrapCount:
            Math.max(
              0,

              beforeCount +
                (
                  beforeScrapped
                    ? -1
                    : 1
                ),
            ),
        }),
      );


      try {

        const result: any =
          await toggleScrap(
            Number(
              id,
            ),
          );


        setPost(
          (
            prev: any,
          ) => ({
            ...prev,

            scrapped:
              typeof result?.active ===
              "boolean"
                ? result.active
                : prev.scrapped,

            scrapCount:
              result?.count ??
              result?.scrapCount ??
              prev.scrapCount,
          }),
        );

      } catch (
        error
      ) {

        console.error(
          "스크랩 처리 실패:",
          error,
        );


        setPost(
          (
            prev: any,
          ) => ({
            ...prev,

            scrapped:
              beforeScrapped,

            scrapCount:
              beforeCount,
          }),
        );


        alert(
          "스크랩 처리에 실패했습니다.",
        );

      }

    };


  /* ==========================================
     로딩
  ========================================== */

  if (
    isLoading
  ) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f6fa]">

        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />

      </main>
    );

  }


  /* ==========================================
     게시글 없음
  ========================================== */

  if (!post) {

    return (
      <main className="min-h-screen bg-[#f5f6fa] px-6 py-10">

        <div className="mx-auto max-w-4xl rounded-3xl border border-blue-100 bg-white p-10 text-center text-slate-500">

          게시글을 찾을 수 없습니다.

        </div>

      </main>
    );

  }


  /* ==========================================
     공지 여부
  ========================================== */

  const isNotice =
    post.postType ===
      "NOTICE" ||
    post.category ===
      "NOTICE";


  /* ==========================================
     현재 사용자
  ========================================== */

  const currentUserName =
    currentUser?.nickname ||
    currentUser?.name ||
    currentUser?.email ||
    "";


  const isMyPost =
    !isNotice &&
    post.authorName ===
      currentUserName;


  /* ==========================================
     통계
  ========================================== */

  const views =
    displayViews ??
    post.viewCount ??
    post.views ??
    0;


  const likeCount =
    post.likeCount ??
    post.likes ??
    0;


  const scrapCount =
    post.scrapCount ??
    post.scraps ??
    0;


  /* ==========================================
     화면
  ========================================== */

  return (
    <main className="min-h-screen bg-[#f5f6fa] px-6 py-10 text-slate-900">

      <div className="mx-auto max-w-4xl">

        {/* 목록 */}

        <Link
          href="/community"
          className="mb-8 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-blue-600"
        >

          <ArrowLeft
            size={14}
          />

          목록으로

        </Link>


        {/* ====================================
            게시글
        ==================================== */}

        <div
          className={`rounded-3xl bg-white p-7 shadow-sm ${
            isNotice
              ? "border border-blue-200"
              : "border border-blue-100"
          }`}
        >

          <div className="mb-5 flex items-start justify-between gap-4">

            <div className="min-w-0">

              {/* 상단 정보 */}

              <div className="mb-3 flex flex-wrap items-center gap-2">

                {isNotice ? (

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">

                    <Megaphone
                      size={13}
                    />

                    공지

                  </span>

                ) : (

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">

                    {categoryLabel[
                      post.category
                    ] ??
                      post.category}

                  </span>

                )}


                <span className="text-sm text-slate-500">

                  {isNotice
                    ? "관리자"
                    : post.authorName}

                  {" · "}

                  {typeof post.createdAt ===
                  "string"
                    ? post.createdAt
                        .split(
                          "T",
                        )
                        .join(
                          " ",
                        )
                        .substring(
                          0,
                          16,
                        )
                    : ""}

                </span>

              </div>


              {/* 제목 */}

              <h1 className="text-3xl font-bold text-slate-950">
                {
                  post.title
                }
              </h1>

            </div>


            {/* ==================================
                일반 게시글 본인일 때만 수정/삭제
            ================================== */}

            {isMyPost && (

              <div className="flex shrink-0 gap-2">

                <Link
                  href={`/community/${post.id}/edit`}
                  className="inline-flex items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                >

                  <Pencil
                    size={15}
                  />

                  수정

                </Link>


                <button
                  type="button"
                  onClick={
                    handleDelete
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-100"
                >

                  <Trash2
                    size={15}
                  />

                  삭제

                </button>

              </div>

            )}

          </div>


          {/* ====================================
              내용
          ==================================== */}

          <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {
              post.content
            }
          </p>


          {/* ====================================
              첨부
          ==================================== */}

          {post.attachments
            ?.length >
            0 && (

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">

              <p className="mb-3 text-sm font-semibold text-slate-700">
                첨부 자료
              </p>


              <div className="grid gap-3 sm:grid-cols-2">

                {post.attachments.map(
                  (
                    file: any,
                  ) => (

                    <div
                      key={
                        file.id ??
                        file.url
                      }
                      className="flex items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-white"
                    >

                      {file.type ===
                      "image" ? (

                        <img
                          src={
                            file.url
                          }
                          alt={
                            file.name
                          }
                          className="max-h-[500px] w-full object-contain"
                        />

                      ) : (

                        <div className="p-4 text-sm text-slate-600">

                          📁{" "}
                          {
                            file.name
                          }

                        </div>

                      )}

                    </div>

                  ),
                )}

              </div>

            </div>

          )}


          {/* ====================================
              태그
          ==================================== */}

          {!isNotice &&
            post.tags?.length >
              0 && (

              <div className="mt-6 flex flex-wrap gap-2">

                {post.tags.map(
                  (
                    tag: string,
                  ) => (

                    <span
                      key={
                        tag
                      }
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600"
                    >

                      #
                      {
                        tag
                      }

                    </span>

                  ),
                )}

              </div>

            )}


          {/* ====================================
              하단
          ==================================== */}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">

            {/* 통계 */}

            {isNotice ? (

              <div className="text-sm text-slate-500">

                조회{" "}
                {
                  views
                }

              </div>

            ) : (

              <div className="text-sm text-slate-500">

                조회{" "}
                {
                  views
                }

                {" · "}

                좋아요{" "}
                {
                  likeCount
                }

                {" · "}

                스크랩{" "}
                {
                  scrapCount
                }

              </div>

            )}


            {/* ==================================
                일반 게시글에서만 상호작용
            ================================== */}

            {!isNotice && (

              <div className="flex flex-wrap gap-2">

                {/* 좋아요 */}

                <button
                  type="button"
                  onClick={
                    handleLike
                  }
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                    post.liked
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >

                  <Heart
                    size={17}
                    className={
                      post.liked
                        ? "fill-current"
                        : ""
                    }
                  />

                  좋아요

                </button>


                {/* 스크랩 */}

                <button
                  type="button"
                  onClick={
                    handleScrap
                  }
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                    post.scrapped
                      ? "border-amber-200 bg-amber-50 text-amber-600"
                      : "border-blue-100 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >

                  <Bookmark
                    size={17}
                    className={
                      post.scrapped
                        ? "fill-current"
                        : ""
                    }
                  />

                  스크랩

                </button>


                {/* 신고 */}

                {!isMyPost && (

                  <button
                    type="button"
                    onClick={() =>
                      setReportOpen(
                        true,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  >

                    <Flag
                      size={17}
                    />

                    신고하기

                  </button>

                )}

              </div>

            )}

          </div>

        </div>


        {/* ====================================
            이전 글 / 다음 글
        ==================================== */}

        <div className="mt-5 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">

          {prevPost ? (

            <Link
              href={`/community/${prevPost.id}`}
              onClick={() =>
                handleAdjacentClick(
                  prevPost,
                )
              }
              className="group flex items-center gap-4 border-b border-slate-100 px-6 py-4 transition hover:bg-blue-50/50"
            >

              <div className="flex w-[82px] shrink-0 items-center gap-1 text-sm font-semibold text-slate-400">

                <ChevronUp
                  size={16}
                />

                이전 글

              </div>


              <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 transition group-hover:text-blue-600">

                {
                  prevPost.title
                }

              </p>


              <span className="shrink-0 text-xs text-slate-400">

                {
                  prevPost.authorName
                }

              </span>

            </Link>

          ) : (

            <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-4">

              <div className="flex w-[82px] shrink-0 items-center gap-1 text-sm font-semibold text-slate-300">

                <ChevronUp
                  size={16}
                />

                이전 글

              </div>


              <p className="text-sm text-slate-300">
                이전 게시글이 없습니다.
              </p>

            </div>

          )}


          {nextPost ? (

            <Link
              href={`/community/${nextPost.id}`}
              onClick={() =>
                handleAdjacentClick(
                  nextPost,
                )
              }
              className="group flex items-center gap-4 px-6 py-4 transition hover:bg-blue-50/50"
            >

              <div className="flex w-[82px] shrink-0 items-center gap-1 text-sm font-semibold text-slate-400">

                <ChevronDown
                  size={16}
                />

                다음 글

              </div>


              <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 transition group-hover:text-blue-600">

                {
                  nextPost.title
                }

              </p>


              <span className="shrink-0 text-xs text-slate-400">

                {
                  nextPost.authorName
                }

              </span>

            </Link>

          ) : (

            <div className="flex items-center gap-4 px-6 py-4">

              <div className="flex w-[82px] shrink-0 items-center gap-1 text-sm font-semibold text-slate-300">

                <ChevronDown
                  size={16}
                />

                다음 글

              </div>


              <p className="text-sm text-slate-300">
                다음 게시글이 없습니다.
              </p>

            </div>

          )}

        </div>


        {/* ====================================
            댓글

            NOTICE에서는 CommentSection 자체를
            렌더링하지 않으므로
            /api/posts/{id}/comments 호출도 발생하지 않음
        ==================================== */}

        {!isNotice ? (

          <div className="mt-8">
            <CommentSection />
          </div>

        ) : (

          <div className="mt-8 rounded-2xl border border-blue-100 bg-white px-6 py-8 text-center shadow-sm">

            <Megaphone
              size={23}
              className="mx-auto text-blue-400"
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              공지사항에는 댓글을 작성할 수 없습니다.
            </p>

          </div>

        )}

      </div>


      {/* ====================================
          신고 모달

          일반 게시글만
      ==================================== */}

      {!isNotice &&
        !isMyPost && (

        <ReportModal
          open={
            reportOpen
          }
          postId={
            post.id
          }
          onClose={() =>
            setReportOpen(
              false,
            )
          }
        />

      )}

    </main>
  );
}