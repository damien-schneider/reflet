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
 * One-off cleanup: deletes stale "starvation"/"bottleneck" coordination notes
 * that were created by the CEO loop before the dedup + chain-gating fix landed.
 * Without this, the dashboard keeps showing misleading notes about agents that
 * were never actually starved (they were chain-gated waiting for bootstrap).
 *
 * Safe to re-run — only deletes notes tagged "coordination" + ("starvation" or
 * "bottleneck"). New notes won't be created for chain-gated agents.
 */
/**
 * Drop legacy `identity` knowledge docs + their version history. Runs after
 * the schema change deploys (identity removed from knowledgeDocType).
 *
 * To deploy:
 *   1. Set `defineSchema(..., { schemaValidation: false })` in convex/schema.ts
 *   2. `bun run dev` (push relaxed schema, Ctrl+C)
 *   3. `bunx convex run autopilot/migrations:dropLegacyIdentity '{}'`
 *   4. Revert schemaValidation
 *   5. `bun run dev` (clean push)
 */
export const dropLegacyIdentity = internalMutation({
  args: {},
  returns: v.object({
    docsDeleted: v.number(),
    versionsDeleted: v.number(),
  }),
  handler: async (ctx) => {
    let docsDeleted = 0;
    let versionsDeleted = 0;

    const docs = await ctx.db.query("autopilotKnowledgeDocs").collect();
    for (const doc of docs) {
      if ((doc.docType as string) !== "identity") {
        continue;
      }

      const versions = await ctx.db
        .query("autopilotKnowledgeDocVersions")
        .withIndex("by_doc", (q) => q.eq("docId", doc._id))
        .collect();
      for (const version of versions) {
        await ctx.db.delete(version._id);
        versionsDeleted++;
      }
      await ctx.db.delete(doc._id);
      docsDeleted++;
    }

    return { docsDeleted, versionsDeleted };
  },
});

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
