/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";
import { UNTITLED_RELEASE_TITLE } from "../release_text";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };

const sourceAt = (headSha: string) => ({
  commits: [],
  files: [],
  headRef: "v1.0.0",
  headSha,
  pullRequests: [],
  totalCommits: 0,
});

const FIRST_SHA = "a".repeat(40);
const SECOND_SHA = "b".repeat(40);

const setup = async () => {
  const t = setupTest({ authUsers: [ADMIN] });
  const releaseId = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "admin",
      userId: ADMIN._id,
    });
    return await ctx.db.insert("releases", {
      createdAt: Date.now(),
      organizationId,
      title: UNTITLED_RELEASE_TITLE,
      updatedAt: Date.now(),
    });
  });
  const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });
  const save = (description: string, headSha = FIRST_SHA) =>
    admin.mutation(api.changelog.release_drafts.saveGeneratedDraft, {
      description,
      releaseId,
      source: sourceAt(headSha),
      title: "Generated",
    });
  const readRelease = () => t.run(async (ctx) => await ctx.db.get(releaseId));
  const readSnapshotHead = () =>
    t.run(
      async (ctx) =>
        (
          await ctx.db
            .query("releaseCommits")
            .withIndex("by_release", (q) => q.eq("releaseId", releaseId))
            .first()
        )?.headSha
    );
  const editDescription = () =>
    t.run(async (ctx) => {
      await ctx.db.patch(releaseId, { description: "Hand written" });
    });
  return { admin, editDescription, readRelease, readSnapshotHead, save, t };
};

describe("saveGeneratedDraft", () => {
  test("applies drafts while the human has not edited the description", async () => {
    const { readRelease, save } = await setup();

    expect((await save("First")).applied).toBe(true);
    expect((await save("Second")).applied).toBe(true);

    const release = await readRelease();
    expect(release?.description).toBe("Second");
    expect(release?.title).toBe("Generated");
  });

  test("keeps a draft pending once the human edited the description", async () => {
    const { editDescription, readRelease, readSnapshotHead, save, t } =
      await setup();
    await save("First");
    await editDescription();

    const result = await save("Second", SECOND_SHA);

    expect(result.applied).toBe(false);
    expect((await readRelease())?.description).toBe("Hand written");
    expect(await readSnapshotHead()).toBe(FIRST_SHA);
    const draft = await t.run(async (ctx) => await ctx.db.get(result.draftId));
    expect(draft?.status).toBe("pending");
  });

  test("dismissing a pending draft leaves the applied snapshot untouched", async () => {
    const { admin, editDescription, readSnapshotHead, save } = await setup();
    await save("First");
    await editDescription();
    const { draftId } = await save("Second", SECOND_SHA);

    await admin.mutation(api.changelog.release_drafts.dismissDraft, {
      draftId,
    });

    expect(await readSnapshotHead()).toBe(FIRST_SHA);
  });

  test("applying a pending draft writes its snapshot and prose", async () => {
    const { admin, editDescription, readRelease, readSnapshotHead, save } =
      await setup();
    await save("First");
    await editDescription();
    const { draftId } = await save("Second", SECOND_SHA);

    await admin.mutation(api.changelog.release_drafts.applyDraft, { draftId });

    expect(await readSnapshotHead()).toBe(SECOND_SHA);
    expect((await readRelease())?.description).toBe("Second");
  });

  test("a newer pending AI draft dismisses the older one", async () => {
    const { editDescription, save, t } = await setup();
    await save("First");
    await editDescription();
    const older = await save("Second");

    await save("Third");

    const olderDraft = await t.run(
      async (ctx) => await ctx.db.get(older.draftId)
    );
    expect(olderDraft?.status).toBe("dismissed");
  });
});
