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
    <main className="">
      
        <ProjectManagerList workspaceId={params.workspaceId} mode={mode} />
    
    </main>
  );
}
