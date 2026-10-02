"use client";

import React, {
  useEffect,
  useState,
} from "react";
import {
  useDispatch,
  useSelector,
} from "react-redux";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  VscFiles,
  VscBook,
  VscBeaker,
  VscSourceControl,
  VscAccount,
  VscSettingsGear,
  VscSignOut,
} from "react-icons/vsc";

import {
  setActiveActivity,
} from "@/store/slices/uiSlice";

import {
  getMyWorkspacesByTokenApi,
} from "@/lib/ide/api";

export default function ActivityBar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const { activeActivity } =
    useSelector(
      (state) => state.ui,
    );

  /* =====================================================
     현재 워크스페이스 이름
  ===================================================== */
  const [
    workspaceName,
    setWorkspaceName,
  ] = useState("");

  /* =====================================================
     IDE 경로 정보
  ===================================================== */
  const getWorkspaceInfo = () => {
    const segments = pathname
      .split("/")
      .filter(Boolean);

    /*
     * 개인 프로젝트
     * /ide/personal/{workspaceId}
     *
     * 팀 프로젝트
     * /ide/team/{workspaceId}
     */
    const ideIndex =
      segments.indexOf("ide");

    if (ideIndex === -1) {
      return {
        mode: null,
        workspaceId: null,
      };
    }

    const mode =
      segments[ideIndex + 1];

    const workspaceId =
      segments[ideIndex + 2];

    return {
      mode,
      workspaceId,
    };
  };

  /* =====================================================
     현재 workspaceName 조회
  ===================================================== */
  useEffect(() => {
    let cancelled = false;

    const loadWorkspaceName =
      async () => {
        const {
          workspaceId,
        } = getWorkspaceInfo();

        if (!workspaceId) {
          setWorkspaceName("");
          return;
        }

        try {
          const response =
            await getMyWorkspacesByTokenApi();

          if (cancelled) {
            return;
          }

          const workspaces =
            Array.isArray(response)
              ? response
              : [];

          const currentWorkspace =
            workspaces.find(
              (workspace) => {
                const id =
                  workspace?.id ??
                  workspace?.uuid ??
                  workspace?.workspaceId;

                return (
                  String(id) ===
                  String(workspaceId)
                );
              },
            );

          const name =
            currentWorkspace?.name ??
            currentWorkspace?.workspaceName ??
            currentWorkspace?.title ??
            "";

          setWorkspaceName(
            String(name).trim(),
          );
        } catch (error) {
          console.error(
            "워크스페이스 이름 조회 실패:",
            error,
          );

          if (!cancelled) {
            setWorkspaceName("");
          }
        }
      };

    void loadWorkspaceName();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  /* =====================================================
     TOP 메뉴
  ===================================================== */
  const topItems = [
    {
      id: "editor",
      icon: (
        <VscFiles size={24} />
      ),
      label: "에디터",
    },
    {
      id: "api-test",
      icon: (
        <VscBeaker size={24} />
      ),
      label: "API 테스트",
    },
    {
      id: "git",
      icon: (
        <VscSourceControl
          size={24}
        />
      ),
      label: "Git 연동",
    },
    {
      id: "docs",
      icon: (
        <VscBook size={24} />
      ),
      label: "문서",
    },
  ];

  /* =====================================================
     프로젝트 메인 화면 경로
  ===================================================== */
  const getWorkspaceMainPath =
    () => {
      const {
        mode,
        workspaceId,
      } = getWorkspaceInfo();

      if (!workspaceId) {
        return "/main";
      }

      if (
        mode === "personal" ||
        mode === "team"
      ) {
        return `/main/${encodeURIComponent(
          workspaceId,
        )}?mode=${mode}`;
      }

      return `/main/${encodeURIComponent(
        workspaceId,
      )}`;
    };

  /* =====================================================
     프로젝트 작업 화면 나가기
  ===================================================== */
  const handleExit = () => {
    const displayName =
      workspaceName ||
      "현재 프로젝트";

    const confirmed =
      window.confirm(
        `"${displayName}" 프로젝트 작업 화면에서 나가시겠습니까?\n\n프로젝트 메인 화면으로 이동합니다.`,
      );

    if (!confirmed) {
      return;
    }

    router.push(
      getWorkspaceMainPath(),
    );
  };

  /* =====================================================
     Activity 변경
  ===================================================== */
  const handleActivityClick = (
    id,
  ) => {
    dispatch(
      setActiveActivity(id),
    );
  };

  return (
    <div className="z-30 flex h-full w-12 shrink-0 flex-col justify-between border-r border-gray-200 bg-[#f8f8f8] shadow-sm">
      {/* =================================================
          TOP
      ================================================= */}
      <div className="flex flex-col gap-2 pt-2">
        {topItems.map(
          (item) => {
            const active =
              activeActivity ===
              item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  handleActivityClick(
                    item.id,
                  )
                }
                className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center transition-all ${
                  active
                    ? "text-[#333]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                aria-label={
                  item.label
                }
                title={item.label}
              >
                {active && (
                  <span className="absolute bottom-0 left-0 top-0 w-[3px] rounded-r-full bg-[#333]" />
                )}

                {item.icon}

                <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {item.label}
                </span>
              </button>
            );
          },
        )}
      </div>

      {/* =================================================
          BOTTOM
      ================================================= */}
      <div className="flex flex-col gap-2 pb-2">
        {/* 마이페이지 */}
        <button
          type="button"
          onClick={() =>
            handleActivityClick(
              "mypage",
            )
          }
          className={`group relative flex h-12 w-12 cursor-pointer items-center justify-center transition-all ${
            activeActivity ===
            "mypage"
              ? "text-[#333]"
              : "text-gray-400 hover:text-gray-600"
          }`}
          aria-label="마이페이지"
          title="마이페이지"
        >
          {activeActivity ===
            "mypage" && (
            <span className="absolute bottom-0 left-0 top-0 w-[3px] rounded-r-full bg-[#333]" />
          )}

          <VscAccount
            size={24}
          />

          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            마이페이지
          </span>
        </button>

        {/* 설정 */}
        <button
          type="button"
          className="group relative flex h-12 w-12 cursor-pointer items-center justify-center text-gray-400 transition-colors hover:text-gray-600"
          aria-label="설정"
          title="설정"
        >
          <VscSettingsGear
            size={24}
          />

          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            설정
          </span>
        </button>

        {/* 프로젝트 나가기 */}
        <button
          type="button"
          onClick={handleExit}
          className="group relative flex h-12 w-12 cursor-pointer items-center justify-center text-gray-400 transition-colors hover:text-red-500"
          aria-label="프로젝트 나가기"
          title="프로젝트 나가기"
        >
          <VscSignOut
            size={24}
          />

          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-black px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            프로젝트 나가기
          </span>
        </button>
      </div>
    </div>
  );
}