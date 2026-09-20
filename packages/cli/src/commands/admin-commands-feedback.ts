import {
  arg,
  bool,
  type CommandSpec,
  choice,
  list,
  num,
  req,
  timestamp,
} from "./admin-flags";
import { downloadScreenshots } from "./screenshot-download";

const FEEDBACK_STATUSES = new Set([
  "open",
  "under_review",
  "planned",
  "in_progress",
  "completed",
  "closed",
]);

const SORT_ORDERS = ["newest", "oldest"] as const;

const VOTES = ["upvote", "downvote"] as const;

const DUPLICATE_ACTIONS = ["confirm", "reject"] as const;

export const FEEDBACK_COMMANDS: Record<string, Record<string, CommandSpec>> = {
  changelog: {
    list: { flags: ["limit"], run: (c, _p, f) => c.getChangelog(num(f.limit)) },
  },
  comment: {
    delete: {
      args: "<commentId>",
      run: (c, p) => c.deleteComment(arg(p, 0, "commentId")),
    },
    official: {
      args: "<commentId> <true|false>",
      run: (c, p) =>
        c.markCommentOfficial(
          arg(p, 0, "commentId"),
          bool(arg(p, 1, "true|false")) === true
        ),
    },
    update: {
      args: "<commentId>",
      flags: ["body"],
      run: (c, p, f) =>
        c.updateComment(arg(p, 0, "commentId"), req(f.body, "body")),
    },
  },
  config: { get: { run: (c) => c.getConfig() } },
  duplicate: {
    list: { run: (c) => c.listPendingDuplicates() },
    merge: {
      args: "<sourceFeedbackId> <targetFeedbackId>",
      flags: ["pair"],
      run: (c, p, f) =>
        c.mergeFeedback({
          pairId: f.pair,
          sourceFeedbackId: arg(p, 0, "sourceFeedbackId"),
          targetFeedbackId: arg(p, 1, "targetFeedbackId"),
        }),
    },
    resolve: {
      args: "<pairId> <confirm|reject>",
      run: (c, p) =>
        c.resolveDuplicate({
          action: choice(arg(p, 1, "confirm|reject"), DUPLICATE_ACTIONS),
          pairId: arg(p, 0, "pairId"),
        }),
    },
  },
  feedback: {
    analysis: {
      args: "<feedbackId>",
      flags: ["priority", "complexity", "time-estimate", "deadline"],
      run: (c, p, f) =>
        c.updateFeedbackAnalysis({
          complexity: f.complexity,
          deadline: timestamp(f.deadline),
          feedbackId: arg(p, 0, "feedbackId"),
          priority: f.priority,
          timeEstimate: f["time-estimate"],
        }),
    },
    assign: {
      args: "<feedbackId> [assigneeId]",
      run: (c, p) => c.assignFeedback(arg(p, 0, "feedbackId"), p[1]),
    },
    claim: {
      args: "<feedbackId>",
      flags: ["as"],
      run: (c, p, f) =>
        c.claimFeedback(arg(p, 0, "feedbackId"), req(f.as, "as")),
    },
    "claim-next": {
      flags: ["as", "statuses", "tags"],
      run: (c, _p, f) =>
        c.claimNext({
          claimedBy: req(f.as, "as"),
          statuses: list(f.statuses),
          tagIds: list(f.tags),
        }),
    },
    comment: {
      args: "<feedbackId>",
      flags: ["body", "parent"],
      run: (c, p, f) =>
        c.createComment({
          body: req(f.body, "body"),
          feedbackId: arg(p, 0, "feedbackId"),
          parentId: f.parent,
        }),
    },
    comments: {
      args: "<feedbackId>",
      flags: ["sort"],
      run: (c, p, f) =>
        c.listComments(
          arg(p, 0, "feedbackId"),
          f.sort === undefined ? undefined : choice(f.sort, SORT_ORDERS)
        ),
    },
    create: {
      flags: ["title", "description", "tag"],
      run: (c, _p, f) =>
        c.createFeedback({
          description: req(f.description, "description"),
          tagId: f.tag,
          title: req(f.title, "title"),
        }),
    },
    delete: {
      args: "<feedbackId>",
      run: (c, p) => c.deleteFeedback(arg(p, 0, "feedbackId")),
    },
    get: {
      args: "<feedbackId>",
      run: (c, p) => c.getFeedback(arg(p, 0, "feedbackId")),
    },
    issue: {
      args: "<feedbackId>",
      run: (c, p) => c.createGithubIssue(arg(p, 0, "feedbackId")),
    },
    list: {
      flags: [
        "status",
        "status-id",
        "tag",
        "search",
        "sort",
        "limit",
        "offset",
      ],
      run: (c, _p, f) =>
        c.listFeedback({
          limit: num(f.limit),
          offset: num(f.offset),
          search: f.search,
          sortBy: f.sort,
          status: f.status,
          statusId: f["status-id"],
          tagId: f.tag,
        }),
    },
    next: {
      flags: ["statuses", "tags", "limit"],
      run: (c, _p, f) =>
        c.nextFeedback({
          limit: num(f.limit),
          statuses: list(f.statuses),
          tagIds: list(f.tags),
        }),
    },
    restore: {
      args: "<feedbackId>",
      run: (c, p) => c.restoreFeedback(arg(p, 0, "feedbackId")),
    },
    status: {
      args: "<feedbackId> <status|statusId>",
      run: (c, p) => {
        const target = arg(p, 1, "status|statusId");
        return FEEDBACK_STATUSES.has(target)
          ? c.setFeedbackStatus(arg(p, 0, "feedbackId"), undefined, target)
          : c.setFeedbackStatus(arg(p, 0, "feedbackId"), target);
      },
    },
    tags: {
      args: "<feedbackId>",
      flags: ["add", "remove"],
      run: (c, p, f) =>
        c.updateFeedbackTags(
          arg(p, 0, "feedbackId"),
          list(f.add),
          list(f.remove)
        ),
    },
    update: {
      args: "<feedbackId>",
      flags: ["title", "description"],
      run: (c, p, f) =>
        c.updateFeedback({
          description: f.description,
          feedbackId: arg(p, 0, "feedbackId"),
          title: f.title,
        }),
    },
    vote: {
      args: "<feedbackId> [upvote|downvote]",
      run: (c, p) =>
        c.voteFeedback(
          arg(p, 0, "feedbackId"),
          p[1] === undefined ? undefined : choice(p[1], VOTES)
        ),
    },
  },
  roadmap: { get: { run: (c) => c.getRoadmap() } },
  screenshot: {
    delete: {
      args: "<screenshotId>",
      run: (c, p) => c.deleteScreenshot(arg(p, 0, "screenshotId")),
    },
    download: {
      args: "<feedbackId>",
      flags: ["out"],
      run: (c, p, f) =>
        downloadScreenshots(c, arg(p, 0, "feedbackId"), { out: f.out }),
    },
    list: {
      args: "<feedbackId>",
      run: (c, p) => c.listScreenshots(arg(p, 0, "feedbackId")),
    },
  },
};
