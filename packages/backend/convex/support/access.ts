import { type Infer, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { authComponent } from "../auth/auth";
import { getOrgMembership, isOrgAdmin } from "../shared/membership";
import { findConversationIdByThreadToken } from "./thread_tokens";

export const supportCredential = v.union(
  v.object({ guestId: v.string(), kind: v.literal("guest") }),
  v.object({ kind: v.literal("thread"), token: v.string() })
);

export type SupportCredential = Infer<typeof supportCredential>;

export interface ConversationAccess {
  isAdmin: boolean;
  isOwner: boolean;
  viewerId: string;
}

const credentialOpens = async (
  ctx: QueryCtx,
  conversation: Doc<"supportConversations">,
  credential: SupportCredential
): Promise<boolean> => {
  if (credential.kind === "guest") {
    return conversation.guestId === credential.guestId;
  }
  return (
    (await findConversationIdByThreadToken(ctx, credential.token)) ===
    conversation._id
  );
};

export const resolveConversationAccess = async (
  ctx: QueryCtx,
  conversation: Doc<"supportConversations">,
  credential?: SupportCredential
): Promise<ConversationAccess | null> => {
  if (credential && (await credentialOpens(ctx, conversation, credential))) {
    return { isAdmin: false, isOwner: true, viewerId: conversation.userId };
  }

  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    return null;
  }
  const membership = await getOrgMembership(
    ctx,
    conversation.organizationId,
    user._id
  );
  const isAdmin = isOrgAdmin(membership?.role);
  const isOwner = !conversation.guestId && conversation.userId === user._id;
  return isAdmin || isOwner ? { isAdmin, isOwner, viewerId: user._id } : null;
};

export const requireConversationAccess = async (
  ctx: QueryCtx,
  conversation: Doc<"supportConversations">,
  credential?: SupportCredential
): Promise<ConversationAccess> => {
  const access = await resolveConversationAccess(ctx, conversation, credential);
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
