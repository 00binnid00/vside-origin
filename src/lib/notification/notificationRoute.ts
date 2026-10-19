/** 이전 알림 URL을 WAIVS의 현재 App Router 경로로 변환합니다. */
const WORKSPACE_ROUTES = new Set([
  "/dashboard", "/design", "/schedules", "/devlogs", "/aivs", "/archive",
]);

export function resolveNotificationHref(targetUrl?: string | null, notificationType?: string | null): string | null {
  if (!targetUrl) return null;
  const input = targetUrl.trim();
  // 외부 URL, 프로토콜 상대 URL 및 제어 문자 거부
  if (!input.startsWith("/") || input.startsWith("//") || /[\u0000-\u001F\u007F\\]/.test(input)) return null;
  try {
    const url = new URL(input, "https://waivs.internal");
    if (url.origin !== "https://waivs.internal") return null;
    let pathname = url.pathname.replace(/\/$/, "") || "/";
    const workspaceId =
      url.searchParams.get("workspaceId") ||
      url.searchParams.get("workspaceid") ||
      url.searchParams.get("workspace");

    // 예전 프로젝트 대시보드 /main/:id -> /dashboard/:id
    if (pathname.startsWith("/main/")) {
      pathname = `/dashboard/${pathname.slice("/main/".length)}`;
    } else if (pathname === "/main") {
      // 프로젝트 선택 화면으로 이동
      pathname = "/projects";
    }
    // 이전 쿼리형 경로 -> 동적 세그먼트 경로
    if (WORKSPACE_ROUTES.has(pathname) && workspaceId) {
      pathname = `${pathname}/${encodeURIComponent(workspaceId)}`;
      url.searchParams.delete("workspaceId");
      url.searchParams.delete("workspaceid");
      url.searchParams.delete("workspace");
    }
    // 커밋·푸시 알림은 기존 /projects/:workspaceId URL이어도 AIVS Git 패널로 이동한다.
    // 다른 알림 및 일반 프로젝트 URL에는 영향을 주지 않는다.
    if (notificationType === "GIT_COMMIT" || notificationType === "GIT_PUSH") {
      const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
      const aivsMatch = pathname.match(/^\/aivs\/([^/]+)$/);
      const gitWorkspaceId = projectMatch?.[1] || aivsMatch?.[1] ||
        (pathname === "/projects" || pathname === "/aivs" ? workspaceId : null);
      if (gitWorkspaceId) {
        pathname = `/aivs/${gitWorkspaceId}`;
        url.searchParams.delete("workspaceId");
        url.searchParams.delete("workspaceid");
        url.searchParams.delete("workspace");
        url.searchParams.set("panel", "git");
      }
    }
    // 외부 도메인으로 향하는 URL로 오인될 여지를 제거
    if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;
    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
