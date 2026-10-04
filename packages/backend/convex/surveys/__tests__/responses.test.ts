/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";
import { DETRACTOR_ENDING, seedBranchingSurvey } from "./branching_seed";
import { insertQuestion, insertSurvey } from "./survey_seed";

const DAY_MS = 24 * 60 * 60 * 1000;

async function setupBranching(overrides = {}) {
  const t = setupTest();
  const seeded = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const survey = await seedBranchingSurvey(ctx, organizationId, overrides);
    return { organizationId, ...survey };
  });
  const { organizationId, surveyId } = seeded;
  const start = (respondentId?: string) =>
    t.mutation(internal.surveys.responses.startResponse, {
      organizationId,
      respondentId,
      surveyId,
    });
  const answer = (
    responseId: Id<"surveyResponses">,
    questionId: Id<"surveyQuestions">,
    value: string | number | boolean | string[] | null
  ) =>
    t.mutation(internal.surveys.responses.submitAnswer, {
      organizationId,
      questionId,
      responseId,
      value,
    });
  const complete = (responseId: Id<"surveyResponses">) =>
    t.mutation(internal.surveys.responses.completeResponse, {
      organizationId,
      responseId,
    });
  const answersOf = (responseId: Id<"surveyResponses">) =>
    t.run((ctx) =>
      ctx.db
        .query("surveyAnswers")
        .withIndex("by_response", (q) => q.eq("responseId", responseId))
        .collect()
    );
  return { ...seeded, answer, answersOf, complete, start, t };
}

describe("survey response counters", () => {
  it("continues a pre-existing survey's counts without recounting responses", async () => {
    const t = setupTest();
    const { organizationId, surveyId } = await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      const surveyId = await insertSurvey(ctx, organizationId, {
        completionRate: 50,
        responseCount: 10,
      });
      await insertQuestion(
        ctx,
        { organizationId, surveyId },
        { order: 0, title: "Anything else?", type: "text" }
      );
      return { organizationId, surveyId };
    });
    const responseId = await t.mutation(
      internal.surveys.responses.startResponse,
      { organizationId, surveyId }
    );
    expect(await t.run((ctx) => ctx.db.get(surveyId))).toMatchObject({
      responseCount: 11,
    });

    const args = { organizationId, responseId };
    await t.mutation(internal.surveys.responses.completeResponse, args);
    await t.mutation(internal.surveys.responses.completeResponse, args);
    expect(await t.run((ctx) => ctx.db.get(surveyId))).toMatchObject({
      completedCount: 6,
      completionRate: 55,
      responseCount: 11,
    });
  });

  it("closes the survey once completed responses reach the cap", async () => {
    const { answer, complete, fix, score, start, surveyId, t } =
      await setupBranching({ maxResponses: 2 });
    const finish = async (responseId: Id<"surveyResponses">) => {
      await answer(responseId, score, 2);
      await answer(responseId, fix, "Speed");
      return await complete(responseId);
    };

    const first = await start("a");
    const second = await start("b");
    const third = await start("c");
    await finish(first);
    expect(await t.run((ctx) => ctx.db.get(surveyId))).toMatchObject({
      status: "active",
    });
    await finish(second);

    expect(await t.run((ctx) => ctx.db.get(surveyId))).toMatchObject({
      completedCount: 2,
      status: "closed",
    });
    await expect(start("d")).rejects.toThrow("not accepting responses");
    await expect(finish(third)).resolves.toEqual({
      endingId: DETRACTOR_ENDING.id,
    });
  });
});

describe("answering", () => {
  it("rejects values the question can't take with a readable message", async () => {
    const { answer, score, start } = await setupBranching();
    const responseId = await start();

    await expect(answer(responseId, score, 11)).rejects.toThrow(
      "Pick a score from 0 to 10."
    );
    await expect(answer(responseId, score, "nine")).rejects.toThrow(
      "Pick a score from 0 to 10."
    );
  });

  it("rejects statements and questions from another survey", async () => {
    const { answer, organizationId, start, surveyId, t } =
      await setupBranching();
    const { otherQuestion, statement } = await t.run(async (ctx) => {
      const otherSurveyId = await insertSurvey(ctx, organizationId);
      return {
        otherQuestion: await insertQuestion(
          ctx,
          { organizationId, surveyId: otherSurveyId },
          { order: 0, title: "Elsewhere", type: "text" }
        ),
        statement: await insertQuestion(
          ctx,
          { organizationId, surveyId },
          { order: 3, title: "Thanks for reading", type: "statement" }
        ),
      };
    });
    const responseId = await start();

    await expect(answer(responseId, statement, "ok")).rejects.toThrow(
      "doesn’t take an answer"
    );
    await expect(answer(responseId, otherQuestion, "hi")).rejects.toThrow(
      "Question not found."
    );
  });

  it("replaces an answer and clears it with null", async () => {
    const { answer, answersOf, score, start } = await setupBranching();
    const responseId = await start();

    await answer(responseId, score, 4);
    await answer(responseId, score, 9);
    expect((await answersOf(responseId)).map((a) => a.value)).toEqual([9]);

    expect(await answer(responseId, score, null)).toBeNull();
    expect(await answersOf(responseId)).toHaveLength(0);
  });
});

describe("completing on a branching flow", () => {
  it("requires the questions on the respondent's own path", async () => {
    const { answer, complete, fix, score, start } = await setupBranching();
    const responseId = await start();
    await answer(responseId, score, 9);
    await answer(responseId, fix, "Nothing, but answered anyway");

    await expect(complete(responseId)).rejects.toThrow(
      "Answer “What do you love?” before finishing."
    );
  });

  it("stores the reached ending and drops answers left off the final path", async () => {
    const { answer, answersOf, complete, fix, love, score, start, t } =
      await setupBranching();
    const responseId = await start();
    await answer(responseId, score, 9);
    await answer(responseId, love, "The editor");
    await answer(responseId, score, 3);
    await answer(responseId, fix, "Load times");

    expect(await complete(responseId)).toEqual({
      endingId: DETRACTOR_ENDING.id,
    });

    const kept = await answersOf(responseId);
    expect(kept.map((a) => a.questionId).sort()).toEqual([fix, score].sort());
    expect(await t.run((ctx) => ctx.db.get(responseId))).toMatchObject({
      endingId: DETRACTOR_ENDING.id,
      status: "completed",
    });
  });

  it("queues a survey.response.completed webhook for subscribed endpoints", async () => {
    const { answer, complete, fix, organizationId, score, start, t } =
      await setupBranching();
    await t.run((ctx) =>
      ctx.db.insert("organizationWebhooks", {
        consecutiveFailures: 0,
        createdAt: Date.now(),
        events: ["survey.response.completed"],
        isActive: true,
        organizationId,
        secret: "s".repeat(64),
        updatedAt: Date.now(),
        url: "https://hooks.example.com/reflet",
      })
    );
    const responseId = await start();
    await answer(responseId, score, 1);
    await answer(responseId, fix, "Pricing");
    await complete(responseId);

    const deliveries = await t.run((ctx) =>
      ctx.db.query("webhookDeliveries").collect()
    );
    expect(deliveries).toEqual([
      expect.objectContaining({
        event: "survey.response.completed",
        surveyResponseId: responseId,
      }),
    ]);
  });
});

describe("leaving a survey", () => {
  it("dismissing abandons the response and stops further answers", async () => {
    const { answer, organizationId, score, start, t } = await setupBranching();
    const responseId = await start();

    await t.mutation(internal.surveys.responses.dismissResponse, {
      organizationId,
      responseId,
    });

    expect(await t.run((ctx) => ctx.db.get(responseId))).toMatchObject({
      status: "abandoned",
    });
    await expect(answer(responseId, score, 5)).rejects.toThrow(
      "no longer accepting answers"
    );
  });

  it("the daily sweep abandons only responses idle for over a day", async () => {
    const { organizationId, surveyId, t } = await setupBranching();
    const [stale, fresh] = await t.run(async (ctx) => {
      const base = { organizationId, status: "in_progress" as const, surveyId };
      return [
        await ctx.db.insert("surveyResponses", {
          ...base,
          startedAt: Date.now() - 2 * DAY_MS,
        }),
        await ctx.db.insert("surveyResponses", {
          ...base,
          startedAt: Date.now() - DAY_MS / 2,
        }),
      ];
    });

    expect(
      await t.mutation(internal.surveys.responses.abandonStaleResponses, {})
    ).toEqual({ abandoned: 1 });
    const statuses = await t.run(async (ctx) => [
      (await ctx.db.get(stale))?.status,
      (await ctx.db.get(fresh))?.status,
    ]);
    expect(statuses).toEqual(["abandoned", "in_progress"]);
  });
});
