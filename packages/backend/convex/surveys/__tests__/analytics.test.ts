/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../_generated/api";
import { setupTest } from "../../test.helpers";
import { ANALYTICS_READ_LIMITS } from "../lib/insights/recent_responses";
import {
  insertQuestion,
  insertResponse,
  insertSurvey,
  SURVEY_TEST_USERS,
  setupSurveyTest,
} from "./survey_seed";

const setup = () =>
  setupSurveyTest(setupTest({ authUsers: SURVEY_TEST_USERS }));

const NOW = Date.parse("2026-10-04T12:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SECOND = 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const seedBranchingSurvey = async () => {
  const { member, organizationId, outsider, t } = await setup();
  const seeded = await t.run(async (ctx) => {
    const surveyId = await insertSurvey(ctx, organizationId, {
      completedCount: 3,
      completionRate: 43,
      endings: [
        { id: "thanks", title: "Thanks" },
        { id: "promoter-end", title: "Spread the word" },
      ],
      responseCount: 7,
    });
    const survey = { organizationId, surveyId };
    const intro = await insertQuestion(ctx, survey, {
      order: 0,
      title: "Welcome",
      type: "statement",
    });
    const score = await insertQuestion(ctx, survey, {
      order: 1,
      required: true,
      title: "How likely are you to recommend us?",
      type: "nps",
    });
    const loved = await insertQuestion(ctx, survey, {
      config: { allowOther: true, choices: ["Speed", "Design"] },
      next: { endingId: "promoter-end", kind: "ending" },
      order: 2,
      title: "What do you love?",
      type: "single_choice",
    });
    const fix = await insertQuestion(ctx, survey, {
      order: 3,
      title: "What should we fix?",
      type: "text",
    });
    const contact = await insertQuestion(ctx, survey, {
      order: 4,
      title: "Can we contact you?",
      type: "boolean",
    });
    await ctx.db.patch(score, {
      logic: [
        {
          id: "detractors",
          operator: "less_than",
          target: { kind: "question", questionId: fix },
          value: 7,
        },
      ],
    });

    const twoDaysAgo = NOW - 2 * DAY;
    const twoHoursAgo = NOW - 2 * HOUR;
    const completed = (
      startedAt: number,
      seconds: number,
      endingId: string
    ) => ({
      fields: { completedAt: startedAt + seconds * SECOND, endingId },
      startedAt,
      status: "completed" as const,
    });
    await insertResponse(ctx, survey, {
      ...completed(twoDaysAgo, 60, "promoter-end"),
      answers: [
        [score, 10],
        [loved, "Speed"],
      ],
    });
    await insertResponse(ctx, survey, {
      ...completed(twoDaysAgo, 120, "promoter-end"),
      answers: [
        [score, 9],
        [loved, "Rocket science"],
      ],
    });
    await insertResponse(ctx, survey, {
      ...completed(twoHoursAgo, 30, "thanks"),
      answers: [
        [score, 3],
        [fix, "Too slow"],
        [contact, true],
      ],
    });
    await insertResponse(ctx, survey, {
      answers: [[score, 8]],
      startedAt: twoHoursAgo,
      status: "abandoned",
    });
    await insertResponse(ctx, survey, {
      startedAt: twoHoursAgo,
      status: "in_progress",
    });
    await insertResponse(ctx, survey, {
      answers: [[score, 2]],
      startedAt: twoHoursAgo,
      status: "abandoned",
    });
    await insertResponse(ctx, survey, {
      answers: [
        [score, 4],
        [contact, false],
      ],
      startedAt: NOW - 45 * DAY,
      status: "abandoned",
    });
    return { contact, fix, intro, loved, score, surveyId };
  });
  return { ...seeded, member, outsider };
};

describe("survey analytics", () => {
  it("summarizes totals, completion time, NPS and endings", async () => {
    const { member, score, surveyId } = await seedBranchingSurvey();

    const analytics = await member.query(api.surveys.analytics.getAnalytics, {
      surveyId,
    });

    expect(analytics).toMatchObject({
      abandonedResponses: 3,
      completedResponses: 3,
      completionRate: 43,
      endings: [
        { count: 1, endingId: "thanks", title: "Thanks" },
        { count: 2, endingId: "promoter-end", title: "Spread the word" },
      ],
      inProgressResponses: 1,
      medianCompletionMs: 60 * SECOND,
      nps: {
        detractors: 3,
        passives: 1,
        promoters: 2,
        questionId: score,
        score: -17,
        total: 6,
      },
      sampledResponses: null,
      totalResponses: 7,
    });
  });

  it("attributes each drop-off to the screen after the respondent's last answer on their branch", async () => {
    const { contact, fix, intro, loved, member, score, surveyId } =
      await seedBranchingSurvey();

    const { questionStats } = await member.query(
      api.surveys.analytics.getAnalytics,
      { surveyId }
    );

    expect(
      questionStats.map(({ answered, dropOffs, questionId, reached }) => ({
        answered,
        dropOffs,
        questionId,
        reached,
      }))
    ).toEqual([
      { answered: 6, dropOffs: 1, questionId: intro, reached: 7 },
      { answered: 6, dropOffs: 0, questionId: score, reached: 6 },
      { answered: 2, dropOffs: 1, questionId: loved, reached: 3 },
      { answered: 1, dropOffs: 1, questionId: fix, reached: 2 },
      { answered: 2, dropOffs: 0, questionId: contact, reached: 2 },
    ]);
  });

  it("reports full answer scales, configured choices with Other kept apart, and recent text", async () => {
    const { member, surveyId } = await seedBranchingSurvey();

    const { questionStats } = await member.query(
      api.surveys.analytics.getAnalytics,
      { surveyId }
    );
    const [, nps, choice, text, yesNo] = questionStats;

    expect(nps?.averageValue).toBe(6);
    expect(nps?.distribution).toEqual(
      [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1].map((count, point) => ({
        count,
        label: String(point),
      }))
    );
    expect(choice).toMatchObject({
      distribution: [
        { count: 1, label: "Speed" },
        { count: 0, label: "Design" },
      ],
      otherAnswers: ["Rocket science"],
    });
    expect(text?.recentTextAnswers?.map(({ value }) => value)).toEqual([
      "Too slow",
    ]);
    expect(yesNo?.distribution).toEqual([
      { count: 1, label: "Yes" },
      { count: 1, label: "No" },
    ]);
  });

  it("fills every UTC day of the last 30 days, including days without responses", async () => {
    const { member, surveyId } = await seedBranchingSurvey();

    const { responsesByDay } = await member.query(
      api.surveys.analytics.getAnalytics,
      { surveyId }
    );

    expect(responsesByDay).toHaveLength(30);
    expect(responsesByDay[0]).toEqual({
      completed: 0,
      date: "2026-09-05",
      started: 0,
    });
    expect(responsesByDay.filter((day) => day.started > 0)).toEqual([
      { completed: 2, date: "2026-10-02", started: 2 },
      { completed: 1, date: "2026-10-04", started: 4 },
    ]);
  });

  it("keeps empty rating scales visible before anyone answers", async () => {
    const { member, organizationId, t } = await setup();
    const surveyId = await t.run(async (ctx) => {
      const id = await insertSurvey(ctx, organizationId);
      await insertQuestion(
        ctx,
        { organizationId, surveyId: id },
        {
          config: { maxValue: 3, minValue: 1 },
          order: 0,
          title: "Rate us",
          type: "rating",
        }
      );
      return id;
    });

    const analytics = await member.query(api.surveys.analytics.getAnalytics, {
      surveyId,
    });

    expect(analytics).toMatchObject({
      endings: [{ count: 0, endingId: "default", title: "Thank you!" }],
      medianCompletionMs: null,
      nps: null,
      totalResponses: 0,
    });
    expect(analytics.questionStats[0]?.distribution).toEqual([
      { count: 0, label: "1" },
      { count: 0, label: "2" },
      { count: 0, label: "3" },
    ]);
  });

  it("counts completions whose ending no longer exists under the first ending", async () => {
    const { member, organizationId, t } = await setup();
    const surveyId = await t.run(async (ctx) => {
      const id = await insertSurvey(ctx, organizationId, {
        completedCount: 3,
        completionRate: 100,
        endings: [
          { id: "welcome-aboard", title: "Welcome aboard" },
          { id: "see-you", title: "See you" },
        ],
        responseCount: 3,
      });
      const survey = { organizationId, surveyId: id };
      for (const endingId of ["default", "removed-ending", "see-you"]) {
        await insertResponse(ctx, survey, {
          fields: { completedAt: NOW - HOUR, endingId },
          startedAt: NOW - 2 * HOUR,
          status: "completed",
        });
      }
      return id;
    });

    const analytics = await member.query(api.surveys.analytics.getAnalytics, {
      surveyId,
    });

    expect(analytics.completedResponses).toBe(3);
    expect(analytics.endings).toEqual([
      { count: 2, endingId: "welcome-aboard", title: "Welcome aboard" },
      { count: 1, endingId: "see-you", title: "See you" },
    ]);
  });

  it("reports stored totals and how many responses the breakdowns cover when a survey outgrows one read", async () => {
    const { member, organizationId, t } = await setup();
    const sampleLimit = ANALYTICS_READ_LIMITS.maxResponses;
    const surveyId = await t.run(async (ctx) => {
      const id = await insertSurvey(ctx, organizationId, {
        completedCount: 1800,
        completionRate: 36,
        responseCount: 5000,
      });
      for (let index = 0; index <= sampleLimit; index++) {
        await ctx.db.insert("surveyResponses", {
          organizationId,
          startedAt: NOW - DAY + index,
          status: "abandoned",
          surveyId: id,
        });
      }
      return id;
    });

    const analytics = await member.query(api.surveys.analytics.getAnalytics, {
      surveyId,
    });

    expect(analytics).toMatchObject({
      abandonedResponses: sampleLimit,
      completedResponses: 1800,
      completionRate: 36,
      sampledResponses: sampleLimit,
      totalResponses: 5000,
    });
  });

  it("hides analytics from people outside the organization", async () => {
    const { outsider, surveyId } = await seedBranchingSurvey();

    await expect(
      outsider.query(api.surveys.analytics.getAnalytics, { surveyId })
    ).rejects.toThrow();
  });
});
