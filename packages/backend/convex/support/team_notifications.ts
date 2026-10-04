import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { DEFAULT_PREFERENCES } from "../notifications/preferences";
import { isOrgAdmin } from "../shared/membership";
import { rateLimiter } from "../shared/rate_limits";
import { resolveConversationPerson } from "./people";

const NOTIFICATION_TITLE = "New support message";

const teamRecipientIds = async (
  ctx: MutationCtx,
  conversation: Doc<"supportConversations">
): Promise<string[]> => {
  if (conversation.assignedTo) {
    return [conversation.assignedTo];
  }
  const members = await ctx.db
    .query("organizationMembers")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", conversation.organizationId)
    )
    .collect();
  return members
    .filter((member) => isOrgAdmin(member.role))
    .map((member) => member.userId)
    .filter((userId) => userId !== conversation.userId);
};

const wantsInboxEmail = async (
  ctx: MutationCtx,
  userId: string
): Promise<boolean> => {
  const preferences = await ctx.db
    .query("userNotificationPreferences")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return (
    preferences?.emailOnInboxMessage ?? DEFAULT_PREFERENCES.emailOnInboxMessage
  );
};

const scheduleInboxAlertEmail = async (
  ctx: MutationCtx,
  args: {
    conversation: Doc<"supportConversations">;
    organization: Doc<"organizations">;
    personLabel: string;
    preview: string;
    userId: string;
  }
) => {
  if (!(await wantsInboxEmail(ctx, args.userId))) {
    return;
  }
  const member = await authComponent.getAnyUserById(ctx, args.userId);
  if (!member?.email) {
    return;
  }
  const { ok } = await rateLimiter.limit(ctx, "supportInboxAlertPerMember", {
    key: args.userId,
  });
  if (!ok) {
    return;
  }
  await ctx.scheduler.runAfter(0, internal.support.email.inbox_alert.send, {
    conversationId: args.conversation._id,
    organizationId: args.organization._id,
    organizationName: args.organization.name,
    organizationSlug: args.organization.slug,
    personLabel: args.personLabel,
    preview: args.preview,
    to: member.email,
  });
};

export const notifyTeamOfCustomerMessage = async (
  ctx: MutationCtx,
  conversation: Doc<"supportConversations">,
  args: { preview: string; wasUnread: boolean }
): Promise<void> => {
  const organization = await ctx.db.get(conversation.organizationId);
  if (!organization) {
    return;
  }
  const person = await resolveConversationPerson(ctx, conversation);
  const personLabel = person?.name ?? person?.email ?? "A visitor";
  const message = `${personLabel}: ${args.preview}`;
  const now = Date.now();

  for (const userId of await teamRecipientIds(ctx, conversation)) {
    await ctx.db.insert("notifications", {
      createdAt: now,
      isRead: false,
      message,
      title: NOTIFICATION_TITLE,
      type: "support_inbox_message",
      userId,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.push.sendPushNotification,
      {
        message,
        title: NOTIFICATION_TITLE,
        type: "support_inbox_message",
        url: `/dashboard/${organization.slug}/inbox?conversation=${conversation._id}`,
        userId,
      }
    );
    if (!args.wasUnread) {
      await scheduleInboxAlertEmail(ctx, {
        conversation,
        organization,
        personLabel,
        preview: args.preview,
        userId,
      });
    }
  }
};
