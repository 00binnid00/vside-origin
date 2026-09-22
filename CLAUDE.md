# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

`vside` — 브라우저 웹 IDE 프론트엔드. Next.js 16 App Router + React 19 + TypeScript.
백엔드(Spring 추정)는 별도 저장소이며, 이 저장소는 REST(`/api/...`)와 WebSocket(`/ws/...`)으로만 붙는다.

## 명령어

```bash
npm run dev      # next dev -H 0.0.0.0 -p 3000
npm run build
npm run start
npm run lint     # eslint (flat config, eslint-config-next)
npx eslint src/components/ide/CodeEditor.jsx   # 파일 하나만 검사
```

테스트 프레임워크는 설정되어 있지 않다. 검증은 `npm run lint` + `npm run build` + 실제 브라우저 확인으로 한다.

### 환경 변수 (`.env.local`, 모두 `NEXT_PUBLIC_`)

| 변수 | 기본값 | 쓰이는 곳 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | `src/lib/api/apiClient.js` |
| `NEXT_PUBLIC_WS_BASE_URL` | `ws://localhost:8080` | 동시편집·터미널·실행·디버그·채팅·프레즌스 |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | — | GitHub OAuth |
| `NEXT_PUBLIC_PREVIEW_HOST` / `_PROTOCOL` | — | `WebPreview` |
| `NEXT_PUBLIC_STUN_URLS` / `TURN_URLS` / `TURN_USERNAME` / `TURN_CREDENTIAL` | — | `useWebRTC`(음성채팅) |

## 에디터(IDE) 아키텍처 — 여기가 핵심

### 진입 경로

- `app/(ide)/ide/personal/[id]/page.tsx` → `IdeMain.jsx` (개인 모드)
- `app/(ide)/ide/team/[id]/page.tsx` → `TeamIdeMain.jsx` (팀 모드, 채팅·음성 패널 추가)
- 둘 다 `dynamic(..., { ssr: false })`. Monaco/xterm/Yjs가 전부 브라우저 전용이므로 SSR을 켜면 안 된다.
- `[id]`는 **workspaceId**다. URL 경로에 `/team`이 있는지로 팀 모드를 판별한다(`CodeEditor.jsx:525`).

두 셸 모두 같은 부품을 조립한다: `MenuBar` / `ActivityBar` / `Sidebar`(파일트리) / `FileTabs` / `CodeEditor` / `BottomPanel`(터미널·출력) / `AgentPanel`(AI) 또는 `DebugPanel` / `CodeMap` / `GitDashboard` / `DevlogPanel`. 패널 리사이즈는 라이브러리 없이 pointer 이벤트로 직접 구현되어 있다.

### 상태: Redux 3개 슬라이스 (`src/store/`)

- `fileSystem` — `workspaceId`, `activeProject`, `activeBranch`, `tree`, `openFiles`, `activeFileId`, `fileContents`, AI diff 제안
- `ui` — 패널 토글, 실행/디버그 상태, 브레이크포인트, 터미널 출력, `activeActivity`(`editor`/`docs`/`api-test`/`git`/`mypage`)
- `problems` — Monaco 마커

`serializableCheck: false`로 꺼져 있다. 인증 상태는 Redux가 아니라 `src/contexts/AuthContext.tsx`에 있다.

**문서 좌표는 항상 `(workspaceId, projectName, branchName, filePath)` 4개 조합이다.** 브랜치 기본값은 `"master"`이며, API 함수마다 `branchName || "master"`로 방어한다. 새 API를 추가할 때 이 형태를 깨지 말 것.

### 동시편집(Yjs) — 순서를 반드시 지켜야 하는 부분

`src/lib/ide/collab/codeDocSession.ts`가 파일 하나당 세션 하나를 담당한다. 지켜야 하는 순서:

1. `fetchRoomDocApi`로 서버 저장본 조회
2. 없으면 디스크 내용으로 `seedRoomDocApi` → **서버가 채택한 바이너리만** 적용 (409는 정상 경쟁 결과)
3. 그 다음에야 WebSocket 접속

3번을 앞당기면 빈 문서로 연결이 열려 "파일 열면 내용이 비어 있음" 버그가 난다. 설계 문서 쪽 `src/components/design/realtime/designDocProvider.ts`도 같은 이유로 같은 순서를 지킨다.

기억해야 할 규칙들:

- **방 이름은 `` `${workspaceId}:${project}:${branch}:${filePath}` ``** (`normalizeCollabKeyPart`로 정규화).
- **`CollabWebSocket` 폴리필을 반드시 넘긴다** (`src/lib/ide/collabSocket.js`). y-websocket 기본값은 방 이름을 경로에 붙이는데 백엔드는 `?room=` 쿼리로만 구분한다. 폴리필 없이 붙으면 모두가 `default-room` 한 곳에 모인다. JWT도 여기서 붙이며, **생성자 안에서 매번 토큰을 읽는다** — 액세스 토큰 수명이 15분이라 한 번 박아 두면 재접속이 영원히 실패한다.
- **저장 담당자는 awareness `clientID`가 가장 작은 한 명.** 협업 서버는 문서를 보관하지 않으므로 담당자가 서버 스냅샷(`saveRoomDocApi`)과 디스크(`saveFileApi`) 양쪽에 쓴다. 3초 유휴 / 최대 30초 주기.
- **빈 내용은 절대 시드하거나 내보내지 않는다**(`canPublish`, `seed`의 early return). 한 번 빈 문서가 방의 정본이 되면 이후 접속자 전원이 빈 파일을 본다.
- **팀 모드에서 `<Editor value={...}>`에 값을 넘기면 안 된다** (`CodeEditor.jsx:2662`의 `value={isTeamMode ? undefined : ...}`). `@monaco-editor/react`가 문서 전체를 `executeEdits`로 갈아치우고, 그게 `MonacoBinding`을 타고 Yjs까지 퍼져 커서가 튀고 되돌리기가 깨진다. 팀 모드의 정본은 `Y.Doc`이다.

팀원 커서 잠금은 awareness의 `lockData` 필드로 주고받고, 겹치면 에디터를 `readOnly`로 만든다(키 가로채기 방식은 한글 조합 입력·붙여넣기를 통과시켜 폐기됨). 이름표는 데코레이션이 아니라 content widget으로 그린다(편집마다 깜빡이지 않게).

### 저장 경로 두 갈래

- 팀 모드: `CodeDocSession`이 담당자 한 명을 뽑아 저장.
- 개인 모드: `CodeEditor.jsx`의 `scheduleDiskSave`/`flushDiskSave`가 3초 유휴 자동 저장.
- 실행/디버그 직전 저장은 Redux 스냅샷이 아니라 `src/lib/ide/activeEditorContent.ts`의 `readActiveEditorContent(filePath)`로 **지금 화면의 값**을 읽는다. Redux는 디바운스되어 마지막 몇 글자가 빠진다.

### WebSocket 채널

모두 `NEXT_PUBLIC_WS_BASE_URL` 기준.

| 경로 | 프로토콜 | 모듈 |
| --- | --- | --- |
| `/ws/collab?room=` | Yjs (y-websocket + 폴리필) | `collabSocket.js`, `collab/codeDocSession.ts` |
| `/ws/terminal` | raw WS | `Terminal.jsx` (xterm) |
| `/ws/run` | raw WS, JSON 메시지 | `runSocket.js` (`INPUT`/`STOP`) |
| `/ws/debug` | raw WS, JSON 메시지 | `debugSocket.js` (`START`/`STEP_OVER`/`STEP_INTO`/`CONTINUE`/`STOP`/`INPUT`) |
| `/ws/chat` | STOMP | `chatSocket.js` (`/topic/workspace/{id}`) |
| 프레즌스 | STOMP | `hooks/useWorkspacePresence.js` (`/app/presence/{id}`) |

`run`/`debug` 소켓은 모듈 단위 싱글톤(`let socket = null`)이다. 새로 연결하면 이전 것을 닫는다.

**워크스페이스 전역 동기화**: `hooks/useWorkspaceGlobalSync.js`의 `globalSyncInstance.trigger()`가 `global-workspace-room-{id}` Yjs 맵에 토큰을 써서, 다른 탭들이 300ms 뒤 `window` 커스텀 이벤트 `workspace-sync-triggered`를 받아 파일 트리를 다시 읽는다. 코드 생성·CodeMap 변경처럼 남의 파일 트리를 바꾸는 동작 뒤에는 이걸 호출한다.

## 네트워크 계층

- `src/lib/api/apiClient.js` — `apiFetch`/`apiJson`/`apiText`/`apiBlob`. JWT를 붙이고, 만료 60초 전 선갱신하며, 401이면 refresh 후 1회 재시도한다. **refresh는 `refreshPromise` 하나로 합류시켜 중복 호출을 막는다.** refresh 500·네트워크 오류는 로그아웃시키지 않고(401/403만 `clearAuth()`), 상위에서 처리하게 둔다.
- `src/lib/ide/api.js` (~1600줄) — IDE가 쓰는 거의 모든 엔드포인트가 여기 모여 있다. 워크스페이스/파일/Git/샌드박스/CodeMap/AI/스케줄/데브로그/초대. 새 IDE API는 여기에 같은 패턴(`authFetch` + `throwApiResponseError`)으로 추가한다.
- `src/lib/auth/` — `tokenStore.js`(메모리 + localStorage), `authClient.js`, `webSocketToken.js`(소켓용 신선한 토큰).

## Git / 샌드박스

`GitDashboard.jsx`와 `hooks/ide/useGitBranches.js`가 상태·스테이징·커밋·푸시·풀·머지·히스토리를 다룬다. 그 위에 **샌드박스** 개념이 있다: `createSandboxApi`(작업 브랜치 생성) → `applySandboxApi`(대상 브랜치에 병합) → 충돌 시 `resolveSandboxConflictApi`. 충돌 파일은 `CodeEditor`가 `parseMergeConflicts`로 `<<<<<<</=======/>>>>>>>` 마커를 파싱해 인라인 해결 UI를 띄우고, `ui` 슬라이스의 `requestConflictNavigation`으로 해당 파일로 이동시킨다.

## 나머지 영역

- `src/components/design/` — 설계 문서(요구사항/ERD/화면/API) 협업 편집. `realtime/`에 IDE와 **별개의** Yjs 세션이 있지만 같은 `/ws/collab` 채널과 같은 로드 순서 규칙을 따른다.
- `src/components/ui/` — shadcn/ui (new-york, neutral, `components.json`). 여기 파일은 대체로 생성물이니 손대지 말 것.
- Tailwind v4 (PostCSS 플러그인 방식, `tailwind.config` 없음. 토큰은 `app/globals.css`).
- 라우트 그룹: `(ide)`, `(project-wizard)`. 그 외 `admin`, `community`, `devlogs`, `main`, `projects`, `schedules`, `my`, `design`.

## 코드 관례

- `.jsx`/`.tsx`가 섞여 있다. IDE 핵심 컴포넌트는 대부분 `.jsx`, 새로 쓴 협업·인증 모듈은 `.ts`. **기존 파일을 통째로 TS로 바꾸지 말고** 그 파일의 확장자를 따른다. (`tsconfig.json`의 `include`에 `.jsx` 파일이 개별 나열되어 있는 이유가 이것이다.)
- 주석은 한국어이고, 특히 협업·저장·인증 쪽 주석은 **"왜 이 순서인가 / 예전에 어떤 버그가 났는가"**를 기록해 둔 것이다. 그 코드를 고칠 때는 주석의 전제를 먼저 읽고, 전제를 바꿨다면 주석도 같이 고친다.
- 파일 상단에 `// 경로: src/...` 주석을 다는 관례가 일부 있다. 그 파일을 옮기면 같이 고친다.
- `reactStrictMode: false` — 개발 중 effect 이중 실행이 일어나지 않는다. 즉 **StrictMode에서 깨질 정리(cleanup) 누락이 조용히 통과한다.** 소켓/Yjs 세션을 다룰 때는 직접 확인할 것.
