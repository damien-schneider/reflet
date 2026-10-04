import type { HttpRouter } from "convex/server";
import { v } from "convex/values";
import { Webhook } from "svix";
import { z } from "zod";
import { internal } from "../../_generated/api";
import {
  type ActionCtx,
  httpAction,
  internalMutation,
} from "../../_generated/server";
import { supportResend } from "./client";
import { unsubscribeThread } from "./contacts";

const SVIX_HEADERS = ["svix-id", "svix-timestamp", "svix-signature"] as const;

const webhookEnvelopeSchema = z.object({ data: z.unknown(), type: z.string() });

const receivedEmailEventSchema = z.object({
  email_id: z.string(),
  from: z.string(),
  message_id: z.string().nullish(),
  subject: z.string().nullish(),
  to: z.array(z.string()),
});

export const unsubscribeFromThread = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await unsubscribeThread(ctx, args.token);
  },
});

const verifiedInboundPayload = (
  secret: string,
  rawBody: string,
  request: Request
): { payload: unknown } | null => {
  const headers: Record<string, string> = {};
  for (const name of SVIX_HEADERS) {
    headers[name] = request.headers.get(name) ?? "";
  }
  try {
    new Webhook(secret).verify(rawBody, headers);
    return { payload: JSON.parse(rawBody) };
  } catch {
    return null;
  }
};

const handleInboundWebhook = async (
  ctx: ActionCtx,
  request: Request
): Promise<Response> => {
  const secret = process.env.RESEND_SUPPORT_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Inbound webhook is not configured", { status: 500 });
  }
  const verified = verifiedInboundPayload(
    secret,
    await request.text(),
    request
  );
  if (!verified) {
    return new Response("Invalid signature", { status: 401 });
  }
  const envelope = webhookEnvelopeSchema.safeParse(verified.payload);
  if (!envelope.success) {
    return new Response("Invalid payload", { status: 400 });
  }
  if (envelope.data.type !== "email.received") {
    return new Response(null, { status: 200 });
  }
  const event = receivedEmailEventSchema.safeParse(envelope.data.data);
  if (!event.success) {
    return new Response("Invalid payload", { status: 400 });
  }
  await ctx.runMutation(internal.support.email.inbound.accept.acceptInbound, {
    from: event.data.from,
    resendEmailId: event.data.email_id,
    rfcMessageId: event.data.message_id ?? undefined,
    subject: event.data.subject ?? "",
    to: event.data.to,
  });
  return new Response(null, { status: 200 });
};

export const registerSupportEmailRoutes = (http: HttpRouter): void => {
  http.route({
    handler: httpAction(
      async (ctx, request) =>
        await supportResend.handleResendEventWebhook(ctx, request)
    ),
    method: "POST",
    path: "/resend-support-events",
  });

  http.route({
    handler: httpAction(handleInboundWebhook),
    method: "POST",
    path: "/resend-support-inbound",
  });

  http.route({
    handler: httpAction(async (ctx, request) => {
      const token = new URL(request.url).searchParams.get("t");
      if (!token) {
        return new Response("Missing token", { status: 400 });
      }
      await ctx.runMutation(
        internal.support.email.http_routes.unsubscribeFromThread,
        { token }
      );
      return new Response(null, { status: 200 });
    }),
    method: "POST",
    path: "/resend-support-unsubscribe",
  });
};
