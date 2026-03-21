/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const testSchema = schema as any;

const createOrg = async (t: ReturnType<typeof convexTest>) =>
  t.run(async (ctx) =>
    ctx.db.insert("organizations", {
      name: "Test Org",
      slug: "test-org",
      isPublic: false,
      subscriptionTier: "free",
      subscriptionStatus: "none",
      createdAt: Date.now(),
    })
  );

describe("admin_api_tags", () => {
  test("createTag should create a tag with generated slug", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const result = await t.mutation(internal.admin_api_tags.createTag, {
      organizationId: orgId,
      name: "Bug Report",
      color: "#FF0000",
    });

    expect(result.id).toBeDefined();

    const tags = await t.query(internal.admin_api_tags.listTags, {
      organizationId: orgId,
    });

    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe("Bug Report");
    expect(tags[0].slug).toBe("bug-report");
    expect(tags[0].color).toBe("#FF0000");
  });

  test("createTag should reject duplicate slugs", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api_tags.createTag, {
      organizationId: orgId,
      name: "Feature",
      color: "#00FF00",
    });

    await expect(
      t.mutation(internal.admin_api_tags.createTag, {
        organizationId: orgId,
        name: "Feature",
        color: "#0000FF",
      })
    ).rejects.toThrow('Tag with slug "feature" already exists');
  });

  test("createTag should set isPublic via settings", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api_tags.createTag, {
      organizationId: orgId,
      name: "Public Tag",
      color: "#AABBCC",
      isPublic: true,
    });

    const tags = await t.query(internal.admin_api_tags.listTags, {
      organizationId: orgId,
    });
    expect(tags[0].isPublic).toBe(true);
  });

  test("listTags should return only tags for the given org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        name: "Other Org",
        slug: "other-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      })
    );

    await t.mutation(internal.admin_api_tags.createTag, {
      organizationId: orgId,
      name: "Our Tag",
      color: "#111",
    });
    await t.mutation(internal.admin_api_tags.createTag, {
      organizationId: otherOrgId,
      name: "Their Tag",
      color: "#222",
    });

    const tags = await t.query(internal.admin_api_tags.listTags, {
      organizationId: orgId,
    });
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe("Our Tag");
  });

  test("updateTag should update name and regenerate slug", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id } = await t.mutation(internal.admin_api_tags.createTag, {
      organizationId: orgId,
      name: "Old Name",
      color: "#000",
    });

    await t.mutation(internal.admin_api_tags.updateTag, {
      organizationId: orgId,
      tagId: id,
      name: "New Name",
    });

    const tags = await t.query(internal.admin_api_tags.listTags, {
      organizationId: orgId,
    });
    expect(tags[0].name).toBe("New Name");
    expect(tags[0].slug).toBe("new-name");
  });

  test("updateTag should reject tag from different org", async () => {
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

    const { id } = await t.mutation(internal.admin_api_tags.createTag, {
      organizationId: orgId,
      name: "Tag",
      color: "#000",
    });

    await expect(
      t.mutation(internal.admin_api_tags.updateTag, {
        organizationId: otherOrgId,
        tagId: id,
        name: "Hacked",
      })
    ).rejects.toThrow("Tag not found");
  });

  test("deleteTag should remove tag and clean up feedbackTags", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: tagId } = await t.mutation(internal.admin_api_tags.createTag, {
      organizationId: orgId,
      name: "ToDelete",
      color: "#F00",
    });

    // Create feedback and link it to the tag
    const _feedbackId = await t.run(async (ctx) => {
      const fId = await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Test",
        description: "Desc",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await ctx.db.insert("feedbackTags", { feedbackId: fId, tagId });
      return fId;
    });

    await t.mutation(internal.admin_api_tags.deleteTag, {
      organizationId: orgId,
      tagId,
    });

    const tags = await t.query(internal.admin_api_tags.listTags, {
      organizationId: orgId,
    });
    expect(tags).toHaveLength(0);

    // feedbackTags junction should be cleaned
    const remaining = await t.run(async (ctx) =>
      ctx.db.query("feedbackTags").collect()
    );
    expect(remaining).toHaveLength(0);
  });
});
