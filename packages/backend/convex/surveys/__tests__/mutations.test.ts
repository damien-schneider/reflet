/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";
import { PROMOTER_ENDING, seedBranchingSurvey } from "./branching_seed";
import { insertResponse } from "./survey_seed";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };

async function setup() {
  const t = setupTest({ authUsers: [ADMIN] });
  const seeded = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId,
      role: "owner",
      userId: ADMIN._id,
    });
    return {
      organizationId,
      ...(await seedBranchingSurvey(ctx, organizationId, { status: "draft" })),
    };
  });
  const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });
  const questionsOf = (surveyId: Id<"surveys">) =>
    t.run(async (ctx) =>
      (
        await ctx.db
          .query("surveyQuestions")
          .withIndex("by_survey", (q) => q.eq("surveyId", surveyId))
          .collect()
      ).sort((a, b) => a.order - b.order)
    );
  return { ...seeded, admin, questionsOf, t };
}

describe("creating surveys from drafts", () => {
  it("turns question-index jumps into question ids", async () => {
    const { admin, organizationId, questionsOf } = await setup();
    const surveyId = await admin.mutation(api.surveys.mutations.create, {
      endings: [PROMOTER_ENDING],
      organizationId,
      questions: [
        {
          logic: [
            {
              id: "yes",
              operator: "equals",
              target: { kind: "question", questionIndex: 2 },
              value: true,
            },
          ],
          required: true,
          title: "Do you use exports?",
          type: "boolean",
        },
        {
          next: { endingId: PROMOTER_ENDING.id, kind: "ending" },
          required: false,
          title: "Why not?",
          type: "text",
        },
        { required: false, title: "Which format?", type: "text" },
      ],
      title: "Exports",
      triggerType: "manual",
    });

    const [first, second, third] = await questionsOf(surveyId);
    expect(first?.logic?.[0]?.target).toEqual({
      kind: "question",
      questionId: third?._id,
    });
    expect(second?.next).toEqual({ endingId: "promoter", kind: "ending" });
    expect([first?.order, second?.order, third?.order]).toEqual([0, 1, 2]);
  });

  it("rejects drafts that jump backward or to a missing ending", async () => {
    const { admin, organizationId } = await setup();
    const draft = (target: { kind: "question"; questionIndex: number }) =>
      admin.mutation(api.surveys.mutations.create, {
        organizationId,
        questions: [
          { required: true, title: "First", type: "text" },
          { next: target, required: true, title: "Second", type: "text" },
        ],
        title: "Loop",
        triggerType: "manual",
      });

    await expect(draft({ kind: "question", questionIndex: 0 })).rejects.toThrow(
      "can only jump to a later question"
    );
    await expect(
      admin.mutation(api.surveys.mutations.create, {
        organizationId,
        questions: [
          {
            next: { endingId: "missing", kind: "ending" },
            required: true,
            title: "Only",
            type: "text",
          },
        ],
        title: "Dangling",
        triggerType: "manual",
      })
    ).rejects.toThrow("ending that doesn't exist");
  });
});

describe("editing the flow", () => {
  it("only accepts forward jumps to questions of the same survey", async () => {
    const { admin, fix, love, score } = await setup();

    await expect(
      admin.mutation(api.surveys.mutations.updateQuestion, {
        next: { kind: "question", questionId: score },
        questionId: fix,
      })
    ).rejects.toThrow("Jumps can only go to a later question.");
    await admin.mutation(api.surveys.mutations.updateQuestion, {
      next: { kind: "question", questionId: fix },
      questionId: love,
    });
    await admin.mutation(api.surveys.mutations.updateQuestion, {
      next: null,
      questionId: love,
    });
  });

  it("drops rules the new question type can't evaluate", async () => {
    const { admin, questionsOf, score, surveyId } = await setup();

    await admin.mutation(api.surveys.mutations.updateQuestion, {
      questionId: score,
      type: "boolean",
    });

    const [updated] = await questionsOf(surveyId);
    expect(updated).toMatchObject({ logic: [], type: "boolean" });
  });

  it("drops rules whose value the new type can never match, keeping the rest", async () => {
    const { admin, organizationId, questionsOf } = await setup();
    const surveyId = await admin.mutation(api.surveys.mutations.create, {
      organizationId,
      questions: [
        {
          config: { choices: ["Yes", "No"] },
          logic: [
            {
              id: "picked-yes",
              operator: "equals",
              target: { kind: "question", questionIndex: 2 },
              value: "Yes",
            },
            {
              id: "skipped-it",
              operator: "skipped",
              target: { kind: "question", questionIndex: 2 },
            },
          ],
          required: true,
          title: "Do you use exports?",
          type: "single_choice",
        },
        { required: false, title: "Why not?", type: "text" },
        { required: false, title: "Which format?", type: "text" },
      ],
      title: "Exports",
      triggerType: "manual",
    });
    const [choice] = await questionsOf(surveyId);
    if (!choice) {
      throw new Error("Expected the seeded question");
    }

    await admin.mutation(api.surveys.mutations.updateQuestion, {
      config: {},
      questionId: choice._id,
      type: "boolean",
    });

    const [updated] = await questionsOf(surveyId);
    expect(updated?.logic?.map((rule) => rule.id)).toEqual(["skipped-it"]);
  });

  it("deleting a question removes jumps to it, its answers, and closes the order gap", async () => {
    const { admin, fix, organizationId, questionsOf, surveyId, t } =
      await setup();
    await t.run((ctx) =>
      insertResponse(
        ctx,
        { organizationId, surveyId },
        {
          answers: [[fix, "Speed"]],
          startedAt: Date.now(),
          status: "completed",
        }
      )
    );

    await admin.mutation(api.surveys.mutations.deleteQuestion, {
      questionId: fix,
    });

    const remaining = await questionsOf(surveyId);
    expect(remaining.map((q) => [q.order, q.logic ?? []])).toEqual([
      [0, []],
      [1, []],
    ]);
    const leftoverAnswers = await t.run((ctx) =>
      ctx.db
        .query("surveyAnswers")
        .withIndex("by_question", (q) => q.eq("questionId", fix))
        .collect()
    );
    expect(leftoverAnswers).toEqual([]);
  });

  it("refuses an order that would turn a jump backward", async () => {
    const { admin, fix, love, questionsOf, score, surveyId } = await setup();

    await expect(
      admin.mutation(api.surveys.mutations.reorderQuestions, {
        questionIds: [fix, score, love],
        surveyId,
      })
    ).rejects.toThrow("would jump back to an earlier question");

    await admin.mutation(api.surveys.mutations.reorderQuestions, {
      questionIds: [score, fix, love],
      surveyId,
    });
    expect((await questionsOf(surveyId)).map((q) => q._id)).toEqual([
      score,
      fix,
      love,
    ]);
  });

  it("inserts questions first, after a question, or at the end", async () => {
    const { admin, love, questionsOf, surveyId } = await setup();
    const question = { required: false, title: "New", type: "text" as const };

    const first = await admin.mutation(api.surveys.mutations.addQuestion, {
      after: null,
      question,
      surveyId,
    });
    const afterLove = await admin.mutation(api.surveys.mutations.addQuestion, {
      after: love,
      question,
      surveyId,
    });
    const last = await admin.mutation(api.surveys.mutations.addQuestion, {
      question,
      surveyId,
    });

    const ids = (await questionsOf(surveyId)).map((q) => q._id);
    expect(ids[0]).toBe(first);
    expect(ids[ids.indexOf(love) + 1]).toBe(afterLove);
    expect(ids.indexOf(last)).toBe(ids.length - 1);
    expect((await questionsOf(surveyId)).map((q) => q.order)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
  });
});

describe("survey settings and lifecycle", () => {
  it("clears schedule and cap with null, and removing an ending unhooks its jumps", async () => {
    const { admin, questionsOf, surveyId, t } = await setup();
    await admin.mutation(api.surveys.mutations.update, {
      endsAt: Date.now() + 1000,
      maxResponses: 50,
      surveyId,
    });

    await admin.mutation(api.surveys.mutations.update, {
      endings: [PROMOTER_ENDING],
      endsAt: null,
      maxResponses: null,
      surveyId,
    });

    const survey = await t.run((ctx) => ctx.db.get(surveyId));
    expect(survey?.endsAt).toBeUndefined();
    expect(survey?.maxResponses).toBeUndefined();
    const nexts = (await questionsOf(surveyId)).map((q) => q.next);
    expect(nexts).toEqual([
      undefined,
      { endingId: PROMOTER_ENDING.id, kind: "ending" },
      undefined,
    ]);
  });

  it("blocks publishing a broken flow and reopening a capped survey", async () => {
    const { admin, organizationId, surveyId, t } = await setup();
    const brokenId = await admin.mutation(api.surveys.mutations.create, {
      organizationId,
      questions: [{ required: true, title: "Pick one", type: "single_choice" }],
      title: "Broken",
      triggerType: "manual",
    });

    await expect(
      admin.mutation(api.surveys.mutations.updateStatus, {
        status: "active",
        surveyId: brokenId,
      })
    ).rejects.toThrow("Question 1: Add at least 2 options.");

    await admin.mutation(api.surveys.mutations.updateStatus, {
      status: "active",
      surveyId,
    });
    await t.run((ctx) =>
      ctx.db.patch(surveyId, {
        completedCount: 5,
        maxResponses: 5,
        status: "closed",
      })
    );
    await expect(
      admin.mutation(api.surveys.mutations.updateStatus, {
        status: "active",
        surveyId,
      })
    ).rejects.toThrow("reached its response limit");
  });

  it("duplicates jumps onto the copied questions", async () => {
    const { admin, questionsOf, surveyId } = await setup();

    const copyId = await admin.mutation(api.surveys.mutations.duplicate, {
      surveyId,
    });

    const [score, , fix] = await questionsOf(copyId);
    expect(score?.surveyId).toBe(copyId);
    expect(score?.logic?.[0]?.target).toEqual({
      kind: "question",
      questionId: fix?._id,
    });
  });

  it("deletes a survey with its responses and answers", async () => {
    const { admin, organizationId, score, surveyId, t } = await setup();
    await t.run((ctx) =>
      insertResponse(
        ctx,
        { organizationId, surveyId },
        { answers: [[score, 9]], startedAt: Date.now(), status: "completed" }
      )
    );

    await admin.mutation(api.surveys.mutations.deleteSurvey, { surveyId });

    const leftovers = await t.run(async (ctx) => [
      ...(await ctx.db.query("surveyQuestions").collect()),
      ...(await ctx.db.query("surveyResponses").collect()),
      ...(await ctx.db.query("surveyAnswers").collect()),
    ]);
    expect(leftovers).toEqual([]);
  });
});
