// import type { DevlogItem, ProjectItem, ScheduleOption } from "./devlog.types";

// export const PROJECTS: ProjectItem[] = [
//   {
//     id: "all",
//     name: "전체 프로젝트",
//     description: "모든 프로젝트 일지",
//     colorClass: "bg-slate-900",
//     mode: "all",
//   },
//   {
//     id: "p-devw",
//     name: "Devw 캡스톤",
//     description: "졸업작품 메인 프로젝트",
//     colorClass: "bg-blue-500",
//     mode: "team",
//   },
//   {
//     id: "p-shop",
//     name: "쇼핑몰 웹",
//     description: "프론트/백엔드 연습 프로젝트",
//     colorClass: "bg-emerald-500",
//     mode: "personal",
//   },
//   {
//     id: "p-ai",
//     name: "AI 면접 분석",
//     description: "AI 기능 실험 프로젝트",
//     colorClass: "bg-violet-500",
//     mode: "personal",
//   },
// ];

// export const initialSchedules: ScheduleOption[] = [
//   {
//     id: "s1",
//     title: "로그인 API 구현",
//     status: "done",
//     projectId: "p-devw",
//     workspaceId: "team",
//   },
//   {
//     id: "s2",
//     title: "프로젝트 생성 UI 수정",
//     status: "progress",
//     projectId: "p-devw",
//     workspaceId: "team",
//   },
//   {
//     id: "s3",
//     title: "GitHub 브랜치 연동",
//     status: "todo",
//     projectId: "p-shop",
//     workspaceId: "personal",
//   },
//   {
//     id: "s4",
//     title: "일정 진행률 계산 로직 정리",
//     status: "delayed",
//     projectId: "p-ai",
//     workspaceId: "personal",
//   },
// ];

// export const initialDevlogs: DevlogItem[] = [
//   {
//     id: "d1",
//     title: "로그인 API 오류 수정",
//     content:
//       "JWT 인증 필터에서 Authorization 헤더가 누락되었을 때 object Object 오류가 발생하는 문제를 확인했다. 예외 메시지를 문자열로 변환하고, 토큰 검증 실패 시 명확한 에러를 반환하도록 수정했다.",
//     date: "2026-05-01",
//     type: "linked",
//     scheduleId: "s1",
//     scheduleTitle: "로그인 API 구현",
//     status: "done",
//     tags: ["Backend", "Spring Security", "JWT"],
//     projectId: "p-devw",
//     workspaceId: "team",
//   },
//   {
//     id: "d2",
//     title: "프로젝트 생성 화면 레이아웃 개선",
//     content:
//       "프로젝트 생성 버튼이 상단에서 따로 떠 보이는 문제가 있어 필터 영역과 함께 배치했다. 개인 프로젝트는 blue, 팀 프로젝트는 green 계열로 구분했다.",
//     date: "2026-04-30",
//     type: "linked",
//     scheduleId: "s2",
//     scheduleTitle: "프로젝트 생성 UI 수정",
//     status: "progress",
//     tags: ["Frontend", "UI", "Tailwind"],
//     projectId: "p-devw",
//     workspaceId: "team",
//   },
//   {
//     id: "d3",
//     title: "Next 개발 환경 오류 정리",
//     content:
//       "개발 중 왼쪽 하단에 나타나는 Next overlay 오류 원인을 확인했다. Promise reject 값이 객체로 전달되는 케이스를 문자열 에러로 바꾸는 방식으로 정리했다.",
//     date: "2026-04-29",
//     type: "general",
//     scheduleId: null,
//     scheduleTitle: null,
//     status: null,
//     tags: ["Next.js", "Debug", "Error"],
//     projectId: "p-shop",
//     workspaceId: "personal",
//   },
// ];
