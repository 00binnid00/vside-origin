"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '@/lib/ide/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { setVoiceConnected, setIsPIPMode } from '@/store/slices/uiSlice';
import VoiceChatPIP from './VoiceChatPIP';
import VoiceChatRoom from './VoiceChatRoom';

// 눈에 보이지 않는 오디오 재생기
const PeerAudio = ({ stream, isDeafened, volume }) => {
    const audioRef = useRef(null);
    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
            audioRef.current.volume = isDeafened ? 0 : volume; 
            audioRef.current.muted = isDeafened;
            audioRef.current.play().catch(e => console.error("재생 실패:", e));
        }
    }, [stream, isDeafened, volume]);
    return <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />;
};

export default function VoiceChatManager({ teamMembers, isModalOpen, onCloseModal }) {
    const dispatch = useDispatch();
    const { user } = useAuth();
    const { workspaceId } = useSelector(state => state.fileSystem);
    const { isVoiceConnected, isPIPMode } = useSelector(state => state.ui);

    const [peerVolumes, setPeerVolumes] = useState({});

    // 글로벌 WebRTC 엔진 가동
    const { 
        peers, leaveRoom, isMuted, isDeafened, 
        toggleMute, toggleDeafen, speakingUsers, micVolume, changeMicVolume 
    } = useWebRTC(
        isVoiceConnected ? workspaceId : null, 
        isVoiceConnected ? "general" : null, // 기본 채널
        isVoiceConnected ? user?.id : null
    );

    // 단축키 설정
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isVoiceConnected) return;
            if (e.ctrlKey && e.altKey) {
                switch(e.key.toLowerCase()) {
                    case 'm': e.preventDefault(); toggleMute(); break;
                    case 'd': e.preventDefault(); toggleDeafen(); break;
                    case 'e': e.preventDefault(); handleDisconnect(); break;
                    default: break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVoiceConnected, toggleMute, toggleDeafen]);

    const handleDisconnect = () => {
        leaveRoom();
        dispatch(setVoiceConnected(false));
        dispatch(setIsPIPMode(false));
        onCloseModal();
    };

    if (!isVoiceConnected) return null;

    const myNickname = user?.nickname || "나";
    const amISpeaking = speakingUsers.has(String(user?.id));

    return (
        <>
            {/* 오디오 엔진 */}
            {Object.entries(peers).map(([peerId, stream]) => (
                <PeerAudio key={peerId} stream={stream} isDeafened={isDeafened} volume={peerVolumes[peerId] ?? 1.0} />
            ))}

            {/* 화면 상태에 따라 컴포넌트 렌더링 스위칭 */}
            {isPIPMode ? (
                <VoiceChatPIP 
                    myNickname={myNickname} peers={peers} teamMembers={teamMembers || []}
                    isMuted={isMuted} isDeafened={isDeafened} amISpeaking={amISpeaking} speakingUsers={speakingUsers} peerVolumes={peerVolumes}
                    onMuteToggle={toggleMute} onDeafenToggle={toggleDeafen} onDisconnect={handleDisconnect}
                />
            ) : isModalOpen ? (
                <VoiceChatRoom 
                    myNickname={myNickname} peers={peers} teamMembers={teamMembers || []}
                    isMuted={isMuted} isDeafened={isDeafened} amISpeaking={amISpeaking} speakingUsers={speakingUsers} 
                    peerVolumes={peerVolumes} micVolume={micVolume}
                    onMuteToggle={toggleMute} onDeafenToggle={toggleDeafen} onDisconnect={handleDisconnect}
                    onMicVolumeChange={changeMicVolume} onPeerVolumeChange={(id, vol) => setPeerVolumes(p => ({...p, [id]: vol}))}
                    onCloseModal={onCloseModal}
                />
            ) : null}
        </>
    );
}