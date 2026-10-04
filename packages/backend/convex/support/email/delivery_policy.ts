import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { authComponent } from "../../auth/auth";
import { getOrgTier } from "../../billing/org_subscription";
import { PLAN_LIMITS } from "../../billing/queries";
import {
  isSupportRecipientSuppressed,
  normalizeEmail,
} from "../../email/suppression";

export interface DeliveryRecipient {
  email: string;
  verified: boolean;
}

export interface DeliveryDomain {
  fromAddress: string;
  status: Doc<"supportSendingDomains">["status"];
}

export type DeliverySkipReason =
  | "no_email"
  | "suppressed"
  | "paused"
  | "unverified_contact";

export type CustomerDelivery =
  | { kind: "full"; from: string; to: string }
  | { kind: "notice"; to: string }
  | { kind: "none"; reason: DeliverySkipReason };

export const chooseCustomerDelivery = (input: {
  domain: DeliveryDomain | null;
  isPro: boolean;
  paused: boolean;
  recipient: DeliveryRecipient | null;
  suppressed: boolean;
}): CustomerDelivery => {
  const { domain, recipient } = input;
  if (!recipient) {
    return { kind: "none", reason: "no_email" };
  }
  if (input.suppressed) {
    return { kind: "none", reason: "suppressed" };
  }
  if (input.paused) {
    return { kind: "none", reason: "paused" };
  }
  if (input.isPro && domain?.status === "verified") {
    return { from: domain.fromAddress, kind: "full", to: recipient.email };
  }
  if (recipient.verified) {
    return { kind: "notice", to: recipient.email };
  }
  return { kind: "none", reason: "unverified_contact" };
};

export const findSupportContact = (
  ctx: QueryCtx,
  organizationId: Doc<"organizations">["_id"],
  email: string
) =>
  ctx.db
    .query("supportContacts")
    .withIndex("by_org_email", (q) =>
      q.eq("organizationId", organizationId).eq("email", normalizeEmail(email))
    )
    .unique();

export const customerRecipient = async (
  ctx: QueryCtx,
  conversation: Doc<"supportConversations">
): Promise<DeliveryRecipient | null> => {
  if (conversation.guestId) {
    if (!conversation.guestEmail) {
      return null;
    }
    const contact = await findSupportContact(
      ctx,
      conversation.organizationId,
      conversation.guestEmail
    );
    return {
      email: normalizeEmail(conversation.guestEmail),
      verified: contact?.verifiedAt !== undefined,
    };
  }
  const user = await authComponent.getAnyUserById(ctx, conversation.userId);
  return user?.email
    ? { email: normalizeEmail(user.email), verified: user.emailVerified }
    : null;
};

export const findSendingDomain = (
  ctx: QueryCtx,
  organizationId: Doc<"organizations">["_id"]
) =>
  ctx.db
    .query("supportSendingDomains")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .first();

export const findSupportEmailSettings = (
  ctx: QueryCtx,
  organizationId: Doc<"organizations">["_id"]
) =>
  ctx.db
    .query("supportEmailSettings")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .unique();

export const orgHasSupportEmailDomainPlan = async (
  ctx: QueryCtx,
  organizationId: Doc<"organizations">["_id"]
): Promise<boolean> =>
  PLAN_LIMITS[await getOrgTier(ctx, organizationId)].supportEmailDomain;

export interface OrgSendingState {
  domain: DeliveryDomain | null;
  isPro: boolean;
  paused: boolean;
  pauseReason: Doc<"supportEmailSettings">["sendingPauseReason"];
}

export const loadOrgSendingState = async (
  ctx: QueryCtx,
  organizationId: Doc<"organizations">["_id"]
): Promise<OrgSendingState> => {
  const domain = await findSendingDomain(ctx, organizationId);
  const settings = await findSupportEmailSettings(ctx, organizationId);
  return {
    domain: domain && {
      fromAddress: `${domain.fromLocalPart}@${domain.domain}`,
      status: domain.status,
    },
    isPro: await orgHasSupportEmailDomainPlan(ctx, organizationId),
    paused: settings?.sendingPausedAt !== undefined,
    pauseReason: settings?.sendingPauseReason,
  };
};

export const resolveCustomerDelivery = async (
  ctx: QueryCtx,
  conversation: Doc<"supportConversations">
): Promise<CustomerDelivery> => {
  const { organizationId } = conversation;
  const recipient = await customerRecipient(ctx, conversation);
  const sending = await loadOrgSendingState(ctx, organizationId);

  return chooseCustomerDelivery({
    domain: sending.domain,
    isPro: sending.isPro,
    paused: sending.paused,
    recipient,
    suppressed: recipient
      ? await isSupportRecipientSuppressed(ctx, recipient.email, organizationId)
      : false,
  });
};
