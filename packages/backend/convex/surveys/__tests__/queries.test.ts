/// <reference types="vite/client" />
import { DEFAULT_DISPLAY, DEFAULT_ENDING } from "@reflet/survey-core";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { setupTest } from "../../test.helpers";
import {
  EXPORT_READ_LIMITS,
  loadRecentResponses,
} from "../lib/insights/recent_responses";
import {
  insertQuestion,
  insertResponse,
  insertSurvey,
  SURVEY_TEST_USERS,
  setupSurveyTest,
} from "./survey_seed";

const setup = () =>
  setupSurveyTest(setupTest({ authUsers: SURVEY_TEST_USERS }));

const BASE_TIME = Date.parse("2026-09-01T09:00:00Z");
const MINUTE = 60_000;

const seedAnsweredSurvey = async () => {
  const { member, organizationId, t } = await setup();
  const seeded = await t.run(async (ctx) => {
    const surveyId = await insertSurvey(ctx, organizationId);
    const survey = { organizationId, surveyId };
    const intro = await insertQuestion(ctx, survey, {
      order: 0,
      title: "Hi there",
      type: "statement",
    });
    const rating = await insertQuestion(ctx, survey, {
      order: 1,
      title: "Rate onboarding",
      type: "rating",
    });
    const features = await insertQuestion(ctx, survey, {
      config: { choices: ["Boards", "Roadmap"] },
      order: 2,
      title: "Which features?",
      type: "multiple_choice",
    });
    const removed = await insertQuestion(ctx, survey, {
      order: 3,
      title: "Removed later",
      type: "text",
    });
    const externalUserId = await ctx.db.insert("externalUsers", {
      createdAt: BASE_TIME,
      email: "ada@example.com",
      externalId: "customer-42",
      lastSeenAt: BASE_TIME,
      name: "Ada",
      organizationId,
    });

    const identified = await insertResponse(ctx, survey, {
      answers: [
        [features, ["Roadmap", "Boards"]],
        [removed, "gone"],
        [rating, 4],
      ],
      fields: {
        channel: "link",
        completedAt: BASE_TIME + MINUTE,
        endingId: "default",
        externalUserId,
        metadata: { pageUrl: "https://app.example.com/settings" },
      },
      startedAt: BASE_TIME,
      status: "completed",
    });
    const statuses = [
      "abandoned",
      "completed",
      "in_progress",
      "completed",
    ] as const;
    for (const [index, status] of statuses.entries()) {
      await insertResponse(ctx, survey, {
        answers: [[rating, index + 1]],
        fields: { respondentId: `anon-${index}` },
        startedAt: BASE_TIME + (index + 1) * MINUTE,
        status,
      });
    }
    await ctx.db.delete(removed);
    return { features, identified, intro, rating, surveyId };
  });
  return { ...seeded, member, organizationId, t };
};

describe("survey list and detail", () => {
  it("applies v2 defaults to surveys stored before endings, display and links existed", async () => {
    const { member, organizationId, t } = await setup();
    const surveyId = await t.run(async (ctx) => {
      const id = await insertSurvey(ctx, organizationId, {
        completionRate: 50,
        responseCount: 10,
      });
      await insertQuestion(
        ctx,
        { organizationId, surveyId: id },
        { order: 0, title: "Anything else?", type: "text" }
      );
      return id;
    });

    const [listed] = await member.query(api.surveys.queries.list, {
      organizationId,
    });
    const detail = await member.query(api.surveys.queries.get, { surveyId });

    expect(listed).toMatchObject({
      completedCount: 5,
      linkEnabled: false,
      questionCount: 1,
    });
    expect(detail).toMatchObject({
      completedCount: 5,
      display: DEFAULT_DISPLAY,
      endings: [DEFAULT_ENDING],
      linkEnabled: false,
    });
  });

  it("returns branching logic and stored endings with questions in order", async () => {
    const { member, organizationId, t } = await setup();
    const { first, second, surveyId } = await t.run(async (ctx) => {
      const id = await insertSurvey(ctx, organizationId, {
        completedCount: 3,
        endings: [{ id: "bye", title: "Bye" }],
        linkEnabled: true,
        triggerConfig: { eventName: "checkout_completed" },
        triggerType: "event",
      });
      const survey = { organizationId, surveyId: id };
      const secondId = await insertQuestion(ctx, survey, {
        next: { endingId: "bye", kind: "ending" },
        order: 1,
        title: "Second",
        type: "boolean",
      });
      const firstId = await insertQuestion(ctx, survey, {
        logic: [
          {
            id: "yes",
            operator: "equals",
            target: { kind: "question", questionId: secondId },
            value: true,
          },
        ],
        order: 0,
        title: "First",
        type: "boolean",
      });
      return { first: firstId, second: secondId, surveyId: id };
    });

    const detail = await member.query(api.surveys.queries.get, { surveyId });

    expect(detail).toMatchObject({
      completedCount: 3,
      endings: [{ id: "bye", title: "Bye" }],
      linkEnabled: true,
      triggerConfig: { eventName: "checkout_completed" },
    });
    expect(detail?.questions).toMatchObject([
      {
        _id: first,
        logic: [{ target: { kind: "question", questionId: second } }],
      },
      { _id: second, next: { endingId: "bye", kind: "ending" } },
    ]);
  });
});

describe("survey responses", () => {
  it("pages newest responses first and filters by status", async () => {
    const { member, surveyId } = await seedAnsweredSurvey();

    const firstPage = await member.query(api.surveys.queries.listResponses, {
      paginationOpts: { cursor: null, numItems: 3 },
      surveyId,
    });
    const secondPage = await member.query(api.surveys.queries.listResponses, {
      paginationOpts: { cursor: firstPage.continueCursor, numItems: 3 },
      surveyId,
    });
    const completed = await member.query(api.surveys.queries.listResponses, {
      paginationOpts: { cursor: null, numItems: 10 },
      status: "completed",
      surveyId,
    });

    expect(firstPage.page.map((r) => r.respondent.id)).toEqual([
      "anon-3",
      "anon-2",
      "anon-1",
    ]);
    expect(firstPage.isDone).toBe(false);
    expect(secondPage.page.map((r) => r.respondent.id)).toEqual([
      "anon-0",
      "customer-42",
    ]);
    expect(secondPage.isDone).toBe(true);
    expect(completed.page.map((r) => r.respondent.id)).toEqual([
      "anon-3",
      "anon-1",
      "customer-42",
    ]);
  });

  it("shows who answered, where, and their answers in question order without deleted questions", async () => {
    const { features, identified, member, rating, surveyId } =
      await seedAnsweredSurvey();

    const { page } = await member.query(api.surveys.queries.listResponses, {
      paginationOpts: { cursor: null, numItems: 10 },
      status: "completed",
      surveyId,
    });

    expect(page.find((r) => r._id === identified)).toEqual({
      _id: identified,
      answers: [
        {
          questionId: rating,
          questionTitle: "Rate onboarding",
          questionType: "rating",
          value: 4,
        },
        {
          questionId: features,
          questionTitle: "Which features?",
          questionType: "multiple_choice",
          value: ["Roadmap", "Boards"],
        },
      ],
      channel: "link",
      completedAt: BASE_TIME + MINUTE,
      endingId: "default",
      pageUrl: "https://app.example.com/settings",
      respondent: {
        email: "ada@example.com",
        id: "customer-42",
        identified: true,
        name: "Ada",
      },
      startedAt: BASE_TIME,
      status: "completed",
    });
    const anonymous = page.find((r) => r._id !== identified);
    expect(anonymous?.channel).toBe("in_app");
    expect(anonymous?.respondent.identified).toBe(false);
  });

  it("exports one row per response keyed by answerable question", async () => {
    const { features, identified, member, rating, surveyId } =
      await seedAnsweredSurvey();

    const exported = await member.query(api.surveys.queries.exportResponses, {
      surveyId,
    });

    expect(exported.truncated).toBe(false);
    expect(exported.questions.map((q) => q._id)).toEqual([rating, features]);
    expect(exported.rows).toHaveLength(5);
    expect(exported.rows.find((row) => row.responseId === identified)).toEqual({
      answers: { [features]: ["Roadmap", "Boards"], [rating]: 4 },
      channel: "link",
      completedAt: BASE_TIME + MINUTE,
      endingId: "default",
      pageUrl: "https://app.example.com/settings",
      respondentEmail: "ada@example.com",
      respondentId: "customer-42",
      respondentName: "Ada",
      responseId: identified,
      startedAt: BASE_TIME,
      status: "completed",
    });
  });

  it("flags exports that hit the read limit and keeps the newest responses", async () => {
    const { member, organizationId, t } = await setup();
    const surveyId = await t.run(async (ctx) => {
      const id = await insertSurvey(ctx, organizationId);
      for (let index = 0; index <= EXPORT_READ_LIMITS.maxResponses; index++) {
        await ctx.db.insert("surveyResponses", {
          organizationId,
          respondentId: `respondent-${index}`,
          startedAt: BASE_TIME + index,
          status: "in_progress",
          surveyId: id,
        });
      }
      return id;
    });

    const exported = await member.query(api.surveys.queries.exportResponses, {
      surveyId,
    });

    expect(exported.truncated).toBe(true);
    expect(exported.rows).toHaveLength(EXPORT_READ_LIMITS.maxResponses);
    expect(exported.rows[0]?.respondentId).toBe(
      `respondent-${EXPORT_READ_LIMITS.maxResponses}`
    );
  });
});

describe("bounded response reads", () => {
  it("only returns responses whose answers were all read within the answer limit", async () => {
    const { organizationId, t } = await setup();

    const { answerCounts, keptIds, newestId, truncated } = await t.run(
      async (ctx) => {
        const surveyId = await insertSurvey(ctx, organizationId);
        const survey = { organizationId, surveyId };
        const first = await insertQuestion(ctx, survey, {
          order: 0,
          title: "First",
          type: "text",
        });
        const second = await insertQuestion(ctx, survey, {
          order: 1,
          title: "Second",
          type: "text",
        });
        const ids: Id<"surveyResponses">[] = [];
        for (let index = 0; index < 3; index++) {
          ids.push(
            await insertResponse(ctx, survey, {
              answers: [
                [first, "a"],
                [second, "b"],
              ],
              startedAt: BASE_TIME + index * MINUTE,
              status: "completed",
            })
          );
        }
        const loaded = await loadRecentResponses(ctx, surveyId, {
          maxAnswers: 3,
          maxResponses: 10,
        });
        return {
          answerCounts: loaded.responses.map(
            (r) => loaded.answersByResponse.get(r._id)?.length
          ),
          keptIds: loaded.responses.map((r) => r._id),
          newestId: ids[2],
          truncated: loaded.truncated,
        };
      }
    );

    expect(truncated).toBe(true);
    expect(keptIds).toEqual([newestId]);
    expect(answerCounts).toEqual([2]);
  });
});
