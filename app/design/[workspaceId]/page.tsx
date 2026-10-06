import { Suspense } from "react";

import { DesignWorkspace } from "@/components/design/components/DesignWorkspace";

export default function DesignPage() {
  return (
    <Suspense
      fallback={
        <div className="waivs-page p-6 text-sm text-[var(--waivs-text-muted)]">
          불러오는 중…
        </div>
      }
    >
      <DesignWorkspace />
    </Suspense>
  );
}