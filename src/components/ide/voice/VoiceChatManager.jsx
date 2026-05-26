"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useAuth } from "@/contexts/AuthContext";
import { useWebRTC } from "@/hooks/useWebRTC";
import { setIsPIPMode, setVoiceConnected } from "@/store/slices/uiSlice";

import VoiceChatPIP from "./VoiceChatPIP";
import VoiceChatRoom from "./VoiceChatRoom";

const normalizeId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const clampVolume = (value, fallback = 1.0) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.min(numberValue, 5.0));
};

const getStoredUser = () => {
  if (typeof window === "undefined") return null;

  try {
    return JSON.parse(window.localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const getDisplayName = ({ user, storedUser, teamMembers }) => {
  const currentUserId = user?.id || storedUser?.id;

  const member = teamMembers.find(
    (item) => normalizeId(item.userId) === normalizeId(currentUserId)
  );

  if (member?.nickname) return member.nickname;
  if (user?.nickname) return user.nickname;
  if (storedUser?.nickname) return storedUser.nickname;

  const email = user?.email || storedUser?.email;
  if (email) return email.split("@")[0];

  return "나";
};

const RemoteAudioRenderer = React.memo(function RemoteAudioRenderer({
  stream,
  volume,
  isDeafened,
}) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audioEl = audioRef.current;

    if (!audioEl || !stream) return undefined;

    let cancelled = false;
    const safeVolume = isDeafened
      ? 0
      : Math.max(0, Math.min(Number(volume) || 1.0, 1.0));

    const attachAndPlay = async () => {
      if (cancelled || !audioEl) return;

      audioEl.srcObject = stream;
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.muted = Boolean(isDeafened);
      audioEl.volume = safeVolume;

      try {
        await audioEl.play();
        console.info("[WebRTC] remote audio element playing", {
          volume: safeVolume,
          muted: audioEl.muted,
          paused: audioEl.paused,
          audioTracks: stream.getAudioTracks?.().map((track) => ({
            id: track.id,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          })),
        });
      } catch (error) {
        console.warn("원격 음성 자동 재생이 차단되었습니다. 다음 사용자 입력 때 재시도합니다:", error);

        const retry = () => {
          if (cancelled) return;

          audioEl.play().catch((retryError) => {
            console.warn("원격 음성 재생 재시도 실패:", retryError);
          });
        };

        window.addEventListener("pointerdown", retry, { once: true });
        window.addEventListener("keydown", retry, { once: true });
      }
    };

    attachAndPlay();

    return () => {
      cancelled = true;

      if (audioEl) {
        audioEl.pause();
        audioEl.srcObject = null;
      }
    };
  }, [stream]);

  useEffect(() => {
    const audioEl = audioRef.current;

    if (!audioEl) return;

    const safeVolume = isDeafened
      ? 0
      : Math.max(0, Math.min(Number(volume) || 1.0, 1.0));

    audioEl.muted = Boolean(isDeafened);
    audioEl.volume = safeVolume;

    if (!isDeafened && audioEl.paused && audioEl.srcObject) {
      audioEl.play().catch(() => {});
    }
  }, [volume, isDeafened]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      controls={false}
      style={{ display: "none" }}
    />
  );
});

export default function VoiceChatManager({
  teamMembers = [],
  isModalOpen = false,
  onCloseModal,
}) {
  const dispatch = useDispatch();
  const { user } = useAuth();

  const { workspaceId } = useSelector((state) => state.fileSystem);
  const { isVoiceConnected, isPIPMode } = useSelector((state) => state.ui);

  const [peerVolumes, setPeerVolumes] = useState({});
  const [storedUser, setStoredUser] = useState(null);
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState("general");

  useEffect(() => {
    setStoredUser(getStoredUser());
  }, []);

  const myUserId = useMemo(() => {
    return user?.id || storedUser?.id || null;
  }, [user?.id, storedUser?.id]);

  const myNickname = useMemo(() => {
    return getDisplayName({
      user,
      storedUser,
      teamMembers,
    });
  }, [user, storedUser, teamMembers]);

  const {
    channels: serverVoiceChannels,
    peers,
    participants,
    remoteMutedUsers,

    isConnected,
    isVoiceJoined,
    isMuted,
    isDeafened,

    speakingUsers,
    micVolume,
    mediaError,

    createVoiceChannel,
    updateVoiceChannel,
    deleteVoiceChannel,
    toggleMute,
    toggleDeafen,
    changeMicVolume,
    leaveRoom,
  } = useWebRTC({
    workspaceId,
    myUserId,
    myNickname,
    channelId: activeVoiceChannelId,
    voiceEnabled: isVoiceConnected,
  });


  const voiceChannels = useMemo(() => {
    const list = Array.isArray(serverVoiceChannels) && serverVoiceChannels.length > 0
      ? serverVoiceChannels
      : [{ channelId: "general", id: "general", name: "일반 회의실", icon: "💬" }];

    return list.map((channel) => ({
      ...channel,
      id: channel.id || channel.channelId || "general",
      channelId: channel.channelId || channel.id || "general",
      name: channel.name || "음성 채널",
      icon: channel.icon || "💬",
    }));
  }, [serverVoiceChannels]);

  useEffect(() => {
    const exists = voiceChannels.some((channel) => normalizeId(channel.id) === normalizeId(activeVoiceChannelId));

    if (!exists) {
      setActiveVoiceChannelId("general");
    }
  }, [voiceChannels, activeVoiceChannelId]);

  const amISpeaking = useMemo(() => {
    return speakingUsers.has(normalizeId(myUserId));
  }, [speakingUsers, myUserId]);

  const effectiveParticipants = useMemo(() => {
    const list = Array.isArray(participants) ? [...participants] : [];

    if (!isVoiceConnected || !myUserId) {
      return list;
    }

    const myKey = normalizeId(myUserId);
    const hasMe = list.some((participant) => normalizeId(participant.userId) === myKey);

    if (!hasMe) {
      list.unshift({
        userId: myUserId,
        nickname: myNickname,
        name: myNickname,
        channelId: activeVoiceChannelId,
        muted: isMuted,
      });
    }

    return list;
  }, [isVoiceConnected, myUserId, participants, myNickname, activeVoiceChannelId, isMuted]);

  const mergedTeamMembers = useMemo(() => {
    const map = new Map();

    teamMembers.forEach((member) => {
      const key = normalizeId(member.userId);

      if (!key) return;

      map.set(key, {
        userId: member.userId,
        nickname: member.nickname || member.name || "User",
        email: member.email,
      });
    });

    effectiveParticipants.forEach((participant) => {
      const key = normalizeId(participant.userId);

      if (!key) return;

      const previous = map.get(key);

      map.set(key, {
        ...previous,
        userId: participant.userId,
        nickname:
          participant.nickname ||
          previous?.nickname ||
          participant.name ||
          "User",
        muted: Boolean(participant.muted),
        joinedAt: participant.joinedAt,
      });
    });

    return Array.from(map.values());
  }, [teamMembers, effectiveParticipants]);

  const handlePeerVolumeChange = useCallback((peerId, volume) => {
    const safeVolume = clampVolume(volume, 1.0);

    setPeerVolumes((prev) => ({
      ...prev,
      [normalizeId(peerId)]: safeVolume,
    }));
  }, []);

  const handleCloseModal = useCallback(() => {
    if (typeof onCloseModal === "function") {
      onCloseModal();
    }
  }, [onCloseModal]);

  const handleJoinCall = useCallback(() => {
    if (!workspaceId || !myUserId) {
      console.warn("워크스페이스 또는 사용자 정보가 없어 음성 연결을 시작할 수 없습니다.");
      return;
    }

    dispatch(setIsPIPMode(false));
    dispatch(setVoiceConnected(true));
  }, [dispatch, workspaceId, myUserId]);

  const handleDisconnect = useCallback(() => {
    if (isVoiceConnected) {
      leaveRoom();
    }

    dispatch(setVoiceConnected(false));
    dispatch(setIsPIPMode(false));

    setPeerVolumes({});

    if (typeof onCloseModal === "function") {
      onCloseModal();
    }
  }, [dispatch, isVoiceConnected, leaveRoom, onCloseModal]);

  const handleCreateChannel = useCallback((channelInput) => {
    const safeName = String(
      typeof channelInput === "object"
        ? channelInput?.name
        : channelInput || "",
    ).trim();

    const safeIcon = String(
      typeof channelInput === "object"
        ? channelInput?.icon || "💬"
        : "💬",
    ).trim() || "💬";

    if (!safeName) return false;

    const created = createVoiceChannel({
      name: safeName,
      icon: safeIcon,
    });

    if (!created) {
      console.warn("음성 채널 생성 요청을 서버에 보내지 못했습니다.");
    }

    return created;
  }, [createVoiceChannel]);

  const handleUpdateChannel = useCallback((channelId, payload) => {
    if (!channelId) return false;

    const updated = updateVoiceChannel(channelId, payload || {});

    if (!updated) {
      console.warn("음성 채널 수정 요청을 서버에 보내지 못했습니다.");
    }

    return updated;
  }, [updateVoiceChannel]);

  const handleDeleteChannel = useCallback((channelId) => {
    if (!channelId) return false;

    const deleted = deleteVoiceChannel(channelId);

    if (!deleted) {
      console.warn("음성 채널 삭제 요청을 서버에 보내지 못했습니다.");
    }

    return deleted;
  }, [deleteVoiceChannel]);

  const handleSelectChannel = useCallback(
    (channelId) => {
      if (!channelId) return;

      if (isVoiceConnected) {
        console.warn("통화 중에는 채널을 변경할 수 없습니다. 먼저 통화를 종료하세요.");
        return;
      }

      setActiveVoiceChannelId(channelId);
    },
    [isVoiceConnected]
  );

  useEffect(() => {
    if (!isVoiceConnected) {
      setPeerVolumes({});
      return;
    }

    if (!workspaceId || !myUserId) {
      dispatch(setVoiceConnected(false));
      dispatch(setIsPIPMode(false));
    }
  }, [dispatch, isVoiceConnected, workspaceId, myUserId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isVoiceConnected) return;

      if (!event.ctrlKey || !event.altKey) return;

      const key = event.key.toLowerCase();

      if (key === "m") {
        event.preventDefault();
        toggleMute();
        return;
      }

      if (key === "d") {
        event.preventDefault();
        toggleDeafen();
        return;
      }

      if (key === "e") {
        event.preventDefault();
        handleDisconnect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isVoiceConnected,
    toggleMute,
    toggleDeafen,
    handleDisconnect,
  ]);

  if (!isModalOpen && !isVoiceConnected) {
    return null;
  }

  return (
    <>
      {isVoiceConnected &&
        Object.entries(peers).map(([peerId, stream]) => {
          const volume = peerVolumes[normalizeId(peerId)] ?? 1.0;

          return (
            <RemoteAudioRenderer
              key={`remote-audio-${peerId}`}
              stream={stream}
              volume={volume}
              isDeafened={isDeafened}
            />
          );
        })}

      {isVoiceConnected && isPIPMode ? (
        <VoiceChatPIP
          myNickname={myNickname}
          peers={peers}
          participants={effectiveParticipants}
          remoteMutedUsers={remoteMutedUsers}
          isConnected={isConnected}
          isMuted={isMuted}
          isDeafened={isDeafened}
          amISpeaking={amISpeaking}
          speakingUsers={speakingUsers}
          peerVolumes={peerVolumes}
          teamMembers={mergedTeamMembers}
          onMuteToggle={toggleMute}
          onDeafenToggle={toggleDeafen}
          onDisconnect={handleDisconnect}
        />
      ) : isModalOpen ? (
        <VoiceChatRoom
          myNickname={myNickname}
          peers={isVoiceConnected ? peers : {}}
          participants={effectiveParticipants}
          remoteMutedUsers={remoteMutedUsers}
          isConnected={isVoiceConnected ? isConnected : false}
          isVoiceConnected={isVoiceConnected}
          isVoiceJoined={isVoiceJoined}
          isMuted={isMuted}
          isDeafened={isDeafened}
          amISpeaking={isVoiceConnected ? amISpeaking : false}
          speakingUsers={speakingUsers}
          peerVolumes={peerVolumes}
          teamMembers={mergedTeamMembers}
          myUserId={myUserId}
          micVolume={micVolume}
          mediaError={mediaError}
          channels={voiceChannels}
          selectedChannelId={activeVoiceChannelId}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={handleCreateChannel}
          onUpdateChannel={handleUpdateChannel}
          onDeleteChannel={handleDeleteChannel}
          onConnectVoice={handleJoinCall}
          onMuteToggle={toggleMute}
          onDeafenToggle={toggleDeafen}
          onDisconnect={handleDisconnect}
          onMicVolumeChange={changeMicVolume}
          onPeerVolumeChange={handlePeerVolumeChange}
          onCloseModal={handleCloseModal}
        />
      ) : null}
    </>
  );
}
