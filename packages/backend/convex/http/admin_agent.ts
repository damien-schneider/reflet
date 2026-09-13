import type { httpRouter } from "convex/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
  type FeedbackStatusValue,
  isFeedbackStatusValue,
} from "../shared/validators";
import {
  adminGet,
  adminPost,
  corsOptionsHandler,
  num,
  optionalId,
  parseId,
  requireStr,
  str,
  strArr,
} from "./helpers";

type Router = ReturnType<typeof httpRouter>;

const ADMIN_AGENT_PATHS = [
  "/api/v1/admin/feedback/next",
  "/api/v1/admin/feedback/claim-next",
  "/api/v1/admin/feedback/claim",
  "/api/v1/admin/feedback/create-github-issue",
] as const;

function parseStatuses(
  values: string[] | undefined
): FeedbackStatusValue[] | undefined {
  if (!values) {
    return;
  }
  return values.map((value) => {
    if (!isFeedbackStatusValue(value)) {
      throw new Error(`Invalid status: ${value}`);
    }
    return value;
  });
}

function parseTagIds(values: string[] | undefined): Id<"tags">[] | undefined {
  return values
    ?.map((value) => optionalId<"tags">(value))
    .filter((id) => id !== undefined);
}

function commaList(value: string | null): string[] | undefined {
  return value ? value.split(",").filter(Boolean) : undefined;
}

function queueFilterFromUrl(url: URL) {
  const limit = url.searchParams.get("limit");
  return {
    limit: limit ? Number(limit) : undefined,
    statuses: parseStatuses(commaList(url.searchParams.get("statuses"))),
    tagIds: parseTagIds(commaList(url.searchParams.get("tagIds"))),
  };
}

function queueFilterFromBody(body: Record<string, unknown>) {
  return {
    limit: num(body.limit),
    statuses: parseStatuses(strArr(body.statuses)),
    tagIds: parseTagIds(strArr(body.tagIds)),
  };
}

export function registerAdminAgentRoutes(http: Router): void {
  http.route({
    handler: adminGet(async (ctx, { organizationId }, url) =>
      ctx.runQuery(internal.feedback.agent_queue.nextFeedback, {
        organizationId,
        ...queueFilterFromUrl(url),
      })
    ),
    method: "GET",
    path: "/api/v1/admin/feedback/next",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.feedback.agent_queue.claimNext, {
        claimedBy: requireStr(body.claimedBy, "claimedBy"),
        organizationId,
        ...queueFilterFromBody(body),
      })
    ),
    method: "POST",
    path: "/api/v1/admin/feedback/claim-next",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runMutation(internal.feedback.agent_queue.claimFeedback, {
        claimedBy: requireStr(body.claimedBy, "claimedBy"),
        feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
        organizationId,
      })
    ),
    method: "POST",
    path: "/api/v1/admin/feedback/claim",
  });

  http.route({
    handler: adminPost(async (ctx, { organizationId }, body) =>
      ctx.runAction(
        internal.integrations.github.issue_promote.promoteFeedback,
        {
          feedbackId: parseId<"feedback">(str(body.feedbackId), "feedbackId"),
          organizationId,
        }
      )
    ),
    method: "POST",
    path: "/api/v1/admin/feedback/create-github-issue",
  });

  for (const path of ADMIN_AGENT_PATHS) {
    http.route({ handler: corsOptionsHandler(), method: "OPTIONS", path });
  }
}
