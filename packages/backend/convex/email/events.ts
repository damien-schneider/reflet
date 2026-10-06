import type { vOnEmailEventArgs } from "@convex-dev/resend";
import type { Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { addSuppressionOnce } from "./suppression";

type EmailEventArgs = Infer<typeof vOnEmailEventArgs>;
type EmailEvent = EmailEventArgs["event"];
type SendStatus = Doc<"emailSendLog">["status"];

const STATUS_BY_EVENT: Partial<Record<EmailEvent["type"], SendStatus>> = {
  "email.bounced": "bounced",
  "email.clicked": "clicked",
  "email.complained": "complained",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.failed": "failed",
  "email.opened": "opened",
};

const TIMESTAMP_FIELD_BY_EVENT: Partial<
  Record<
    EmailEvent["type"],
    "bouncedAt" | "clickedAt" | "complainedAt" | "deliveredAt" | "openedAt"
  >
> = {
  "email.bounced": "bouncedAt",
  "email.clicked": "clickedAt",
  "email.complained": "complainedAt",
  "email.delivered": "deliveredAt",
  "email.opened": "openedAt",
};

const suppressionReasonFor = (
  event: EmailEvent
): "complaint" | "hard_bounce" | null => {
  if (event.type === "email.complained") {
    return "complaint";
  }
  if (
    event.type === "email.bounced" &&
    event.data.bounce.type === "Permanent"
  ) {
    return "hard_bounce";
  }
  return null;
};

export type ComplaintScope = "global" | "organization";

export const recordEmailEvent = async (
  ctx: MutationCtx,
  args: EmailEventArgs,
  options: { complaintScope: ComplaintScope }
): Promise<{
  sendLog: Doc<"emailSendLog"> | null;
  suppressionReason: "complaint" | "hard_bounce" | null;
}> => {
  const { type } = args.event;
  const resendEmailId = String(args.id);
  const now = Date.now();

  const sendLog = await ctx.db
    .query("emailSendLog")
    .withIndex("by_resend_id", (q) => q.eq("resendEmailId", resendEmailId))
    .first();

  const { to } = args.event.data;
  const recipientEmail = typeof to === "string" ? to : to[0];

  const newStatus = STATUS_BY_EVENT[type];
  if (sendLog && newStatus) {
    const timestampField = TIMESTAMP_FIELD_BY_EVENT[type];
    await ctx.db.patch(sendLog._id, {
      status: newStatus,
      ...(timestampField ? { [timestampField]: now } : {}),
    });
  }

  const reason = suppressionReasonFor(args.event);
  if (!(reason && recipientEmail)) {
    return { sendLog, suppressionReason: null };
  }

  const scopedToOrganization =
    reason === "complaint" && options.complaintScope === "organization";
  await addSuppressionOnce(ctx, {
    email: recipientEmail,
    organizationId: scopedToOrganization ? sendLog?.organizationId : undefined,
    originalEventType: type,
    reason,
  });

  return { sendLog, suppressionReason: reason };
};
