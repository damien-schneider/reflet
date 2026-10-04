import { type Infer, v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { emailSendStatus } from "../../email/tableFields";
import { outboundDeliveryMode, outboundSkipReason } from "./tableFields";

export const supportMessageEmail = v.union(
  v.object({
    autoSubmitted: v.boolean(),
    direction: v.literal("inbound"),
    from: v.string(),
    senderAuthenticated: v.boolean(),
    senderMismatch: v.boolean(),
  }),
  v.object({
    deliveryStatus: v.optional(emailSendStatus),
    direction: v.literal("outbound"),
    mode: outboundDeliveryMode,
  }),
  v.object({ direction: v.literal("skipped"), reason: outboundSkipReason })
);

export type SupportMessageEmail = Infer<typeof supportMessageEmail>;

export const describeMessageEmail = async (
  ctx: QueryCtx,
  message: Doc<"supportMessages">
): Promise<SupportMessageEmail | undefined> => {
  if (message.inboundEmailId) {
    const inbound = await ctx.db.get(message.inboundEmailId);
    if (!inbound) {
      return undefined;
    }
    return {
      autoSubmitted: inbound.isAutoSubmitted ?? false,
      direction: "inbound",
      from: inbound.from,
      senderAuthenticated: inbound.senderAuthenticated ?? false,
      senderMismatch: inbound.senderMismatch ?? false,
    };
  }
  const outbound = message.outboundEmail;
  if (!outbound) {
    return undefined;
  }
  if (outbound.status === "skipped") {
    return { direction: "skipped", reason: outbound.reason };
  }
  const sendLog = await ctx.db.get(outbound.sendLogId);
  return {
    deliveryStatus: sendLog?.status,
    direction: "outbound",
    mode: outbound.mode,
  };
};
