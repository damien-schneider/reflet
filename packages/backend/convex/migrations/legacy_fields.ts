import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "../_generated/api";
import type { Doc, Id, TableNames } from "../_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import {
  legacyApiRequestLogPatch,
  legacyFeedbackPatch,
  legacyGithubConnectionPatch,
  legacyInsightPatch,
  legacyMilestonePatch,
  legacyNotificationPreferencesPatch,
  legacyOrganizationPatch,
  legacyOrganizationStatusPatch,
  legacyProjectSetupResultPatch,
  legacyRepoAnalysisPatch,
  legacyTagPatch,
} from "./legacy_field_patches";

const migrations = new Migrations(components.migrations, { internalMutation });

export const run = migrations.runner();

export const tags = migrations.define({
  migrateOne: (_ctx, tag) => legacyTagPatch(tag),
  table: "tags",
});

export const milestones = migrations.define({
  migrateOne: (_ctx, milestone) => legacyMilestonePatch(milestone),
  table: "milestones",
});

export const organizationStatuses = migrations.define({
  migrateOne: (_ctx, status) => legacyOrganizationStatusPatch(status),
  table: "organizationStatuses",
});

export const projectSetupResults = migrations.define({
  migrateOne: (_ctx, setup) => legacyProjectSetupResultPatch(setup),
  table: "projectSetupResults",
});

export const feedback = migrations.define({
  migrateOne: (_ctx, row) => legacyFeedbackPatch(row),
  table: "feedback",
});

export const organizations = migrations.define({
  migrateOne: (_ctx, organization) => legacyOrganizationPatch(organization),
  table: "organizations",
});

export const userNotificationPreferences = migrations.define({
  migrateOne: (_ctx, preferences) =>
    legacyNotificationPreferencesPatch(preferences),
  table: "userNotificationPreferences",
});

export const githubConnections = migrations.define({
  migrateOne: (_ctx, connection) => legacyGithubConnectionPatch(connection),
  table: "githubConnections",
});

export const apiRequestLogs = migrations.define({
  migrateOne: (_ctx, log) => legacyApiRequestLogPatch(log),
  table: "apiRequestLogs",
});

export const repoAnalysis = migrations.define({
  migrateOne: (_ctx, analysis) => legacyRepoAnalysisPatch(analysis),
  table: "repoAnalysis",
});

export const intelligenceInsights = migrations.define({
  migrateOne: (_ctx, insight) => legacyInsightPatch(insight),
  table: "intelligenceInsights",
});

const DEAD_TABLES = [
  "emailEvents",
  "feedbackImportanceVotes",
  "githubWebhookEvents",
  "onboardingProgress",
] as const;

const deleteRow = async (ctx: MutationCtx, row: { _id: Id<TableNames> }) => {
  await ctx.db.delete(row._id);
};

export const emailEvents = migrations.define({
  migrateOne: deleteRow,
  table: "emailEvents",
});

export const feedbackImportanceVotes = migrations.define({
  migrateOne: deleteRow,
  table: "feedbackImportanceVotes",
});

export const githubWebhookEvents = migrations.define({
  migrateOne: deleteRow,
  table: "githubWebhookEvents",
});

export const onboardingProgress = migrations.define({
  migrateOne: deleteRow,
  table: "onboardingProgress",
});

export const runAll = migrations.runner([
  internal.migrations.legacy_fields.tags,
  internal.migrations.legacy_fields.milestones,
  internal.migrations.legacy_fields.organizationStatuses,
  internal.migrations.legacy_fields.projectSetupResults,
  internal.migrations.legacy_fields.feedback,
  internal.migrations.legacy_fields.organizations,
  internal.migrations.legacy_fields.userNotificationPreferences,
  internal.migrations.legacy_fields.githubConnections,
  internal.migrations.legacy_fields.apiRequestLogs,
  internal.migrations.legacy_fields.repoAnalysis,
  internal.migrations.legacy_fields.intelligenceInsights,
  internal.migrations.legacy_fields.emailEvents,
  internal.migrations.legacy_fields.feedbackImportanceVotes,
  internal.migrations.legacy_fields.githubWebhookEvents,
  internal.migrations.legacy_fields.onboardingProgress,
]);

const COUNT_SAMPLE_LIMIT = 1000;

async function countLegacyRowsIn<Table extends TableNames>(
  ctx: QueryCtx,
  table: Table,
  legacyPatch: (row: Doc<Table>) => unknown
) {
  const rows = await ctx.db.query(table).take(COUNT_SAMPLE_LIMIT);
  return {
    hasMore: rows.length === COUNT_SAMPLE_LIMIT,
    legacy: rows.filter((row) => legacyPatch(row) !== undefined).length,
  };
}

async function countDeadTableRows(ctx: QueryCtx) {
  const counts: Partial<Record<(typeof DEAD_TABLES)[number], number>> = {};
  for (const table of DEAD_TABLES) {
    counts[table] = (await ctx.db.query(table).take(COUNT_SAMPLE_LIMIT)).length;
  }
  return counts;
}

export const countLegacyRows = internalQuery({
  args: {},
  handler: async (ctx) => ({
    apiRequestLogs: await countLegacyRowsIn(
      ctx,
      "apiRequestLogs",
      legacyApiRequestLogPatch
    ),
    deadTables: await countDeadTableRows(ctx),
    feedback: await countLegacyRowsIn(ctx, "feedback", legacyFeedbackPatch),
    githubConnections: await countLegacyRowsIn(
      ctx,
      "githubConnections",
      legacyGithubConnectionPatch
    ),
    intelligenceInsights: await countLegacyRowsIn(
      ctx,
      "intelligenceInsights",
      legacyInsightPatch
    ),
    milestones: await countLegacyRowsIn(
      ctx,
      "milestones",
      legacyMilestonePatch
    ),
    organizationStatuses: await countLegacyRowsIn(
      ctx,
      "organizationStatuses",
      legacyOrganizationStatusPatch
    ),
    organizations: await countLegacyRowsIn(
      ctx,
      "organizations",
      legacyOrganizationPatch
    ),
    projectSetupResults: await countLegacyRowsIn(
      ctx,
      "projectSetupResults",
      legacyProjectSetupResultPatch
    ),
    repoAnalysis: await countLegacyRowsIn(
      ctx,
      "repoAnalysis",
      legacyRepoAnalysisPatch
    ),
    tags: await countLegacyRowsIn(ctx, "tags", legacyTagPatch),
    userNotificationPreferences: await countLegacyRowsIn(
      ctx,
      "userNotificationPreferences",
      legacyNotificationPreferencesPatch
    ),
  }),
});
