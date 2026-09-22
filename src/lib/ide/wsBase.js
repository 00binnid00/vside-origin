"use client";

// 경로: src/lib/ide/wsBase.js
//
// 웹소켓 서버 주소를 정한다.
//
// 지금까지는 어느 파일에서나 `NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080"`
// 이었다. 그런데 개발 서버는 `next dev -H 0.0.0.0` 으로 열려 있어서 팀원이
// 같은 와이파이의 사설 IP(192.168.x.x:3000)로 들어온다. 그 사람 브라우저에서
// localhost 는 백엔드가 아니라 자기 PC 라서 연결이 무조건 거부된다.
//
// 그래서 환경 변수가 없을 때는 지금 보고 있는 페이지의 호스트를 쓴다.
// 프론트와 백엔드를 같은 기계에서 띄우는 이 프로젝트의 구성과 맞고,
// localhost 로 들어온 사람은 그대로 localhost 가 된다.
//
// 환경 변수가 설정돼 있으면 그 값을 그대로 쓴다. 동작이 바뀌지 않는다.

/** 백엔드 포트. 환경 변수가 없을 때만 쓰인다. */
const DEFAULT_BACKEND_PORT = "8080";

export const getWsBase = () => {
  const configured = process.env.NEXT_PUBLIC_WS_BASE_URL;

  if (configured) return configured.replace(/\/$/, "");

  // 서버 렌더링 중에는 호스트를 알 수 없다. IDE 화면은 전부 ssr:false 라
  // 실제로 여기에 오지 않지만, 안전하게 예전 기본값을 돌려준다.
  if (typeof window === "undefined") {
    return `ws://localhost:${DEFAULT_BACKEND_PORT}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${window.location.hostname}:${DEFAULT_BACKEND_PORT}`;
};
