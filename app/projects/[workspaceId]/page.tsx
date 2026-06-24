import { ProjectManagerList } from "@/components/projects/ProjectManagerList";
import type { WorkspaceMode } from "@/components/main-dashboard/dashboard.types";

type PageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function AivsPage({ params, searchParams }: PageProps) {
  const { workspaceId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const mode: WorkspaceMode =
    resolvedSearchParams.mode === "team" ||
    resolvedSearchParams.mode === "personal"
      ? resolvedSearchParams.mode
      : "personal";

  return (
    <main className="">
      <ProjectManagerList workspaceId={workspaceId} mode={mode} />
    </main>
  );
}
