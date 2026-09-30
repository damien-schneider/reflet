import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { seedOrganization } from "../../test.fixtures";
import { modules } from "../../test.helpers";

async function setup(counts: {
  completionRate: number;
  maxResponses?: number;
  responseCount: number;
}) {
  const t = convexTest(schema, modules);
  const { organizationId, surveyId } = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const surveyId = await ctx.db.insert("surveys", {
      ...counts,
      createdAt: Date.now(),
      createdBy: "user-1",
      organizationId,
      status: "active",
      title: "NPS",
      triggerType: "manual",
      updatedAt: Date.now(),
    });
    return { organizationId, surveyId };
  });
  const start = () =>
    t.mutation(internal.surveys.responses.startResponse, {
      organizationId,
      surveyId,
    });
  const complete = (responseId: Id<"surveyResponses">) =>
    t.mutation(internal.surveys.responses.completeResponse, {
      organizationId,
      responseId,
    });
  const survey = () => t.run((ctx) => ctx.db.get(surveyId));
  return { complete, start, survey };
}

describe("survey response counters", () => {
  it("continues a pre-existing survey's counts without recounting responses", async () => {
    const { complete, start, survey } = await setup({
      completionRate: 50,
      responseCount: 10,
    });

    const responseId = await start();
    expect(await survey()).toMatchObject({ responseCount: 11 });

    await complete(responseId);
    await complete(responseId);
    expect(await survey()).toMatchObject({
      completedCount: 6,
      completionRate: 55,
      responseCount: 11,
    });
  });

  it("closes the survey once started responses reach the cap", async () => {
    const { start } = await setup({
      completionRate: 0,
      maxResponses: 2,
      responseCount: 0,
    });

    await start();
    await start();
    await expect(start()).rejects.toThrow("maximum responses");
  });
});
