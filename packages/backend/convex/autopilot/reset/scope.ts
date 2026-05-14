import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

export const resetScopeGroup = v.object({
  description: v.string(),
  items: v.array(v.string()),
  title: v.string(),
});

const AUTOPILOT_RESET_GROUPS = [
  {
    title: "Work and review history",
    description: "All Autopilot work, review state, and activity.",
    steps: [
      {
        kind: "byOrganization",
        label: "Feedback links",
        table: "feedbackTaskLinks",
      },
      {
        kind: "byOrganization",
        label: "Work items",
        table: "autopilotWorkItems",
      },
      {
        kind: "byOrganization",
        label: "Activity logs",
        table: "autopilotActivityLog",
      },
    ],
  },
  {
    title: "Generated artifacts",
    description:
      "Documents, reports, and knowledge files created or maintained by agents.",
    steps: [
      {
        kind: "knowledgeVersions",
        label: "Knowledge versions",
        table: "autopilotKnowledgeDocVersions",
      },
      {
        kind: "byOrganization",
        label: "Knowledge documents",
        table: "autopilotKnowledgeDocs",
      },
      {
        kind: "byOrganization",
        label: "Documents",
        table: "autopilotDocuments",
      },
      {
        kind: "byOrganization",
        label: "Reports",
        table: "autopilotReports",
      },
    ],
  },
  {
    title: "Market and customer intelligence",
    description:
      "Research data, customer signals, lead records, personas, and use cases.",
    steps: [
      {
        kind: "byOrganization",
        label: "Competitors",
        table: "autopilotCompetitors",
      },
      {
        kind: "byOrganization",
        label: "Community posts",
        table: "autopilotCommunityPosts",
      },
      {
        kind: "byOrganization",
        label: "Revenue snapshots",
        table: "autopilotRevenueSnapshots",
      },
      {
        kind: "byOrganization",
        label: "Autopilot repo intelligence",
        table: "autopilotRepoAnalysis",
      },
      { kind: "byOrganization", label: "Leads", table: "autopilotLeads" },
      {
        kind: "byOrganization",
        label: "Personas",
        table: "autopilotPersonas",
      },
      {
        kind: "byOrganization",
        label: "Use cases",
        table: "autopilotUseCases",
      },
    ],
  },
  {
    title: "Agent conversations and memory",
    description:
      "Agent chat history, saved memory, and associated thread metadata.",
    steps: [
      {
        kind: "byOrgThread",
        label: "Agent messages",
        table: "autopilotAgentMessages",
      },
      {
        kind: "byOrganization",
        label: "Agent work streams",
        table: "autopilotAgentWorkStreams",
      },
      {
        kind: "byOrganization",
        label: "Agent threads",
        table: "autopilotAgentThreads",
      },
      {
        kind: "byOrganization",
        label: "Agent memories",
        table: "autopilotAgentMemories",
      },
    ],
  },
  {
    title: "Automation settings",
    description: "Schedules, operating limits, and the Autopilot config.",
    steps: [
      {
        kind: "byOrganization",
        label: "Routines",
        table: "autopilotRoutines",
      },
      {
        kind: "byOrganization",
        label: "Autopilot configuration",
        table: "autopilotConfig",
      },
    ],
  },
  {
    title: "Project context",
    description:
      "Repository analysis, setup outputs, and website references Autopilot uses.",
    steps: [
      {
        kind: "byOrganization",
        label: "Connected repo analysis",
        table: "repoAnalysis",
      },
      {
        kind: "byOrganization",
        label: "Website references",
        table: "websiteReferences",
      },
      {
        kind: "byOrganization",
        label: "Project setup results",
        table: "projectSetupResults",
      },
    ],
  },
] as const;

type ResetStep = (typeof AUTOPILOT_RESET_GROUPS)[number]["steps"][number];
type ResetStepByKind<Kind extends ResetStep["kind"]> = Extract<
  ResetStep,
  { kind: Kind }
>;

export const getAutopilotResetScope = () =>
  AUTOPILOT_RESET_GROUPS.map((group) => ({
    description: group.description,
    items: group.steps.map((step) => step.label),
    title: group.title,
  }));

const getResetSteps = () => {
  const steps: ResetStep[] = [];
  for (const group of AUTOPILOT_RESET_GROUPS) {
    for (const step of group.steps) {
      steps.push(step);
    }
  }
  return steps;
};

const deleteRowsByOrganization = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  table: ResetStepByKind<"byOrganization">["table"]
) => {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();

  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
};

const deleteRowsByOrgThread = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  table: ResetStepByKind<"byOrgThread">["table"]
) => {
  const rows = await ctx.db
    .query(table)
    .withIndex("by_org_thread", (q) => q.eq("organizationId", organizationId))
    .collect();

  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
};

const deleteKnowledgeVersions = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) => {
  const knowledgeDocs = await ctx.db
    .query("autopilotKnowledgeDocs")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();

  for (const doc of knowledgeDocs) {
    const versions = await ctx.db
      .query("autopilotKnowledgeDocVersions")
      .withIndex("by_doc", (q) => q.eq("docId", doc._id))
      .collect();

    for (const version of versions) {
      await ctx.db.delete(version._id);
    }
  }
};

const deleteResetStep = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  step: ResetStep
) => {
  if (step.kind === "byOrganization") {
    await deleteRowsByOrganization(ctx, organizationId, step.table);
    return;
  }
  if (step.kind === "byOrgThread") {
    await deleteRowsByOrgThread(ctx, organizationId, step.table);
    return;
  }
  if (step.kind === "knowledgeVersions") {
    await deleteKnowledgeVersions(ctx, organizationId);
    return;
  }

  const exhaustiveCheck: never = step;
  throw new Error(`Unhandled reset step: ${exhaustiveCheck}`);
};

export const deleteAutopilotResetData = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">
) => {
  for (const step of getResetSteps()) {
    await deleteResetStep(ctx, organizationId, step);
  }
};
