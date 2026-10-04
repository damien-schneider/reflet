import { Resend } from "@convex-dev/resend";
import { components, internal } from "../../_generated/api";

export const supportResend: Resend = new Resend(components.supportResend, {
  apiKey: process.env.RESEND_SUPPORT_API_KEY,
  onEmailEvent: internal.support.email.events.handleSupportEmailEvent,
  testMode: false,
  webhookSecret: process.env.RESEND_SUPPORT_EVENTS_WEBHOOK_SECRET,
});

export const SUPPORT_INBOUND_DOMAIN =
  process.env.SUPPORT_INBOUND_DOMAIN ?? "inbox.reflet.app";

export const SUPPORT_NOTIFICATIONS_FROM = `Reflet <notifications@${SUPPORT_INBOUND_DOMAIN}>`;
