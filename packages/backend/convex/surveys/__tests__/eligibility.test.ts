/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";
import { insertQuestion, insertResponse, insertSurvey } from "./survey_seed";

const DAY_MS = 24 * 60 * 60 * 1000;

async function setup() {
  const t = setupTest();
  const organizationId = await t.run((ctx) => seedOrganization(ctx));
  const addSurvey = (overrides: Partial<Doc<"surveys">> = {}) =>
    t.run(async (ctx) => {
      const surveyId = await insertSurvey(ctx, organizationId, overrides);
      await insertQuestion(
        ctx,
        { organizationId, surveyId },
        { order: 0, required: true, title: "Rate us", type: "rating" }
      );
      return surveyId;
    });
  const addResponse = (
    surveyId: Id<"surveys">,
    response: {
      daysAgo: number;
      externalUserId?: Id<"externalUsers">;
      respondentId?: string;
      status: Doc<"surveyResponses">["status"];
    }
  ) =>
    t.run((ctx) =>
      insertResponse(
        ctx,
        { organizationId, surveyId },
        {
          fields: {
            externalUserId: response.externalUserId,
            respondentId: response.respondentId,
          },
          startedAt: Date.now() - response.daysAgo * DAY_MS,
          status: response.status,
        }
      )
    );
  const eligibleIds = async (
    respondent: { externalUserId?: Id<"externalUsers">; respondentId?: string },
    filters: { surveyId?: string; triggerType?: "page_visit" } = {}
  ) =>
    (
      await t.query(internal.surveys.responses.getEligibleSurveys, {
        organizationId,
        ...respondent,
        ...filters,
      })
    ).map((survey) => survey._id);
  const start = (surveyId: Id<"surveys">, respondentId: string) =>
    t.mutation(internal.surveys.responses.startResponse, {
      organizationId,
      respondentId,
      surveyId,
    });
  return { addResponse, addSurvey, eligibleIds, organizationId, start, t };
}

describe("survey eligibility", () => {
  it("respects the schedule and the cap on completed responses", async () => {
    const { addSurvey, eligibleIds } = await setup();
    const now = Date.now();
    const running = await addSurvey({
      endsAt: now + DAY_MS,
      startsAt: now - DAY_MS,
    });
    await addSurvey({ startsAt: now + DAY_MS });
    await addSurvey({ endsAt: now - DAY_MS });
    await addSurvey({ completedCount: 3, maxResponses: 3, responseCount: 9 });
    const underCap = await addSurvey({
      completedCount: 2,
      maxResponses: 3,
      responseCount: 9,
    });
    await addSurvey({ status: "paused" });

    expect(await eligibleIds({ respondentId: "r1" })).toEqual([
      running,
      underCap,
    ]);
  });

  it("shows a 'once' survey a single time per respondent", async () => {
    const { addResponse, addSurvey, eligibleIds, start } = await setup();
    const surveyId = await addSurvey({ display: { frequency: "once" } });
    await addResponse(surveyId, {
      daysAgo: 30,
      respondentId: "seen",
      status: "abandoned",
    });

    expect(await eligibleIds({ respondentId: "seen" })).toEqual([]);
    expect(await eligibleIds({ respondentId: "new" })).toEqual([surveyId]);
    await expect(start(surveyId, "seen")).rejects.toThrow("already shown");
  });

  it("re-asks 'until completed' after the recontact wait, never after completion", async () => {
    const { addResponse, addSurvey, eligibleIds } = await setup();
    const surveyId = await addSurvey({
      display: { frequency: "until_completed", recontactDays: 7 },
    });
    await addResponse(surveyId, {
      daysAgo: 8,
      respondentId: "waited",
      status: "abandoned",
    });
    await addResponse(surveyId, {
      daysAgo: 1,
      respondentId: "recent",
      status: "abandoned",
    });
    await addResponse(surveyId, {
      daysAgo: 30,
      respondentId: "done",
      status: "completed",
    });

    expect(await eligibleIds({ respondentId: "waited" })).toEqual([surveyId]);
    expect(await eligibleIds({ respondentId: "recent" })).toEqual([]);
    expect(await eligibleIds({ respondentId: "done" })).toEqual([]);
  });

  it("repeats 'recurring' surveys once the recontact wait has passed", async () => {
    const { addResponse, addSurvey, eligibleIds } = await setup();
    const surveyId = await addSurvey({
      display: { frequency: "recurring", recontactDays: 3 },
    });
    await addResponse(surveyId, {
      daysAgo: 4,
      respondentId: "due",
      status: "completed",
    });
    await addResponse(surveyId, {
      daysAgo: 1,
      respondentId: "early",
      status: "completed",
    });

    expect(await eligibleIds({ respondentId: "due" })).toEqual([surveyId]);
    expect(await eligibleIds({ respondentId: "early" })).toEqual([]);
  });

  it("follows an identified user across devices but not anonymous strangers", async () => {
    const { addResponse, addSurvey, eligibleIds, organizationId, t } =
      await setup();
    const externalUserId = await t.run((ctx) =>
      ctx.db.insert("externalUsers", {
        createdAt: Date.now(),
        externalId: "user-42",
        lastSeenAt: Date.now(),
        organizationId,
      })
    );
    const surveyId = await addSurvey({ display: { frequency: "once" } });
    await addResponse(surveyId, {
      daysAgo: 2,
      externalUserId,
      respondentId: "laptop",
      status: "completed",
    });

    expect(
      await eligibleIds({ externalUserId, respondentId: "phone" })
    ).toEqual([]);
    expect(await eligibleIds({ respondentId: "phone" })).toEqual([surveyId]);
  });

  it("keeps each respondent consistently in or out of a sample", async () => {
    const { addSurvey, eligibleIds, start } = await setup();
    const surveyId = await addSurvey({ triggerConfig: { sampleRate: 50 } });
    const respondents = Array.from({ length: 20 }, (_, i) => `visitor-${i}`);

    const sampledIn = async () => {
      const included: string[] = [];
      for (const respondentId of respondents) {
        if ((await eligibleIds({ respondentId })).length > 0) {
          included.push(respondentId);
        }
      }
      return included;
    };
    const firstPass = await sampledIn();

    expect(firstPass.length).toBeGreaterThan(0);
    expect(firstPass.length).toBeLessThan(respondents.length);
    expect(await sampledIn()).toEqual(firstPass);
    const excluded = respondents.find((id) => !firstPass.includes(id));
    if (excluded) {
      await expect(start(surveyId, excluded)).rejects.toThrow("sample");
    }
  });

  it("falls through to the next active survey when the first is not eligible", async () => {
    const { addResponse, addSurvey, eligibleIds, organizationId, t } =
      await setup();
    const alreadySeen = await addSurvey({ display: { frequency: "once" } });
    const fresh = await addSurvey({
      triggerConfig: { pageUrl: "/pricing" },
      triggerType: "page_visit",
    });
    await addResponse(alreadySeen, {
      daysAgo: 1,
      respondentId: "r1",
      status: "completed",
    });

    const active = await t.query(internal.surveys.responses.getActiveSurvey, {
      organizationId,
      respondentId: "r1",
    });
    expect(active?._id).toBe(fresh);
    expect(active?.endings).toEqual([
      expect.objectContaining({ id: "default" }),
    ]);
    expect(
      await eligibleIds({ respondentId: "r2" }, { triggerType: "page_visit" })
    ).toEqual([fresh]);
    expect(
      await eligibleIds({ respondentId: "r2" }, { surveyId: alreadySeen })
    ).toEqual([alreadySeen]);
    expect(
      await eligibleIds({ respondentId: "r2" }, { surveyId: "not-an-id" })
    ).toEqual([]);
  });
});
