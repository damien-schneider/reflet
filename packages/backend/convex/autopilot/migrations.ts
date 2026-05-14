/**
 * One-shot data migrations for autopilot.
 *
 * To run after the coding-adapter strip:
 *   1. Set `defineSchema(..., { schemaValidation: false })` in convex/schema.ts.
 *   2. `bun run dev` (push the relaxed schema, then Ctrl+C).
 *   3. `bunx convex run autopilot/migrations:cleanupLegacyAutopilotData '{}'`.
 *   4. Revert `schemaValidation` change in convex/schema.ts.
 *   5. `bun run dev` (clean push — succeeds because data is now in sync).
 *
 * Each step is idempotent. Safe to run multiple times.
 */

import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

interface LegacyConfigShape {
  adapter?: unknown;
  autoMergePRs?: unknown;
  autoMergeThreshold?: unknown;
  devEnabled?: unknown;
}

interface LegacyActivityShape {
  agent?: string;
  entityType?: string;
  runId?: unknown;
  targetAgent?: string;
}

interface LegacyWorkItemShape {
  assignedAgent?: string;
}

const stripFields = <T extends Record<string, unknown>>(
  doc: T,
  fields: readonly string[]
): T => {
  const next = { ...doc };
  for (const field of fields) {
    delete (next as Record<string, unknown>)[field];
  }
  return next;
};

export const cleanupLegacyAutopilotData = internalMutation({
  args: {},
  returns: v.object({
    activityLogsCleaned: v.number(),
    activityLogsDeleted: v.number(),
    configsCleaned: v.number(),
    runsDeleted: v.number(),
    workItemsCleared: v.number(),
  }),
  handler: async (ctx) => {
    let configsCleaned = 0;
    let activityLogsCleaned = 0;
    let activityLogsDeleted = 0;
    let workItemsCleared = 0;
    let runsDeleted = 0;

    const configs = await ctx.db.query("autopilotConfig").collect();
    for (const cfg of configs) {
      const legacy = cfg as unknown as LegacyConfigShape;
      const hasLegacyField =
        legacy.adapter !== undefined ||
        legacy.devEnabled !== undefined ||
        legacy.autoMergePRs !== undefined ||
        legacy.autoMergeThreshold !== undefined;
      if (hasLegacyField) {
        await ctx.db.replace(
          cfg._id,
          stripFields(cfg as unknown as Record<string, unknown>, [
            "adapter",
            "autoMergePRs",
            "autoMergeThreshold",
            "devEnabled",
            "_id",
            "_creationTime",
          ]) as never
        );
        configsCleaned++;
      }
    }

    const activityLogs = await ctx.db.query("autopilotActivityLog").collect();
    for (const log of activityLogs) {
      const legacy = log as unknown as LegacyActivityShape;
      const isLegacyDevAgent =
        legacy.agent === "dev" || legacy.targetAgent === "dev";
      const isLegacyRunEntity = legacy.entityType === "run";
      if (isLegacyDevAgent || isLegacyRunEntity) {
        await ctx.db.delete(log._id);
        activityLogsDeleted++;
        continue;
      }
      if (legacy.runId !== undefined) {
        await ctx.db.replace(
          log._id,
          stripFields(log as unknown as Record<string, unknown>, [
            "runId",
            "_id",
            "_creationTime",
          ]) as never
        );
        activityLogsCleaned++;
      }
    }

    const workItems = await ctx.db.query("autopilotWorkItems").collect();
    for (const item of workItems) {
      const legacy = item as unknown as LegacyWorkItemShape;
      if (legacy.assignedAgent === "dev") {
        await ctx.db.patch(item._id, { assignedAgent: undefined });
        workItemsCleared++;
      }
    }

    const runs = await ctx.db
      .query("autopilotRuns" as never)
      .collect()
      .catch(() => []);
    for (const run of runs as Array<{ _id: never }>) {
      await ctx.db.delete(run._id);
      runsDeleted++;
    }

    return {
      activityLogsCleaned,
      activityLogsDeleted,
      configsCleaned,
      runsDeleted,
      workItemsCleared,
    };
  },
});

/**
 * Migrate any existing `product_definition` knowledge docs to `identity`. Used
 * once when collapsing the legacy single-doc product_definition into the four
 * typed knowledge docs (identity, brand_voice, feature_catalog, scope). The
 * content is preserved verbatim into identity since that's the user-facing
 * "what is the product" surface; the other three typed docs are regenerated
 * by the chain producers from codebase_understanding.
 *
 * MUST run before deploying the schema change that drops "product_definition"
 * from knowledgeDocType, otherwise the new schema rejects legacy rows.
 *
 * Run via:
 *   bunx convex run autopilot/migrations:migrateProductDefinitionToIdentity '{}'
 */
export const migrateProductDefinitionToIdentity = internalMutation({
  args: {},
  returns: v.object({
    migrated: v.number(),
    skippedExistingIdentity: v.number(),
    versionsRelinked: v.number(),
  }),
  handler: async (ctx) => {
    let migrated = 0;
    let skippedExistingIdentity = 0;
    let versionsRelinked = 0;

    const productDefs = await ctx.db.query("autopilotKnowledgeDocs").collect();
    for (const doc of productDefs) {
      // Compare via `as string` so this migration keeps compiling after the
      // schema drops "product_definition" from the knowledgeDocType union.
      if ((doc.docType as string) !== "product_definition") {
        continue;
      }

      const existingIdentity = await ctx.db
        .query("autopilotKnowledgeDocs")
        .withIndex("by_org_docType", (q) =>
          q.eq("organizationId", doc.organizationId).eq("docType", "identity")
        )
        .unique();

      if (existingIdentity) {
        // Identity already exists for this org — drop legacy product_definition
        // rather than overwrite user-edited identity content.
        await ctx.db.delete(doc._id);
        skippedExistingIdentity++;
        continue;
      }

      await ctx.db.patch(doc._id, {
        docType: "identity",
        ownerAgent: doc.ownerAgent,
      });
      migrated++;

      // Relink version history rows to the same doc — they reference docId,
      // which doesn't change. Nothing to do, but count for the report.
      const versions = await ctx.db
        .query("autopilotKnowledgeDocVersions")
        .withIndex("by_doc", (q) => q.eq("docId", doc._id))
        .collect();
      versionsRelinked += versions.length;
    }

    return { migrated, skippedExistingIdentity, versionsRelinked };
  },
});

/**
 * One-off cleanup: deletes stale "starvation"/"bottleneck" coordination notes
 * that were created by the CEO loop before the dedup + chain-gating fix landed.
 * Without this, the dashboard keeps showing misleading notes about agents that
 * were never actually starved (they were chain-gated waiting for bootstrap).
 *
 * Safe to re-run — only deletes notes tagged "coordination" + ("starvation" or
 * "bottleneck"). New notes won't be created for chain-gated agents.
 */
export const purgeStaleCoordinationNotes = internalMutation({
  args: {},
  returns: v.object({
    starvationDeleted: v.number(),
    bottleneckDeleted: v.number(),
  }),
  handler: async (ctx) => {
    let starvationDeleted = 0;
    let bottleneckDeleted = 0;

    const notes = await ctx.db.query("autopilotDocuments").collect();

    for (const note of notes) {
      if (note.type !== "note") {
        continue;
      }
      const tags = note.tags ?? [];
      if (!tags.includes("coordination")) {
        continue;
      }
      if (tags.includes("starvation")) {
        await ctx.db.delete(note._id);
        starvationDeleted++;
        continue;
      }
      if (tags.includes("bottleneck")) {
        await ctx.db.delete(note._id);
        bottleneckDeleted++;
      }
    }

    return { starvationDeleted, bottleneckDeleted };
  },
});
