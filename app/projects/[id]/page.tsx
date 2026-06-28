import Link from "next/link";
import { Activity, BookOpen, FileText, FolderOpen, Layers3, Sparkles } from "lucide-react";
import {
  MissionCard,
  MissionProgress,
  MissionWorkspace,
  NextStepCard,
  StatusBadge,
} from "@/components/mission-ui";
import { ProjectUnavailableState } from "@/components/project-workspace";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getBoqItemsForCurrentUser, getProjectFilesForCurrentUser, getProjectForCurrentUser } from "@/lib/data";
import { deriveProjectProcessingItems } from "@/lib/project-processing";
import { getParsedFileIds } from "@/lib/project-workspace";

export const dynamic = "force-dynamic";

const missionSteps = ["Analyze", "Identify", "Prepare", "Review", "Source", "Award"];

function getNextAction({
  filesCount,
  itemRows,
  projectId,
  reviewRequired,
}: {
  filesCount: number;
  itemRows: number;
  projectId: string;
  reviewRequired: number;
}) {
  if (filesCount === 0) {
    return {
      count: 1,
      href: `/projects/${projectId}/documents`,
      label: "Upload documents",
      text: "Upload the tender package so AI can start reading the mission.",
      title: "Start with documents",
    };
  }

  if (itemRows === 0) {
    return {
      count: 1,
      href: `/projects/${projectId}/documents`,
      label: "Parse BOQ",
      text: "Parse the uploaded BOQ so Mnelo can extract clean review items.",
      title: "Prepare project intelligence",
    };
  }

  if (reviewRequired > 0) {
    return {
      count: reviewRequired,
      href: `/projects/${projectId}/intelligence`,
      label: "Start Review",
      text: "These decisions need your approval before AI can continue.",
      title: `${reviewRequired} decisions are waiting for you`,
    };
  }

  return {
    count: 0,
    href: `/projects/${projectId}/intelligence`,
    label: "Open Intelligence",
    text: "AI has organized the current project knowledge.",
    title: "Mission is ready for the next stage",
  };
}

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [projectResult, fileResult, boqResult] = await Promise.all([
    getProjectForCurrentUser(id),
    getProjectFilesForCurrentUser(id),
    getBoqItemsForCurrentUser(id),
  ]);
  const { project, errorMessage } = projectResult;
  const { files } = fileResult;
  const { cleanupSummary, items: boqItems } = boqResult;

  if (!project) {
    return (
      <WorkspaceShell active="Projects">
        <ProjectUnavailableState errorMessage={errorMessage} />
      </WorkspaceShell>
    );
  }

  const itemRows = boqItems.filter((item) => item.rowType === "item");
  const reviewRequired = itemRows.filter((item) => item.needsReview).length;
  const parsedFileIds = getParsedFileIds(boqItems, files);
  const processingItems = deriveProjectProcessingItems({ files, parsedFileIds });
  const nextAction = getNextAction({
    filesCount: files.length,
    itemRows: cleanupSummary.itemRows,
    projectId: project.id,
    reviewRequired,
  });
  const currentStep = cleanupSummary.itemRows > 0 ? 3 : files.length > 0 ? 1 : 0;

  return (
    <WorkspaceShell active="Projects">
      <MissionWorkspace>
        <header className="max-w-4xl">
          <Link className="text-sm font-semibold text-[#16A34A] transition hover:text-[#15803D]" href="/projects">
            Missions
          </Link>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[40px] font-semibold leading-tight tracking-[-0.02em] text-[#0F172A]">{project.name}</h1>
              <p className="mt-3 text-lg text-[#64748B]">
                {project.client} · {project.location} · {project.workType}
              </p>
            </div>
            <StatusBadge tone="green">{project.status}</StatusBadge>
          </div>
        </header>

        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <MissionCard className="p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#64748B]">Mission Brief</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#0F172A]">What AI already did</h2>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#64748B]">
                Mnelo has collected {files.length} document{files.length === 1 ? "" : "s"} and found{" "}
                {cleanupSummary.itemRows.toLocaleString()} clean procurement item
                {cleanupSummary.itemRows === 1 ? "" : "s"}.{" "}
                {reviewRequired > 0
                  ? `${reviewRequired} decisions need your approval before the mission can move forward.`
                  : "There are no urgent review decisions in the current workspace."}
              </p>
              <div className="mt-8">
                <MissionProgress currentStep={currentStep} steps={missionSteps} />
              </div>
            </MissionCard>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <MissionCard>
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#ECFDF3] text-[#22C55E]">
                    <Sparkles aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#0F172A]">AI summary</h2>
                    <p className="mt-2 text-[15px] leading-7 text-[#64748B]">
                      {nextAction.text}
                    </p>
                  </div>
                </div>
              </MissionCard>
              <NextStepCard count={nextAction.count} href={nextAction.href} />
            </div>

            <MissionCard>
              <h2 className="text-base font-semibold text-[#0F172A]">Mission areas</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { description: "See BOQ evidence as business requirements.", href: "requirements", icon: Layers3, label: "Requirements" },
                  { description: "Upload and parse tender files.", href: "documents", icon: FileText, label: "Documents" },
                  { description: "Review extracted rows and cleanup.", href: "boq", icon: FolderOpen, label: "BOQ Review" },
                  { description: "Confirm systems and categories.", href: "intelligence", icon: Sparkles, label: "Intelligence" },
                  { description: "Permanent project memory.", href: "knowledge", icon: BookOpen, label: "Knowledge" },
                ].map((area) => {
                  const AreaIcon = area.icon;

                  return (
                    <Link
                      className="rounded-[20px] border border-[#E5E7EB] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#BBF7D0] hover:bg-[#F8FAFC]"
                      href={`/projects/${project.id}/${area.href}`}
                      key={area.label}
                    >
                      <AreaIcon aria-hidden="true" className="h-5 w-5 text-[#22C55E]" strokeWidth={2} />
                      <p className="mt-4 text-sm font-semibold text-[#0F172A]">{area.label}</p>
                      <p className="mt-2 text-sm leading-6 text-[#64748B]">{area.description}</p>
                    </Link>
                  );
                })}
              </div>
            </MissionCard>
          </div>

          <aside className="rounded-[20px] border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#F5F3FF] text-[#7C3AED]">
                <Activity aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#0F172A]">Activity</h2>
                <p className="text-sm text-[#64748B]">What changed recently</p>
              </div>
            </div>
            {processingItems.length > 0 ? (
              <div className="mt-6 space-y-5">
                {processingItems.slice(0, 5).map((item) => (
                  <div className="rounded-2xl border border-[#E5E7EB] p-4" key={item.id}>
                    <p className="truncate text-sm font-semibold text-[#0F172A]">{item.fileName}</p>
                    <p className="mt-2 text-sm capitalize text-[#64748B]">{item.stage}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-[#E5E7EB] p-5 text-sm leading-6 text-[#64748B]">
                No activity yet. Upload project documents to start the mission.
              </p>
            )}
          </aside>
        </div>
      </MissionWorkspace>
    </WorkspaceShell>
  );
}
