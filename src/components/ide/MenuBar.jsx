"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { Rnd } from "react-rnd";

import {
  setActiveBranch,
  closeAllFiles,
  closeFile,
  openCodeMapTab,
  clearVirtualTree,
  setWorkspaceTree,
} from "@/store/slices/fileSystemSlice";
import {
  openProjectModal,
  setDebugMode,
  writeToTerminal,
  setActiveBottomTab,
  triggerEditorCmd,
  toggleTerminal,
  toggleSidebar,
  toggleRightPanel,
  setCodeMapMode,
  setVoiceConnected,
  setRunning,
  setCurrentDebugLine,
  updateDebugVariables,
  setActiveActivity,
} from "@/store/slices/uiSlice";
import { DebugSocket } from "@/lib/ide/debugSocket";
import { RunSocket } from "@/lib/ide/runSocket";
import {
  VscSourceControl,
  VscChevronDown,
  VscAdd,
  VscRefresh,
  VscClose,
  VscMail,
  VscCopy,
  VscCheck,
  VscKey,
  VscTrash,
  VscLock,
  VscRocket,
  VscBeaker,
  VscMute,
  VscMicFilled,
  VscBell,
  VscCallOutgoing,
  VscPlay,
  VscDebugStop,
  VscChromeMinimize,
  VscChromeMaximize,
  VscMegaphone,
  VscCircleFilled,
  VscSettingsGear,
  VscEdit,
} from "react-icons/vsc";
import {
  fetchBranchListApi,
  createBranchApi,
  saveFileApi,
  getWorkspaceMembersApi,
  inviteWorkspaceMemberApi,
  getUserProfileApi,
  deleteBranchApi,
  createSandboxApi,
  applySandboxApi,
  fetchProjectFilesApi,
  pushToRemoteApi,
  pullFromRemoteApi,
} from "@/lib/ide/api";
import { useAuth } from "@/lib/ide/AuthContext";
import { useWebRTC } from "@/hooks/useWebRTC";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

const getLanguageFromPath = (path) => {
  if (!path) return "UNKNOWN";
  const ext = path.split(".").pop().toLowerCase();
  switch (ext) {
    case "java": return "JAVA";
    case "py": return "PYTHON";
    case "cpp": case "cc": case "cxx": return "CPP";
    case "c": return "C";
    case "cs": return "CSHARP";
    case "js": return "JAVASCRIPT";
    case "ts": return "TYPESCRIPT";
    case "html": case "css": return "HTML";
    default: return "UNKNOWN";
  }
};

const avatarColors = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-teal-500",
];

const PeerAudio = React.memo(({ stream, volume = 1.0 }) => {
  const audioRef = useRef(null);
  const gainNodeRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl && stream && audioEl.srcObject !== stream) {
      audioEl.srcObject = stream;
      audioEl.muted = true;
      audioEl.play().catch((e) => console.warn("오디오 차단됨:", e));

      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = audioCtx;

        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch((e) => console.warn("AudioContext 차단:", e));
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const gainNode = audioCtx.createGain();

        gainNode.gain.value = isNaN(volume) ? 1.0 : volume;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        gainNodeRef.current = gainNode;
      } catch (err) {
        audioEl.muted = false;
        audioEl.volume = Math.max(0, Math.min(volume, 1.0));
      }
    }

    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stream]);

  useEffect(() => {
    try {
      const safeVol = isNaN(volume) ? 1.0 : volume;
      if (gainNodeRef.current && gainNodeRef.current.context.state !== "closed") {
        gainNodeRef.current.gain.setTargetAtTime(
          safeVol,
          gainNodeRef.current.context.currentTime,
          0.1
        );
      } else if (audioRef.current) {
        audioRef.current.volume = Math.max(0, Math.min(safeVol, 1.0));
      }
    } catch (e) {
      console.error("볼륨 조절 에러:", e);
    }
  }, [volume]);

  return <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />;
});
PeerAudio.displayName = "PeerAudio";

const VoiceChatRoom = ({ myUserId, teamMembers, onClose, isMinimized, onToggleMinimize }) => {
  const dispatch = useDispatch();
  const { workspaceId } = useSelector((state) => state.fileSystem);
  const { isVoiceConnected } = useSelector((state) => state.ui);

  const [channels, setChannels] = useState([
    { id: "general", name: "일반 회의실", icon: "💬" }
  ]);
  const [activeChannel, setActiveChannel] = useState("general");
  const [isDeafened, setIsDeafened] = useState(false);
  
  const [editingChannelId, setEditingChannelId] = useState(null);
  const [editChannelName, setEditChannelName] = useState("");

  const [safeUserId] = useState(() => {
    if (myUserId) return myUserId;
    if (typeof window !== "undefined") {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      if (stored?.id) return stored.id;
    }
    return Math.floor(Math.random() * 1000000);
  });

  const currentRoomId = isVoiceConnected && workspaceId ? `${workspaceId}-${activeChannel}` : null;

  const { peers, speakingUsers, isMuted, toggleMute, micVolume, changeMicVolume } = useWebRTC(
    currentRoomId,
    isVoiceConnected ? safeUserId : null
  );

  const [peerVolumes, setPeerVolumes] = useState({});
  const handlePeerVolume = (peerId, vol) => {
    const safeVol = isNaN(vol) ? 1.0 : vol;
    setPeerVolumes((prev) => ({ ...prev, [peerId]: safeVol }));
  };

  const handleConnectToggle = () => dispatch(setVoiceConnected(!isVoiceConnected));
  const toggleDeafen = () => setIsDeafened(!isDeafened);

  const handleAddChannel = () => {
    const channelName = window.prompt("생성할 음성 채널 이름을 입력하세요:");
    if (channelName && channelName.trim()) {
      const newChannelId = `ch_${Date.now()}`;
      setChannels([...channels, { id: newChannelId, name: channelName.trim(), icon: "🔊" }]);
      setActiveChannel(newChannelId);
      if (!isVoiceConnected) dispatch(setVoiceConnected(true));
    }
  };

  const handleDeleteChannel = (e, id) => {
    e.stopPropagation();
    if (id === 'general') return;
    if (window.confirm("이 채널을 삭제하시겠습니까?")) {
      setChannels(channels.filter(c => c.id !== id));
      if (activeChannel === id) setActiveChannel("general");
    }
  };

  const handleEditStart = (e, ch) => {
    e.stopPropagation();
    setEditingChannelId(ch.id);
    setEditChannelName(ch.name);
  };

  const handleEditSave = (id) => {
    if (editChannelName.trim()) {
      setChannels(channels.map(c => c.id === id ? { ...c, name: editChannelName.trim() } : c));
    }
    setEditingChannelId(null);
  };

  const handleChannelClick = (channelId) => {
    if (editingChannelId === channelId) return;
    setActiveChannel(channelId);
    if (!isVoiceConnected) dispatch(setVoiceConnected(true));
  };

  const myMember = teamMembers.find((m) => String(m.userId) === String(safeUserId));
  let myNickname = "나";
  if (myMember?.nickname) {
    myNickname = myMember.nickname;
  } else {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      if (stored?.nickname) myNickname = stored.nickname;
      else if (stored?.email) myNickname = stored.email.split("@")[0];
    } catch (e) {}
  }

  const amISpeaking = speakingUsers.has(String(safeUserId));
  const activeChannelName = channels.find(c => c.id === activeChannel)?.name || "음성 채널";

  if (isMinimized) {
    return (
      <div className="flex items-center gap-3 px-2 py-2 bg-white/95 backdrop-blur-xl rounded-full border border-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.15)] w-max max-w-full overflow-hidden">
        
        <div 
          className="voice-chat-drag-handle flex flex-col items-center justify-center gap-[3px] px-2 py-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-blue-500 transition-colors"
          title="여기를 잡고 이동하세요"
        >
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
        </div>

        {Object.entries(peers).map(([peerId, stream]) => (
          <PeerAudio key={`mini-audio-${peerId}`} stream={stream} volume={isDeafened ? 0 : (peerVolumes[peerId] ?? 1.0)} />
        ))}

        <div className="flex items-center -space-x-2.5">
          <div className="relative z-10 group">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white border-[2px] border-white shadow-sm transition-all
              ${isMuted || !isVoiceConnected ? "bg-gray-400 grayscale" : "bg-gradient-to-br from-blue-500 to-indigo-600"}
              ${amISpeaking && !isMuted ? "ring-[2px] ring-emerald-400" : ""}`}
            >
              {myNickname[0]}
            </div>
            {(isMuted || isDeafened || !isVoiceConnected) && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-rose-500 rounded-full p-0.5 border-2 border-white">
                {isDeafened ? <VscBell size={8} className="text-white line-through" /> : <VscMute size={8} className="text-white" />}
              </div>
            )}
          </div>

          {isVoiceConnected && Object.entries(peers).map(([peerId, _], index) => {
            const member = teamMembers.find((m) => String(m.userId) === String(peerId));
            const nickname = member ? member.nickname : `U`;
            const isSpeaking = speakingUsers.has(String(peerId));
            const vol = peerVolumes[peerId] ?? 1.0;
            const bgClass = avatarColors[index % avatarColors.length];

            return (
              <div key={`mini-${peerId}`} className="relative z-0 group">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white border-[2px] border-white shadow-sm transition-all ${bgClass}
                  ${isSpeaking && !isDeafened ? "ring-[2px] ring-emerald-400" : ""}
                  ${isDeafened || vol === 0 ? "grayscale opacity-80" : ""}`}
                >
                  {nickname[0]}
                </div>
                {(vol === 0 || isDeafened) && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-gray-500 rounded-full p-0.5 border-2 border-white">
                    <VscMute size={8} className="text-white line-through" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="w-[1px] h-5 bg-gray-200 mx-1 shrink-0"></div>

        <div className="flex items-center gap-1 shrink-0 pr-2">
          <button onClick={toggleMute} disabled={!isVoiceConnected} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isMuted ? "bg-gray-800 text-white" : "text-gray-500 hover:bg-gray-100"}`} title={isMuted ? "마이크 켜기" : "마이크 끄기"}>
            {isMuted ? <VscMute size={14} /> : <VscMicFilled size={14} />}
          </button>
          <button onClick={toggleDeafen} disabled={!isVoiceConnected} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isDeafened ? "bg-gray-800 text-white" : "text-gray-500 hover:bg-gray-100"}`} title={isDeafened ? "소리 켜기" : "소리 끄기"}>
            {isDeafened ? <VscMute size={14} /> : <VscBell size={14} />}
          </button>
          <button onClick={onToggleMinimize} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-all ml-1" title="중앙 팝업으로 크게 보기">
            <VscChromeMaximize size={14} />
          </button>
          <button onClick={() => { handleConnectToggle(); onClose(); }} className="w-7 h-7 rounded-full flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all" title="통화 종료">
            <VscCallOutgoing size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row h-full bg-[#f8f9fa] text-[#333] overflow-hidden rounded-2xl border border-gray-200 shadow-2xl relative">
      <div className="w-[200px] bg-white flex flex-col shrink-0 border-r border-gray-200 z-10 shadow-[2px_0_15px_rgba(0,0,0,0.03)]">
        <div className="voice-chat-drag-handle h-12 flex items-center justify-between px-3 border-b border-gray-100 cursor-grab active:cursor-grabbing bg-[#fcfcfc]">
          <span className="text-xs font-black text-gray-700 uppercase tracking-wider pl-1">보이스룸</span>
          <button onClick={handleAddChannel} className="text-blue-500 hover:text-white p-1 rounded hover:bg-blue-500 transition-colors" title="채널 만들기">
            <VscAdd size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {channels.map((ch) => {
            const isActiveChannel = activeChannel === ch.id;
            return (
              <div key={ch.id} className="flex flex-col mb-2 group/channel">
                
                {editingChannelId === ch.id ? (
                  <div className="flex items-center px-2 py-1.5 rounded-md bg-blue-50 border border-blue-200">
                    <input 
                      autoFocus
                      className="w-full bg-transparent outline-none text-[13px] font-bold text-blue-700"
                      value={editChannelName}
                      onChange={(e) => setEditChannelName(e.target.value)}
                      onBlur={() => handleEditSave(ch.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleEditSave(ch.id)}
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => handleChannelClick(ch.id)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer ${
                      isActiveChannel
                        ? "bg-blue-50 text-blue-700 font-bold border border-blue-100"
                        : "text-gray-600 hover:bg-gray-100 font-medium"
                    }`}
                  >
                    <div className="flex items-center truncate flex-1 pr-2">
                      <span className="mr-2 text-gray-400">{ch.icon}</span>
                      <span className="truncate">{ch.name}</span>
                    </div>
                    {ch.id !== 'general' && (
                      <div className="hidden group-hover/channel:flex items-center gap-1.5">
                        <VscEdit className="text-gray-400 hover:text-blue-600" onClick={(e) => handleEditStart(e, ch)} title="이름 수정" />
                        <VscTrash className="text-gray-400 hover:text-red-500" onClick={(e) => handleDeleteChannel(e, ch.id)} title="채널 삭제" />
                      </div>
                    )}
                  </div>
                )}
                
                {isVoiceConnected && isActiveChannel && (
                  <div className="flex flex-col pl-7 pr-2 mt-1.5 space-y-2 relative before:absolute before:left-[15px] before:top-0 before:bottom-2 before:w-px before:bg-gray-200">
                    <div className="flex items-center gap-2 relative">
                      <div className="absolute -left-[12px] top-1/2 w-2 h-px bg-gray-200"></div>
                      <div className="relative">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                          {myNickname[0]}
                        </div>
                        {amISpeaking && !isMuted && <div className="absolute inset-0 ring-[2px] ring-emerald-400 rounded-full animate-pulse"></div>}
                      </div>
                      <span className={`text-[12px] truncate ${amISpeaking && !isMuted ? "text-blue-600 font-black" : "text-gray-500 font-bold"}`}>
                        {myNickname}
                      </span>
                    </div>

                    {Object.entries(peers).map(([peerId, _], index) => {
                      const member = teamMembers.find((m) => String(m.userId) === String(peerId));
                      const nickname = member ? member.nickname : `U-${peerId.substring(0,2)}`;
                      const isSpeaking = speakingUsers.has(String(peerId));
                      const bgClass = avatarColors[index % avatarColors.length];

                      return (
                        <div key={peerId} className="flex items-center gap-2 relative">
                          <div className="absolute -left-[12px] top-1/2 w-2 h-px bg-gray-200"></div>
                          <div className="relative">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-sm ${bgClass}`}>
                              {nickname[0]}
                            </div>
                            {isSpeaking && !isDeafened && <div className="absolute inset-0 ring-[2px] ring-emerald-400 rounded-full animate-pulse"></div>}
                          </div>
                          <span className={`text-[12px] truncate ${isSpeaking && !isDeafened ? "text-blue-600 font-black" : "text-gray-500 font-bold"}`}>
                            {nickname}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-[#fcfcfc] p-3 flex flex-col gap-3 shrink-0 border-t border-gray-200">
          <div className="flex items-center gap-2.5 px-1">
            <div className="relative">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm ${isVoiceConnected && !isMuted ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gray-400"}`}>
                {myNickname[0]}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isVoiceConnected ? "bg-emerald-500" : "bg-gray-400"}`}></div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-gray-800 truncate">{myNickname}</span>
              <span className="text-[10px] text-gray-500 truncate font-bold">{isVoiceConnected ? "접속 중" : "오프라인"}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button onClick={toggleMute} disabled={!isVoiceConnected} className={`p-1.5 rounded-md transition-colors ${isMuted ? "text-rose-500 bg-rose-50" : "text-gray-500 hover:bg-gray-100"}`} title={isMuted ? "마이크 켜기" : "마이크 끄기"}>
              {isMuted ? <VscMute size={16} /> : <VscMicFilled size={16} />}
            </button>
            <button onClick={toggleDeafen} disabled={!isVoiceConnected} className={`p-1.5 rounded-md transition-colors ${isDeafened ? "text-rose-500 bg-rose-50" : "text-gray-500 hover:bg-gray-100"}`} title={isDeafened ? "소리 켜기" : "소리 끄기"}>
              {isDeafened ? <VscMute size={16} /> : <VscBell size={16} />}
            </button>
            <button onClick={handleConnectToggle} className={`p-1.5 rounded-md transition-colors ${isVoiceConnected ? "text-rose-500 hover:bg-rose-50" : "text-emerald-500 hover:bg-emerald-50"}`} title={isVoiceConnected ? "연결 끊기" : "접속하기"}>
              <VscCallOutgoing size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-transparent">
        <div className="voice-chat-drag-handle h-12 flex items-center justify-between px-5 border-b border-gray-200 cursor-grab active:cursor-grabbing shrink-0 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-2 text-gray-700">
            <VscMegaphone size={18} className="text-blue-500" />
            <span className="text-[15px] font-black">{activeChannelName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onToggleMinimize} className="p-1.5 bg-white border border-gray-200 shadow-sm text-gray-500 hover:bg-gray-50 hover:text-blue-600 rounded-md transition-all active:scale-95" title="최소화 (알약 모드)">
              <VscChromeMinimize size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 bg-white border border-gray-200 shadow-sm text-gray-500 hover:bg-rose-50 hover:text-rose-500 rounded-md transition-all active:scale-95" title="창 닫기 (연결 유지)">
              <VscClose size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-wrap content-start gap-8 bg-transparent">
          
          <div className="w-[140px] flex flex-col items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative group hover:shadow-md transition-shadow">
            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-lg transition-all duration-300 z-10
              ${isMuted || !isVoiceConnected ? "bg-gray-300 grayscale" : "bg-gradient-to-br from-blue-500 to-indigo-600"}
              ${amISpeaking && !isMuted ? "ring-[4px] ring-emerald-400 ring-offset-4 scale-105" : "scale-100"}`}
            >
              {myNickname[0]}
            </div>
            {(isMuted || isDeafened || !isVoiceConnected) && (
              <div className="absolute top-3 right-3 bg-white p-1 rounded-full z-20 shadow-md">
                <div className="bg-rose-500 rounded-full p-1">
                  {isDeafened ? <VscBell size={10} className="text-white line-through" /> : <VscMute size={10} className="text-white" />}
                </div>
              </div>
            )}
            <span className="text-[12px] font-black text-gray-800 mt-3 truncate w-full text-center bg-gray-50 py-1 rounded-md">
              {myNickname} (나)
            </span>
            {isVoiceConnected && (
              <div className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-gray-50 p-1.5 rounded-full border border-gray-100">
                <VscMicFilled size={12} className="text-blue-500 shrink-0 ml-1" />
                <input
                  type="range" min="0.1" max="5.0" step="0.1"
                  value={micVolume || 1.0}
                  onChange={(e) => changeMicVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500 outline-none mr-1"
                  title="내 마이크 증폭 조절"
                />
              </div>
            )}
          </div>

          {isVoiceConnected && Object.entries(peers).map(([peerId, stream], index) => {
            const member = teamMembers.find((m) => String(m.userId) === String(peerId));
            const nickname = member ? member.nickname : `User-${peerId.substring(0, 4)}`;
            const isSpeaking = speakingUsers.has(String(peerId));
            const vol = peerVolumes[peerId] ?? 1.0;
            const bgClass = avatarColors[index % avatarColors.length];

            return (
              <div key={peerId} className="w-[140px] flex flex-col items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative group hover:shadow-md transition-shadow animate-fade-in">
                <PeerAudio stream={stream} volume={isDeafened ? 0 : vol} />
                
                <div className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-lg transition-all duration-300 z-10 ${bgClass}
                  ${isSpeaking && !isDeafened ? "ring-[4px] ring-emerald-400 ring-offset-4 scale-105" : "scale-100"}
                  ${isDeafened || vol === 0 ? "grayscale opacity-70" : ""}`}
                >
                  {nickname[0]}
                </div>
                {(vol === 0 || isDeafened) && (
                  <div className="absolute top-3 right-3 bg-white p-1 rounded-full z-20 shadow-md">
                    <div className="bg-gray-500 rounded-full p-1">
                      <VscMute size={10} className="text-white line-through" />
                    </div>
                  </div>
                )}
                <span className="text-[12px] font-black text-gray-800 mt-3 truncate w-full text-center bg-gray-50 py-1 rounded-md">
                  {nickname}
                </span>
                <div className="w-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-gray-50 p-1.5 rounded-full border border-gray-100">
                  <VscBell size={12} className={`${isDeafened ? "text-gray-400" : "text-emerald-500"} shrink-0 ml-1`} />
                  <input
                    type="range" min="0" max="5.0" step="0.1"
                    value={vol}
                    onChange={(e) => handlePeerVolume(peerId, parseFloat(e.target.value))}
                    disabled={isDeafened}
                    className={`flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer outline-none mr-1 ${isDeafened ? "accent-gray-400 cursor-not-allowed" : "accent-emerald-500"}`}
                    title="상대방 볼륨 조절"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function MenuBar({ mode = "personal" }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const { user } = useAuth();

  const [myProfile, setMyProfile] = useState(null);

  const {
    workspaceId,
    activeProject,
    activeBranch,
    fileContents,
    activeFileId,
    tree,
  } = useSelector((state) => state.fileSystem);

  const {
    isTerminalVisible,
    breakpoints,
    codeMapMode,
    isVoiceConnected,
    isRunning,
    isDebugMode,
    isRightPanelVisible, 
  } = useSelector((state) => state.ui);

  const [activeMenu, setActiveMenu] = useState(null);
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isVoiceChatModalOpen, setIsVoiceChatModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [branches, setBranches] = useState([]);
  const [newBranchName, setNewBranchName] = useState("");
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [fullScreenLoading, setFullScreenLoading] = useState({
    isOpen: false,
    text: "",
  });
  const [isSandboxCreateModalOpen, setIsSandboxCreateModalOpen] = useState(false);
  const [sandboxTaskName, setSandboxTaskName] = useState("");
  const [isSandboxApplyModalOpen, setIsSandboxApplyModalOpen] = useState(false);
  const [mergeCommitMessage, setMergeCommitMessage] = useState("");

  const menuRef = useRef(null);
  const branchRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isVoiceChatMinimized, setIsVoiceChatMinimized] = useState(false);
  const [rndState, setRndState] = useState({
    width: 800,
    height: 500,
    x: 0,
    y: 0,
  });

  const isRelocationPage = pathname?.includes("/relocation") || pathname?.includes("/rearrange");
  const currentBranch = activeProject ? activeBranch || "master" : "No Project";
  const isSandboxMode = currentBranch.startsWith("focus-") || currentBranch.startsWith("focus/");
  const currentNickname = myProfile?.nickname || user?.nickname || "dev";

  useEffect(() => {
    setIsMounted(true);
    const initialWidth = Math.min(800, window.innerWidth * 0.9);
    const initialHeight = Math.min(500, window.innerHeight * 0.8);
    setRndState({
      width: initialWidth,
      height: initialHeight,
      x: (window.innerWidth - initialWidth) / 2,
      y: (window.innerHeight - initialHeight) / 2,
    });

    if (user && user.id) {
      getUserProfileApi(user.id)
        .then(setMyProfile)
        .catch((err) => console.error("프로필 정보 로드 실패", err));
    }
  }, [user]);

  const handleToggleMinimize = () => {
    if (isVoiceChatMinimized) {
      const targetWidth = Math.min(800, window.innerWidth * 0.9);
      const targetHeight = Math.min(500, window.innerHeight * 0.8);
      setRndState({
        width: targetWidth,
        height: targetHeight,
        x: (window.innerWidth - targetWidth) / 2,
        y: (window.innerHeight - targetHeight) / 2,
      });
    }
    setIsVoiceChatMinimized(!isVoiceChatMinimized);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setActiveMenu(null);
      if (branchRef.current && !branchRef.current.contains(event.target))
        setIsBranchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setIsTeamModalOpen(false);
        setIsVoiceChatModalOpen(false);
        setIsInviteModalOpen(false);
        setIsSandboxCreateModalOpen(false);
        setIsSandboxApplyModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (workspaceId && activeProject)
      fetchBranchListApi(workspaceId, activeProject)
        .then(setBranches)
        .catch(console.error);
    else setBranches([]);
  }, [workspaceId, activeProject, isBranchOpen, currentBranch]);

  useEffect(() => {
    if (mode === "team" && workspaceId)
      getWorkspaceMembersApi(workspaceId)
        .then(setTeamMembers)
        .catch(console.error);
  }, [mode, workspaceId, isTeamModalOpen]);

  const handleSelectBranch = (branchName) => {
    if (branchName === activeBranch) return;
    dispatch(closeAllFiles());
    dispatch(clearVirtualTree());
    dispatch(setActiveBranch(branchName));
    setIsBranchOpen(false);
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      setIsCreatingBranch(true);
      await createBranchApi(workspaceId, activeProject, newBranchName);
      dispatch(closeAllFiles());
      dispatch(clearVirtualTree());
      dispatch(setActiveBranch(newBranchName));
      setNewBranchName("");
      setIsBranchOpen(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleDeleteBranch = async (e, branchName) => {
    e.stopPropagation();
    if (branchName === "master") return alert("master 브랜치는 삭제할 수 없습니다.");
    if (!window.confirm(`정말 '${branchName}' 브랜치를 삭제하시겠습니까?`)) return;
    try {
      await deleteBranchApi(workspaceId, activeProject, branchName);
      setBranches((prev) => prev.filter((b) => b !== branchName));
      if (activeBranch === branchName) {
        dispatch(closeAllFiles());
        dispatch(clearVirtualTree());
        dispatch(setActiveBranch("master"));
        setIsBranchOpen(false);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const executeCreateSandbox = async () => {
    if (!sandboxTaskName.trim()) return alert("작업명을 입력해주세요.");
    setIsSandboxCreateModalOpen(false);
    setFullScreenLoading({ isOpen: true, text: "격리된 샌드박스 환경을 구축하는 중입니다..." });
    try {
      const sandboxBranchName = await createSandboxApi(workspaceId, activeProject, currentNickname, sandboxTaskName);
      dispatch(closeAllFiles());
      dispatch(clearVirtualTree());
      dispatch(setActiveBranch(sandboxBranchName));
      setSandboxTaskName("");
    } catch (error) {
      alert(error.message);
    } finally {
      setTimeout(() => setFullScreenLoading({ isOpen: false, text: "" }), 500);
    }
  };

  const executeApplySandbox = async () => {
    if (!mergeCommitMessage.trim()) return alert("병합 전 남길 커밋 메시지를 입력해주세요!");
    setIsSandboxApplyModalOpen(false);
    setFullScreenLoading({ isOpen: true, text: "작업 내용을 저장하고 메인으로 합치는 중..." });
    try {
      if (fileContents && Object.keys(fileContents).length > 0) {
        const savePromises = Object.entries(fileContents).map(([path, content]) =>
          saveFileApi(workspaceId, activeProject, activeBranch, path, content)
        );
        await Promise.all(savePromises);
      }
      await applySandboxApi(workspaceId, activeProject, activeBranch, mergeCommitMessage, currentNickname);
      dispatch(closeAllFiles());
      dispatch(setActiveBranch("master"));
      if (activeFileId) alert("🚀 master 브랜치로 병합이 완료되었습니다!\n최신 변경된 코드를 화면에 표시하려면 좌측 탐색기에서 파일을 다시 클릭해 주세요.");
      else alert("🚀 성공적으로 메인(master) 코드에 반영되었습니다!");
      dispatch(clearVirtualTree());
      setMergeCommitMessage("");
    } catch (error) {
      alert(`⚠️ 병합 실패:\n${error.message}`);
    } finally {
      setTimeout(() => setFullScreenLoading({ isOpen: false, text: "" }), 500);
    }
  };

  const handleCopyCode = () => {
    if (!workspaceId) return alert("워크스페이스 ID를 찾을 수 없습니다.");
    navigator.clipboard.writeText(workspaceId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return alert("초대할 이메일 주소를 입력해주세요.");
    try {
      setIsInviting(true);
      await inviteWorkspaceMemberApi({ workspaceId, email: inviteEmail });
      alert(`✨ ${inviteEmail} 님에게 초대장을 발송했습니다!`);
      setInviteEmail("");
      setIsInviteModalOpen(false);
    } catch (error) {
      alert(`초대 실패: ${error.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleQuickStop = () => {
    dispatch(setRunning(false));
    dispatch(setDebugMode(false));
    if (DebugSocket && typeof DebugSocket.stopDebug === "function") DebugSocket.stopDebug();
    if (RunSocket && typeof RunSocket.stop === "function") RunSocket.stop();
    if (!isTerminalVisible) dispatch(toggleTerminal());
    dispatch(writeToTerminal("\r\n[System] 🛑 서버 및 실행을 강제 중지했습니다.\r\n"));
  };

  const handleQuickRun = async () => {
    if (!activeFileId || !workspaceId || !activeProject) return alert("실행할 파일을 에디터에 열어주세요!");
    if (!isTerminalVisible) dispatch(toggleTerminal());
    dispatch(setActiveBottomTab("output"));

    try {
      const content = fileContents[activeFileId] || "";
      await saveFileApi(workspaceId, activeProject, activeBranch || "master", activeFileId, content);
      dispatch(writeToTerminal(`\r\n[System] 코드를 자동 저장했습니다: ${activeFileId}\r\n`));
    } catch (error) {
      return dispatch(writeToTerminal(`\r\n[Error] 실행 전 자동 저장에 실패했습니다: ${error.message}\r\n`));
    }

    const language = getLanguageFromPath(activeFileId);
    let templateType = "CONSOLE";

    if (tree && tree.children) {
      const projectNode = tree.children.find((p) => p.name === activeProject);
      if (projectNode && projectNode.children) {
        const rootFiles = projectNode.children.map((c) => c.name);
        if (rootFiles.includes("build.gradle")) templateType = "SPRING_BOOT";
        else if (rootFiles.includes("package.json")) templateType = "REACT";
        else if (rootFiles.includes("index.html") && !rootFiles.includes("package.json")) templateType = "VANILLA";
      }
    }

    dispatch(writeToTerminal(`[System] ${language} 환경에서 [${templateType}] 모드로 실행을 준비합니다...\r\n`));
    dispatch(setRunning(true));

    const runPayload = {
      type: "RUN",
      workspaceId,
      projectName: activeProject,
      branchName: activeBranch || "master",
      filePath: activeFileId,
      language,
      templateType,
    };

    RunSocket.connectAndRun(
      `${WS_BASE}/ws/run`,
      runPayload,
      (msg) => dispatch(writeToTerminal(msg)),
      () => {
        dispatch(writeToTerminal("\r\n[Error] 실행 중 웹소켓 에러가 발생했습니다.\r\n"));
        dispatch(setRunning(false));
      },
      () => {
        dispatch(writeToTerminal("\r\n[System] 실행이 완전히 종료되었습니다.\r\n"));
        dispatch(setRunning(false));
      }
    );
  };

  const startDebugSession = async () => {
    if (!activeFileId || !workspaceId || !activeProject) return alert("디버깅할 파일을 에디터에 열어주세요!");
    if (!isTerminalVisible) dispatch(toggleTerminal());
    dispatch(setDebugMode(true));
    dispatch(setActiveBottomTab("output"));
    try {
      const content = fileContents[activeFileId] || "";
      await saveFileApi(workspaceId, activeProject, activeBranch || "master", activeFileId, content);
      dispatch(writeToTerminal(`\r\n[System] 코드를 자동 저장했습니다: ${activeFileId}\r\n`));
    } catch (error) {
      return dispatch(writeToTerminal(`\r\n[Error] 실행 전 자동 저장에 실패했습니다: ${error.message}\r\n`));
    }
    dispatch(writeToTerminal("[System] 백엔드 디버거와 연결을 시도합니다...\n"));
    const currentFileBreakpoints = breakpoints.filter((bp) => bp.path === activeFileId).map((bp) => ({ line: bp.line }));

    DebugSocket.connect(
      `${WS_BASE}/ws/debug`,
      () => {
        DebugSocket.startDebug(workspaceId, activeProject, activeBranch || "master", activeFileId, currentFileBreakpoints);
      },
      (msg) => {
        try {
          const data = JSON.parse(msg);
          if (data.type === "SUSPENDED") {
            dispatch(setCurrentDebugLine({ line: data.line, path: data.path }));
            dispatch(updateDebugVariables(data.variables || {}));
          } else if (data.type === "OUTPUT" || data.type === "ERROR") {
            dispatch(writeToTerminal((data.data || "") + "\n"));
            if (data.data && data.data.includes("Debugging Finished")) {
              dispatch(setDebugMode(false));
              dispatch(setCurrentDebugLine(null));
              dispatch(updateDebugVariables({}));
            }
          }
        } catch {
          dispatch(writeToTerminal(msg + "\n"));
        }
      },
      () => {
        dispatch(writeToTerminal("\r\n[System] 디버깅 세션이 종료되었습니다.\r\n"));
        dispatch(setDebugMode(false));
        dispatch(setCurrentDebugLine(null));
        dispatch(updateDebugVariables({}));
      }
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !workspaceId || !activeProject) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      try {
        await saveFileApi(workspaceId, activeProject, activeBranch || "master", file.name, content);
        dispatch(writeToTerminal(`\r\n[System] ✅ 로컬 파일 업로드: ${file.name}\r\n`));
        const treeData = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
        dispatch(setWorkspaceTree(treeData));
      } catch (error) {
        dispatch(writeToTerminal(`\r\n[Error] ❌ 업로드 실패: ${error.message}\r\n`));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleFolderUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !workspaceId || !activeProject) return;

    dispatch(writeToTerminal(`\r\n[System] 📂 ${files.length}개 파일 업로드 시작...\r\n`));

    try {
      const uploadPromises = files.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const path = file.webkitRelativePath || file.name;
              await saveFileApi(workspaceId, activeProject, activeBranch || "master", path, event.target.result);
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsText(file);
        });
      });

      await Promise.all(uploadPromises);
      dispatch(writeToTerminal(`[System] ✅ 폴더 업로드 완료.\r\n`));
      const treeData = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
      dispatch(setWorkspaceTree(treeData));
    } catch (error) {
      dispatch(writeToTerminal(`[Error] ❌ 폴더 업로드 에러: ${error.message}\r\n`));
    }
    e.target.value = "";
  };

  const handleMenuItemClick = async (menuName, itemName) => {
    setActiveMenu(null);

    switch (itemName) {
      case "새 파일":
        if (!workspaceId || !activeProject) return alert("프로젝트를 선택해주세요.");
        const fileName = window.prompt("파일 이름을 확장자와 함께 입력하세요 (예: index.js):");
        if (fileName) {
          try {
            await saveFileApi(workspaceId, activeProject, activeBranch || "master", fileName, "");
            dispatch(writeToTerminal(`[System] ✅ 새 파일 생성 성공: ${fileName}\n`));
            const treeData = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
            dispatch(setWorkspaceTree(treeData));
          } catch (e) {
            dispatch(writeToTerminal(`[Error] ❌ 생성 실패: ${e.message}\n`));
          }
        }
        break;
      case "파일 열기...":
        if (!workspaceId || !activeProject) return alert("프로젝트를 선택해주세요.");
        if (fileInputRef.current) fileInputRef.current.click();
        break;
      case "폴더 열기...":
        if (!workspaceId || !activeProject) return alert("프로젝트를 선택해주세요.");
        if (folderInputRef.current) folderInputRef.current.click();
        break;
      case "저장":
        if (!activeFileId || !workspaceId || !activeProject) return alert("에디터에 파일이 없습니다.");
        try {
          const content = fileContents[activeFileId] || "";
          await saveFileApi(workspaceId, activeProject, activeBranch || "master", activeFileId, content);
          if (!isTerminalVisible) dispatch(toggleTerminal());
          dispatch(writeToTerminal(`[System] ✅ 저장 완료: ${activeFileId}\n`));
        } catch (error) {
          if (!isTerminalVisible) dispatch(toggleTerminal());
          dispatch(writeToTerminal(`[Error] ❌ 저장 실패: ${error.message}\n`));
        }
        break;
      case "다른 이름으로...":
        if (!activeFileId || !workspaceId || !activeProject) return alert("파일이 없습니다.");
        const newName = window.prompt("새로운 파일 이름을 입력하세요:", activeFileId);
        if (newName && newName !== activeFileId) {
          try {
            const content = fileContents[activeFileId] || "";
            await saveFileApi(workspaceId, activeProject, activeBranch || "master", newName, content);
            dispatch(writeToTerminal(`[System] ✅ 복제 저장 완료: ${newName}\n`));
            const treeData = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
            dispatch(setWorkspaceTree(treeData));
          } catch (error) {
            dispatch(writeToTerminal(`[Error] ❌ 복제 실패: ${error.message}\n`));
          }
        }
        break;
      case "모두 저장":
        if (!workspaceId || !activeProject) return alert("저장할 내용이 없습니다.");
        dispatch(writeToTerminal("[System] 모든 파일을 저장합니다...\n"));
        try {
          const savePromises = Object.entries(fileContents || {}).map(([path, content]) =>
            saveFileApi(workspaceId, activeProject, activeBranch || "master", path, content)
          );
          await Promise.all(savePromises);
          if (!isTerminalVisible) dispatch(toggleTerminal());
          dispatch(writeToTerminal("[System] ✅ 모두 저장 완료!\n"));
        } catch (e) {
          if (!isTerminalVisible) dispatch(toggleTerminal());
          dispatch(writeToTerminal(`[Error] ❌ 모두 저장 실패: ${e.message}\n`));
        }
        break;
      case "내보내기":
        if (!activeFileId) return alert("다운로드할 파일을 열어주세요.");
        const fileContent = fileContents[activeFileId] || "";
        const blob = new Blob([fileContent], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = activeFileId.split("/").pop() || "export.txt";
        a.click();
        window.URL.revokeObjectURL(url);
        dispatch(writeToTerminal(`[System] ✅ 로컬로 내보내기 되었습니다.\n`));
        break;
      case "닫기":
        if (activeFileId) dispatch(closeFile(activeFileId));
        break;
      case "실행 취소":
        dispatch(triggerEditorCmd("undo"));
        break;
      case "다시 실행":
        dispatch(triggerEditorCmd("redo"));
        break;
      case "잘라내기":
        dispatch(triggerEditorCmd("cut"));
        break;
      case "복사":
        dispatch(triggerEditorCmd("copy"));
        break;
      case "붙여넣기":
        dispatch(triggerEditorCmd("paste"));
        break;
      case "찾기":
        dispatch(setActiveActivity("editor"));
        dispatch(triggerEditorCmd("find"));
        break;
      case "바꾸기":
        dispatch(setActiveActivity("editor"));
        dispatch(triggerEditorCmd("replace"));
        break;
      case "탐색기":
        dispatch(setActiveActivity("editor"));
        break;
      case "검색":
        dispatch(setActiveActivity("editor"));
        dispatch(triggerEditorCmd("find"));
        break;
      case "소스 제어":
        dispatch(setActiveActivity("git"));
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal("[System] 🔄 Git 대시보드 오픈\n"));
        break;
      case "실행 및 디버그":
        dispatch(setActiveActivity("editor"));
        dispatch(setDebugMode(true));
        break;
      case "확장":
        alert("💡 IDE 환경에 언어 컴파일러가 기본 내장되어 있습니다.");
        break;
      case "출력":
      case "디버그 콘솔":
        dispatch(setDebugMode(true));
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("output"));
        break;
      case "터미널":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("terminal"));
        break;
      case "확대":
        dispatch(triggerEditorCmd("zoom_in"));
        break;
      case "축소":
        dispatch(triggerEditorCmd("zoom_out"));
        break;
      case "정의로 이동":
        dispatch(triggerEditorCmd("go_to_definition"));
        break;
      case "참조로 이동":
        dispatch(triggerEditorCmd("go_to_references"));
        break;
      case "줄로 이동...":
        dispatch(triggerEditorCmd("go_to_line"));
        break;
      case "디버깅 시작":
        await startDebugSession();
        break;
      case "디버깅 없이 실행":
        await handleQuickRun();
        break;
      case "디버깅 중지":
        handleQuickStop();
        break;
      case "중단점 설정/해제":
        dispatch(triggerEditorCmd("toggle_breakpoint"));
        break;
      case "한 단계씩 코드 실행":
        if (DebugSocket && typeof DebugSocket.stepOver === "function") DebugSocket.stepOver();
        break;
      case "프로시저 단위 실행":
        if (DebugSocket && typeof DebugSocket.stepInto === "function") DebugSocket.stepInto();
        break;
      case "프로젝트 빌드":
      case "다시 빌드":
        if (!workspaceId || !activeProject) return alert("빌드할 프로젝트를 선택해주세요!");
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("output"));
        dispatch(writeToTerminal(`\r\n[System] 🔨 ${activeProject} 빌드 시작...\r\n`));
        fetch(`${BASE_URL}/api/workspaces/build`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, projectName: activeProject, branchName: activeBranch || "master" }),
        })
          .then(async (res) => {
            if (!res.ok) throw new Error((await res.text()) || "서버 빌드 에러");
            let defaultExtension =
              getLanguageFromPath(activeFileId) === "JAVA" ? ".jar" :
              getLanguageFromPath(activeFileId) === "C" || getLanguageFromPath(activeFileId) === "CPP" ? ".exe" : "";
            let filename = `${activeProject}_build_result${defaultExtension}`;
            return { blob: await res.blob(), filename };
          })
          .then(({ blob, filename }) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            dispatch(writeToTerminal(`[System] ✅ 빌드 및 다운로드 완료.\r\n`));
          })
          .catch((err) => dispatch(writeToTerminal(`[Error] ❌ 빌드 실패: ${err.message}\r\n`)));
        break;
      case "빌드 취소":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal("[System] 🛑 빌드 취소 요청 완료.\n"));
        break;
      case "새 터미널":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("terminal"));
        dispatch(writeToTerminal(`\r\n[System] 새 터미널 세션 오픈\r\n$ `));
        break;
      case "터미널 분할":
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(setActiveBottomTab("terminal"));
        dispatch(writeToTerminal(`\r\n[System] 터미널 분할 예정\r\n`));
        break;
      case "정보":
        alert("💻 Cloud Web IDE v1.0.0\nReact 기반 팀 협업 지원 에디터");
        break;
      case "문서":
        window.open("https://github.com/TeamIDE", "_blank");
        break;
      case "키보드 단축키":
        alert("📌 단축키\nCtrl+S : 저장\nCtrl+Shift+S : 모두 저장\nCtrl+` : 터미널 토글\nF5 : 디버깅");
        break;
      case "전체 화면":
        dispatch(setCodeMapMode("full"));
        dispatch(openCodeMapTab());
        break;
      case "분할 화면":
        dispatch(setCodeMapMode("split"));
        dispatch(openCodeMapTab());
        break;
      case "Commit & Merge":
      case "Repository Settings":
        dispatch(setActiveActivity("git"));
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal(`[Git] 🔄 Git 설정 창 이동\n`));
        break;
      case "Pull from Remote":
        if (!workspaceId || !activeProject) return alert("프로젝트 선택 필수");
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal(`[Git] ⬇️ Pull 시작...\n`));
        try {
          await pullFromRemoteApi(workspaceId, activeProject, activeBranch || "master");
          dispatch(writeToTerminal(`[Git] ✅ Pull 완료.\n`));
          const treeData = await fetchProjectFilesApi(workspaceId, activeProject, activeBranch || "master");
          dispatch(setWorkspaceTree(treeData));
        } catch (e) {
          dispatch(writeToTerminal(`[Git] ❌ Pull 실패: ${e.message}\n`));
        }
        break;
      case "Push to Remote":
        if (!workspaceId || !activeProject) return alert("프로젝트 선택 필수");
        if (!isTerminalVisible) dispatch(toggleTerminal());
        dispatch(writeToTerminal(`[Git] ⬆️ Push 시작...\n`));
        try {
          await pushToRemoteApi(workspaceId, activeProject, activeBranch || "master");
          dispatch(writeToTerminal(`[Git] ✅ Push 성공!\n`));
        } catch (e) {
          dispatch(writeToTerminal(`[Git] ❌ Push 실패: ${e.message}\n`));
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 💡 오른쪽 패널 토글 단축키 추가
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        dispatch(toggleRightPanel());
      }

      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (e.shiftKey) handleMenuItemClick(null, "모두 저장");
        else handleMenuItemClick(null, "저장");
      } else if (e.ctrlKey && e.shiftKey && (e.key === "`" || e.key === "~")) {
        e.preventDefault();
        handleMenuItemClick(null, "새 터미널");
      } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        dispatch(toggleSidebar());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFileId, workspaceId, activeProject, activeBranch, fileContents, isTerminalVisible, codeMapMode]);

  const subMenus = [
    {
      name: "파일",
      items: [
        { label: "새 파일", shortcut: "Ctrl+N" },
        { label: "파일 열기...", shortcut: "Ctrl+O" },
        { label: "폴더 열기...", shortcut: "Ctrl+Shift+O" },
        { label: "저장", shortcut: "Ctrl+S" },
        { label: "다른 이름으로...", shortcut: "Ctrl+Shift+S" },
        { label: "모두 저장", shortcut: "Ctrl+Shift+S" },
        { label: "내보내기" },
        { label: "닫기", shortcut: "Ctrl+W" },
      ],
    },
    {
      name: "편집",
      items: [
        { label: "실행 취소", shortcut: "Ctrl+Z" },
        { label: "다시 실행", shortcut: "Ctrl+Y" },
        { label: "잘라내기", shortcut: "Ctrl+X" },
        { label: "복사", shortcut: "Ctrl+C" },
        { label: "붙여넣기", shortcut: "Ctrl+V" },
        { label: "찾기", shortcut: "Ctrl+F" },
        { label: "바꾸기", shortcut: "Ctrl+H" },
      ],
    },
    {
      name: "보기",
      items: [
        { label: "탐색기", shortcut: "Ctrl+Shift+E" },
        { label: "검색", shortcut: "Ctrl+Shift+F" },
        { label: "소스 제어", shortcut: "Ctrl+Shift+G" },
        { label: "실행 및 디버그", shortcut: "Ctrl+Shift+D" },
        { label: "확장", shortcut: "Ctrl+Shift+X" },
        { label: "출력", shortcut: "Ctrl+Shift+U" },
        { label: "디버그 콘솔", shortcut: "Ctrl+Shift+Y" },
        { label: "터미널", shortcut: "Ctrl+`" },
        { label: "확대", shortcut: "Ctrl+=" },
        { label: "축소", shortcut: "Ctrl+-" },
      ],
    },
    {
      name: "이동",
      items: [
        { label: "정의로 이동", shortcut: "F12" },
        { label: "참조로 이동", shortcut: "Shift+F12" },
        { label: "줄로 이동...", shortcut: "Ctrl+G" },
      ],
    },
    {
      name: "디버그",
      items: [
        { label: "디버깅 시작", shortcut: "F5" },
        { label: "디버깅 없이 실행", shortcut: "Ctrl+F5" },
        { label: "디버깅 중지", shortcut: "Shift+F5" },
        { label: "중단점 설정/해제", shortcut: "F9" },
        { label: "한 단계씩 코드 실행", shortcut: "F10" },
        { label: "프로시저 단위 실행", shortcut: "F11" },
      ],
    },
    {
      name: "빌드",
      items: [
        { label: "프로젝트 빌드", shortcut: "Ctrl+Shift+B" },
        { label: "다시 빌드" },
        { label: "빌드 취소" },
      ],
    },
    {
      name: "터미널",
      items: [
        { label: "새 터미널", shortcut: "Ctrl+Shift+`" },
        { label: "터미널 분할", shortcut: "Ctrl+Shift+5" },
      ],
    },
    {
      name: "도움말",
      items: [
        { label: "정보" },
        { label: "문서" },
        { label: "키보드 단축키", shortcut: "Ctrl+K Ctrl+S" },
      ],
    },
    { name: "코드맵", items: [{ label: "전체 화면" }, { label: "분할 화면" }] },
    {
      name: "Git",
      items: [
        { label: "Commit & Merge", shortcut: "Ctrl+Shift+G" },
        { label: "Pull from Remote", shortcut: "Ctrl+Shift+P" },
        { label: "Push to Remote", shortcut: "Ctrl+Shift+U" },
        { label: "Repository Settings" },
      ],
    },
  ];

  const visibleBranches = branches.filter((branch) => {
    if (branch.startsWith("focus-") || branch.startsWith("focus/"))
      return (
        branch.startsWith(`focus-${currentNickname}-`) ||
        branch.startsWith(`focus/${currentNickname}/`)
      );
    return true;
  });

  return (
    <>
      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileUpload} />
      <input
        type="file"
        ref={folderInputRef}
        webkitdirectory="true"
        directory="true"
        style={{ display: "none" }}
        onChange={handleFolderUpload}
      />

      {/* 💡 최신 IDE 트렌드를 반영한 세련되고 깔끔한 메뉴바 헤더 UI */}
      {!isRelocationPage && (
        <div className="flex items-center justify-between px-4 h-[48px] border-b border-gray-200 bg-white relative z-[2000] shadow-sm select-none">
          
          {/* 1. 왼쪽: 드롭다운 메뉴 영역 */}
          <div className="flex items-center gap-0.5" ref={menuRef}>
            {subMenus.map((menu) => (
              <div key={menu.name} className="relative">
                <div
                  className={`cursor-pointer px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
                    activeMenu === menu.name
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setActiveMenu(activeMenu === menu.name ? null : menu.name)}
                >
                  {menu.name}
                </div>
                {activeMenu === menu.name && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-lg py-1.5 z-[99999] animate-fade-in-up">
                    {menu.items.map((item, idx) => (
                      <div
                        key={item.label}
                        onClick={() => handleMenuItemClick(menu.name, item.label)}
                        className="px-4 py-1.5 hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-[13px] font-medium text-gray-700 transition-colors flex justify-between items-center"
                      >
                        <span>{item.label}</span>
                        {item.shortcut && <span className="text-[10px] font-bold text-gray-400">{item.shortcut}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 2. 중앙 및 오른쪽: 액션 버튼 그룹 */}
          <div className="flex items-center gap-3">
            
            {/* Run / Stop 컨트롤 */}
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-0.5">
              <button
                onClick={handleQuickRun}
                disabled={isRunning || isDebugMode}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-bold transition-all h-7 ${
                  isRunning || isDebugMode
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-emerald-600 hover:bg-white hover:shadow-sm active:scale-95"
                }`}
                title="빠른 실행"
              >
                <VscPlay size={14} /> Run
              </button>
              <div className="w-px h-3 bg-gray-300 mx-0.5"></div>
              <button
                onClick={handleQuickStop}
                disabled={!isRunning && !isDebugMode}
                className={`flex items-center justify-center px-2.5 py-1 rounded-md transition-all h-7 ${
                  !isRunning && !isDebugMode
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-rose-500 hover:bg-white hover:shadow-sm active:scale-95"
                }`}
                title="강제 중지"
              >
                <VscDebugStop size={14} />
              </button>
            </div>

            <div className="w-px h-4 bg-gray-200"></div>

            {/* 새 프로젝트 버튼 */}
            <button
              onClick={() => dispatch(openProjectModal())}
              className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-gray-800 text-white hover:bg-black active:scale-95 rounded-lg text-[12px] font-bold shadow-sm transition-all"
            >
              <VscAdd size={14} /> 새 프로젝트
            </button>

            <div className="w-px h-4 bg-gray-200"></div>

            {/* Git Branch & 샌드박스 그룹 */}
            <div className="flex items-center gap-2">
              {mode === "team" && activeProject && currentBranch === "master" && (
                <button
                  onClick={() => setIsSandboxCreateModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 active:scale-95 rounded-lg text-[12px] font-bold transition-all"
                >
                  <VscLock size={14} /> 샌드박스 (개인작업)
                </button>
              )}
              {mode === "team" && activeProject && isSandboxMode && (
                <button
                  onClick={() => setIsSandboxApplyModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 active:scale-95 rounded-lg text-[12px] font-bold transition-all"
                >
                  <VscRocket size={14} /> 메인 병합
                </button>
              )}

              {/* 💡 Git 브랜치 드롭다운 (디자인 전면 개선 및 Z-index 최상위 배정) */}
              <div className="relative" ref={branchRef}>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 h-8 border rounded-lg cursor-pointer transition-all text-[12px] font-bold ${
                    isSandboxMode
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                  onClick={() => {
                    if (!activeProject) return alert("프로젝트를 먼저 설정해주세요!");
                    setIsBranchOpen(!isBranchOpen);
                  }}
                >
                  <VscSourceControl size={14} className={isSandboxMode ? "text-indigo-500" : "text-blue-500"} />
                  <span className="max-w-[100px] truncate">{currentBranch}</span>
                  <VscChevronDown size={14} className={isBranchOpen ? "rotate-180 transition-transform" : "transition-transform text-gray-400"} />
                </button>
                
                {/* 💡 드롭다운 메뉴 팝업 (깔끔한 UI/UX 반영) */}
                {isBranchOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 shadow-xl rounded-xl py-2 z-[99999] animate-fade-in-up origin-top-right">
                    <div className="px-4 pb-3 pt-1 border-b border-gray-100 mb-2 bg-gray-50/30">
                      <p className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                        <VscSourceControl /> Git Repository
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-1 font-medium">{activeProject}</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar px-2 space-y-1">
                      {branches.map((branch) => {
                        const isActive = branch === currentBranch;
                        return (
                          <div
                            key={branch}
                            onClick={() => handleSelectBranch(branch)}
                            className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs rounded-lg font-medium transition-all ${
                              isActive ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <VscSourceControl className={isActive ? "text-blue-500" : "text-gray-400"} />
                              <span>{branch}</span>
                            </div>
                            {branch !== "master" && (
                              <button onClick={(e) => handleDeleteBranch(e, branch)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="브랜치 삭제">
                                <VscTrash size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {mode === "team" && <div className="w-px h-4 bg-gray-200 mx-1"></div>}

            {/* Team 및 VoiceChat 그룹 */}
            {mode === "team" && (
              <div className="flex items-center gap-2">
                {/* 팀원 아바타 */}
                <div className="flex -space-x-1.5 mr-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsTeamModalOpen(true)}>
                  {teamMembers.slice(0, 3).map((member, idx) => (
                    <div key={member.userId} className={`w-7 h-7 rounded-full ${avatarColors[idx % avatarColors.length]} ring-2 ring-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm relative`}>
                      {member.nickname?.[0]}
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 ring-2 ring-white rounded-full"></div>
                    </div>
                  ))}
                  {teamMembers.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 ring-2 ring-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                      +{teamMembers.length - 3}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsTeamModalOpen(true)}
                  className="px-3 py-1.5 h-8 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 rounded-lg text-[12px] font-bold transition-all active:scale-95"
                >
                  TEAM
                </button>

                <button
                  onClick={() => setIsVoiceChatModalOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg text-[12px] font-bold transition-all active:scale-95 ${
                    isVoiceConnected 
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" 
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isVoiceConnected ? "animate-ping bg-emerald-400" : "bg-gray-400"}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isVoiceConnected ? "bg-emerald-500" : "bg-gray-500"}`}></span>
                  </div>
                  VoiceChat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {fullScreenLoading.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex flex-col items-center justify-center animate-fade-in">
          <div className="bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl flex flex-col items-center justify-center animate-pulse">
            <VscBeaker className="text-indigo-400 mb-4 animate-bounce" size={48} />
            <h2 className="text-xl font-extrabold text-white tracking-tight">{fullScreenLoading.text}</h2>
            <div className="w-48 h-1 bg-indigo-900/50 rounded-full mt-5 overflow-hidden">
              <div className="w-1/2 h-full bg-indigo-400 rounded-full animate-[ping_1.5s_ease-in-out_infinite]"></div>
            </div>
          </div>
        </div>
      )}

      {isSandboxCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in" onClick={() => setIsSandboxCreateModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[440px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-indigo-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-indigo-100 p-1.5 rounded-lg"><VscLock className="text-indigo-600" size={20} /></div>
                  <h2 className="text-xl font-black text-indigo-900 tracking-tight">나만의 집중 공간 만들기</h2>
                </div>
                <p className="text-[13px] text-indigo-700/80 font-medium">다른 팀원에게 영향을 주지 않고 코드를 테스트해보세요.</p>
              </div>
              <button onClick={() => setIsSandboxCreateModalOpen(false)} className="text-gray-400 hover:text-gray-800 bg-white/50 hover:bg-white p-1.5 rounded-full transition-colors">
                <VscClose size={20} />
              </button>
            </div>
            <div className="p-6 bg-white space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800">어떤 작업을 진행하시나요?</label>
                <input
                  type="text"
                  value={sandboxTaskName}
                  onChange={(e) => setSandboxTaskName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && executeCreateSandbox()}
                  placeholder="예) 로그인 에러 수정, 헤더 UI 변경"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[14px] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all font-medium"
                  autoFocus
                />
              </div>
              <button onClick={executeCreateSandbox} disabled={!sandboxTaskName.trim()} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-[14px] font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2">
                공간 생성 및 이동하기
              </button>
            </div>
          </div>
        </div>
      )}

      {isSandboxApplyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in" onClick={() => setIsSandboxApplyModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] w-[460px] overflow-hidden flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 pb-6 text-center flex flex-col items-center border-b border-gray-100">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5 border-4 border-white shadow-md relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-50"></span>
                <VscRocket className="text-emerald-600" size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">메인 코드로 병합 (Merge)</h2>
              <p className="text-[13px] text-gray-500 font-medium leading-relaxed">작업하신 내용을 안전하게 저장하고 <strong className="text-emerald-600 font-black">master</strong> 브랜치에 합칩니다.</p>
            </div>
            <div className="p-6 bg-gray-50 space-y-3">
              <label className="text-[12px] font-bold text-gray-700 flex items-center gap-1.5"><VscSourceControl /> 병합 커밋 메시지 작성</label>
              <input
                type="text"
                value={mergeCommitMessage}
                onChange={(e) => setMergeCommitMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && executeApplySandbox()}
                placeholder="예) 로그인 화면 레이아웃 수정 완료"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-[13px] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-medium bg-white"
                autoFocus
              />
            </div>
            <div className="flex border-t border-gray-100 p-4 gap-3 bg-white">
              <button onClick={() => setIsSandboxApplyModalOpen(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 rounded-xl text-[13px] font-bold transition-all shadow-sm">
                취소
              </button>
              <button onClick={executeApplySandbox} disabled={!mergeCommitMessage.trim()} className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-xl text-[13px] font-bold shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100">
                <VscCheck size={16} strokeWidth={1} /> 커밋 및 병합하기
              </button>
            </div>
          </div>
        </div>
      )}

      {isTeamModalOpen && mode === "team" && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] flex items-center justify-center animate-fade-in" onClick={() => setIsTeamModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <h2 className="text-lg font-black text-gray-900">팀원 관리 <span className="text-blue-500 ml-1">{teamMembers.length}</span></h2>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors">
                <VscClose size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-[350px] overflow-y-auto bg-gray-50/50 custom-scrollbar">
              {teamMembers.map((member, idx) => {
                const isMe = user?.id === member.userId;
                return (
                  <div key={member.userId} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md hover:ring-2 hover:ring-blue-50 transition-all group cursor-default">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full ${avatarColors[idx % avatarColors.length]} text-white flex items-center justify-center font-bold text-[14px] shadow-sm`}>
                          {member.nickname?.[0]}
                        </div>
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[13px] text-gray-900">{member.nickname}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${member.role === "OWNER" ? "bg-blue-100 text-blue-700" : member.role === "ADMIN" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                            {member.role === "OWNER" ? "Owner" : member.role === "ADMIN" ? "Admin" : "Member"} {isMe && "(나)"}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 mt-0.5">{member.email}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white">
              <button onClick={() => { setIsInviteModalOpen(true); setIsTeamModalOpen(false); }} className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-200 transition-all">
                <VscAdd size={16} strokeWidth={1} /> 새로운 팀원 초대하기
              </button>
            </div>
          </div>
        </div>
      )}

      {isInviteModalOpen && mode === "team" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in" onClick={() => setIsInviteModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden flex flex-col animate-slide-up ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
              <div>
                <h2 className="text-lg font-black text-gray-900">팀원 초대</h2>
                <p className="text-xs text-gray-500 mt-1">이메일 발송 또는 프로젝트 코드로 초대하세요</p>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors">
                <VscClose size={20} />
              </button>
            </div>
            <div className="p-6 space-y-7 bg-gray-50/50">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-extrabold text-gray-800 flex items-center gap-1.5"><VscMail className="text-blue-500" /> 이메일로 초대장 발송</label>
                  <div className="flex gap-2">
                    <input type="text" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSendInvite(); }} placeholder="teammate@example.com" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 bg-white transition-all shadow-sm" />
                    <button onClick={handleSendInvite} disabled={isInviting || !inviteEmail.trim()} className="px-5 bg-[#2d333b] hover:bg-black text-white rounded-xl text-[13px] font-bold transition-all shadow-sm disabled:opacity-50 flex items-center justify-center shrink-0">
                      {isInviting ? <VscRefresh className="animate-spin" size={16} /> : "발송"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-[11px] font-bold text-gray-400">또는</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-extrabold text-gray-800 flex items-center gap-1.5"><VscKey className="text-green-500" /> 프로젝트 코드 공유</label>
                <p className="text-[11px] text-gray-500">새로운 팀원이 대시보드에서 이 코드를 입력하여 참여할 수 있습니다.</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 text-[13px] text-gray-700 truncate font-mono shadow-sm select-all font-bold tracking-wider text-center">{workspaceId || "PROJ-XXXX-YYYY"}</div>
                  <button onClick={handleCopyCode} className={`px-5 py-3 rounded-xl flex items-center gap-1.5 text-[12px] font-bold shrink-0 transition-all shadow-sm ${isCopied ? "bg-green-500 text-white border-transparent" : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-95"}`}>
                    {isCopied ? <><VscCheck size={14} /> 복사됨</> : <><VscCopy size={14} /> 복사</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💡 유령 상자(클릭 먹통) 버그 해결 & Z-index를 MenuBar보다 높임 */}
      {isMounted && (
        <div
          className={`fixed inset-0 pointer-events-none z-[999999] transition-all duration-300 ${
            isVoiceChatModalOpen && mode === "team" ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
          }`}
        >
          <Rnd
            position={{ x: rndState.x, y: rndState.y }}
            size={
              isVoiceChatMinimized
                ? { width: "auto", height: "auto" }
                : { width: rndState.width, height: rndState.height }
            }
            onDragStop={(e, d) => setRndState((prev) => ({ ...prev, x: d.x, y: d.y }))}
            onResizeStop={(e, direction, ref, delta, position) => {
              if (!isVoiceChatMinimized) {
                setRndState({
                  width: parseInt(ref.style.width, 10),
                  height: parseInt(ref.style.height, 10),
                  ...position,
                });
              }
            }}
            enableResizing={!isVoiceChatMinimized}
            minWidth={isVoiceChatMinimized ? 150 : 400}
            minHeight={isVoiceChatMinimized ? 40 : 400}
            bounds="window"
            dragHandleClassName="voice-chat-drag-handle"
            className={`pointer-events-auto transition-transform duration-300 ${
              isVoiceChatModalOpen ? "scale-100" : "scale-95"
            } ${
              isVoiceChatMinimized
                ? "rounded-full shadow-none border-none bg-transparent"
                : "rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)] border border-gray-300 backdrop-blur-md bg-white"
            }`}
          >
            <VoiceChatRoom
              myUserId={user?.id}
              teamMembers={teamMembers}
              onClose={() => setIsVoiceChatModalOpen(false)}
              isMinimized={isVoiceChatMinimized}
              onToggleMinimize={handleToggleMinimize}
            />
          </Rnd>
        </div>
      )}
    </>
  );
}