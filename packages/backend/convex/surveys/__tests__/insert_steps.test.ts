/// <reference types="vite/client" />
import { resolveNextStep } from "@reflet/survey-core";
import { describe, expect, it } from "vitest";
import { api } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";
import {
  DETRACTOR_ENDING,
  PROMOTER_ENDING,
  seedBranchingSurvey,
} from "./branching_seed";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };
const OUTSIDER = { _id: "user_outsider", email: "outsider@example.com" };
const ENDINGS = [PROMOTER_ENDING, DETRACTOR_ENDING];

const textStep = (title: string) => ({
  required: false,
  title,
  type: "text" as const,
});

async function setup() {
  const t = setupTest({ authUsers: [ADMIN, OUTSIDER] });
  const seeded = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const otherOrganizationId = await seedOrganization(ctx, { slug: "other" });
    const addOwner = (orgId: Id<"organizations">, userId: string) =>
      ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role: "owner",
        userId,
      });
    await addOwner(organizationId, ADMIN._id);
    await addOwner(otherOrganizationId, OUTSIDER._id);
    return seedBranchingSurvey(ctx, organizationId, { status: "draft" });
  });
  const questionsOf = () =>
    t.run(async (ctx) =>
      (
        await ctx.db
          .query("surveyQuestions")
          .withIndex("by_survey", (q) => q.eq("surveyId", seeded.surveyId))
          .collect()
      ).sort((a, b) => a.order - b.order)
    );
  return {
    ...seeded,
    admin: t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id }),
    outsider: t.withIdentity({
      sessionId: OUTSIDER._id,
      subject: OUTSIDER._id,
    }),
    questionsOf,
  };
}

/** Where a respondent goes after answering `questionId` with `answer`. */
const stepAfter = (
  questions: Doc<"surveyQuestions">[],
  questionId: Id<"surveyQuestions">,
  answer?: number | string
) => {
  const current = questions.find((question) => question._id === questionId);
  if (!current) {
    throw new Error("Question missing from the survey.");
  }
  const step = resolveNextStep(questions, current, answer, ENDINGS);
  return step.kind === "question" ? step.question._id : step.ending.id;
};

describe("inserting steps", () => {
  it("splitting a rule routes it through the new steps and keeps the default path", async () => {
    const { admin, fix, love, questionsOf, score, surveyId } = await setup();

    const [inserted] = await admin.mutation(api.surveys.mutations.insertSteps, {
      after: score,
      drafts: [textStep("What went wrong?")],
      splits: { questionId: score, ruleId: "low-score" },
      surveyId,
    });

    const questions = await questionsOf();
    expect(questions.map((question) => question._id)).toEqual([
      score,
      inserted,
      love,
      fix,
    ]);
    expect(stepAfter(questions, score, 3)).toBe(inserted);
    expect(stepAfter(questions, score, 9)).toBe(love);
    expect(inserted && stepAfter(questions, inserted)).toBe(fix);
  });

  it("splitting an explicit next chains the new steps into the former destination", async () => {
    const { admin, love, questionsOf, surveyId } = await setup();

    const [first, second] = await admin.mutation(
      api.surveys.mutations.insertSteps,
      {
        after: love,
        drafts: [textStep("Which feature?"), textStep("How often?")],
        splits: { questionId: love },
        surveyId,
      }
    );

    const questions = await questionsOf();
    expect(stepAfter(questions, love)).toBe(first);
    expect(first && stepAfter(questions, first)).toBe(second);
    expect(second && stepAfter(questions, second)).toBe(PROMOTER_ENDING.id);
  });

  it("inserts first, keeping orders contiguous and sending unknown endings to the first one", async () => {
    const { admin, questionsOf, score, surveyId } = await setup();

    const insertedIds = await admin.mutation(
      api.surveys.mutations.insertSteps,
      {
        after: null,
        drafts: [
          {
            ...textStep("Before we start"),
            next: { endingId: "invented-by-ai", kind: "ending" },
          },
        ],
        surveyId,
      }
    );

    const questions = await questionsOf();
    expect(questions.map((question) => question._id).slice(0, 2)).toEqual([
      ...insertedIds,
      score,
    ]);
    expect(questions.map((question) => question.order)).toEqual([0, 1, 2, 3]);
    expect(questions[0]?.next).toEqual({
      endingId: PROMOTER_ENDING.id,
      kind: "ending",
    });
  });

  it("leaves the survey untouched when any draft has an invalid jump", async () => {
    const { admin, questionsOf, score, surveyId } = await setup();
    const before = await questionsOf();

    await expect(
      admin.mutation(api.surveys.mutations.insertSteps, {
        after: score,
        drafts: [
          textStep("Fine"),
          {
            ...textStep("Loops back"),
            logic: [
              {
                id: "back",
                operator: "answered",
                target: { kind: "question", questionIndex: 0 },
              },
            ],
          },
        ],
        splits: { questionId: score, ruleId: "low-score" },
        surveyId,
      })
    ).rejects.toThrow("New step 2 can only jump to a later question.");
    expect(await questionsOf()).toEqual(before);
  });

  it("rejects admins of another organization", async () => {
    const { outsider, questionsOf, surveyId } = await setup();
    const before = await questionsOf();

    await expect(
      outsider.mutation(api.surveys.mutations.insertSteps, {
        drafts: [textStep("Sneaky")],
        surveyId,
      })
    ).rejects.toThrow();
    expect(await questionsOf()).toEqual(before);
  });
});
