/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import type { Doc, Id, TableNames } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import schema from "../../schema";
import { modules } from "../../test.helpers";
import {
  legacyFeedbackPatch,
  legacyMilestonePatch,
  legacyOrganizationPatch,
  legacyTagPatch,
} from "../legacy_field_patches";

async function loaded<Table extends TableNames>(
  ctx: MutationCtx,
  id: Id<Table>
): Promise<Doc<Table>> {
  const row = await ctx.db.get(id);
  if (!row) {
    throw new Error(`Row ${id} not found`);
  }
  return row;
}

async function insertOrganization(
  ctx: MutationCtx,
  overrides: Partial<Doc<"organizations">> = {}
) {
  return await ctx.db.insert("organizations", {
    createdAt: 1,
    isPublic: true,
    name: "Acme",
    slug: "acme",
    subscriptionStatus: "none",
    subscriptionTier: "free",
    ...overrides,
  });
}

const SELECTION = {
  componentStack: ["Editor"],
  html: "<button>Save</button>",
  label: "Save",
  rect: { height: 1, width: 1, x: 0, y: 0 },
  selector: "button.save",
};

describe("legacyTagPatch", () => {
  test("maps the hex colour, drops lane flags and legacy settings, keeps isPublic", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const organizationId = await insertOrganization(ctx);
      const tagId = await ctx.db.insert("tags", {
        color: "#3B82F6",
        createdAt: 1,
        isDoneStatus: true,
        isRoadmapLane: true,
        laneOrder: 2,
        name: "Bug",
        organizationId,
        settings: {
          defaultStatus: "open",
          isPublic: true,
          requireApproval: false,
        },
        slug: "bug",
      });
      const patch = legacyTagPatch(await loaded(ctx, tagId));
      expect(patch).toBeDefined();
      await ctx.db.patch(tagId, patch ?? {});

      expect(await loaded(ctx, tagId)).toMatchObject({
        color: "blue",
        settings: { isPublic: true },
      });
      const migrated = await loaded(ctx, tagId);
      expect(migrated.isDoneStatus).toBeUndefined();
      expect(migrated.isRoadmapLane).toBeUndefined();
      expect(migrated.laneOrder).toBeUndefined();
      expect(migrated.settings?.defaultStatus).toBeUndefined();
      expect(migrated.settings?.requireApproval).toBeUndefined();
      expect(legacyTagPatch(migrated)).toBeUndefined();
    });
  });

  test("an already named colour with no legacy fields is a no-op", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const organizationId = await insertOrganization(ctx);
      const tagId = await ctx.db.insert("tags", {
        color: "red",
        createdAt: 1,
        name: "Bug",
        organizationId,
        settings: { isPublic: false },
        slug: "bug",
      });
      expect(legacyTagPatch(await loaded(ctx, tagId))).toBeUndefined();
    });
  });
});

describe("legacyMilestonePatch", () => {
  test("unmapped hex falls back to default", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const organizationId = await insertOrganization(ctx);
      const milestoneId = await ctx.db.insert("milestones", {
        color: "#123456",
        createdAt: 1,
        isPublic: true,
        name: "Launch",
        order: 0,
        organizationId,
        status: "active",
        timeHorizon: "now",
        updatedAt: 1,
      });
      expect(legacyMilestonePatch(await loaded(ctx, milestoneId))).toEqual({
        color: "default",
      });
    });
  });
});

describe("legacyFeedbackPatch", () => {
  test("appends the singular selection, drops scroll and the never-written AI fields", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const organizationId = await insertOrganization(ctx);
      const feedbackId = await ctx.db.insert("feedback", {
        aiComplexity: "simple",
        aiPriority: "high",
        aiPriorityGeneratedAt: 5,
        aiTimeEstimate: "2d",
        commentCount: 0,
        context: {
          scroll: { x: 0, y: 120 },
          selection: { ...SELECTION, label: "Legacy" },
          selections: [SELECTION],
          url: "https://acme.test/settings",
        },
        createdAt: 1,
        description: "Clicking save loses the draft",
        isApproved: true,
        isPinned: false,
        organizationId,
        status: "open",
        title: "Draft lost",
        updatedAt: 1,
        voteCount: 0,
      });
      const patch = legacyFeedbackPatch(await loaded(ctx, feedbackId));
      expect(patch).toBeDefined();
      await ctx.db.patch(feedbackId, patch ?? {});

      const migrated = await loaded(ctx, feedbackId);
      expect(migrated.context).toEqual({
        selections: [SELECTION, { ...SELECTION, label: "Legacy" }],
        url: "https://acme.test/settings",
      });
      expect(migrated.aiPriority).toBe("high");
      expect(migrated.aiComplexity).toBeUndefined();
      expect(migrated.aiPriorityGeneratedAt).toBeUndefined();
      expect(migrated.aiTimeEstimate).toBeUndefined();
      expect(legacyFeedbackPatch(migrated)).toBeUndefined();
    });
  });

  test("feedback without legacy fields is a no-op", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const organizationId = await insertOrganization(ctx);
      const feedbackId = await ctx.db.insert("feedback", {
        commentCount: 0,
        context: { selections: [SELECTION], url: "https://acme.test" },
        createdAt: 1,
        description: "Nothing legacy here",
        isApproved: true,
        isPinned: false,
        organizationId,
        status: "open",
        title: "Fine",
        updatedAt: 1,
        voteCount: 0,
      });
      expect(
        legacyFeedbackPatch(await loaded(ctx, feedbackId))
      ).toBeUndefined();
    });
  });
});

describe("legacyOrganizationPatch", () => {
  test("drops customCss and the unread feedback settings, keeps the read ones", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const tagOrganizationId = await insertOrganization(ctx);
      const tagId = await ctx.db.insert("tags", {
        color: "red",
        createdAt: 1,
        name: "Bug",
        organizationId: tagOrganizationId,
        slug: "bug",
      });
      const organizationId = await insertOrganization(ctx, {
        customCss: "body { color: red }",
        feedbackSettings: {
          allowAnonymousVoting: true,
          cardStyle: "sweep-corner",
          defaultStatus: "planned",
          defaultTagId: tagId,
          defaultView: "feed",
          milestoneStyle: "track",
          requireApproval: true,
        },
        slug: "legacy",
      });
      const patch = legacyOrganizationPatch(await loaded(ctx, organizationId));
      expect(patch).toBeDefined();
      await ctx.db.patch(organizationId, patch ?? {});

      const migrated = await loaded(ctx, organizationId);
      expect(migrated.customCss).toBeUndefined();
      expect(migrated.feedbackSettings).toEqual({
        defaultStatus: "planned",
        defaultView: "feed",
        requireApproval: true,
      });
      expect(legacyOrganizationPatch(migrated)).toBeUndefined();
    });
  });
});

describe("countLegacyRows", () => {
  test("counts rows per table before the migration and zero after", async () => {
    const t = convexTest(schema, modules);
    const tagId = await t.run(async (ctx) => {
      const organizationId = await insertOrganization(ctx);
      return await ctx.db.insert("tags", {
        color: "#ef4444",
        createdAt: 1,
        name: "Bug",
        organizationId,
        slug: "bug",
      });
    });

    const before = await t.query(
      internal.migrations.legacy_fields.countLegacyRows,
      {}
    );
    expect(before.tags).toEqual({ hasMore: false, legacy: 1 });
    expect(before.organizations).toEqual({ hasMore: false, legacy: 0 });

    await t.run(async (ctx) => {
      await ctx.db.patch(tagId, legacyTagPatch(await loaded(ctx, tagId)) ?? {});
    });
    const after = await t.query(
      internal.migrations.legacy_fields.countLegacyRows,
      {}
    );
    expect(after.tags).toEqual({ hasMore: false, legacy: 0 });
  });
});
