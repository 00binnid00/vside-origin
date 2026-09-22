"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  FileText,
  FolderKanban,
  Loader2,
  MessageSquare,
  Search,
  Send,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useMessages } from "@/contexts/MessageContext";
import { useAuth } from "@/contexts/AuthContext";

import * as api from "@/lib/messages/messageApi";

import {
  fetchChatHistoryApi,
  getMyWorkspacesByTokenApi,
  getWorkspaceMembersApi,
} from "@/lib/ide/api";

import { ChatSocket } from "@/lib/ide/chatSocket";

/* =========================================================
   TYPES
========================================================= */

type WorkspaceMode = "personal" | "team";

type WorkspaceItem = {
  id: string;
  name: string;
  mode: WorkspaceMode;
  role?: string;
};

type WorkspaceMember = {
  userId: number;
  email?: string;
  nickname?: string;
  name?: string;
  role?: string;
};

type WorkspaceChatMessage = {
  id: string;
  senderId: string;
  receiverId: string | null;
  senderName: string;
  content: string;
  createdAt: string;
  mine: boolean;
};

/* =========================================================
   COMMON
========================================================= */

function cn(
  ...classes: Array<
    string | false | null | undefined
  >
) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitial(value?: string) {
  return (
    value
      ?.trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}

function getMemberName(
  member?: WorkspaceMember | null,
) {
  if (!member) {
    return "팀원";
  }

  return (
    member.nickname ||
    member.name ||
    member.email ||
    `사용자 ${member.userId}`
  );
}

function mergeDirectMessages(
  current: api.DirectMessage[],
  incoming: api.DirectMessage[],
) {
  const map = new Map(
    [...current, ...incoming].map(
      (message) => [
        message.id,
        message,
      ],
    ),
  );

  return [...map.values()].sort(
    (a, b) => {
      try {
        const left = BigInt(a.id);
        const right = BigInt(b.id);

        if (left < right) {
          return -1;
        }

        if (left > right) {
          return 1;
        }

        return 0;
      } catch {
        return a.id.localeCompare(b.id);
      }
    },
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center bg-[#F7F8FA] text-sm text-slate-500">
          메시지를 불러오는 중...
        </main>
      }
    >
      <Inbox />
    </Suspense>
  );
}

/* =========================================================
   INBOX
========================================================= */

function Inbox() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const conversationId =
    searchParams.get("conversation");

  const workspaceId =
    searchParams.get("workspace");

  const memberId =
    searchParams.get("member");

  const {
    enabled,
    conversations,
    select,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useMessages();

  const [
    keyword,
    setKeyword,
  ] = useState("");

  const [
    workspaces,
    setWorkspaces,
  ] =
    useState<WorkspaceItem[]>([]);

  const [
    workspaceLoading,
    setWorkspaceLoading,
  ] = useState(false);

  const [
    workspaceError,
    setWorkspaceError,
  ] = useState("");

  /* =======================================================
     LOAD WORKSPACES
  ======================================================= */

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const loadWorkspaces =
      async () => {
        try {
          setWorkspaceLoading(true);
          setWorkspaceError("");

          const response =
            await getMyWorkspacesByTokenApi();

          if (cancelled) {
            return;
          }

          const list =
            Array.isArray(response)
              ? response
              : [];

          const teamWorkspaces: WorkspaceItem[] =
            list
              .map((item: any) => ({
                id: String(
                  item.id ??
                    item.uuid ??
                    "",
                ),

                name:
                  item.name ||
                  item.teamName ||
                  "이름 없는 프로젝트",

                mode:
                  item.mode === "team" ||
                  item.type === "TEAM"
                    ? "team"
                    : "personal",

                role:
                  item.role,
              }))
              .filter(
                (
                  item: WorkspaceItem,
                ) =>
                  Boolean(item.id) &&
                  item.mode === "team",
              );

          setWorkspaces(
            teamWorkspaces,
          );
        } catch (loadError) {
          if (cancelled) {
            return;
          }

          console.error(
            "메시지 프로젝트 목록 조회 실패:",
            loadError,
          );

          setWorkspaceError(
            loadError instanceof Error
              ? loadError.message
              : "프로젝트 목록을 불러오지 못했습니다.",
          );
        } finally {
          if (!cancelled) {
            setWorkspaceLoading(false);
          }
        }
      };

    void loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  /* =======================================================
     FILTER
  ======================================================= */

  const normalizedKeyword =
    keyword
      .trim()
      .toLocaleLowerCase();

  const filteredWorkspaces =
    useMemo(() => {
      if (!normalizedKeyword) {
        return workspaces;
      }

      return workspaces.filter(
        (workspace) =>
          workspace.name
            .toLocaleLowerCase()
            .includes(
              normalizedKeyword,
            ),
      );
    }, [
      workspaces,
      normalizedKeyword,
    ]);

  const filteredConversations =
    useMemo(() => {
      if (!normalizedKeyword) {
        return conversations;
      }

      return conversations.filter(
        (conversation) =>
          conversation.recipient.name
            .toLocaleLowerCase()
            .includes(
              normalizedKeyword,
            ),
      );
    }, [
      conversations,
      normalizedKeyword,
    ]);

  const selectedWorkspace =
    useMemo(() => {
      if (!workspaceId) {
        return null;
      }

      return (
        workspaces.find(
          (workspace) =>
            String(
              workspace.id,
            ) ===
            String(
              workspaceId,
            ),
        ) ?? null
      );
    }, [
      workspaces,
      workspaceId,
    ]);

  const hasActiveConversation =
    Boolean(
      conversationId ||
        workspaceId,
    );

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const openWorkspace = (
    targetWorkspaceId: string,
  ) => {
    router.push(
      `/messages?workspace=${encodeURIComponent(
        targetWorkspaceId,
      )}`,
    );
  };

  /* =======================================================
     ENABLE CHECK
  ======================================================= */

  if (!enabled) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[#F7F8FA] px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
          로그인 사용자 정보를 확인해 주세요.
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 bg-[#F7F8FA] px-3 py-3 text-slate-900 sm:px-5 lg:px-7">
      <div className="mx-auto flex min-h-0 w-full max-w-[1580px] flex-1">
        {/* ===============================================
            ERROR FLOAT
        ================================================ */}

        {(error ||
          workspaceError) ? (
          <div
            role="alert"
            className="fixed left-1/2 top-[82px] z-[2100] flex max-w-[90vw] -translate-x-1/2 items-center gap-4 rounded-xl border border-red-100 bg-white px-5 py-3 text-sm text-red-600 shadow-lg"
          >
            <span>
              {error ||
                workspaceError}
            </span>

            {error ? (
              <button
                type="button"
                onClick={() =>
                  void refresh()
                }
                className="shrink-0 font-semibold underline"
              >
                다시 조회
              </button>
            ) : null}
          </div>
        ) : null}

        {/* ===============================================
            MESSAGE FRAME
        ================================================ */}

        <div className="flex h-[calc(100dvh-94px)] min-h-[560px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* =============================================
              LEFT SIDEBAR
          ============================================== */}

          <aside
            className={cn(
              "w-full shrink-0 flex-col bg-white md:flex md:w-[340px] md:border-r md:border-slate-100",
              hasActiveConversation
                ? "hidden"
                : "flex",
            )}
            aria-label="대화 목록"
          >
            {/* SIDEBAR HEADER */}

            <div className="border-b border-slate-100 px-5 pb-4 pt-5">
              <div className="flex items-center justify-between">
                <h1 className="text-[16px] font-bold tracking-[-0.02em] text-slate-900">
                  대화
                </h1>

                {(loading ||
                  workspaceLoading) ? (
                  <Loader2
                    size={16}
                    className="animate-spin text-blue-500"
                  />
                ) : null}
              </div>

              <div className="relative mt-4">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={keyword}
                  onChange={(
                    event,
                  ) =>
                    setKeyword(
                      event.target
                        .value,
                    )
                  }
                  placeholder="프로젝트 또는 사용자 검색"
                  aria-label="프로젝트 또는 사용자 검색"
                  className="h-11 w-full rounded-xl bg-slate-50 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* SIDEBAR LIST */}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {/* =========================================
                  PROJECT
              ========================================== */}

              <section className="pt-4">
                <div className="mb-2 flex items-center justify-between px-2">
                  <p className="text-[11px] font-bold tracking-[0.06em] text-slate-400">
                    참여 프로젝트
                  </p>

                  <span className="text-[10px] font-semibold text-slate-400">
                    {workspaces.length}
                  </span>
                </div>

                {workspaceLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2
                      size={18}
                      className="animate-spin text-blue-400"
                    />
                  </div>
                ) : filteredWorkspaces.length ===
                  0 ? (
                  <p className="px-4 py-7 text-center text-xs leading-5 text-slate-400">
                    {keyword
                      ? "검색된 프로젝트가 없습니다."
                      : "참여 중인 팀 프로젝트가 없습니다."}
                  </p>
                ) : (
                  filteredWorkspaces.map(
                    (
                      workspace,
                    ) => {
                      const active =
                        String(
                          workspace.id,
                        ) ===
                        String(
                          workspaceId,
                        );

                      return (
                        <button
                          key={
                            workspace.id
                          }
                          type="button"
                          onClick={() =>
                            openWorkspace(
                              workspace.id,
                            )
                          }
                          className={cn(
                            "mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                            active
                              ? "bg-blue-50"
                              : "hover:bg-slate-50",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                              active
                                ? "bg-blue-100 text-blue-600"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            <FolderKanban
                              size={
                                18
                              }
                            />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-slate-800">
                              {
                                workspace.name
                              }
                            </span>

                            <span className="mt-1 block text-[11px] text-slate-400">
                              팀 프로젝트
                            </span>
                          </span>

                          {active ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                          ) : null}
                        </button>
                      );
                    },
                  )
                )}
              </section>

              {/* DIVIDER */}

              <div className="mx-2 my-3 border-t border-slate-100" />

              {/* =========================================
                  DIRECT MESSAGES
              ========================================== */}

              <section>
                <div className="mb-2 flex items-center justify-between px-2">
                  <p className="text-[11px] font-bold tracking-[0.06em] text-slate-400">
                    개인 메시지
                  </p>

                  <span className="text-[10px] font-semibold text-slate-400">
                    {
                      conversations.length
                    }
                  </span>
                </div>

                {!loading &&
                filteredConversations.length ===
                  0 ? (
                  <p className="px-4 py-7 text-center text-xs leading-5 text-slate-400">
                    {keyword
                      ? "검색된 개인 대화가 없습니다."
                      : "아직 개인 메시지가 없습니다."}
                  </p>
                ) : null}

                {filteredConversations.map(
                  (
                    conversation,
                  ) => {
                    const active =
                      conversation.id ===
                      conversationId;

                    return (
                      <button
                        key={
                          conversation.id
                        }
                        type="button"
                        onClick={() =>
                          select(
                            conversation.id,
                          )
                        }
                        aria-pressed={
                          active
                        }
                        className={cn(
                          "mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                          active
                            ? "bg-blue-50"
                            : "hover:bg-slate-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                            active
                              ? "bg-blue-100 text-blue-600"
                              : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {getInitial(
                            conversation
                              .recipient
                              .name,
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-bold text-slate-800">
                              {
                                conversation
                                  .recipient
                                  .name
                              }
                            </span>

                            {conversation.unreadCount >
                            0 ? (
                              <span className="flex min-w-[18px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {conversation.unreadCount >
                                99
                                  ? "99+"
                                  : conversation.unreadCount}
                              </span>
                            ) : null}
                          </span>

                          <span className="mt-1 block truncate text-xs text-slate-500">
                            {conversation.lastContent ||
                              "아직 메시지가 없습니다"}
                          </span>

                          <span className="mt-1 block text-[10px] text-slate-400">
                            {formatTime(
                              conversation.updatedAt,
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  },
                )}

                {hasMore ? (
                  <button
                    type="button"
                    disabled={
                      loading
                    }
                    onClick={() =>
                      void loadMore()
                    }
                    className="mt-2 w-full rounded-xl py-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:text-slate-300"
                  >
                    {loading
                      ? "불러오는 중..."
                      : "대화 더 보기"}
                  </button>
                ) : null}
              </section>
            </div>
          </aside>

          {/* =============================================
              RIGHT CHAT AREA
          ============================================== */}

          <section
            className={cn(
              "min-w-0 flex-1 flex-col bg-white md:flex",
              hasActiveConversation
                ? "flex"
                : "hidden",
            )}
            aria-label="대화 내용"
          >
            {workspaceId ? (
              <WorkspaceThread
                key={workspaceId}
                workspaceId={
                  workspaceId
                }
                workspaceName={
                  selectedWorkspace
                    ?.name ||
                  "프로젝트"
                }
                targetMemberId={
                  memberId
                }
              />
            ) : conversationId ? (
              <DirectThread
                key={
                  conversationId
                }
                id={
                  conversationId
                }
              />
            ) : (
              <EmptyConversation />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyConversation() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-400">
        <MessageSquare size={23} />
      </div>

      <h2 className="text-sm font-bold text-slate-800">
        대화를 선택해 주세요
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        왼쪽에서 프로젝트 또는
        <br />
        개인 대화를 선택하세요.
      </p>
    </div>
  );
}

/* =========================================================
   WORKSPACE THREAD
========================================================= */

function WorkspaceThread({
  workspaceId,
  workspaceName,
  targetMemberId,
}: {
  workspaceId: string;
  workspaceName: string;
  targetMemberId: string | null;
}) {
  const router = useRouter();

  const { user } = useAuth();

  const [
    members,
    setMembers,
  ] =
    useState<WorkspaceMember[]>(
      [],
    );

  const [
    messages,
    setMessages,
  ] =
    useState<
      WorkspaceChatMessage[]
    >([]);

  const [
    draft,
    setDraft,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const [
    memberMenuOpen,
    setMemberMenuOpen,
  ] = useState(false);

  const bottomRef =
    useRef<HTMLDivElement>(
      null,
    );

  const currentUserId =
    user?.userId ??
    (user?.id
      ? Number(user.id)
      : null);

  const selectedMember =
    useMemo(() => {
      if (!targetMemberId) {
        return null;
      }

      return (
        members.find(
          (member) =>
            String(
              member.userId,
            ) ===
            String(
              targetMemberId,
            ),
        ) ?? null
      );
    }, [
      members,
      targetMemberId,
    ]);

  /* =======================================================
     SCROLL
  ======================================================= */

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      block: "end",
    });
  }, [
    messages.length,
    targetMemberId,
  ]);

  /* =======================================================
     LOAD CHAT
  ======================================================= */

  useEffect(() => {
    if (
      !workspaceId ||
      !currentUserId
    ) {
      return;
    }

    let disposed = false;

    const load =
      async () => {
        try {
          setLoading(true);
          setError("");

          const [
            memberResponse,
            historyResponse,
          ] =
            await Promise.all([
              getWorkspaceMembersApi(
                workspaceId,
              ),

              fetchChatHistoryApi(
                workspaceId,
                currentUserId,
              ),
            ]);

          if (disposed) {
            return;
          }

          const memberList: WorkspaceMember[] =
            Array.isArray(
              memberResponse,
            )
              ? memberResponse.map(
                  (
                    item: any,
                  ) => ({
                    userId:
                      Number(
                        item.userId ??
                          item.id,
                      ),

                    nickname:
                      item.nickname,

                    name:
                      item.name,

                    email:
                      item.email,

                    role:
                      item.role,
                  }),
                )
              : [];

          setMembers(
            memberList.filter(
              (member) =>
                Number.isFinite(
                  member.userId,
                ),
            ),
          );

          const history: WorkspaceChatMessage[] =
            Array.isArray(
              historyResponse,
            )
              ? historyResponse.map(
                  (
                    message: any,
                  ) => ({
                    id:
                      String(
                        message.id,
                      ),

                    senderId:
                      String(
                        message.senderId,
                      ),

                    receiverId:
                      message.receiverId ===
                        null ||
                      message.receiverId ===
                        undefined
                        ? null
                        : String(
                            message.receiverId,
                          ),

                    senderName:
                      message.senderName ||
                      "팀원",

                    content:
                      message.content ||
                      "",

                    createdAt:
                      message.createdAt,

                    mine:
                      String(
                        message.senderId,
                      ) ===
                      String(
                        currentUserId,
                      ),
                  }),
                )
              : [];

          setMessages(
            history,
          );
        } catch (loadError) {
          if (disposed) {
            return;
          }

          console.error(
            "프로젝트 채팅 조회 실패:",
            loadError,
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : "프로젝트 채팅을 불러오지 못했습니다.",
          );
        } finally {
          if (!disposed) {
            setLoading(false);
          }
        }
      };

    void load();

    ChatSocket.connect(
      workspaceId,
      currentUserId,
      (
        newMessage: any,
      ) => {
        if (disposed) {
          return;
        }

        const normalized: WorkspaceChatMessage =
          {
            id: String(
              newMessage.id,
            ),

            senderId:
              String(
                newMessage.senderId,
              ),

            receiverId:
              newMessage.receiverId ===
                null ||
              newMessage.receiverId ===
                undefined
                ? null
                : String(
                    newMessage.receiverId,
                  ),

            senderName:
              newMessage.senderName ||
              "팀원",

            content:
              newMessage.content ||
              "",

            createdAt:
              newMessage.createdAt,

            mine:
              String(
                newMessage.senderId,
              ) ===
              String(
                currentUserId,
              ),
          };

        setMessages(
          (current) => {
            if (
              current.some(
                (message) =>
                  message.id ===
                  normalized.id,
              )
            ) {
              return current;
            }

            return [
              ...current,
              normalized,
            ];
          },
        );
      },
    );

    return () => {
      disposed = true;

      ChatSocket.disconnect();
    };
  }, [
    workspaceId,
    currentUserId,
  ]);

  /* =======================================================
     DISPLAY MESSAGES
  ======================================================= */

  const displayedMessages =
    useMemo(() => {
      if (!currentUserId) {
        return [];
      }

      if (!targetMemberId) {
        return messages.filter(
          (message) =>
            message.receiverId ===
            null,
        );
      }

      const myId =
        String(
          currentUserId,
        );

      const target =
        String(
          targetMemberId,
        );

      return messages.filter(
        (message) => {
          const sender =
            String(
              message.senderId,
            );

          const receiver =
            message.receiverId ===
            null
              ? ""
              : String(
                  message.receiverId,
                );

          return (
            (sender === myId &&
              receiver ===
                target) ||
            (sender === target &&
              receiver ===
                myId)
          );
        },
      );
    }, [
      messages,
      currentUserId,
      targetMemberId,
    ]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const goBack = () => {
    router.push("/messages");
  };

  const selectAll = () => {
    setMemberMenuOpen(false);

    router.push(
      `/messages?workspace=${encodeURIComponent(
        workspaceId,
      )}`,
    );
  };

  const selectMember = (
    member: WorkspaceMember,
  ) => {
    setMemberMenuOpen(false);

    router.push(
      `/messages?workspace=${encodeURIComponent(
        workspaceId,
      )}&member=${encodeURIComponent(
        String(
          member.userId,
        ),
      )}`,
    );
  };

  /* =======================================================
     SEND
  ======================================================= */

  const send = () => {
    const content =
      draft.trim();

    if (
      !content ||
      !currentUserId
    ) {
      return;
    }

    const senderName =
      user?.nickname ||
      user?.name ||
      user?.email?.split(
        "@",
      )[0] ||
      "팀원";

    ChatSocket.sendMessage({
      workspaceId,

      senderId:
        currentUserId,

      senderName,

      receiverId:
        targetMemberId
          ? Number(
              targetMemberId,
            )
          : null,

      content,

      type: "CHAT",
    });

    setDraft("");
  };

  const otherMembers =
    members.filter(
      (member) =>
        String(
          member.userId,
        ) !==
        String(
          currentUserId,
        ),
    );

  return (
    <>
      {/* ===============================================
          HEADER
      ================================================ */}

      <div className="relative flex min-h-[72px] shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-5">
        <button
          type="button"
          onClick={goBack}
          aria-label="대화 목록으로"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 md:hidden"
        >
          <ArrowLeft size={20} />
        </button>

        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center",
            targetMemberId
              ? "rounded-full bg-slate-100 text-slate-500"
              : "rounded-xl bg-blue-50 text-blue-600",
          )}
        >
          {targetMemberId ? (
            <UserRound
              size={18}
            />
          ) : (
            <FolderKanban
              size={18}
            />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-slate-900">
            {targetMemberId
              ? getMemberName(
                  selectedMember,
                )
              : workspaceName}
          </h2>

          <p className="mt-1 truncate text-[11px] text-slate-400">
            {targetMemberId
              ? `${workspaceName} · 팀원과 1:1 대화`
              : `프로젝트 전체 대화 · 팀원 ${members.length}명`}
          </p>
        </div>

        {/* MEMBER MENU */}

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setMemberMenuOpen(
                (value) =>
                  !value,
              )
            }
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition",
              memberMenuOpen
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            <UsersRound
              size={15}
            />

            <span>
              팀원{" "}
              {members.length}
            </span>

            <ChevronDown
              size={14}
              className={cn(
                "transition-transform",
                memberMenuOpen &&
                  "rotate-180",
              )}
            />
          </button>

          {memberMenuOpen ? (
            <div className="absolute right-0 top-11 z-30 w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <p className="px-3 pb-2 pt-1 text-[10px] font-bold tracking-[0.08em] text-slate-400">
                대화 선택
              </p>

              {/* 전체 프로젝트 */}

              <button
                type="button"
                onClick={
                  selectAll
                }
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                  !targetMemberId
                    ? "bg-blue-50"
                    : "hover:bg-slate-50",
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <UsersRound
                    size={15}
                  />
                </span>

                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800">
                    프로젝트 전체
                  </span>

                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    모든 팀원과 대화
                  </span>
                </span>
              </button>

              <div className="my-2 border-t border-slate-100" />

              {/* MEMBERS */}

              <div className="max-h-[280px] overflow-y-auto">
                {otherMembers.length ===
                0 ? (
                  <p className="px-3 py-5 text-center text-xs text-slate-400">
                    다른 팀원이 없습니다.
                  </p>
                ) : (
                  otherMembers.map(
                    (
                      member,
                    ) => {
                      const active =
                        String(
                          member.userId,
                        ) ===
                        String(
                          targetMemberId,
                        );

                      return (
                        <button
                          key={
                            member.userId
                          }
                          type="button"
                          onClick={() =>
                            selectMember(
                              member,
                            )
                          }
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                            active
                              ? "bg-blue-50"
                              : "hover:bg-slate-50",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              active
                                ? "bg-blue-100 text-blue-600"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {getInitial(
                              getMemberName(
                                member,
                              ),
                            )}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold text-slate-800">
                              {getMemberName(
                                member,
                              )}
                            </span>

                            <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                              {member.role?.toUpperCase() ===
                              "OWNER"
                                ? "프로젝트 오너"
                                : "팀원"}
                            </span>
                          </span>
                        </button>
                      );
                    },
                  )
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ===============================================
          ERROR
      ================================================ */}

      {error ? (
        <div className="mx-5 mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
          {error}
        </div>
      ) : null}

      {/* ===============================================
          MESSAGES
      ================================================ */}

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#FBFCFE] px-6 py-5">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-blue-400" />
          </div>
        ) : displayedMessages.length ===
          0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-400">
              {targetMemberId ? (
                <UserRound
                  size={22}
                />
              ) : (
                <UsersRound
                  size={22}
                />
              )}
            </div>

            <p className="text-sm font-bold text-slate-700">
              {targetMemberId
                ? `${getMemberName(
                    selectedMember,
                  )}님과 대화를 시작해 보세요`
                : "프로젝트 대화를 시작해 보세요"}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              {targetMemberId
                ? "팀원에게 개인 메시지를 보낼 수 있습니다."
                : "프로젝트 팀원 모두가 확인할 수 있는 대화입니다."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedMessages.map(
              (
                message,
              ) => (
                <div
                  key={
                    message.id
                  }
                  className={cn(
                    "flex flex-col",
                    message.mine
                      ? "items-end"
                      : "items-start",
                  )}
                >
                  {!message.mine ? (
                    <span className="mb-1 px-1 text-[10px] font-semibold text-slate-400">
                      {
                        message.senderName
                      }
                    </span>
                  ) : null}

                  <p
                    className={cn(
                      "max-w-[72%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-6",
                      message.mine
                        ? "rounded-tr-md bg-blue-600 text-white"
                        : "rounded-tl-md border border-slate-100 bg-white text-slate-700 shadow-sm",
                    )}
                  >
                    {
                      message.content
                    }
                  </p>

                  <span className="mt-1 px-1 text-[10px] text-slate-400">
                    {formatTime(
                      message.createdAt,
                    )}
                  </span>
                </div>
              ),
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ===============================================
          INPUT
      ================================================ */}

      <form
        onSubmit={(
          event,
        ) => {
          event.preventDefault();
          send();
        }}
        className="shrink-0 border-t border-slate-100 bg-white px-5 py-4"
      >
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-50">
          <textarea
            value={draft}
            maxLength={2000}
            rows={2}
            onChange={(
              event,
            ) =>
              setDraft(
                event.target.value,
              )
            }
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                  "Enter" &&
                !event.shiftKey &&
                !event
                  .nativeEvent
                  .isComposing
              ) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={
              targetMemberId
                ? `${getMemberName(
                    selectedMember,
                  )}님에게 메시지 보내기`
                : "프로젝트 팀원에게 메시지 보내기"
            }
            className="w-full resize-none bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
          />

          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {draft.length}
              /2000 ·
              Shift+Enter 줄바꿈
            </span>

            <button
              type="submit"
              disabled={
                !draft.trim()
              }
              className="flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              <Send
                size={14}
              />
              보내기
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

/* =========================================================
   DIRECT MESSAGE THREAD
========================================================= */

function DirectThread({
  id,
}: {
  id: string;
}) {
  const {
    revision,
    back,
    refresh,
  } = useMessages();

  const [
    room,
    setRoom,
  ] =
    useState<api.Conversation | null>(
      null,
    );

  const [
    messages,
    setMessages,
  ] =
    useState<api.DirectMessage[]>(
      [],
    );

  const [error, setError] =
    useState("");

  const [draft, setDraft] =
    useState("");

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    more,
    setMore,
  ] = useState(false);

  const [
    olderLoading,
    setOlderLoading,
  ] = useState(false);

  const scroll =
    useRef<HTMLDivElement>(
      null,
    );

  const alive =
    useRef(true);

  const busy =
    useRef(false);

  const queued =
    useRef(false);

  const known =
    useRef<
      api.DirectMessage[]
    >([]);

  const sendLock =
    useRef(false);

  const pending =
    useRef<{
      text: string;
      clientId: string;
    } | null>(null);

  const readCursor =
    useRef("");

  /* =======================================================
     PUBLISH
  ======================================================= */

  const publish = (
    items: api.DirectMessage[],
  ) => {
    known.current = items;

    setMessages(items);
  };

  /* =======================================================
     SYNC
  ======================================================= */

  const sync =
    useCallback(
      async (): Promise<void> => {
        if (busy.current) {
          queued.current =
            true;

          return;
        }

        busy.current = true;

        try {
          const [
            detail,
            latest,
          ] =
            await Promise.all([
              api.getConversation(
                id,
              ),

              api.getMessages(
                id,
              ),
            ]);

          if (!alive.current) {
            return;
          }

          const oldLast =
            known.current[
              known.current
                .length - 1
            ]?.id;

          let incoming =
            latest.items;

          let part =
            latest;

          while (
            oldLast &&
            part.hasMore &&
            part.items.length
          ) {
            let shouldContinue =
              false;

            try {
              shouldContinue =
                BigInt(
                  part.items[0]
                    .id,
                ) >
                BigInt(
                  oldLast,
                );
            } catch {
              shouldContinue =
                false;
            }

            if (!shouldContinue) {
              break;
            }

            part =
              await api.getMessages(
                id,
                part.items[0]
                  .id,
              );

            if (
              !alive.current
            ) {
              return;
            }

            incoming =
              mergeDirectMessages(
                part.items,
                incoming,
              );
          }

          const element =
            scroll.current;

          const atBottom =
            !element ||
            element.scrollHeight -
              element.scrollTop -
              element.clientHeight <
              100;

          const first =
            known.current
              .length === 0;

          setRoom(
            detail,
          );

          publish(
            mergeDirectMessages(
              known.current,
              incoming,
            ),
          );

          if (first) {
            setMore(
              latest.hasMore,
            );
          }

          setError("");

          if (
            first ||
            atBottom
          ) {
            requestAnimationFrame(
              () => {
                if (
                  alive.current &&
                  scroll.current
                ) {
                  scroll.current.scrollTop =
                    scroll.current.scrollHeight;
                }
              },
            );
          }

          const last =
            incoming[
              incoming.length -
                1
            ];

          if (
            document.visibilityState ===
              "visible" &&
            last &&
            incoming.some(
              (message) =>
                !message.mine &&
                !message.readAt,
            ) &&
            readCursor.current !==
              last.id
          ) {
            await api.markRead(
              id,
              last.id,
            );

            if (
              !alive.current
            ) {
              return;
            }

            readCursor.current =
              last.id;

            void refresh();
          }
        } catch (syncError) {
          if (
            alive.current
          ) {
            setError(
              api.errorText(
                syncError,
              ),
            );
          }
        } finally {
          busy.current = false;

          if (
            alive.current
          ) {
            setLoading(false);

            if (
              queued.current
            ) {
              queued.current =
                false;

              void sync();
            }
          }
        }
      },
      [
        id,
        refresh,
      ],
    );

  /* =======================================================
     EFFECT
  ======================================================= */

  useEffect(() => {
    alive.current = true;

    const visible =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void sync();
        }
      };

    document.addEventListener(
      "visibilitychange",
      visible,
    );

    return () => {
      alive.current = false;

      document.removeEventListener(
        "visibilitychange",
        visible,
      );
    };
  }, [sync]);

  useEffect(() => {
    void sync();
  }, [
    revision,
    sync,
  ]);

  /* =======================================================
     OLDER
  ======================================================= */

  const loadOlder =
    async () => {
      if (
        olderLoading ||
        !messages.length
      ) {
        return;
      }

      setOlderLoading(
        true,
      );

      try {
        const response =
          await api.getMessages(
            id,
            messages[0].id,
          );

        if (
          !alive.current
        ) {
          return;
        }

        const element =
          scroll.current;

        const oldHeight =
          element
            ?.scrollHeight ??
          0;

        const oldTop =
          element
            ?.scrollTop ??
          0;

        publish(
          mergeDirectMessages(
            response.items,
            known.current,
          ),
        );

        setMore(
          response.hasMore,
        );

        requestAnimationFrame(
          () => {
            if (
              element &&
              alive.current
            ) {
              element.scrollTop =
                oldTop +
                element.scrollHeight -
                oldHeight;
            }
          },
        );
      } catch (loadError) {
        if (
          alive.current
        ) {
          setError(
            api.errorText(
              loadError,
            ),
          );
        }
      } finally {
        if (
          alive.current
        ) {
          setOlderLoading(
            false,
          );
        }
      }
    };

  /* =======================================================
     SEND
  ======================================================= */

  const send =
    async () => {
      const text =
        draft.trim();

      if (
        !text ||
        text.length > 2000 ||
        sendLock.current
      ) {
        return;
      }

      sendLock.current =
        true;

      setSending(true);
      setError("");

      if (
        !pending.current ||
        pending.current
          .text !== text
      ) {
        pending.current =
          {
            text,

            clientId:
              api.newClientId(),
          };
      }

      try {
        const message =
          await api.sendMessage(
            id,
            text,
            pending.current
              .clientId,
          );

        if (
          !alive.current
        ) {
          return;
        }

        pending.current =
          null;

        setDraft("");

        publish(
          mergeDirectMessages(
            known.current,
            [message],
          ),
        );

        requestAnimationFrame(
          () => {
            if (
              scroll.current
            ) {
              scroll.current.scrollTop =
                scroll.current.scrollHeight;
            }
          },
        );

        void refresh();
      } catch (sendError) {
        if (
          alive.current
        ) {
          setError(
            api.errorText(
              sendError,
            ),
          );
        }
      } finally {
        sendLock.current =
          false;

        if (
          alive.current
        ) {
          setSending(false);
        }
      }
    };

  return (
    <>
      {/* ===============================================
          HEADER
      ================================================ */}

      <div className="flex min-h-[72px] shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-5">
        <button
          type="button"
          onClick={back}
          aria-label="대화 목록으로"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 md:hidden"
        >
          <ArrowLeft
            size={20}
          />
        </button>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
          {getInitial(
            room?.recipient
              .name,
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-slate-900">
            {room?.recipient
              .name ||
              "대화 불러오는 중"}
          </h2>

          <p className="mt-1 text-[11px] text-slate-400">
            개인 메시지
          </p>
        </div>
      </div>

      {/* ===============================================
          SOURCE POST
      ================================================ */}

      {room?.source ? (
        <Link
          href={`/community/${room.source.postId}`}
          className="mx-5 mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-500 transition hover:bg-slate-100"
        >
          <FileText
            size={15}
          />

          <span className="min-w-0 flex-1 truncate">
            관련 글 ·{" "}
            {
              room.source
                .title
            }
          </span>

          <ArrowUpRight
            size={15}
          />
        </Link>
      ) : null}

      {/* ===============================================
          ERROR
      ================================================ */}

      {error ? (
        <div
          role="alert"
          className="mx-5 mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600"
        >
          {error}{" "}

          <button
            type="button"
            onClick={() =>
              void sync()
            }
            className="font-semibold underline"
          >
            다시 조회
          </button>
        </div>
      ) : null}

      {/* ===============================================
          MESSAGES
      ================================================ */}

      <div
        ref={scroll}
        role="log"
        aria-live="polite"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#FBFCFE] px-6 py-5"
      >
        {more ? (
          <button
            type="button"
            disabled={
              olderLoading
            }
            onClick={() =>
              void loadOlder()
            }
            className="block w-full rounded-xl py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:text-slate-300"
          >
            {olderLoading
              ? "불러오는 중..."
              : "이전 메시지 보기"}
          </button>
        ) : null}

        {loading ? (
          <div className="flex h-full min-h-[220px] items-center justify-center">
            <Loader2 className="animate-spin text-blue-400" />
          </div>
        ) : messages.length ===
          0 ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-400">
              <MessageSquare
                size={22}
              />
            </div>

            <p className="text-sm font-bold text-slate-700">
              첫 메시지를 보내보세요
            </p>

            <p className="mt-2 text-xs text-slate-400">
              상대방과 개인 대화를 시작할 수 있습니다.
            </p>
          </div>
        ) : null}

        {messages.map(
          (message) => (
            <div
              key={
                message.id
              }
              className={cn(
                "flex flex-col",
                message.mine
                  ? "items-end"
                  : "items-start",
              )}
            >
              <p
                className={cn(
                  "max-w-[72%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-6",
                  message.mine
                    ? "rounded-tr-md bg-blue-600 text-white"
                    : "rounded-tl-md border border-slate-100 bg-white text-slate-700 shadow-sm",
                )}
              >
                {
                  message.content
                }
              </p>

              <span className="mt-1 px-1 text-[10px] text-slate-400">
                {formatTime(
                  message.createdAt,
                )}
              </span>
            </div>
          ),
        )}
      </div>

      {/* ===============================================
          INPUT
      ================================================ */}

      <form
        onSubmit={(
          event,
        ) => {
          event.preventDefault();

          void send();
        }}
        className="shrink-0 border-t border-slate-100 bg-white px-5 py-4"
      >
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 transition focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-50">
          <textarea
            aria-label="메시지 내용"
            value={draft}
            disabled={
              sending ||
              !room
            }
            maxLength={2000}
            rows={2}
            onChange={(
              event,
            ) =>
              setDraft(
                event.target.value,
              )
            }
            onKeyDown={(
              event,
            ) => {
              if (
                event.key ===
                  "Enter" &&
                !event.shiftKey &&
                !event
                  .nativeEvent
                  .isComposing
              ) {
                event.preventDefault();

                void send();
              }
            }}
            placeholder="메시지를 입력하세요"
            className="w-full resize-none bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400"
          />

          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              {draft.length}
              /2000 ·
              Shift+Enter 줄바꿈
            </span>

            <button
              type="submit"
              disabled={
                sending ||
                !room ||
                !draft.trim()
              }
              className="flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              {sending ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Send
                  size={14}
                />
              )}

              보내기
            </button>
          </div>
        </div>
      </form>
    </>
  );
}