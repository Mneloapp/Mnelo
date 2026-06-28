import { Lightbulb, Plus } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  AIActivityPanel,
  AISuggestionCard,
  MissionCard,
  MissionProgress,
  MissionWorkspace,
  NextStepCard,
  PrimaryButton,
  RecentMissions,
  StatusBadge,
} from "@/components/mission-ui";
import { getDashboardForCurrentUser } from "@/lib/data";

const missionSteps = ["Analyze", "Identify", "Prepare", "Review", "Source", "Award"];

function progressForProject({
  boqItemCount,
  fileCount,
}: {
  boqItemCount: number;
  fileCount: number;
}) {
  if (boqItemCount > 0) {
    return 55;
  }

  if (fileCount > 0) {
    return 28;
  }

  return 8;
}

export default async function DashboardPage() {
  const { projects, recentActivity, summary, errorMessage } = await getDashboardForCurrentUser();
  const currentMission = projects[0] || null;
  const reviewCount = Math.min(summary.boqItems, 12);
  const currentStep = currentMission?.boqItemCount ? 3 : currentMission?.fileCount ? 1 : 0;
  const recentMissions = projects.slice(0, 3).map((project) => ({
    href: `/projects/${project.id}`,
    name: project.name,
    progress: progressForProject(project),
    subtitle: `${project.client} · ${project.location}`,
  }));
  const activities =
    recentActivity.length > 0
      ? recentActivity.slice(0, 5).map((activity) => ({
          detail: activity.projectName,
          title: `${activity.fileName} uploaded`,
        }))
      : [
          {
            detail: "Upload a tender package to begin.",
            title: "Waiting for first mission",
          },
        ];

  return (
    <WorkspaceShell active="Dashboard">
      <MissionWorkspace>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-[40px] font-semibold leading-tight tracking-[-0.02em] text-[#0F172A]">
                  Good morning, George.
                </h1>
                <p className="mt-3 text-lg text-[#64748B]">AI has your procurement under control.</p>
              </div>
              <PrimaryButton href="/projects/new">
                <Plus aria-hidden="true" className="mr-2 h-4 w-4" strokeWidth={2} />
                New Mission
              </PrimaryButton>
            </header>

            {process.env.NODE_ENV === "development" && errorMessage ? (
              <div className="mt-6 rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 font-mono text-xs text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <section className="mt-10 grid gap-6">
              <MissionCard className="p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#64748B]">Current Mission</p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0F172A]">
                      {currentMission?.name || "No active mission yet"}
                    </h2>
                    <div className="mt-4">
                      <StatusBadge tone={currentMission ? "green" : "neutral"}>
                        {currentMission?.status || "Waiting for project"}
                      </StatusBadge>
                    </div>
                    <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#64748B]">
                      {currentMission
                        ? `AI reviewed ${currentMission.fileCount} document${
                            currentMission.fileCount === 1 ? "" : "s"
                          } and organized ${currentMission.boqItemCount.toLocaleString()} procurement item${
                            currentMission.boqItemCount === 1 ? "" : "s"
                          } for this mission.`
                        : "Create a mission to let Mnelo read documents, identify decisions and prepare procurement work."}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-[#E5E7EB] bg-[#F8FAFC] p-5 lg:w-64">
                    <p className="text-sm font-medium text-[#64748B]">AI summary</p>
                    <p className="mt-3 text-2xl font-semibold text-[#0F172A]">{summary.totalProjects}</p>
                    <p className="mt-1 text-sm text-[#64748B]">active mission{summary.totalProjects === 1 ? "" : "s"}</p>
                  </div>
                </div>

                <div className="mt-8">
                  <MissionProgress currentStep={currentStep} steps={missionSteps} />
                </div>
              </MissionCard>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <NextStepCard count={reviewCount} href={currentMission ? `/projects/${currentMission.id}/intelligence` : "/projects/new"} />
                <RecentMissions missions={recentMissions} />
              </div>

              <AISuggestionCard
                ctaHref={currentMission ? `/projects/${currentMission.id}/documents` : "/projects/new"}
                ctaLabel={currentMission ? "Open documents" : "Create mission"}
                icon={Lightbulb}
                text={
                  currentMission
                    ? "Keep documents and decisions in one mission workspace before moving into supplier sourcing."
                    : "Start by creating one mission and uploading the tender package. Mnelo will organize the next steps."
                }
                title="AI Suggestion"
              />
            </section>
          </div>

          <AIActivityPanel
            activities={[
              ...activities,
              {
                detail:
                  reviewCount > 0
                    ? `${reviewCount} items need your review before procurement packages can move forward.`
                    : "No urgent decisions are waiting right now.",
                title: reviewCount > 0 ? "Decisions waiting" : "Workspace calm",
              },
            ].slice(0, 5)}
          />
        </div>
      </MissionWorkspace>
    </WorkspaceShell>
  );
}
