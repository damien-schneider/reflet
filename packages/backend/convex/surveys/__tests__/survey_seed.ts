import type { AnswerValue } from "@reflet/survey-core";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { seedOrganization } from "../../test.fixtures";
import type { TestContext } from "../../test.helpers";

const MEMBER = { _id: "user_member", email: "member@example.com" };
const OUTSIDER = { _id: "user_outsider", email: "outsider@example.com" };

export const SURVEY_TEST_USERS = [MEMBER, OUTSIDER];

export const setupSurveyTest = async (t: TestContext) => {
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "member",
      userId: MEMBER._id,
    });
    return orgId;
  });
  return {
    member: t.withIdentity({ sessionId: MEMBER._id, subject: MEMBER._id }),
    organizationId,
    outsider: t.withIdentity({
      sessionId: OUTSIDER._id,
      subject: OUTSIDER._id,
    }),
    t,
  };
};

export const insertSurvey = (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  overrides: Partial<Doc<"surveys">> = {}
): Promise<Id<"surveys">> =>
  ctx.db.insert("surveys", {
    completionRate: 0,
    createdAt: Date.now(),
    createdBy: MEMBER._id,
    organizationId,
    responseCount: 0,
    status: "active",
    title: "Product feedback",
    triggerType: "manual",
    updatedAt: Date.now(),
    ...overrides,
  });

export const insertQuestion = (
  ctx: MutationCtx,
  survey: { organizationId: Id<"organizations">; surveyId: Id<"surveys"> },
  question: Pick<Doc<"surveyQuestions">, "order" | "title" | "type"> &
    Partial<Doc<"surveyQuestions">>
): Promise<Id<"surveyQuestions">> =>
  ctx.db.insert("surveyQuestions", { required: false, ...survey, ...question });

interface SeededResponse {
  answers?: [Id<"surveyQuestions">, AnswerValue][];
  fields?: Partial<Doc<"surveyResponses">>;
  startedAt: number;
  status: Doc<"surveyResponses">["status"];
}

export const insertResponse = async (
  ctx: MutationCtx,
  survey: { organizationId: Id<"organizations">; surveyId: Id<"surveys"> },
  { answers = [], fields, startedAt, status }: SeededResponse
): Promise<Id<"surveyResponses">> => {
  const responseId = await ctx.db.insert("surveyResponses", {
    ...survey,
    startedAt,
    status,
    ...fields,
  });
  for (const [index, [questionId, value]] of answers.entries()) {
    await ctx.db.insert("surveyAnswers", {
      ...survey,
      answeredAt: startedAt + index + 1,
      questionId,
      responseId,
      value,
    });
  }
  return responseId;
};
