"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useWebRTC } from "@/hooks/useWebRTC";
import { setIsPIPMode, setVoiceConnected } from "@/store/slices/uiSlice";

import VoiceChatPIP from "./VoiceChatPIP";
import VoiceChatRoom from "./VoiceChatRoom";

const DEFAULT_CHANNEL_ID = "general";

const normalizeId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeChannelId = (value) => {
  if (!value || String(value).trim() === "") return DEFAULT_CHANNEL_ID;
  return String(value).trim();
};

const clampVolume = (value, fallback = 1.0) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return fallback;

  return Math.max(0, Math.min(numberValue, 1.0));
};

const parseJsonSafely = (value) => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object") {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
};

const getStorageItem = (key) => {
  if (typeof window === "undefined") return null;

  return (
    window.localStorage.getItem(key) ||
    window.sessionStorage.getItem(key) ||
    null
  );
};

const getStoredUser = () => {
  if (typeof window === "undefined") return null;

  const candidateKeys = [
    "user",
    "loginUser",
    "currentUser",
    "authUser",
    "userInfo",
    "member",
    "profile",
  ];

  for (const key of candidateKeys) {
    const parsed = parseJsonSafely(getStorageItem(key));

    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const getStoredAccessToken = () => {
  if (typeof window === "undefined") return null;

  const candidateKeys = [
    "accessToken",
    "token",
    "jwt",
    "authToken",
    "Authorization",
  ];

  for (const key of candidateKeys) {
    const value = getStorageItem(key);

    if (!value) continue;

    return value.replace(/^Bearer\s+/i, "");
  }

  return null;
};

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");

  if (parts.length < 2) return null;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);

    return JSON.parse(json);
  } catch {
    return null;
  }
};

const resolveNumericUserId = (...sources) => {
  const candidates = [];

  sources.forEach((source) => {
    if (!source || typeof source !== "object") return;

    candidates.push(
      source.id,
      source.userId,
      source.user_id,
      source.memberId,
      source.member_id,
      source.uid,
      source.sub,
    );
  });

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") {
      continue;
    }

    const numberValue = Number(candidate);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return null;
};

const getDisplayName = (...sources) => {
  const candidates = [];

  sources.forEach((source) => {
    if (!source || typeof source !== "object") return;

    candidates.push(
      source.nickname,
      source.name,
      source.username,
      source.loginId,
      source.email,
      source.sub,
    );
  });

  for (const candidate of candidates) {
    if (!candidate) continue;

    const value = String(candidate).trim();

    if (!value) continue;

    if (value.includes("@")) {
      return value.split("@")[0];
    }

    return value;
  }

  return "User";
};

function RemoteAudioRenderer({
  peerId,
  stream,
  volume = 1.0,
  deafened = false,
}) {
  const audioRef = React.useRef(null);

  useEffect(() => {
    const audioElement = audioRef.current;

    if (!audioElement) return;

    audioElement.srcObject = stream || null;
  }, [stream]);

  useEffect(() => {
    const audioElement = audioRef.current;

    if (!audioElement) return;

    audioElement.volume = deafened ? 0 : clampVolume(volume, 1.0);
    audioElement.muted = Boolean(deafened);
  }, [volume, deafened]);

  return (
    <audio
      ref={audioRef}
      data-peer-id={peerId}
      autoPlay
      playsInline
      style={{ display: "none" }}
    />
  );
}

export default function VoiceChatManager({
  teamMembers = [],
  isModalOpen = false,
  onCloseModal,
}) {
  const dispatch = useDispatch();

  const { workspaceId } = useSelector((state) => state.fileSystem);
  const { isVoiceConnected, isPIPMode } = useSelector((state) => state.ui);

  const reduxUser = useSelector((state) => {
    return (
      state.auth?.user ||
      state.user?.user ||
      state.login?.user ||
      state.member?.user ||
      null
    );
  });

  const [authSnapshot, setAuthSnapshot] = useState({
    storedUser: null,
    tokenPayload: null,
  });

  const [selectedChannelId, setSelectedChannelId] =
    useState(DEFAULT_CHANNEL_ID);
  const [peerVolumes, setPeerVolumes] = useState({});

  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getStoredAccessToken();
    const tokenPayload = decodeJwtPayload(token);

    setAuthSnapshot({
      storedUser,
      tokenPayload,
    });
  }, []);

  const myUserId = useMemo(() => {
    return resolveNumericUserId(
      reduxUser,
      authSnapshot.storedUser,
      authSnapshot.tokenPayload,
    );
  }, [reduxUser, authSnapshot]);

  const myNickname = useMemo(() => {
    return getDisplayName(
      reduxUser,
      authSnapshot.storedUser,
      authSnapshot.tokenPayload,
    );
  }, [reduxUser, authSnapshot]);

  const {
    channels,
    participants,
    peers,
    remoteMutedUsers,

    isConnected,
    isVoiceJoined,

    isMuted,
    isDeafened,
    speakingUsers,

    micVolume,
    mediaError,

    requestChannels,
    createVoiceChannel,
    updateVoiceChannel,
    deleteVoiceChannel,

    toggleMute,
    toggleDeafen,
    changeMicVolume,

    leaveRoom,
  } = useWebRTC({
    workspaceId: isModalOpen || isVoiceConnected ? workspaceId : null,
    channelId: selectedChannelId,
    myUserId,
    myNickname,
    voiceEnabled: isVoiceConnected,
  });

  const safeChannels = useMemo(() => {
    if (Array.isArray(channels) && channels.length > 0) {
      return channels;
    }

    return [
      {
        channelId: DEFAULT_CHANNEL_ID,
        name: "일반 회의실",
        icon: "💬",
      },
    ];
  }, [channels]);

  const selectedChannel = useMemo(() => {
    const safeSelectedChannelId = normalizeChannelId(selectedChannelId);

    return (
      safeChannels.find(
        (channel) =>
          normalizeChannelId(channel.channelId) === safeSelectedChannelId,
      ) ||
      safeChannels[0] ||
      {
        channelId: DEFAULT_CHANNEL_ID,
        name: "일반 회의실",
        icon: "💬",
      }
    );
  }, [safeChannels, selectedChannelId]);

  const mergedTeamMembers = useMemo(() => {
    const memberMap = new Map();

    teamMembers.forEach((member) => {
      const key = normalizeId(member.userId ?? member.id);

      if (!key) return;

      memberMap.set(key, {
        ...member,
        userId: member.userId ?? member.id,
      });
    });

    participants.forEach((participant) => {
      const key = normalizeId(participant.userId);

      if (!key) return;

      const previous = memberMap.get(key) || {};

      memberMap.set(key, {
        ...previous,
        ...participant,
        userId: participant.userId,
      });
    });

    return Array.from(memberMap.values());
  }, [teamMembers, participants]);

  const amISpeaking = useMemo(() => {
    const myKey = normalizeId(myUserId);

    if (!myKey || !speakingUsers) return false;

    if (typeof speakingUsers.has === "function") {
      return speakingUsers.has(myKey);
    }

    if (Array.isArray(speakingUsers)) {
      return speakingUsers.includes(myKey);
    }

    return false;
  }, [myUserId, speakingUsers]);

  const handleSelectChannel = useCallback(
    (channelId) => {
      if (isVoiceConnected) return;

      setSelectedChannelId(normalizeChannelId(channelId));
    },
    [isVoiceConnected],
  );

  const handleConnectVoice = useCallback(() => {
    if (!workspaceId) {
      console.warn("[VoiceChat] workspaceId가 없어 음성 연결을 시작할 수 없습니다.");
      return;
    }

    if (myUserId === null || myUserId === undefined) {
      console.warn("[VoiceChat] userId가 없어 음성 연결을 시작할 수 없습니다.");
      return;
    }

    dispatch(setIsPIPMode(false));
    dispatch(setVoiceConnected(true));
  }, [dispatch, workspaceId, myUserId]);

  const handleDisconnectVoice = useCallback(() => {
    leaveRoom();

    dispatch(setVoiceConnected(false));
    dispatch(setIsPIPMode(false));

    setPeerVolumes({});
  }, [dispatch, leaveRoom]);

  const handleCreateChannel = useCallback(
    ({ name, icon }) => {
      if (typeof createVoiceChannel !== "function") return false;

      return createVoiceChannel({
        name,
        icon,
      });
    },
    [createVoiceChannel],
  );

  const handleUpdateChannel = useCallback(
    (channelId, { name, icon }) => {
      const safeChannelId = normalizeChannelId(channelId);

      if (!safeChannelId) return false;
      if (typeof updateVoiceChannel !== "function") return false;

      return updateVoiceChannel(safeChannelId, {
        name,
        icon,
      });
    },
    [updateVoiceChannel],
  );

  const handleDeleteChannel = useCallback(
    (channelId) => {
      const safeChannelId = normalizeChannelId(channelId);

      if (safeChannelId === DEFAULT_CHANNEL_ID) {
        return false;
      }

      if (isVoiceConnected) {
        return false;
      }

      const result = deleteVoiceChannel(safeChannelId);

      if (safeChannelId === normalizeChannelId(selectedChannelId)) {
        setSelectedChannelId(DEFAULT_CHANNEL_ID);
      }

      return result;
    },
    [deleteVoiceChannel, isVoiceConnected, selectedChannelId],
  );

  const handlePeerVolumeChange = useCallback((peerId, nextVolume) => {
    const key = normalizeId(peerId);

    if (!key) return;

    setPeerVolumes((prev) => ({
      ...prev,
      [key]: clampVolume(nextVolume, 1.0),
    }));
  }, []);

  useEffect(() => {
    if (!isModalOpen && !isVoiceConnected) return;

    requestChannels();
  }, [isModalOpen, isVoiceConnected, requestChannels]);

  useEffect(() => {
    const selectedExists = safeChannels.some(
      (channel) =>
        normalizeChannelId(channel.channelId) ===
        normalizeChannelId(selectedChannelId),
    );

    if (!selectedExists) {
      setSelectedChannelId(DEFAULT_CHANNEL_ID);
    }
  }, [safeChannels, selectedChannelId]);

  useEffect(() => {
    if (!mediaError) return;
    if (!isVoiceConnected) return;

    dispatch(setVoiceConnected(false));
    dispatch(setIsPIPMode(false));
  }, [dispatch, mediaError, isVoiceConnected]);

  useEffect(() => {
    if (isVoiceConnected) return;

    setPeerVolumes({});
  }, [isVoiceConnected]);

  useEffect(() => {
    if (!isVoiceConnected) return;

    if (!workspaceId || myUserId === null || myUserId === undefined) {
      handleDisconnectVoice();
    }
  }, [isVoiceConnected, workspaceId, myUserId, handleDisconnectVoice]);

  useEffect(() => {
    if (!isVoiceConnected) return;

    const handleKeyDown = (event) => {
      if (!event.ctrlKey || !event.altKey) return;

      const key = event.key.toLowerCase();

      if (key === "m") {
        event.preventDefault();
        toggleMute();
      }

      if (key === "d") {
        event.preventDefault();
        toggleDeafen();
      }

      if (key === "e") {
        event.preventDefault();
        handleDisconnectVoice();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVoiceConnected, toggleMute, toggleDeafen, handleDisconnectVoice]);

  const shouldRender = isModalOpen || isVoiceConnected || isPIPMode;

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      {Object.entries(peers || {}).map(([peerId, stream]) => (
        <RemoteAudioRenderer
          key={`remote-audio-${peerId}`}
          peerId={peerId}
          stream={stream}
          volume={peerVolumes[normalizeId(peerId)] ?? 1.0}
          deafened={isDeafened}
        />
      ))}

      {isPIPMode && isVoiceConnected ? (
        <VoiceChatPIP
          myNickname={myNickname}
          peers={peers}
          participants={participants}
          channels={safeChannels}
          selectedChannel={selectedChannel}
          selectedChannelId={selectedChannelId}
          remoteMutedUsers={remoteMutedUsers}
          isConnected={isConnected}
          isVoiceConnected={isVoiceConnected}
          isVoiceJoined={isVoiceJoined}
          isMuted={isMuted}
          isDeafened={isDeafened}
          amISpeaking={amISpeaking}
          speakingUsers={speakingUsers}
          peerVolumes={peerVolumes}
          teamMembers={mergedTeamMembers}
          onMuteToggle={toggleMute}
          onDeafenToggle={toggleDeafen}
          onDisconnect={handleDisconnectVoice}
        />
      ) : null}

      {!isPIPMode && isModalOpen ? (
        <VoiceChatRoom
          myNickname={myNickname}
          channels={safeChannels}
          selectedChannel={selectedChannel}
          selectedChannelId={selectedChannelId}
          participants={participants}
          peers={peers}
          remoteMutedUsers={remoteMutedUsers}
          isConnected={isConnected}
          isVoiceConnected={isVoiceConnected}
          isVoiceJoined={isVoiceJoined}
          isMuted={isMuted}
          isDeafened={isDeafened}
          amISpeaking={amISpeaking}
          speakingUsers={speakingUsers}
          peerVolumes={peerVolumes}
          teamMembers={mergedTeamMembers}
          micVolume={micVolume}
          mediaError={mediaError}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={handleCreateChannel}
          onUpdateChannel={handleUpdateChannel}
          onDeleteChannel={handleDeleteChannel}
          onConnectVoice={handleConnectVoice}
          onMuteToggle={toggleMute}
          onDeafenToggle={toggleDeafen}
          onDisconnect={handleDisconnectVoice}
          onMicVolumeChange={changeMicVolume}
          onPeerVolumeChange={handlePeerVolumeChange}
          onCloseModal={onCloseModal}
        />
      ) : null}
    </>
  );
}