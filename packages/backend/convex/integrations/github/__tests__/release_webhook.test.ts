/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import { seedGithubConnection, seedOrganization } from "../../../test.fixtures";
import { setupTest, type TestContext } from "../../../test.helpers";
import type { GithubReleaseSnapshot } from "../release_mirror";

const GITHUB_RELEASE_ID = "gh-release-1";
const PUBLISHED_AT = Date.UTC(2026, 0, 1);

const snapshot = (
  overrides: Partial<GithubReleaseSnapshot> = {}
): GithubReleaseSnapshot => ({
  body: "Changesets notes",
  createdAt: PUBLISHED_AT,
  githubReleaseId: GITHUB_RELEASE_ID,
  htmlUrl: "https://github.com/acme/app/releases/tag/v1.4.0",
  isDraft: false,
  isPrerelease: false,
  name: "v1.4.0",
  publishedAt: PUBLISHED_AT,
  tagName: "v1.4.0",
  ...overrides,
});

const setup = async (connection: Partial<Doc<"githubConnections">> = {}) => {
  const t = setupTest();
  const ids = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const connectionId = await seedGithubConnection(
      ctx,
      organizationId,
      connection
    );
    return { connectionId, organizationId };
  });
  return { ...ids, t };
};

const deliver = (
  t: TestContext,
  connectionId: Id<"githubConnections">,
  action: string,
  release: GithubReleaseSnapshot
) =>
  t.mutation(
    internal.integrations.github.release_webhook.processReleaseWebhook,
    {
      action,
      connectionId,
      release,
    }
  );

const seedLinkedRelease = (
  t: TestContext,
  organizationId: Id<"organizations">,
  release: Partial<Doc<"releases">>
) =>
  t.run(async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("releases", {
      createdAt: now,
      description: "Changesets notes",
      githubReleaseId: GITHUB_RELEASE_ID,
      organizationId,
      publishedAt: now,
      syncedFromGithub: true,
      title: "v1.4.0",
      updatedAt: now,
      version: "v1.4.0",
      ...release,
    });
  });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("published", () => {
  test("links the Reflet release that already owns the tag instead of duplicating it", async () => {
    const { connectionId, organizationId, t } = await setup({
      autoSyncReleases: true,
    });
    const releaseId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("releases", {
        createdAt: now,
        description: "Written in Reflet",
        organizationId,
        publishedAt: now,
        title: "Faster sync",
        updatedAt: now,
        version: "v1.4.0",
      });
    });

    await deliver(t, connectionId, "published", snapshot());

    const { mirrors, releases } = await t.run(async (ctx) => ({
      mirrors: await ctx.db.query("githubReleases").collect(),
      releases: await ctx.db.query("releases").collect(),
    }));
    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({
      _id: releaseId,
      description: "Written in Reflet",
      githubReleaseId: GITHUB_RELEASE_ID,
      title: "Faster sync",
    });
    expect(mirrors[0]?.refletReleaseId).toBe(releaseId);
  });

  test("links an unpublished Reflet draft without publishing it and proposes CI's notes", async () => {
    const { connectionId, organizationId, t } = await setup({
      autoSyncReleases: true,
    });
    const releaseId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("releases", {
        createdAt: now,
        description: "Draft written in Reflet",
        organizationId,
        title: "Faster sync",
        updatedAt: now,
        version: "v1.4.0",
      });
    });

    await deliver(t, connectionId, "published", snapshot());

    const { drafts, release } = await t.run(async (ctx) => ({
      drafts: await ctx.db.query("releaseDrafts").collect(),
      release: await ctx.db.get(releaseId),
    }));
    expect(release?.publishedAt).toBeUndefined();
    expect(release?.githubReleaseId).toBe(GITHUB_RELEASE_ID);
    expect(release?.description).toBe("Draft written in Reflet");
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      description: "Changesets notes",
      origin: "github",
      status: "pending",
    });
  });
});

describe("push echo", () => {
  test("the webhook echoing a Reflet push records no draft", async () => {
    const { connectionId, organizationId, t } = await setup();
    const releaseId = await t.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("releases", {
        createdAt: now,
        description: "Old notes",
        organizationId,
        publishedAt: now,
        title: "Faster sync",
        updatedAt: now,
        version: "v1.4.0",
      });
    });
    await t.mutation(
      internal.integrations.github.release_mutations.recordGithubPush,
      {
        githubHtmlUrl: "https://github.com/acme/app/releases/tag/v1.4.0",
        githubReleaseId: GITHUB_RELEASE_ID,
        pushed: { body: "Old notes", name: "Faster sync", tagName: "v1.4.0" },
        releaseId,
        syncedAt: Date.now(),
      }
    );
    await deliver(
      t,
      connectionId,
      "published",
      snapshot({ body: "Old notes", name: "Faster sync" })
    );
    await t.run((ctx) =>
      ctx.db.patch(releaseId, {
        description: "New notes",
        updatedAt: Date.now(),
      })
    );
    await t.mutation(
      internal.integrations.github.release_mutations.recordGithubPush,
      {
        githubHtmlUrl: "https://github.com/acme/app/releases/tag/v1.4.0",
        githubReleaseId: GITHUB_RELEASE_ID,
        pushed: { body: "New notes", name: "Faster sync", tagName: "v1.4.0" },
        releaseId,
        syncedAt: Date.now(),
      }
    );

    await deliver(
      t,
      connectionId,
      "edited",
      snapshot({ body: "New notes", name: "Faster sync" })
    );

    const { drafts, release } = await t.run(async (ctx) => ({
      drafts: await ctx.db.query("releaseDrafts").collect(),
      release: await ctx.db.get(releaseId),
    }));
    expect(drafts).toEqual([]);
    expect(release?.description).toBe("New notes");
  });
});

describe("edited", () => {
  test("updates a release whose notes were never edited in Reflet", async () => {
    const { connectionId, organizationId, t } = await setup();
    await deliver(t, connectionId, "published", snapshot());
    const releaseId = await seedLinkedRelease(t, organizationId, {});

    await deliver(
      t,
      connectionId,
      "edited",
      snapshot({ body: "Fixed typo", name: "v1.4.0 — Faster sync" })
    );

    const { drafts, release } = await t.run(async (ctx) => ({
      drafts: await ctx.db.query("releaseDrafts").collect(),
      release: await ctx.db.get(releaseId),
    }));
    expect(release?.description).toBe("Fixed typo");
    expect(release?.title).toBe("v1.4.0 — Faster sync");
    expect(drafts).toEqual([]);
  });

  test("proposes a pending GitHub draft when the notes were edited in Reflet", async () => {
    const { connectionId, organizationId, t } = await setup();
    await deliver(t, connectionId, "published", snapshot());
    const releaseId = await seedLinkedRelease(t, organizationId, {
      description: "Rewritten for customers",
    });

    await deliver(t, connectionId, "edited", snapshot({ body: "Fixed typo" }));

    const { drafts, release } = await t.run(async (ctx) => ({
      drafts: await ctx.db.query("releaseDrafts").collect(),
      release: await ctx.db.get(releaseId),
    }));
    expect(release?.description).toBe("Rewritten for customers");
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      description: "Fixed typo",
      origin: "github",
      releaseId,
      status: "pending",
    });
  });

  test("follows a renamed tag", async () => {
    const { connectionId, organizationId, t } = await setup();
    await deliver(t, connectionId, "published", snapshot());
    const releaseId = await seedLinkedRelease(t, organizationId, {});

    await deliver(t, connectionId, "edited", snapshot({ tagName: "v1.4.1" }));

    const release = await t.run((ctx) => ctx.db.get(releaseId));
    expect(release?.version).toBe("v1.4.1");
  });
});

describe("deleted", () => {
  test("drops the mirror and unlinks the release, keeping its notes", async () => {
    const { connectionId, organizationId, t } = await setup();
    await deliver(t, connectionId, "published", snapshot());
    const releaseId = await seedLinkedRelease(t, organizationId, {
      githubHtmlUrl: "https://github.com/acme/app/releases/tag/v1.4.0",
      githubSyncedAt: Date.now(),
    });

    await deliver(t, connectionId, "deleted", snapshot());

    const { mirrors, release } = await t.run(async (ctx) => ({
      mirrors: await ctx.db.query("githubReleases").collect(),
      release: await ctx.db.get(releaseId),
    }));
    expect(mirrors).toEqual([]);
    expect(release?.description).toBe("Changesets notes");
    expect(release?.githubHtmlUrl).toBeUndefined();
    expect(release?.githubReleaseId).toBeUndefined();
    expect(release?.githubSyncedAt).toBeUndefined();
  });
});
