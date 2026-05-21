"use client";

import React from "react";
import { useDispatch } from "react-redux";
import { Rnd } from "react-rnd";
import { VscMicFilled, VscMute, VscBell, VscChromeMaximize, VscCallOutgoing } from "react-icons/vsc";
import { setIsPIPMode, setVoiceConnected } from "@/store/slices/uiSlice"; // 경로 확인 필요

export default function VoiceChatPIP({
  myNickname,
  peers,
  isMuted,
  isDeafened,
  amISpeaking,
  speakingUsers,
  peerVolumes,
  teamMembers,
  onMuteToggle,
  onDeafenToggle,
  onDisconnect,
}) {
  const dispatch = useDispatch();
  const avatarColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-teal-500"];

  const handleMaximize = () => {
    dispatch(setIsPIPMode(false));
  };

  return (
    <Rnd
      default={{ x: window.innerWidth - 350, y: window.innerHeight - 150, width: "auto", height: "auto" }}
      bounds="window"
      dragHandleClassName="voice-pip-drag-handle"
      enableResizing={false}
      className="z-[9999]"
    >
      <div className="flex items-center gap-3 px-3 py-2 bg-white/95 backdrop-blur-xl rounded-full border border-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.15)] w-max cursor-move voice-pip-drag-handle">
        
        {/* 드래그 핸들 (점 3개) */}
        <div className="flex flex-col gap-[3px] text-gray-400 hover:text-blue-500 transition-colors px-1">
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
        </div>

        {/* 참가자 프로필 아이콘 목록 */}
        <div className="flex items-center -space-x-2.5">
          {/* 내 프로필 */}
          <div className="relative z-10 group">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white border-[2px] border-white shadow-sm transition-all
              ${isMuted ? "bg-gray-400 grayscale" : "bg-gradient-to-br from-blue-500 to-indigo-600"}
              ${amISpeaking && !isMuted ? "ring-[2px] ring-emerald-400" : ""}`}
            >
              {myNickname[0]}
            </div>
            {(isMuted || isDeafened) && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-rose-500 rounded-full p-0.5 border-2 border-white">
                {isDeafened ? <VscBell size={8} className="text-white line-through" /> : <VscMute size={8} className="text-white" />}
              </div>
            )}
          </div>

          {/* 상대방 프로필 */}
          {Object.entries(peers).map(([peerId, _], index) => {
            const member = teamMembers.find((m) => String(m.userId) === String(peerId));
            const nickname = member ? member.nickname : `U`;
            const isSpeaking = speakingUsers.has(String(peerId));
            const vol = peerVolumes[peerId] ?? 1.0;
            const bgClass = avatarColors[index % avatarColors.length];

            return (
              <div key={`pip-${peerId}`} className="relative z-0 group">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black text-white border-[2px] border-white shadow-sm transition-all ${bgClass}
                  ${isSpeaking && !isDeafened ? "ring-[2px] ring-emerald-400" : ""}
                  ${isDeafened || vol === 0 ? "grayscale opacity-80" : ""}`}
                >
                  {nickname[0]}
                </div>
              </div>
            );
          })}
        </div>

        <div className="w-[1px] h-5 bg-gray-200 mx-2 shrink-0"></div>

        {/* 컨트롤러 (마이크, 헤드셋, 최대화, 종료) */}
        <div className="flex items-center gap-1">
          <button onClick={onMuteToggle} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isMuted ? "bg-gray-800 text-white" : "text-gray-500 hover:bg-gray-100"}`} title="마이크 켜기/끄기 (Ctrl+Alt+M)">
            {isMuted ? <VscMute size={14} /> : <VscMicFilled size={14} />}
          </button>
          <button onClick={onDeafenToggle} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isDeafened ? "bg-gray-800 text-white" : "text-gray-500 hover:bg-gray-100"}`} title="소리 켜기/끄기 (Ctrl+Alt+D)">
            {isDeafened ? <VscMute size={14} /> : <VscBell size={14} />}
          </button>
          <button onClick={handleMaximize} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-all ml-1" title="크게 보기">
            <VscChromeMaximize size={14} />
          </button>
          <button onClick={onDisconnect} className="w-8 h-8 rounded-full flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-all ml-1" title="통화 종료 (Ctrl+Alt+E)">
            <VscCallOutgoing size={14} />
          </button>
        </div>
      </div>
    </Rnd>
  );
}