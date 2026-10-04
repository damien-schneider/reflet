/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api, internal } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";
import { PROMOTER_ENDING, seedBranchingSurvey } from "./branching_seed";

async function setup(linkEnabled = true) {
  const t = setupTest();
  const seeded = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx, {
      name: "Acme",
      primaryColor: "#ff5500",
    });
    return {
      organizationId,
      ...(await seedBranchingSurvey(ctx, organizationId, { linkEnabled })),
    };
  });
  return { ...seeded, t };
}

describe("hosted link surveys", () => {
  it("serves only link-enabled, open surveys with the organization's branding", async () => {
    const { surveyId, t } = await setup();

    const page = await t.query(api.surveys.link.get, {
      respondentId: "visitor",
      surveyId,
    });
    expect(page).toMatchObject({
      alreadyCompleted: false,
      organization: { name: "Acme", primaryColor: "#ff5500" },
      survey: { _id: surveyId },
    });
    expect(page?.survey.questions).toHaveLength(3);

    await t.run((ctx) => ctx.db.patch(surveyId, { linkEnabled: false }));
    expect(
      await t.query(api.surveys.link.get, { respondentId: "visitor", surveyId })
    ).toBeNull();
    expect(
      await t.query(api.surveys.link.get, {
        respondentId: "visitor",
        surveyId: "garbage",
      })
    ).toBeNull();
  });

  it("runs a full response on the link channel and remembers completion", async () => {
    const { love, score, surveyId, t } = await setup();

    const responseId = await t.mutation(api.surveys.link.start, {
      respondentId: "visitor",
      surveyId,
    });
    await t.mutation(api.surveys.link.answer, {
      questionId: score,
      responseId,
      value: 10,
    });
    await t.mutation(api.surveys.link.answer, {
      questionId: love,
      responseId,
      value: "Speed",
    });
    expect(await t.mutation(api.surveys.link.complete, { responseId })).toEqual(
      { endingId: PROMOTER_ENDING.id }
    );

    expect(await t.run((ctx) => ctx.db.get(responseId))).toMatchObject({
      channel: "link",
      status: "completed",
    });
    expect(
      await t.query(api.surveys.link.get, { respondentId: "visitor", surveyId })
    ).toMatchObject({ alreadyCompleted: true });
    await expect(
      t.mutation(api.surveys.link.start, { respondentId: "visitor", surveyId })
    ).rejects.toThrow("already answered");
  });

  it("refuses to start when links are off", async () => {
    const { surveyId, t } = await setup(false);

    await expect(
      t.mutation(api.surveys.link.start, { respondentId: "visitor", surveyId })
    ).rejects.toThrow("Survey not found.");
  });

  it("keeps link and in-app responses apart", async () => {
    const { organizationId, score, surveyId, t } = await setup();
    const linkResponse = await t.mutation(api.surveys.link.start, {
      respondentId: "visitor",
      surveyId,
    });
    const inAppResponse = await t.mutation(
      internal.surveys.responses.startResponse,
      { organizationId, respondentId: "widget-user", surveyId }
    );

    await expect(
      t.mutation(api.surveys.link.answer, {
        questionId: score,
        responseId: inAppResponse,
        value: 3,
      })
    ).rejects.toThrow("Response not found.");
    await expect(
      t.mutation(internal.surveys.responses.submitAnswer, {
        organizationId,
        questionId: score,
        responseId: linkResponse,
        value: 3,
      })
    ).rejects.toThrow("Response not found.");
  });
});

describe("link survey throttling", () => {
  it("caps how often one response can be completed per minute", async () => {
    const { love, score, surveyId, t } = await setup();
    const responseId = await t.mutation(api.surveys.link.start, {
      respondentId: "visitor",
      surveyId,
    });
    await t.mutation(api.surveys.link.answer, {
      questionId: score,
      responseId,
      value: 10,
    });
    await t.mutation(api.surveys.link.answer, {
      questionId: love,
      responseId,
      value: "Speed",
    });
    const completesPerMinute = 5;
    for (let attempt = 0; attempt < completesPerMinute; attempt++) {
      await t.mutation(api.surveys.link.complete, { responseId });
    }

    await expect(
      t.mutation(api.surveys.link.complete, { responseId })
    ).rejects.toThrow("Too many requests");
  });
});
