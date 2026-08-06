import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getOrgMembership, isOrgAdmin } from "../shared/membership";

export interface ConversationAccess {
  isAdmin: boolean;
  isOwner: boolean;
  viewerId: string;
}

export const resolveConversationAccess = async (
  ctx: QueryCtx,
  conversation: Doc<"supportConversations">,
  guestId?: string
): Promise<ConversationAccess | null> => {
  const user = await authComponent.safeGetAuthUser(ctx);

  if (user) {
    const membership = await getOrgMembership(
      ctx,
      conversation.organizationId,
      user._id
    );
    const isAdmin = isOrgAdmin(membership?.role);
    const isOwner = conversation.userId === user._id;

    if (!(isAdmin || isOwner)) {
      return null;
    }
    return { isAdmin, isOwner, viewerId: user._id };
  }

  if (guestId && conversation.guestId === guestId) {
    return { isAdmin: false, isOwner: true, viewerId: guestId };
  }

  return null;
};

export const requireConversationAccess = async (
  ctx: QueryCtx,
  conversation: Doc<"supportConversations">,
  guestId?: string
): Promise<ConversationAccess> => {
  const access = await resolveConversationAccess(ctx, conversation, guestId);
  if (!access) {
    throw new Error("You don't have access to this conversation");
  }
  return access;
};

export const isOrgAdminViewer = async (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<boolean> => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    return false;
  }
  const membership = await getOrgMembership(ctx, organizationId, user._id);
  return isOrgAdmin(membership?.role);
};
