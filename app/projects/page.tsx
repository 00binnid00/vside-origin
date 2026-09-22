import { Suspense } from "react";
import { ProjectManagerList } from "@/components/projects/ProjectManagerList";

export default function AivsPage() {
  return (
    <Suspense fallback={<div className="p-5 text-sm text-slate-500">AIVS를 불러오는 중...</div>}>
      <ProjectManagerList />
    </Suspense>
  );
}
