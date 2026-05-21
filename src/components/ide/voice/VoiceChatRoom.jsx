"use client";

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Rnd } from "react-rnd";
import { VscAdd, VscEdit, VscTrash, VscMute, VscMicFilled, VscBell, VscCallOutgoing, VscChromeMinimize, VscClose, VscMegaphone } from "react-icons/vsc";
import { setIsPIPMode } from "@/store/slices/uiSlice"; // 경로 확인 필요

export default function VoiceChatRoom({
  myNickname,
  peers,
  isMuted,
  isDeafened,
  amISpeaking,
  speakingUsers,
  peerVolumes,
  teamMembers,
  micVolume,
  onMuteToggle,
  onDeafenToggle,
  onDisconnect,
  onMicVolumeChange,
  onPeerVolumeChange,
  onCloseModal // 모달 창만 닫기 (통화 유지)
}) {
  const dispatch = useDispatch();
  const avatarColors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-teal-500"];
  
  // 방 목록 (기존 코드 유지)
  const [channels, setChannels] = useState([{ id: "general", name: "일반 회의실", icon: "💬" }]);
  const [activeChannel, setActiveChannel] = useState("general");
  const [editingChannelId, setEditingChannelId] = useState(null);
  const [editChannelName, setEditChannelName] = useState("");

  const handleMinimize = () => {
    dispatch(setIsPIPMode(true)); // 알약 모드(PIP)로 전환!
  };

  const activeChannelName = channels.find(c => c.id === activeChannel)?.name || "음성 채널";

  return (
    <Rnd
      default={{ x: 100, y: 100, width: 800, height: 500 }}
      bounds="window"
      dragHandleClassName="voice-chat-drag-handle"
      className="z-50 rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.5)] border border-gray-300 bg-white"
    >
      {/* 💡 여기에 기존 MenuBar.jsx에 있던 VoiceChatRoom 컴포넌트의 return(...) 내부 코드를 그대로 넣습니다 */}
      <div className="flex flex-row h-full bg-[#f8f9fa] text-[#333] relative">
        
        {/* 좌측 채널 목록 바 */}
        <div className="w-[200px] bg-white flex flex-col border-r border-gray-200 z-10">
          <div className="voice-chat-drag-handle h-12 flex items-center justify-between px-3 border-b cursor-grab bg-[#fcfcfc]">
            <span className="text-xs font-black text-gray-700">보이스룸</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
             {/* 채널 목록 렌더링 (기존 코드와 동일) */}
             <div className="flex items-center px-2 py-1.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100">
               <span className="mr-2">💬</span> 일반 회의실
             </div>
          </div>

          <div className="p-3 flex flex-col gap-3 border-t">
            {/* 내 프로필 및 컨트롤 바 */}
            <div className="flex items-center justify-between bg-white border rounded-lg p-1">
              <button onClick={onMuteToggle} className={`p-1.5 rounded-md ${isMuted ? "text-rose-500" : "text-gray-500"}`}><VscMicFilled size={16} /></button>
              <button onClick={onDeafenToggle} className={`p-1.5 rounded-md ${isDeafened ? "text-rose-500" : "text-gray-500"}`}><VscBell size={16} /></button>
              <button onClick={onDisconnect} className="p-1.5 rounded-md text-rose-500"><VscCallOutgoing size={16} /></button>
            </div>
          </div>
        </div>

        {/* 우측 방 참가자 표시 영역 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="voice-chat-drag-handle h-12 flex items-center justify-between px-5 border-b cursor-grab bg-white/50">
            <div className="flex items-center gap-2"><VscMegaphone size={18} className="text-blue-500" /><span className="font-black">{activeChannelName}</span></div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleMinimize} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="최소화(PIP)"><VscChromeMinimize size={14} /></button>
              <button onClick={onCloseModal} className="p-1.5 text-gray-500 hover:bg-rose-50 rounded-md" title="창 닫기 (통화 유지)"><VscClose size={16} /></button>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto flex flex-wrap content-start gap-8">
             {/* 기존 참가자 카드 렌더링 (나) */}
             <div className="w-[140px] flex flex-col items-center bg-white p-4 rounded-2xl border shadow-sm group">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white ${isMuted ? 'bg-gray-400' : 'bg-blue-500'} ${amISpeaking && !isMuted ? 'ring-4 ring-emerald-400' : ''}`}>
                  {myNickname[0]}
                </div>
                <span className="mt-3 font-black">{myNickname} (나)</span>
             </div>

             {/* 다른 참가자 렌더링 */}
             {Object.keys(peers).map((peerId) => (
               <div key={peerId} className="w-[140px] flex flex-col items-center bg-white p-4 rounded-2xl border shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-2xl font-black text-white">U</div>
                  <span className="mt-3 font-black">User</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </Rnd>
  );
}