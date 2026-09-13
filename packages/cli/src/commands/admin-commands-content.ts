import {
  arg,
  bool,
  type CommandSpec,
  choice,
  json,
  num,
  req,
  timestamp,
} from "./admin-flags";

const LINK_ACTIONS = ["link", "unlink"] as const;

const RELEASE_STATUSES = ["draft", "published", "all"] as const;

const MILESTONE_STATUSES = ["active", "completed", "archived", "all"] as const;

const SURVEY_STATUSES = ["draft", "active", "paused", "closed"] as const;

const RESPONSE_STATUSES = ["started", "completed", "abandoned"] as const;

const ROLES = ["admin", "member"] as const;

export const CONTENT_COMMANDS: Record<string, Record<string, CommandSpec>> = {
  invitation: {
    cancel: {
      args: "<invitationId>",
      run: (c, p) => c.cancelInvitation(arg(p, 0, "invitationId")),
    },
    create: {
      flags: ["email", "role"],
      run: (c, _p, f) =>
        c.createInvitation({
          email: req(f.email, "email"),
          role: choice(req(f.role, "role"), ROLES),
        }),
    },
    list: { run: (c) => c.listInvitations() },
  },
  member: { list: { run: (c) => c.listMembers() } },
  milestone: {
    complete: {
      args: "<milestoneId>",
      run: (c, p) => c.completeMilestone(arg(p, 0, "milestoneId")),
    },
    create: {
      flags: [
        "name",
        "color",
        "horizon",
        "description",
        "emoji",
        "target-date",
        "public",
      ],
      run: (c, _p, f) =>
        c.createMilestone({
          color: req(f.color, "color"),
          description: f.description,
          emoji: f.emoji,
          isPublic: bool(f.public),
          name: req(f.name, "name"),
          targetDate: timestamp(f["target-date"]),
          timeHorizon: req(f.horizon, "horizon"),
        }),
    },
    delete: {
      args: "<milestoneId>",
      run: (c, p) => c.deleteMilestone(arg(p, 0, "milestoneId")),
    },
    get: {
      args: "<milestoneId>",
      run: (c, p) => c.getMilestone(arg(p, 0, "milestoneId")),
    },
    link: {
      args: "<milestoneId> <feedbackId> [link|unlink]",
      run: (c, p) =>
        c.linkMilestoneFeedback(
          arg(p, 0, "milestoneId"),
          arg(p, 1, "feedbackId"),
          choice(p[2] ?? "link", LINK_ACTIONS)
        ),
    },
    list: {
      flags: ["status"],
      run: (c, _p, f) =>
        c.listMilestones({
          status:
            f.status === undefined
              ? undefined
              : choice(f.status, MILESTONE_STATUSES),
        }),
    },
    update: {
      args: "<milestoneId>",
      flags: [
        "name",
        "color",
        "horizon",
        "description",
        "emoji",
        "target-date",
        "public",
      ],
      run: (c, p, f) =>
        c.updateMilestone({
          color: f.color,
          description: f.description,
          emoji: f.emoji,
          isPublic: bool(f.public),
          milestoneId: arg(p, 0, "milestoneId"),
          name: f.name,
          targetDate: timestamp(f["target-date"]),
          timeHorizon: f.horizon,
        }),
    },
  },
  org: {
    get: { run: (c) => c.getOrganization() },
    update: {
      flags: ["name", "public", "color", "support"],
      run: (c, _p, f) =>
        c.updateOrganization({
          isPublic: bool(f.public),
          name: f.name,
          primaryColor: f.color,
          supportEnabled: bool(f.support),
        }),
    },
  },
  release: {
    "cancel-schedule": {
      args: "<releaseId>",
      run: (c, p) => c.cancelScheduledRelease(arg(p, 0, "releaseId")),
    },
    create: {
      flags: ["title", "description", "version"],
      run: (c, _p, f) =>
        c.createRelease({
          description: f.description,
          title: req(f.title, "title"),
          version: f.version,
        }),
    },
    delete: {
      args: "<releaseId>",
      run: (c, p) => c.deleteRelease(arg(p, 0, "releaseId")),
    },
    get: {
      args: "<releaseId>",
      run: (c, p) => c.getRelease(arg(p, 0, "releaseId")),
    },
    link: {
      args: "<releaseId> <feedbackId> [link|unlink]",
      run: (c, p) =>
        c.linkReleaseFeedback(
          arg(p, 0, "releaseId"),
          arg(p, 1, "feedbackId"),
          choice(p[2] ?? "link", LINK_ACTIONS)
        ),
    },
    list: {
      flags: ["status", "limit", "offset"],
      run: (c, _p, f) =>
        c.listReleases({
          limit: num(f.limit),
          offset: num(f.offset),
          status:
            f.status === undefined
              ? undefined
              : choice(f.status, RELEASE_STATUSES),
        }),
    },
    publish: {
      args: "<releaseId>",
      run: (c, p) => c.publishRelease(arg(p, 0, "releaseId")),
    },
    schedule: {
      args: "<releaseId>",
      flags: ["at", "feedback-status"],
      run: (c, p, f) =>
        c.scheduleRelease({
          feedbackStatus: f["feedback-status"],
          releaseId: arg(p, 0, "releaseId"),
          scheduledPublishAt: timestamp(req(f.at, "at")) ?? 0,
        }),
    },
    unpublish: {
      args: "<releaseId>",
      run: (c, p) => c.unpublishRelease(arg(p, 0, "releaseId")),
    },
    update: {
      args: "<releaseId>",
      flags: ["title", "description", "version"],
      run: (c, p, f) =>
        c.updateRelease({
          description: f.description,
          releaseId: arg(p, 0, "releaseId"),
          title: f.title,
          version: f.version,
        }),
    },
  },
  status: {
    create: {
      flags: ["name", "color", "icon"],
      run: (c, _p, f) =>
        c.createStatus({
          color: req(f.color, "color"),
          icon: f.icon,
          name: req(f.name, "name"),
        }),
    },
    delete: {
      args: "<statusId>",
      run: (c, p) => c.deleteStatus(arg(p, 0, "statusId")),
    },
    list: { run: (c) => c.listStatuses() },
    update: {
      args: "<statusId>",
      flags: ["name", "color", "icon"],
      run: (c, p, f) =>
        c.updateStatus({
          color: f.color,
          icon: f.icon,
          name: f.name,
          statusId: arg(p, 0, "statusId"),
        }),
    },
  },
  survey: {
    analytics: {
      args: "<surveyId>",
      run: (c, p) => c.getSurveyAnalytics(arg(p, 0, "surveyId")),
    },
    create: {
      flags: ["title", "description", "trigger", "trigger-config", "questions"],
      run: (c, _p, f) =>
        c.createSurvey({
          description: f.description,
          questions: json(req(f.questions, "questions")) ?? [],
          title: req(f.title, "title"),
          triggerConfig: json(f["trigger-config"]),
          triggerType: req(f.trigger, "trigger"),
        }),
    },
    delete: {
      args: "<surveyId>",
      run: (c, p) => c.deleteSurvey(arg(p, 0, "surveyId")),
    },
    duplicate: {
      args: "<surveyId>",
      flags: ["title"],
      run: (c, p, f) => c.duplicateSurvey(arg(p, 0, "surveyId"), f.title),
    },
    get: {
      args: "<surveyId>",
      run: (c, p) => c.getSurvey(arg(p, 0, "surveyId")),
    },
    list: {
      flags: ["status"],
      run: (c, _p, f) =>
        c.listSurveys({
          status:
            f.status === undefined
              ? undefined
              : choice(f.status, SURVEY_STATUSES),
        }),
    },
    responses: {
      args: "<surveyId>",
      flags: ["status", "limit"],
      run: (c, p, f) =>
        c.listSurveyResponses(arg(p, 0, "surveyId"), {
          limit: num(f.limit),
          status:
            f.status === undefined
              ? undefined
              : choice(f.status, RESPONSE_STATUSES),
        }),
    },
    status: {
      args: "<surveyId> <draft|active|paused|closed>",
      run: (c, p) =>
        c.updateSurveyStatus(
          arg(p, 0, "surveyId"),
          choice(arg(p, 1, "status"), SURVEY_STATUSES)
        ),
    },
    update: {
      args: "<surveyId>",
      flags: [
        "title",
        "description",
        "trigger",
        "trigger-config",
        "max-responses",
      ],
      run: (c, p, f) =>
        c.updateSurvey({
          description: f.description,
          maxResponses: num(f["max-responses"]),
          surveyId: arg(p, 0, "surveyId"),
          title: f.title,
          triggerConfig: json(f["trigger-config"]),
          triggerType: f.trigger,
        }),
    },
  },
  tag: {
    create: {
      flags: ["name", "color", "icon", "description", "public"],
      run: (c, _p, f) =>
        c.createTag({
          color: req(f.color, "color"),
          description: f.description,
          icon: f.icon,
          isPublic: bool(f.public),
          name: req(f.name, "name"),
        }),
    },
    delete: { args: "<tagId>", run: (c, p) => c.deleteTag(arg(p, 0, "tagId")) },
    list: { run: (c) => c.listTags() },
    update: {
      args: "<tagId>",
      flags: ["name", "color", "icon", "description", "public"],
      run: (c, p, f) =>
        c.updateTag({
          color: f.color,
          description: f.description,
          icon: f.icon,
          isPublic: bool(f.public),
          name: f.name,
          tagId: arg(p, 0, "tagId"),
        }),
    },
  },
};
