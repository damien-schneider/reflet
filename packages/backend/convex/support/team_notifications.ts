import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { teamAlertEmailAddress } from "../notifications/team_alerts";
import { orgAdminIdsExcept } from "../shared/membership";
import { resolveConversationPerson } from "./people";

const NOTIFICATION_TITLE = "New support message";

const teamRecipientIds = async (
  ctx: MutationCtx,
  conversation: Doc<"supportConversations">
): Promise<string[]> => {
  if (conversation.assignedTo) {
    return [conversation.assignedTo];
  }
  return await orgAdminIdsExcept(
    ctx,
    conversation.organizationId,
    conversation.userId
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
  const to = await teamAlertEmailAddress(ctx, {
    preference: "emailOnInboxMessage",
    rateLimit: "supportInboxAlertPerMember",
    userId: args.userId,
  });
  if (!to) {
    return;
  }
  await ctx.scheduler.runAfter(0, internal.support.email.inbox_alert.send, {
    conversationId: args.conversation._id,
    organizationId: args.organization._id,
    organizationName: args.organization.name,
    organizationSlug: args.organization.slug,
    personLabel: args.personLabel,
    preview: args.preview,
    to,
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
