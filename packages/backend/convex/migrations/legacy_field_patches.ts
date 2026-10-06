import type { Doc } from "../_generated/dataModel";
import { isTagColor, type TagColor } from "../feedback/tag_colors";

const LEGACY_HEX_TO_TAG_COLOR: Record<string, TagColor> = {
  "#3b82f6": "blue",
  "#3ddc84": "green",
  "#6b7280": "gray",
  "#8b5cf6": "purple",
  "#8fb0ff": "blue",
  "#14b8a6": "green",
  "#22c55e": "green",
  "#a855f7": "purple",
  "#eab308": "yellow",
  "#ec4899": "pink",
  "#ef4438": "red",
  "#ef4444": "red",
  "#f0b719": "yellow",
  "#f59e0b": "yellow",
  "#f97316": "orange",
};

function legacyColorPatch(color: string): { color: TagColor } | undefined {
  if (isTagColor(color)) {
    return undefined;
  }
  return { color: LEGACY_HEX_TO_TAG_COLOR[color.toLowerCase()] ?? "default" };
}

export function legacyProjectSetupResultPatch(
  setup: Doc<"projectSetupResults">
) {
  const tags = setup.suggestedTags;
  if (!tags || tags.every((tag) => isTagColor(tag.color))) {
    return;
  }
  return {
    suggestedTags: tags.map((tag) => ({
      ...tag,
      color: legacyColorPatch(tag.color)?.color ?? tag.color,
    })),
  };
}

export const legacyMilestonePatch = (milestone: Doc<"milestones">) =>
  legacyColorPatch(milestone.color);

export const legacyOrganizationStatusPatch = (
  status: Doc<"organizationStatuses">
) => legacyColorPatch(status.color);

export function legacyTagPatch(tag: Doc<"tags">) {
  const colorPatch = legacyColorPatch(tag.color);
  const hasLegacyFlags =
    tag.isDoneStatus !== undefined ||
    tag.isRoadmapLane !== undefined ||
    tag.laneOrder !== undefined;
  const hasLegacySettings =
    tag.settings?.defaultStatus !== undefined ||
    tag.settings?.requireApproval !== undefined;
  if (!(colorPatch || hasLegacyFlags || hasLegacySettings)) {
    return;
  }
  return {
    ...colorPatch,
    ...(hasLegacyFlags && {
      isDoneStatus: undefined,
      isRoadmapLane: undefined,
      laneOrder: undefined,
    }),
    ...(hasLegacySettings && {
      settings: { isPublic: tag.settings?.isPublic },
    }),
  };
}

const LEGACY_FEEDBACK_AI_FIELDS = [
  "aiComplexity",
  "aiComplexityGeneratedAt",
  "aiComplexityReasoning",
  "aiPriorityGeneratedAt",
  "aiTimeEstimate",
  "aiTimeEstimateGeneratedAt",
] as const;

function legacyContextPatch(context: Doc<"feedback">["context"]) {
  if (!(context && (context.selection || context.scroll))) {
    return;
  }
  const { selection, scroll: _scroll, ...rest } = context;
  if (!selection) {
    return rest;
  }
  return { ...rest, selections: [...(rest.selections ?? []), selection] };
}

export function legacyFeedbackPatch(feedback: Doc<"feedback">) {
  const context = legacyContextPatch(feedback.context);
  const hasLegacyAiFields = LEGACY_FEEDBACK_AI_FIELDS.some(
    (field) => feedback[field] !== undefined
  );
  if (!(context || hasLegacyAiFields)) {
    return;
  }
  return {
    ...(context && { context }),
    ...(hasLegacyAiFields && {
      aiComplexity: undefined,
      aiComplexityGeneratedAt: undefined,
      aiComplexityReasoning: undefined,
      aiPriorityGeneratedAt: undefined,
      aiTimeEstimate: undefined,
      aiTimeEstimateGeneratedAt: undefined,
    }),
  };
}

export function legacyOrganizationPatch(organization: Doc<"organizations">) {
  const settings = organization.feedbackSettings;
  const hasLegacySettings =
    settings?.allowAnonymousVoting !== undefined ||
    settings?.cardStyle !== undefined ||
    settings?.defaultTagId !== undefined ||
    settings?.milestoneStyle !== undefined;
  const hasCustomCss = organization.customCss !== undefined;
  if (!(hasLegacySettings || hasCustomCss)) {
    return;
  }
  return {
    ...(hasCustomCss && { customCss: undefined }),
    ...(hasLegacySettings && {
      feedbackSettings: {
        defaultStatus: settings?.defaultStatus,
        defaultView: settings?.defaultView,
        requireApproval: settings?.requireApproval,
      },
    }),
  };
}

export const legacyNotificationPreferencesPatch = (
  preferences: Doc<"userNotificationPreferences">
) =>
  preferences.weeklyDigestEnabled === undefined
    ? undefined
    : { weeklyDigestEnabled: undefined };

export function legacyGithubConnectionPatch(
  connection: Doc<"githubConnections">
) {
  const hasCiFields =
    connection.ciBranch !== undefined ||
    connection.ciEnabled !== undefined ||
    connection.ciWorkflowCreated !== undefined;
  return hasCiFields
    ? {
        ciBranch: undefined,
        ciEnabled: undefined,
        ciWorkflowCreated: undefined,
      }
    : undefined;
}

export const legacyApiRequestLogPatch = (log: Doc<"apiRequestLogs">) =>
  log.ip === undefined ? undefined : { ip: undefined };

export const legacyRepoAnalysisPatch = (analysis: Doc<"repoAnalysis">) =>
  analysis.threadId === undefined ? undefined : { threadId: undefined };

export const legacyInsightPatch = (insight: Doc<"intelligenceInsights">) =>
  insight.competitorIds === undefined
    ? undefined
    : { competitorIds: undefined };
