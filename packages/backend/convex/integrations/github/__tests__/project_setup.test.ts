/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api } from "../../../_generated/api";
import type { Id } from "../../../_generated/dataModel";
import type { MutationCtx } from "../../../_generated/server";
import { seedGithubConnection, seedOrganization } from "../../../test.fixtures";
import { setupTest } from "../../../test.helpers";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };

const seedSetup = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">
): Promise<Id<"projectSetupResults">> =>
  await ctx.db.insert("projectSetupResults", {
    createdAt: Date.now(),
    githubConnectionId: await seedGithubConnection(ctx, organizationId),
    organizationId,
    status: "review",
    steps: [],
    updatedAt: Date.now(),
  });

const setup = async () => {
  const t = setupTest({ authUsers: [ADMIN] });
  const ids = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const otherOrganizationId = await seedOrganization(ctx, { slug: "other" });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "owner",
      userId: ADMIN._id,
    });
    return {
      organizationId,
      otherSetupId: await seedSetup(ctx, otherOrganizationId),
      setupId: await seedSetup(ctx, organizationId),
    };
  });
  const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });
  return { ...ids, admin, t };
};

const NOTHING_ACCEPTED = {
  acceptedKeywords: [],
  acceptedMonitors: [],
  acceptedTags: [],
};

describe("applySetupResults", () => {
  test("refuses a proposed monitor on an internal URL", async () => {
    const { admin, organizationId, setupId, t } = await setup();

    await expect(
      admin.mutation(api.integrations.github.project_setup.applySetupResults, {
        ...NOTHING_ACCEPTED,
        acceptedMonitors: [
          { name: "Metadata", url: "http://169.254.169.254/latest/" },
        ],
        organizationId,
        setupId,
      })
    ).rejects.toThrow(/public/);
    expect(
      await t.run((ctx) => ctx.db.query("statusMonitors").collect())
    ).toEqual([]);
  });

  test("refuses to complete another organization's setup", async () => {
    const { admin, organizationId, otherSetupId } = await setup();

    await expect(
      admin.mutation(api.integrations.github.project_setup.applySetupResults, {
        ...NOTHING_ACCEPTED,
        organizationId,
        setupId: otherSetupId,
      })
    ).rejects.toThrow("Setup not found");
  });

  test("stores accepted monitors and keywords with the defaults of manual creation", async () => {
    const { admin, organizationId, setupId, t } = await setup();

    await admin.mutation(
      api.integrations.github.project_setup.applySetupResults,
      {
        ...NOTHING_ACCEPTED,
        acceptedKeywords: [{ keyword: "  acme app ", source: "both" }],
        acceptedMonitors: [{ name: "API", url: "https://api.acme.dev/" }],
        organizationId,
        setupId,
      }
    );

    const { keywords, monitors } = await t.run(async (ctx) => ({
      keywords: await ctx.db.query("intelligenceKeywords").collect(),
      monitors: await ctx.db.query("statusMonitors").collect(),
    }));
    expect(monitors).toMatchObject([
      { alertThreshold: 3, checkIntervalMinutes: 5, isPublic: true },
    ]);
    expect(keywords.map(({ keyword }) => keyword)).toEqual(["acme app"]);
  });
});
