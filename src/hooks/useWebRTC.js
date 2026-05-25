"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { getAccessToken } from "@/lib/auth/tokenStore";

const DEFAULT_CHANNEL_ID = "general";

const DEFAULT_CHANNEL = {
  channelId: DEFAULT_CHANNEL_ID,
  name: "일반 회의실",
  icon: "💬",
};

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

const parseCsv = (value) => {
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};


const buildRtcConfig = () => {
  const stunUrls = parseCsv(
    process.env.NEXT_PUBLIC_STUN_URLS ||
      "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302",
  );

  const turnUrls = parseCsv(process.env.NEXT_PUBLIC_TURN_URLS);
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  const iceServers = [];

  if (stunUrls.length > 0) {
    iceServers.push({
      urls: stunUrls,
    });
  }

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10,
  };
};

const RTC_CONFIG = buildRtcConfig();

const normalizeId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeChannelId = (value) => {
  if (!value || String(value).trim() === "") return DEFAULT_CHANNEL_ID;
  return String(value).trim();
};

const toServerUserId = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return null;

  return numberValue;
};

const clampVolume = (value, fallback = 1.0) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return fallback;

  return Math.max(0, Math.min(numberValue, 5.0));
};

const sleep = (ms) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const upsertChannel = (channels, channel) => {
  if (!channel?.channelId) return channels;

  const targetId = normalizeChannelId(channel.channelId);

  const exists = channels.some(
    (item) => normalizeChannelId(item.channelId) === targetId,
  );

  if (exists) {
    return channels.map((item) =>
      normalizeChannelId(item.channelId) === targetId
        ? { ...item, ...channel }
        : item,
    );
  }

  return [...channels, channel];
};

export const useWebRTC = (arg1, arg2, arg3) => {
  const options =
    typeof arg1 === "object" && arg1 !== null
      ? arg1
      : {
          workspaceId: arg1,
          myUserId: arg2,
          myNickname: arg3,
          channelId: DEFAULT_CHANNEL_ID,
        };

  const {
    workspaceId,
    myUserId,
    myNickname,
    channelId = DEFAULT_CHANNEL_ID,
    voiceEnabled,
  } = options;

  const resolvedVoiceEnabled =
    voiceEnabled === undefined
      ? Boolean(workspaceId && myUserId !== null && myUserId !== undefined)
      : Boolean(voiceEnabled);

  const selectedChannelId = useMemo(
    () => normalizeChannelId(channelId),
    [channelId],
  );

  const [channels, setChannels] = useState([DEFAULT_CHANNEL]);
  const [participants, setParticipants] = useState([]);
  const [peers, setPeers] = useState({});
  const [remoteMutedUsers, setRemoteMutedUsers] = useState({});

  const [isConnected, setIsConnected] = useState(false);
  const [isVoiceJoined, setIsVoiceJoined] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());
  const [micVolume, setMicVolumeState] = useState(1.0);
  const [mediaError, setMediaError] = useState(null);

  const workspaceIdRef = useRef(workspaceId);
  const myUserIdRef = useRef(myUserId);
  const myNicknameRef = useRef(myNickname);
  const selectedChannelIdRef = useRef(selectedChannelId);
  const joinedChannelIdRef = useRef(null);

  const stompClientRef = useRef(null);

  const rawStreamRef = useRef(null);
  const localStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const micVolumeRef = useRef(1.0);

  const peerConnectionsRef = useRef({});
  const iceQueueRef = useRef({});

  const localSpeakingRef = useRef(false);
  const localSpeakingTimerRef = useRef(null);
  const remoteAnalyzersRef = useRef({});

  useEffect(() => {
    workspaceIdRef.current = workspaceId;
    myUserIdRef.current = myUserId;
    myNicknameRef.current = myNickname;
    selectedChannelIdRef.current = selectedChannelId;
  }, [workspaceId, myUserId, myNickname, selectedChannelId]);

  const sendSignalingMessage = useCallback(
    (
      type,
      {
        receiverId = null,
        payload = null,
        channelId: overrideChannelId = null,
        extra = {},
      } = {},
    ) => {
      const client = stompClientRef.current;
      const currentWorkspaceId = workspaceIdRef.current;
      const currentUserId = myUserIdRef.current;
      const serverSenderId = toServerUserId(currentUserId);

      if (!client || !client.connected) {
        console.warn("[WebRTC] STOMP client is not connected.", { type });
        return false;
      }

      if (!currentWorkspaceId) {
        console.warn("[WebRTC] workspaceId is missing.", { type });
        return false;
      }

      if (serverSenderId === null) {
        console.warn("[WebRTC] senderId must be numeric.", {
          type,
          currentUserId,
        });
        return false;
      }

      const messageChannelId = normalizeChannelId(
        overrideChannelId || selectedChannelIdRef.current,
      );

      client.publish({
        destination: `/app/webrtc/${currentWorkspaceId}`,
        body: JSON.stringify({
          type,
          workspaceId: currentWorkspaceId,
          channelId: messageChannelId,
          senderId: serverSenderId,
          senderName: myNicknameRef.current || "User",
          receiverId,
          payload,
          ...extra,
        }),
      });

      return true;
    },
    [],
  );

  const requestChannels = useCallback(() => {
    return sendSignalingMessage("CHANNELS", {
      channelId: selectedChannelIdRef.current || DEFAULT_CHANNEL_ID,
    });
  }, [sendSignalingMessage]);

  const createVoiceChannel = useCallback(
    ({ name, icon = "💬" }) => {
      const safeName =
        name && String(name).trim() ? String(name).trim() : "새 음성 채널";
      const safeIcon =
        icon && String(icon).trim() ? String(icon).trim() : "💬";

      const sent = sendSignalingMessage("CREATE_CHANNEL", {
        channelId: DEFAULT_CHANNEL_ID,
        payload: {
          name: safeName,
          icon: safeIcon,
        },
        extra: {
          channelName: safeName,
          channelIcon: safeIcon,
        },
      });

      if (sent) {
        window.setTimeout(() => {
          requestChannels();
        }, 300);
      }

      return sent;
    },
    [requestChannels, sendSignalingMessage],
  );

  const updateVoiceChannel = useCallback(
    (targetChannelId, { name, icon }) => {
      const safeChannelId = normalizeChannelId(targetChannelId);

      const safeName =
        name && String(name).trim() ? String(name).trim() : null;
      const safeIcon =
        icon && String(icon).trim() ? String(icon).trim() : null;

      if (!safeName && !safeIcon) {
        console.warn("[WebRTC] updateVoiceChannel requires name or icon.");
        return false;
      }

      const sent = sendSignalingMessage("UPDATE_CHANNEL", {
        channelId: safeChannelId,
        payload: {
          ...(safeName ? { name: safeName } : {}),
          ...(safeIcon ? { icon: safeIcon } : {}),
        },
        extra: {
          ...(safeName ? { channelName: safeName } : {}),
          ...(safeIcon ? { channelIcon: safeIcon } : {}),
        },
      });

      if (sent) {
        window.setTimeout(() => {
          requestChannels();
        }, 300);
      }

      return sent;
    },
    [requestChannels, sendSignalingMessage],
  );

  const deleteVoiceChannel = useCallback(
    (targetChannelId) => {
      const safeChannelId = normalizeChannelId(targetChannelId);

      if (safeChannelId === DEFAULT_CHANNEL_ID) return false;

      const sent = sendSignalingMessage("DELETE_CHANNEL", {
        channelId: safeChannelId,
      });

      if (sent) {
        window.setTimeout(() => {
          requestChannels();
        }, 300);
      }

      return sent;
    },
    [requestChannels, sendSignalingMessage],
  );

  const stopRemoteAnalyzer = useCallback((userId) => {
    const key = normalizeId(userId);
    const analyzer = remoteAnalyzersRef.current[key];

    if (!analyzer) return;

    if (analyzer.timerId) {
      window.clearTimeout(analyzer.timerId);
    }

    if (analyzer.audioCtx && analyzer.audioCtx.state !== "closed") {
      analyzer.audioCtx.close().catch(() => {});
    }

    delete remoteAnalyzersRef.current[key];
  }, []);

  const removePeer = useCallback(
    (userId) => {
      const key = normalizeId(userId);

      const pc = peerConnectionsRef.current[key];

      if (pc) {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.close();

        delete peerConnectionsRef.current[key];
      }

      delete iceQueueRef.current[key];

      stopRemoteAnalyzer(key);

      setPeers((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      setSpeakingUsers((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });

      setRemoteMutedUsers((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [stopRemoteAnalyzer],
  );

  const cleanupLocalSpeakingMonitor = useCallback(() => {
    if (localSpeakingTimerRef.current) {
      window.clearTimeout(localSpeakingTimerRef.current);
      localSpeakingTimerRef.current = null;
    }

    localSpeakingRef.current = false;
  }, []);

  const cleanupVoiceResources = useCallback(
    ({ sendLeave = true } = {}) => {
      const joinedChannelId = joinedChannelIdRef.current;

      if (sendLeave && joinedChannelId) {
        sendSignalingMessage("LEAVE", {
          channelId: joinedChannelId,
        });
      }

      joinedChannelIdRef.current = null;

      Object.keys(peerConnectionsRef.current).forEach((peerId) => {
        removePeer(peerId);
      });

      peerConnectionsRef.current = {};
      iceQueueRef.current = {};

      cleanupLocalSpeakingMonitor();

      Object.keys(remoteAnalyzersRef.current).forEach((userId) => {
        stopRemoteAnalyzer(userId);
      });

      if (rawStreamRef.current) {
        rawStreamRef.current.getTracks().forEach((track) => track.stop());
        rawStreamRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }

      audioCtxRef.current = null;
      gainNodeRef.current = null;

      setPeers({});
      setParticipants([]);
      setRemoteMutedUsers({});
      setSpeakingUsers(new Set());
      setIsVoiceJoined(false);
      setIsMuted(false);
      setIsDeafened(false);
    },
    [
      cleanupLocalSpeakingMonitor,
      removePeer,
      sendSignalingMessage,
      stopRemoteAnalyzer,
    ],
  );

  const leaveRoom = useCallback(() => {
    cleanupVoiceResources({ sendLeave: true });
  }, [cleanupVoiceResources]);

  const waitForStompConnected = useCallback(async () => {
    for (let i = 0; i < 30; i += 1) {
      if (stompClientRef.current?.connected) {
        return true;
      }

      await sleep(100);
    }

    return false;
  }, []);

  const startLocalSpeakingMonitor = useCallback((audioCtx, sourceNode) => {
    try {
      const analyser = audioCtx.createAnalyser();

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;

      sourceNode.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastSpeakingTime = 0;

      const updateSpeakingState = (isSpeaking) => {
        const myKey = normalizeId(myUserIdRef.current);

        if (!myKey) return;
        if (localSpeakingRef.current === isSpeaking) return;

        localSpeakingRef.current = isSpeaking;

        setSpeakingUsers((prev) => {
          const next = new Set(prev);

          if (isSpeaking) {
            next.add(myKey);
          } else {
            next.delete(myKey);
          }

          return next;
        });
      };

      const checkVolume = () => {
        if (!audioCtx || audioCtx.state === "closed") return;

        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }

        analyser.getByteFrequencyData(dataArray);

        let sum = 0;

        for (let i = 0; i < dataArray.length; i += 1) {
          sum += dataArray[i];
        }

        const averageVolume = sum / dataArray.length;
        const isSpeakingNow = averageVolume > 5;

        const rawAudioTrack = rawStreamRef.current?.getAudioTracks?.()[0];
        const currentlyMuted = rawAudioTrack?.enabled === false;

        if (currentlyMuted) {
          updateSpeakingState(false);
        } else if (isSpeakingNow) {
          lastSpeakingTime = Date.now();
          updateSpeakingState(true);
        } else if (Date.now() - lastSpeakingTime > 800) {
          updateSpeakingState(false);
        }

        localSpeakingTimerRef.current = window.setTimeout(checkVolume, 150);
      };

      checkVolume();
    } catch (error) {
      console.error("로컬 오디오 감지 실패:", error);
    }
  }, []);

  const startRemoteSpeakingMonitor = useCallback(
    (userId, stream) => {
      const key = normalizeId(userId);

      if (!key || !stream) return;

      stopRemoteAnalyzer(key);

      try {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();

        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;

        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let lastSpeakingTime = 0;
        let lastState = false;

        const updateSpeakingState = (isSpeaking) => {
          if (lastState === isSpeaking) return;

          lastState = isSpeaking;

          setSpeakingUsers((prev) => {
            const next = new Set(prev);

            if (isSpeaking) {
              next.add(key);
            } else {
              next.delete(key);
            }

            return next;
          });
        };

        const checkVolume = () => {
          if (audioCtx.state === "closed") return;

          analyser.getByteFrequencyData(dataArray);

          let sum = 0;

          for (let i = 0; i < dataArray.length; i += 1) {
            sum += dataArray[i];
          }

          const averageVolume = sum / dataArray.length;
          const isSpeakingNow = averageVolume > 5;

          if (isSpeakingNow) {
            lastSpeakingTime = Date.now();
            updateSpeakingState(true);
          } else if (Date.now() - lastSpeakingTime > 900) {
            updateSpeakingState(false);
          }

          const timerId = window.setTimeout(checkVolume, 180);

          if (remoteAnalyzersRef.current[key]) {
            remoteAnalyzersRef.current[key].timerId = timerId;
          }
        };

        remoteAnalyzersRef.current[key] = {
          audioCtx,
          timerId: null,
        };

        checkVolume();
      } catch (error) {
        console.error("원격 오디오 감지 실패:", error);
      }
    },
    [stopRemoteAnalyzer],
  );

  const flushIceQueue = useCallback(async (remoteUserId, pc) => {
    const key = normalizeId(remoteUserId);
    const queue = iceQueueRef.current[key];

    if (!queue || queue.length === 0) return;

    for (const iceData of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(iceData));
      } catch (error) {
        console.error("ICE 후보 추가 실패:", error);
      }
    }

    iceQueueRef.current[key] = [];
  }, []);

  const createPeerConnection = useCallback(
    (remoteUserId) => {
      const key = normalizeId(remoteUserId);

      if (!key) return null;

      if (peerConnectionsRef.current[key]) {
        return peerConnectionsRef.current[key];
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);

      peerConnectionsRef.current[key] = pc;

      if (!iceQueueRef.current[key]) {
        iceQueueRef.current[key] = [];
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;

        if (!remoteStream) return;

        setPeers((prev) => ({
          ...prev,
          [key]: remoteStream,
        }));

        startRemoteSpeakingMonitor(key, remoteStream);
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;

        const candidate =
          typeof event.candidate.toJSON === "function"
            ? event.candidate.toJSON()
            : event.candidate;

        sendSignalingMessage("ICE", {
          receiverId: remoteUserId,
          channelId: joinedChannelIdRef.current || selectedChannelIdRef.current,
          payload: candidate,
        });
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;

        if (
          state === "failed" ||
          state === "closed" ||
          state === "disconnected"
        ) {
          removePeer(key);
        }
      };

      return pc;
    },
    [removePeer, sendSignalingMessage, startRemoteSpeakingMonitor],
  );

  const handleChannelsMessage = useCallback((message) => {
    const myKey = normalizeId(myUserIdRef.current);
    const receiverKey = normalizeId(message.receiverId);

    if (receiverKey && receiverKey !== myKey) return;

    if (Array.isArray(message.channels)) {
      setChannels(message.channels.length > 0 ? message.channels : [DEFAULT_CHANNEL]);
    }
  }, []);

  const handleRoomUsersMessage = useCallback((message) => {
    const myKey = normalizeId(myUserIdRef.current);
    const receiverKey = normalizeId(message.receiverId);
    const messageChannelId = normalizeChannelId(message.channelId);
    const currentJoinedChannelId = normalizeChannelId(joinedChannelIdRef.current);

    if (receiverKey && receiverKey !== myKey) return;
    if (messageChannelId !== currentJoinedChannelId) return;

    const list = Array.isArray(message.participants) ? message.participants : [];

    setParticipants(list);

    const mutedMap = {};

    list.forEach((participant) => {
      const userKey = normalizeId(participant.userId);

      if (!userKey || userKey === myKey) return;

      mutedMap[userKey] = Boolean(participant.muted);
    });

    setRemoteMutedUsers(mutedMap);

    if (Array.isArray(message.channels)) {
      setChannels(message.channels.length > 0 ? message.channels : [DEFAULT_CHANNEL]);
    }
  }, []);

  const handleSignalingMessage = useCallback(
    async (message) => {
      if (!message || !message.type) return;

      const type = message.type;
      const myKey = normalizeId(myUserIdRef.current);
      const senderKey = normalizeId(message.senderId);
      const receiverKey = normalizeId(message.receiverId);
      const messageChannelId = normalizeChannelId(message.channelId);
      const currentJoinedChannelId = normalizeChannelId(joinedChannelIdRef.current);

      if (!myKey) return;

      if (
        receiverKey &&
        receiverKey !== myKey &&
        ["ROOM_USERS", "OFFER", "ANSWER", "ICE", "ERROR"].includes(type)
      ) {
        return;
      }

      try {
        switch (type) {
          case "CHANNELS": {
            handleChannelsMessage(message);
            break;
          }

          case "CHANNEL_CREATED": {
            if (Array.isArray(message.channels)) {
              setChannels(message.channels.length > 0 ? message.channels : [DEFAULT_CHANNEL]);
            } else if (message.channel) {
              setChannels((prev) => upsertChannel(prev, message.channel));
            }

            break;
          }

          case "CHANNEL_UPDATED": {
            if (Array.isArray(message.channels)) {
              setChannels(message.channels.length > 0 ? message.channels : [DEFAULT_CHANNEL]);
            } else if (message.channel) {
              setChannels((prev) => upsertChannel(prev, message.channel));
            }

            break;
          }

          case "CHANNEL_DELETED": {
            const deletedChannelId = normalizeChannelId(
              message.channel?.channelId || message.channelId,
            );

            if (Array.isArray(message.channels)) {
              setChannels(message.channels.length > 0 ? message.channels : [DEFAULT_CHANNEL]);
            } else {
              setChannels((prev) =>
                prev.filter(
                  (channel) =>
                    normalizeChannelId(channel.channelId) !== deletedChannelId,
                ),
              );
            }

            if (
              joinedChannelIdRef.current &&
              normalizeChannelId(joinedChannelIdRef.current) === deletedChannelId
            ) {
              cleanupVoiceResources({ sendLeave: false });
            }

            break;
          }

          case "ROOM_USERS": {
            handleRoomUsersMessage(message);
            break;
          }

          case "USER_JOINED": {
            if (!joinedChannelIdRef.current) break;
            if (messageChannelId !== currentJoinedChannelId) break;
            if (!senderKey || senderKey === myKey) break;

            setParticipants((prev) => {
              const exists = prev.some(
                (participant) => normalizeId(participant.userId) === senderKey,
              );

              if (exists) return prev;

              return [
                ...prev,
                {
                  userId: message.senderId,
                  nickname: message.senderName || "User",
                  channelId: messageChannelId,
                  muted: Boolean(message.muted),
                },
              ];
            });

            setRemoteMutedUsers((prev) => ({
              ...prev,
              [senderKey]: Boolean(message.muted),
            }));

            const pc = createPeerConnection(message.senderId);

            if (!pc) break;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            sendSignalingMessage("OFFER", {
              receiverId: message.senderId,
              channelId: messageChannelId,
              payload: {
                type: offer.type,
                sdp: offer.sdp,
              },
            });

            break;
          }

          case "USER_LEFT":
          case "LEAVE": {
            if (messageChannelId !== currentJoinedChannelId) break;
            if (!senderKey || senderKey === myKey) break;

            removePeer(senderKey);

            setParticipants((prev) =>
              prev.filter(
                (participant) => normalizeId(participant.userId) !== senderKey,
              ),
            );

            break;
          }

          case "OFFER": {
            if (messageChannelId !== currentJoinedChannelId) break;
            if (!senderKey || senderKey === myKey) break;

            const pc = createPeerConnection(message.senderId);

            if (!pc) break;

            await pc.setRemoteDescription(
              new RTCSessionDescription(message.payload),
            );

            await flushIceQueue(senderKey, pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            sendSignalingMessage("ANSWER", {
              receiverId: message.senderId,
              channelId: messageChannelId,
              payload: {
                type: answer.type,
                sdp: answer.sdp,
              },
            });

            break;
          }

          case "ANSWER": {
            if (messageChannelId !== currentJoinedChannelId) break;
            if (!senderKey || senderKey === myKey) break;

            const pc = peerConnectionsRef.current[senderKey];

            if (!pc) break;

            if (!pc.currentRemoteDescription) {
              await pc.setRemoteDescription(
                new RTCSessionDescription(message.payload),
              );
            }

            await flushIceQueue(senderKey, pc);

            break;
          }

          case "ICE": {
            if (messageChannelId !== currentJoinedChannelId) break;
            if (!senderKey || senderKey === myKey) break;

            let pc = peerConnectionsRef.current[senderKey];

            if (!pc) {
              pc = createPeerConnection(message.senderId);
            }

            if (!pc) break;

            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(message.payload));
            } else {
              if (!iceQueueRef.current[senderKey]) {
                iceQueueRef.current[senderKey] = [];
              }

              iceQueueRef.current[senderKey].push(message.payload);
            }

            break;
          }

          case "MUTE":
          case "UNMUTE": {
            if (messageChannelId !== currentJoinedChannelId) break;
            if (!senderKey || senderKey === myKey) break;

            const muted = type === "MUTE";

            setRemoteMutedUsers((prev) => ({
              ...prev,
              [senderKey]: muted,
            }));

            setParticipants((prev) =>
              prev.map((participant) =>
                normalizeId(participant.userId) === senderKey
                  ? { ...participant, muted }
                  : participant,
              ),
            );

            if (muted) {
              setSpeakingUsers((prev) => {
                const next = new Set(prev);
                next.delete(senderKey);
                return next;
              });
            }

            break;
          }

          case "ERROR": {
            if (!receiverKey || receiverKey === myKey) {
              console.warn("[WebRTC ERROR]", message.errorMessage);
            }

            break;
          }

          default:
            break;
        }
      } catch (error) {
        console.error(`WebRTC 메시지 처리 실패 [${type}]:`, error);
      }
    },
    [
      cleanupVoiceResources,
      createPeerConnection,
      flushIceQueue,
      handleChannelsMessage,
      handleRoomUsersMessage,
      removePeer,
      sendSignalingMessage,
    ],
  );

  useEffect(() => {
    if (!workspaceId || myUserId === null || myUserId === undefined) {
      return undefined;
    }

    if (typeof window === "undefined") {
      return undefined;
    }

    let cancelled = false;

    const accessToken = getAccessToken();

    const client = new Client({
      brokerURL: `${WS_BASE_URL}/ws/webrtc`,
      connectHeaders: accessToken
        ? {
            Authorization: `Bearer ${accessToken}`,
          }
        : {},
      reconnectDelay: 5000,
      debug: () => {},
      onConnect: () => {
        if (cancelled) {
          client.deactivate().catch(() => {});
          return;
        }

        setIsConnected(true);

        client.subscribe(
          `/topic/workspace/${workspaceId}/webrtc`,
          (stompMessage) => {
            try {
              const parsedMessage = JSON.parse(stompMessage.body);
              handleSignalingMessage(parsedMessage);
            } catch (error) {
              console.error("WebRTC STOMP 메시지 파싱 실패:", error);
            }
          },
        );

        window.setTimeout(() => {
          if (!cancelled) {
            requestChannels();
          }
        }, 100);
      },
      onWebSocketClose: () => {
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error("WebRTC STOMP 에러:", frame);
      },
    });

    stompClientRef.current = client;
    client.activate();

    return () => {
      cancelled = true;

      cleanupVoiceResources({ sendLeave: true });

      if (stompClientRef.current) {
        stompClientRef.current.deactivate().catch(() => {});
        stompClientRef.current = null;
      }

      setIsConnected(false);
      setChannels([DEFAULT_CHANNEL]);
    };
  }, [
    workspaceId,
    myUserId,
    handleSignalingMessage,
    requestChannels,
    cleanupVoiceResources,
  ]);

  useEffect(() => {
    if (
      !workspaceId ||
      myUserId === null ||
      myUserId === undefined ||
      !resolvedVoiceEnabled
    ) {
      cleanupVoiceResources({ sendLeave: true });
      return undefined;
    }

    if (typeof window === "undefined") {
      return undefined;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError("이 브라우저는 마이크 접근을 지원하지 않습니다.");
      return undefined;
    }

    let cancelled = false;

    const startVoice = async () => {
      try {
        setMediaError(null);
        cleanupVoiceResources({ sendLeave: true });

        const stompReady = await waitForStompConnected();

        if (!stompReady) {
          setMediaError("음성 서버 연결에 실패했습니다.");
          return;
        }

        const rawStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 1,
          },
          video: false,
        });

        if (cancelled) {
          rawStream.getTracks().forEach((track) => track.stop());
          return;
        }

        rawStreamRef.current = rawStream;

        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContextClass();

        audioCtxRef.current = audioCtx;

        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {});
        }

        const source = audioCtx.createMediaStreamSource(rawStream);
        const gainNode = audioCtx.createGain();
        const destination = audioCtx.createMediaStreamDestination();

        gainNode.gain.value = micVolumeRef.current;

        source.connect(gainNode);
        gainNode.connect(destination);

        gainNodeRef.current = gainNode;
        localStreamRef.current = destination.stream;

        startLocalSpeakingMonitor(audioCtx, gainNode);

        const joinChannelId = normalizeChannelId(selectedChannelIdRef.current);

        joinedChannelIdRef.current = joinChannelId;
        setIsVoiceJoined(true);

        sendSignalingMessage("JOIN", {
          channelId: joinChannelId,
        });
      } catch (error) {
        console.error("마이크 또는 WebRTC 초기화 실패:", error);

        if (error?.name === "NotAllowedError") {
          setMediaError(
            "마이크 권한이 거부되었습니다. 브라우저 사이트 설정에서 마이크를 허용하세요.",
          );
        } else if (error?.name === "NotFoundError") {
          setMediaError("사용 가능한 마이크를 찾을 수 없습니다.");
        } else {
          setMediaError("음성 연결을 시작하지 못했습니다.");
        }

        cleanupVoiceResources({ sendLeave: true });
      }
    };

    startVoice();

    return () => {
      cancelled = true;
      cleanupVoiceResources({ sendLeave: true });
    };
  }, [
    workspaceId,
    myUserId,
    selectedChannelId,
    resolvedVoiceEnabled,
    cleanupVoiceResources,
    sendSignalingMessage,
    startLocalSpeakingMonitor,
    waitForStompConnected,
  ]);

  const toggleMute = useCallback(() => {
    const rawAudioTrack = rawStreamRef.current?.getAudioTracks?.()[0];

    if (!rawAudioTrack) return;

    rawAudioTrack.enabled = !rawAudioTrack.enabled;

    const nextMuted = !rawAudioTrack.enabled;

    setIsMuted(nextMuted);

    if (nextMuted) {
      const myKey = normalizeId(myUserIdRef.current);

      setSpeakingUsers((prev) => {
        const next = new Set(prev);
        next.delete(myKey);
        return next;
      });
    }

    sendSignalingMessage(nextMuted ? "MUTE" : "UNMUTE", {
      channelId: joinedChannelIdRef.current || selectedChannelIdRef.current,
    });
  }, [sendSignalingMessage]);

  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => !prev);
  }, []);

  const changeMicVolume = useCallback((volume) => {
    const safeVolume = clampVolume(volume, 1.0);

    micVolumeRef.current = safeVolume;

    try {
      const gainNode = gainNodeRef.current;

      if (gainNode && gainNode.context.state !== "closed") {
        gainNode.gain.setTargetAtTime(
          safeVolume,
          gainNode.context.currentTime,
          0.1,
        );
      }

      setMicVolumeState(safeVolume);
    } catch (error) {
      console.error("마이크 볼륨 조절 실패:", error);
    }
  }, []);

  return {
    channels,
    participants,
    peers,
    remoteMutedUsers,

    selectedChannelId,
    joinedChannelId: joinedChannelIdRef.current,

    isConnected,
    isVoiceJoined,
    isVoiceConnected: isVoiceJoined,

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
    removePeer,
  };
};