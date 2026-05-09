import { ProjectManagerList } from "@/components/projects/ProjectManagerList";
import type { WorkspaceMode } from "@/components/main-dashboard/dashboard.types";

type PageProps = {
  params: {
    workspaceId: string;
  };
  searchParams?: {
    mode?: string;
  };
};

export default function AivsPage({ params, searchParams }: PageProps) {
  const mode: WorkspaceMode =
    searchParams?.mode === "team" || searchParams?.mode === "personal"
      ? searchParams.mode
      : "personal";

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-6 py-8 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-[1440px]">
        <ProjectManagerList workspaceId={params.workspaceId} mode={mode} />
      </div>
    </main>
  );
}
