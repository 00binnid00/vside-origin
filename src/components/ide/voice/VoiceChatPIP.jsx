"use client";

import React, { useMemo } from "react";
import { useDispatch } from "react-redux";
import { Rnd } from "react-rnd";
import {
  VscCallOutgoing,
  VscChromeMaximize,
  VscMicFilled,
  VscMute,
} from "react-icons/vsc";
import { FaHeadphones } from "react-icons/fa";

import { setIsPIPMode } from "@/store/slices/uiSlice";

const DEFAULT_CHANNEL_ID = "general";

const PIP_WIDTH_ESTIMATE = 430;
const PIP_HEIGHT_ESTIMATE = 56;

const getCenteredPipPosition = () => {
  if (typeof window === "undefined") {
    return {
      x: 500,
      y: 300,
    };
  }

  return {
    x: Math.max(40, Math.round((window.innerWidth - PIP_WIDTH_ESTIMATE) / 2)),
    y: Math.max(80, Math.round((window.innerHeight - PIP_HEIGHT_ESTIMATE) / 2)),
  };
};

const normalizeId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeChannelId = (value) => {
  if (!value || String(value).trim() === "") return DEFAULT_CHANNEL_ID;
  return String(value).trim();
};

const avatarColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-indigo-500",
];

const getInitial = (name) => {
  if (!name) return "U";
  return String(name).trim().charAt(0).toUpperCase();
};

const getChannelName = (channel) => {
  if (!channel) return "일반 회의실";
  return channel.name || channel.channelName || "음성 채널";
};

const getChannelIcon = (channel) => {
  if (!channel) return "💬";
  return channel.icon || channel.channelIcon || "💬";
};

const getMemberName = ({ peerId, teamMembers, participants }) => {
  const key = normalizeId(peerId);

  const teamMember = teamMembers.find(
    (member) => normalizeId(member.userId) === key,
  );

  if (teamMember?.nickname) return teamMember.nickname;
  if (teamMember?.name) return teamMember.name;
  if (teamMember?.email) return teamMember.email.split("@")[0];

  const participant = participants.find(
    (item) => normalizeId(item.userId) === key,
  );

  if (participant?.nickname) return participant.nickname;
  if (participant?.name) return participant.name;

  return "User";
};

function MiniAvatar({
  nickname,
  muted = false,
  deafened = false,
  speaking = false,
  colorClass = "bg-blue-500",
  title,
}) {
  return (
    <div className="group relative" title={title || nickname}>
      <div
        className={[
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[12px] font-black text-white shadow-sm transition-all",
          muted || deafened ? "bg-gray-400 grayscale opacity-80" : colorClass,
          speaking && !muted && !deafened
            ? "ring-2 ring-emerald-400 ring-offset-1"
            : "",
        ].join(" ")}
      >
        {getInitial(nickname)}
      </div>

      {(muted || deafened) && (
        <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-white">
          {deafened ? <FaHeadphones size={8} /> : <VscMute size={8} />}
        </div>
      )}
    </div>
  );
}

export default function VoiceChatPIP({
  myNickname = "나",

  peers = {},
  participants = [],
  channels = [],
  selectedChannel = null,
  selectedChannelId = DEFAULT_CHANNEL_ID,

  remoteMutedUsers = {},

  isConnected = false,
  isVoiceConnected = false,
  isVoiceJoined = false,

  isMuted = false,
  isDeafened = false,
  amISpeaking = false,

  speakingUsers = new Set(),
  peerVolumes = {},
  teamMembers = [],

  onMuteToggle,
  onDeafenToggle,
  onDisconnect,
}) {
  const dispatch = useDispatch();

  const activeChannel = useMemo(() => {
    const safeSelectedChannelId = normalizeChannelId(selectedChannelId);

    return (
      selectedChannel ||
      channels.find(
        (channel) =>
          normalizeChannelId(channel.channelId) === safeSelectedChannelId,
      ) ||
      {
        channelId: DEFAULT_CHANNEL_ID,
        name: "일반 회의실",
        icon: "💬",
      }
    );
  }, [channels, selectedChannel, selectedChannelId]);

  const activeChannelName = getChannelName(activeChannel);
  const activeChannelIcon = getChannelIcon(activeChannel);

  const remotePeerIds = useMemo(() => {
    const ids = new Set();

    Object.keys(peers || {}).forEach((peerId) => {
      const key = normalizeId(peerId);
      if (key) ids.add(key);
    });

    participants.forEach((participant) => {
      const key = normalizeId(participant.userId);
      const nickname = participant.nickname || participant.name;

      if (!key) return;
      if (nickname && nickname === myNickname) return;

      ids.add(key);
    });

    return Array.from(ids);
  }, [peers, participants, myNickname]);

  const visibleRemotePeerIds = remotePeerIds.slice(0, 4);
  const hiddenCount = Math.max(
    0,
    remotePeerIds.length - visibleRemotePeerIds.length,
  );

  const handleMaximize = () => {
    dispatch(setIsPIPMode(false));
  };

  return (
    <Rnd
      default={{
        ...getCenteredPipPosition(),
        width: "auto",
        height: "auto",
      }}
      bounds="window"
      dragHandleClassName="voice-pip-drag-handle"
      enableResizing={false}
      className="z-[9999]"
    >
      <div className="voice-pip-drag-handle flex w-max cursor-move items-center gap-3 rounded-full border border-gray-200 bg-white/95 px-3 py-2 shadow-[0_10px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl">
        <div className="flex flex-col gap-[3px] px-1 text-gray-400 transition-colors hover:text-blue-500">
          <div className="h-1 w-1 rounded-full bg-current" />
          <div className="h-1 w-1 rounded-full bg-current" />
          <div className="h-1 w-1 rounded-full bg-current" />
        </div>

        <div
          className={[
            "h-2 w-2 rounded-full",
            isConnected && isVoiceConnected && isVoiceJoined
              ? "bg-emerald-500"
              : "bg-amber-400",
          ].join(" ")}
          title={
            isConnected && isVoiceConnected && isVoiceJoined
              ? "음성 연결됨"
              : "음성 연결 중"
          }
        />

        <div
          className="flex max-w-[160px] items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1"
          title={activeChannelName}
        >
          <span className="shrink-0 text-sm">{activeChannelIcon}</span>
          <span className="truncate text-[11px] font-black text-gray-600">
            {activeChannelName}
          </span>
        </div>

        <div className="flex items-center -space-x-2.5">
          <MiniAvatar
            nickname={myNickname}
            muted={isMuted}
            deafened={isDeafened}
            speaking={amISpeaking}
            colorClass="bg-blue-500"
            title={`${myNickname} (나)`}
          />

          {visibleRemotePeerIds.map((peerId, index) => {
            const nickname = getMemberName({
              peerId,
              teamMembers,
              participants,
            });

            const isSpeaking = speakingUsers.has(normalizeId(peerId));
            const muted = Boolean(remoteMutedUsers[normalizeId(peerId)]);
            const volume = peerVolumes[normalizeId(peerId)] ?? 1.0;

            return (
              <MiniAvatar
                key={`pip-peer-${peerId}`}
                nickname={nickname}
                muted={muted || volume === 0}
                deafened={false}
                speaking={isSpeaking && !isDeafened}
                colorClass={avatarColors[index % avatarColors.length]}
                title={`${nickname}${muted ? " · 음소거" : ""}`}
              />
            );
          })}

          {hiddenCount > 0 && (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[11px] font-black text-gray-600 shadow-sm"
              title={`${hiddenCount}명 더 있음`}
            >
              +{hiddenCount}
            </div>
          )}
        </div>

        <div className="mx-2 h-5 w-px shrink-0 bg-gray-200" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMuteToggle}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-full transition-all",
              isMuted
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:bg-gray-100",
            ].join(" ")}
            title="마이크 켜기/끄기 (Ctrl + Alt + M)"
          >
            {isMuted ? <VscMute size={14} /> : <VscMicFilled size={14} />}
          </button>

          <button
            type="button"
            onClick={onDeafenToggle}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-full transition-all",
              isDeafened
                ? "bg-gray-800 text-white"
                : "text-gray-500 hover:bg-gray-100",
            ].join(" ")}
            title="헤드셋 켜기/끄기 (Ctrl + Alt + D)"
          >
            <FaHeadphones size={14} />
          </button>

          <button
            type="button"
            onClick={handleMaximize}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-all hover:bg-gray-100"
            title="크게 보기"
          >
            <VscChromeMaximize size={14} />
          </button>

          <button
            type="button"
            onClick={onDisconnect}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition-all hover:bg-rose-500 hover:text-white"
            title="통화 종료 (Ctrl + Alt + E)"
          >
            <VscCallOutgoing size={14} />
          </button>
        </div>
      </div>
    </Rnd>
  );
}