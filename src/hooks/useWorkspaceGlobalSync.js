// src/hooks/useWorkspaceGlobalSync.js
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { fetchProjectFilesApi } from "@/lib/ide/api";
import { mergeProjectFiles } from "@/store/slices/fileSystemSlice";

const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

export const useWorkspaceGlobalSync = (workspaceId, activeProject) => {
    const dispatch = useDispatch();

    useEffect(() => {
        if (!workspaceId || !activeProject) return;

        // 1. 특정 파일에 종속되지 않은, 프로젝트 전체 공유용 Global Room 생성
        const globalDoc = new Y.Doc();
        const globalRoomName = `global-${workspaceId}-${activeProject}`;
        
        const provider = new WebsocketProvider(
            `${WS_BASE}/ws/collab`,
            globalRoomName,
            globalDoc
        );

        // 2. 전역 이벤트 감지용 공유 Map 생성
        const eventsMap = globalDoc.getMap("workspaceEvents");

        // 3. A 사용자가 파일 생성 이벤트를 날리면 B 사용자가 여기서 감지!
        eventsMap.observe((event) => {
            const lastUpdate = eventsMap.get("lastTreeUpdate");
            if (lastUpdate) {
                console.log("🔄 글로벌 파일 트리 업데이트 감지, 새로고침을 시작합니다.");
                // 백엔드로부터 최신 트리 구조를 다시 불러와 B의 화면을 동기화
                fetchProjectFilesApi(workspaceId, activeProject, "master")
                    .then(files => dispatch(mergeProjectFiles({ projectName: activeProject, files })))
                    .catch(console.error);
            }
        });

        return () => {
            provider.disconnect();
            globalDoc.destroy();
        };
    }, [workspaceId, activeProject, dispatch]);
};