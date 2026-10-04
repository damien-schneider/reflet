import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { ensureThreadToken } from "./thread_tokens";

const NOTIFICATION_TITLE = "New support message";

const notifySignedInCustomer = async (
  ctx: MutationCtx,
  conversation: Doc<"supportConversations">,
  threadUrl: string
) => {
  const message = `You have a new reply from support${conversation.subject ? `: ${conversation.subject}` : ""}`;

  await ctx.db.insert("notifications", {
    createdAt: Date.now(),
    isRead: false,
    message,
    title: NOTIFICATION_TITLE,
    type: "new_support_message",
    userId: conversation.userId,
  });

  await ctx.scheduler.runAfter(
    0,
    internal.notifications.push.sendPushNotification,
    {
      message,
      title: NOTIFICATION_TITLE,
      type: "new_support_message",
      url: threadUrl,
      userId: conversation.userId,
    }
  );
};

export const scheduleCustomerDelivery = async (
  ctx: MutationCtx,
  conversation: Doc<"supportConversations">,
  messageId: Id<"supportMessages">
): Promise<void> => {
  const token = await ensureThreadToken(ctx, conversation._id);

  if (!conversation.guestId) {
    await notifySignedInCustomer(ctx, conversation, `/support/t/${token}`);
  }

  await ctx.scheduler.runAfter(
    0,
    internal.support.email.render.deliverAdminReply,
    { messageId }
  );
};
