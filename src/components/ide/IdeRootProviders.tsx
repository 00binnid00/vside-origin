"use client";

// 경로: src/components/ide/IdeRootProviders.tsx
// 전역 Provider는 app/providers.tsx에서 이미 적용됩니다.
// 이 파일은 기존 import 호환을 위해 children만 그대로 반환합니다.

export default function IdeRootProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}