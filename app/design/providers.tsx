"use client";

// 전역 Provider는 app/providers.tsx에서 이미 적용됩니다.
// design 영역 전용 Provider가 필요하지 않으면 children만 반환합니다.

export default function DesignProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}