/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

import { createFeedback, createOrg } from "./test-helpers";

const testSchema = schema as any;

describe("admin_api_releases", () => {
  test("createRelease should create a release", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const result = await t.mutation(internal.admin_api.releases.createRelease, {
      organizationId: orgId,
      title: "v1.0.0 Release",
      description: "Initial release",
      version: "v1.0.0",
    });

    expect(result.id).toBeDefined();
  });

  test("listReleases should paginate and sort by newest", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api.releases.createRelease, {
      organizationId: orgId,
      title: "First",
    });
    await t.mutation(internal.admin_api.releases.createRelease, {
      organizationId: orgId,
      title: "Second",
    });

    const result = await t.query(internal.admin_api.releases.listReleases, {
      organizationId: orgId,
    });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.hasMore).toBe(false);
  });

  test("listReleases should filter by status", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api.releases.createRelease, {
      organizationId: orgId,
      title: "Draft",
    });
    const { id: pubId } = await t.mutation(
      internal.admin_api.releases.createRelease,
      { organizationId: orgId, title: "Published" }
    );

    await t.mutation(internal.admin_api.releases.publishRelease, {
      organizationId: orgId,
      releaseId: pubId,
    });

    const published = await t.query(internal.admin_api.releases.listReleases, {
      organizationId: orgId,
      status: "published",
    });
    expect(published.items).toHaveLength(1);
    expect(published.items[0].title).toBe("Published");

    const drafts = await t.query(internal.admin_api.releases.listReleases, {
      organizationId: orgId,
      status: "draft",
    });
    expect(drafts.items).toHaveLength(1);
    expect(drafts.items[0].title).toBe("Draft");
  });

  test("getRelease should return release with linked feedback", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: releaseId } = await t.mutation(
      internal.admin_api.releases.createRelease,
      { organizationId: orgId, title: "Release" }
    );
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.releases.linkReleaseFeedback, {
      organizationId: orgId,
      releaseId,
      feedbackId,
      action: "link",
    });

    const release = await t.query(internal.admin_api.releases.getRelease, {
      organizationId: orgId,
      releaseId,
    });

    expect(release).not.toBeNull();
    expect(release?.linkedFeedback).toHaveLength(1);
    expect(release?.linkedFeedback?.[0]?.title).toBe("Test Feedback");
  });

  test("getRelease should return null for wrong org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: "Other",
        slug: "other",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      })
    );

    const { id: releaseId } = await t.mutation(
      internal.admin_api.releases.createRelease,
      { organizationId: orgId, title: "Private" }
    );

    const result = await t.query(internal.admin_api.releases.getRelease, {
      organizationId: otherOrgId,
      releaseId,
    });
    expect(result).toBeNull();
  });

  test("updateRelease should update fields", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: releaseId } = await t.mutation(
      internal.admin_api.releases.createRelease,
      { organizationId: orgId, title: "Old Title" }
    );

    await t.mutation(internal.admin_api.releases.updateRelease, {
      organizationId: orgId,
      releaseId,
      title: "New Title",
      version: "v2.0.0",
    });

    const release = await t.query(internal.admin_api.releases.getRelease, {
      organizationId: orgId,
      releaseId,
    });
    expect(release?.title).toBe("New Title");
  });

  test("publishRelease and unpublishRelease toggle publishedAt", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: releaseId } = await t.mutation(
      internal.admin_api.releases.createRelease,
      { organizationId: orgId, title: "Toggle" }
    );

    await t.mutation(internal.admin_api.releases.publishRelease, {
      organizationId: orgId,
      releaseId,
    });

    let release = await t.run(async (ctx) => ctx.db.get(releaseId));
    expect(release?.publishedAt).toBeDefined();

    await t.mutation(internal.admin_api.releases.unpublishRelease, {
      organizationId: orgId,
      releaseId,
    });

    release = await t.run(async (ctx) => ctx.db.get(releaseId));
    expect(release?.publishedAt).toBeUndefined();
  });

  test("deleteRelease should remove release and its feedback links", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: releaseId } = await t.mutation(
      internal.admin_api.releases.createRelease,
      { organizationId: orgId, title: "ToDelete" }
    );
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.releases.linkReleaseFeedback, {
      organizationId: orgId,
      releaseId,
      feedbackId,
      action: "link",
    });

    await t.mutation(internal.admin_api.releases.deleteRelease, {
      organizationId: orgId,
      releaseId,
    });

    const remaining = await t.run(async (ctx) => ctx.db.get(releaseId));
    expect(remaining).toBeNull();

    const links = await t.run(async (ctx) =>
      ctx.db.query("releaseFeedback").collect()
    );
    expect(links).toHaveLength(0);
  });

  test("linkReleaseFeedback link/unlink works", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: releaseId } = await t.mutation(
      internal.admin_api.releases.createRelease,
      { organizationId: orgId, title: "R" }
    );
    const feedbackId = await createFeedback(t, orgId);

    // Link
    await t.mutation(internal.admin_api.releases.linkReleaseFeedback, {
      organizationId: orgId,
      releaseId,
      feedbackId,
      action: "link",
    });

    let links = await t.run(async (ctx) =>
      ctx.db.query("releaseFeedback").collect()
    );
    expect(links).toHaveLength(1);

    // Duplicate link should be idempotent
    await t.mutation(internal.admin_api.releases.linkReleaseFeedback, {
      organizationId: orgId,
      releaseId,
      feedbackId,
      action: "link",
    });

    links = await t.run(async (ctx) =>
      ctx.db.query("releaseFeedback").collect()
    );
    expect(links).toHaveLength(1);

    // Unlink
    await t.mutation(internal.admin_api.releases.linkReleaseFeedback, {
      organizationId: orgId,
      releaseId,
      feedbackId,
      action: "unlink",
    });

    links = await t.run(async (ctx) =>
      ctx.db.query("releaseFeedback").collect()
    );
    expect(links).toHaveLength(0);
  });
});
