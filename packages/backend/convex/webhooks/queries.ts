import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { requireOrgAdmin } from "../shared/access";

const MAX_DELIVERIES_LISTED = 50;

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "view webhooks");
    const webhooks = await ctx.db
      .query("organizationWebhooks")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();
    return webhooks.map(({ secret: _secret, ...webhook }) => webhook);
  },
});

export const listDeliveries = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, "view webhooks");
    return await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .take(MAX_DELIVERIES_LISTED);
  },
});

export const getDeliveryTarget = internalQuery({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) {
      return null;
    }
    const webhook = await ctx.db.get(delivery.webhookId);
    if (!webhook) {
      return null;
    }
    return { delivery, webhook };
  },
});

export const getSurveyResponsePayload = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    surveyResponseId: v.id("surveyResponses"),
  },
  handler: async (ctx, args) => {
    const response = await ctx.db.get(args.surveyResponseId);
    if (
      response?.organizationId !== args.organizationId ||
      response.status !== "completed"
    ) {
      return null;
    }
    const survey = await ctx.db.get(response.surveyId);
    if (!survey) {
      return null;
    }
    const storedAnswers = await ctx.db
      .query("surveyAnswers")
      .withIndex("by_response", (q) => q.eq("responseId", response._id))
      .collect();
    const questions = await Promise.all(
      storedAnswers.map((answer) => ctx.db.get(answer.questionId))
    );
    const answers = storedAnswers.flatMap((answer, index) => {
      const question = questions[index];
      return question
        ? [
            {
              questionId: question._id,
              questionTitle: question.title,
              questionType: question.type,
              value: answer.value,
            },
          ]
        : [];
    });
    return {
      response: {
        _id: response._id,
        answers,
        channel: response.channel ?? "in_app",
        completedAt: response.completedAt,
        endingId: response.endingId,
        externalUserId: response.externalUserId,
        pageUrl: response.metadata?.pageUrl,
        respondentId: response.respondentId,
        startedAt: response.startedAt,
      },
      survey: { _id: survey._id, title: survey.title },
    };
  },
});
