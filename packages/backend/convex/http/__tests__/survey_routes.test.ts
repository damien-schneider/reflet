/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { hashSecretKey } from "../../feedback/api_auth";
import { seedBranchingSurvey } from "../../surveys/__tests__/branching_seed";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const PUBLIC_KEY = "fb_pub_surveys";
const SECRET_KEY = "fb_sec_surveys";

async function setup() {
  const t = setupTest();
  const seeded = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    await ctx.db.insert("organizationApiKeys", {
      createdAt: Date.now(),
      isActive: true,
      name: "Widget",
      organizationId,
      publicKey: PUBLIC_KEY,
      secretKeyHash: await hashSecretKey(SECRET_KEY),
    });
    return {
      organizationId,
      ...(await seedBranchingSurvey(ctx, organizationId)),
    };
  });
  const call = async (
    path: string,
    init: { body?: Record<string, unknown>; key?: string } = {}
  ) => {
    const response = await t.fetch(path, {
      body: init.body ? JSON.stringify(init.body) : undefined,
      headers: { Authorization: `Bearer ${init.key ?? PUBLIC_KEY}` },
      method: init.body ? "POST" : "GET",
    });
    return { body: await response.json(), status: response.status };
  };
  return { ...seeded, call, t };
}

describe("survey REST API", () => {
  test("a respondent goes from eligible to a branching ending, then stops being eligible", async () => {
    const { call, fix, score, surveyId } = await setup();

    const eligible = await call("/api/v1/surveys/eligible?respondentId=v1");
    expect(eligible.body.surveys.map((s: { _id: string }) => s._id)).toEqual([
      surveyId,
    ]);

    const started = await call("/api/v1/surveys/respond/start", {
      body: { respondentId: "v1", surveyId },
    });
    const { responseId } = started.body;
    for (const [questionId, value] of [
      [score, 2],
      [fix, "Search"],
    ] as const) {
      const answered = await call("/api/v1/surveys/respond/answer", {
        body: { questionId, responseId, value },
      });
      expect(answered.status).toBe(200);
    }
    const completed = await call("/api/v1/surveys/respond/complete", {
      body: { responseId },
    });

    expect(completed).toEqual({
      body: { endingId: "detractor", success: true },
      status: 200,
    });
    expect(
      (await call("/api/v1/surveys/eligible?respondentId=v1")).body
    ).toEqual({ surveys: [] });
  });

  test("business errors come back as 400 with a readable message", async () => {
    const { call, love, score, surveyId } = await setup();
    const { responseId } = (
      await call("/api/v1/surveys/respond/start", {
        body: { respondentId: "v2", surveyId },
      })
    ).body;

    expect(
      await call("/api/v1/surveys/respond/answer", {
        body: { questionId: score, responseId, value: 42 },
      })
    ).toEqual({ body: { error: "Pick a score from 0 to 10." }, status: 400 });
    await call("/api/v1/surveys/respond/answer", {
      body: { questionId: score, responseId, value: 9 },
    });
    expect(
      await call("/api/v1/surveys/respond/complete", { body: { responseId } })
    ).toEqual({
      body: { error: "Answer “What do you love?” before finishing." },
      status: 400,
    });
    expect(
      await call("/api/v1/surveys/respond/answer", {
        body: { questionId: love, responseId: "nope", value: "x" },
      })
    ).toEqual({ body: { error: "Response not found." }, status: 400 });
  });

  test("dismissing abandons the response", async () => {
    const { call, surveyId, t } = await setup();
    const { responseId } = (
      await call("/api/v1/surveys/respond/start", {
        body: { respondentId: "v3", surveyId },
      })
    ).body;

    expect(
      await call("/api/v1/surveys/respond/dismiss", { body: { responseId } })
    ).toEqual({ body: { success: true }, status: 200 });
    const stored = await t.run((ctx) =>
      ctx.db
        .query("surveyResponses")
        .withIndex("by_survey_respondent", (q) =>
          q.eq("surveyId", surveyId).eq("respondentId", "v3")
        )
        .unique()
    );
    expect(stored?.status).toBe("abandoned");
  });

  test("the admin API creates branching surveys and rejects malformed drafts", async () => {
    const { call } = await setup();

    const created = await call("/api/v1/admin/survey/create", {
      body: {
        questions: [
          {
            next: { kind: "question", questionIndex: 2 },
            title: "Skip ahead",
            type: "text",
          },
          { title: "Skipped", type: "text" },
          { title: "Landed", type: "rating" },
        ],
        title: "Admin made",
        triggerType: "manual",
      },
      key: SECRET_KEY,
    });
    expect(created.status).toBe(200);

    const survey = await call(`/api/v1/admin/survey?id=${created.body}`, {
      key: SECRET_KEY,
    });
    expect(survey.body.questions[0].next).toEqual({
      kind: "question",
      questionId: survey.body.questions[2]._id,
    });

    const malformed = await call("/api/v1/admin/survey/create", {
      body: { questions: [], title: "Bad", triggerType: "sometimes" },
      key: SECRET_KEY,
    });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toContain("triggerType");
  });
});
