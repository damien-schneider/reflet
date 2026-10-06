"use node";

import { render } from "@react-email/render";
import { InvitationEmail } from "@reflet/email/templates/invitation-email";
import { PlatformAlertEmail } from "@reflet/email/templates/platform-alert-email";
import { StatusIncidentEmail } from "@reflet/email/templates/status-incident-email";
import { StatusMaintenanceEmail } from "@reflet/email/templates/status-maintenance-email";
import { SubscriptionConfirmationEmail } from "@reflet/email/templates/subscription-confirmation-email";
import { VerificationEmail } from "@reflet/email/templates/verification-email";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { type ActionCtx, internalAction } from "../_generated/server";
import {
  statusIncidentEmailFields,
  statusMaintenanceEmailFields,
} from "../status/incidentNotifications";

const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "notifications@mail.reflet.app";
const fromName = "Reflet";
const defaultFrom = `${fromName} <${fromEmail}>`;
const SUPPORT_EMAIL = "support@reflet.app";

export const sendVerificationEmail = internalAction({
  args: {
    to: v.string(),
    userName: v.optional(v.string()),
    verificationUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const component = VerificationEmail({
      userName: args.userName,
      verificationUrl: args.verificationUrl,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      html,
      replyTo: SUPPORT_EMAIL,
      subject: "Vérifiez votre adresse email",
      text,
      to: args.to,
    });
  },
});

export const sendPasswordResetEmail = internalAction({
  args: {
    resetUrl: v.string(),
    to: v.string(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { PasswordResetEmail } = await import(
      "@reflet/email/templates/password-reset-email"
    );

    const component = PasswordResetEmail({
      resetUrl: args.resetUrl,
      userName: args.userName,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      html,
      replyTo: SUPPORT_EMAIL,
      subject: "Réinitialisez votre mot de passe",
      text,
      to: args.to,
    });
  },
});

export const sendInvitationEmail = internalAction({
  args: {
    acceptUrl: v.string(),
    inviterName: v.string(),
    organizationName: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const component = InvitationEmail({
      acceptUrl: args.acceptUrl,
      inviterName: args.inviterName,
      organizationName: args.organizationName,
      role: args.role,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      html,
      replyTo: SUPPORT_EMAIL,
      subject: `Invitation à rejoindre ${args.organizationName}`,
      text,
      to: args.to,
    });
  },
});

export const sendChangelogNotificationEmail = internalAction({
  args: {
    organizationName: v.string(),
    releaseDescription: v.string(),
    releaseTitle: v.string(),
    releaseUrl: v.string(),
    releaseVersion: v.optional(v.string()),
    to: v.string(),
    unsubscribeUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { ChangelogNotificationEmail } = await import(
      "@reflet/email/templates/changelog-notification-email"
    );

    const component = ChangelogNotificationEmail({
      organizationName: args.organizationName,
      releaseDescription: args.releaseDescription,
      releaseTitle: args.releaseTitle,
      releaseUrl: args.releaseUrl,
      releaseVersion: args.releaseVersion,
      unsubscribeUrl: args.unsubscribeUrl,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      headers: [
        { name: "List-Unsubscribe", value: args.unsubscribeUrl },
        { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
      ],
      html,
      replyTo: SUPPORT_EMAIL,
      subject: `${args.organizationName} - ${args.releaseTitle}`,
      text,
      to: args.to,
    });
  },
});

export const sendSubscriptionConfirmationEmail = internalAction({
  args: {
    confirmUrl: v.string(),
    list: v.union(v.literal("changelog"), v.literal("status")),
    organizationName: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const isSuppressed = await ctx.runQuery(
      internal.email.suppression.isEmailSuppressed,
      { email: args.to }
    );
    if (isSuppressed) {
      return null;
    }

    const component = SubscriptionConfirmationEmail({
      confirmUrl: args.confirmUrl,
      list: args.list,
      organizationName: args.organizationName,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      html,
      replyTo: SUPPORT_EMAIL,
      subject: `Confirmez votre abonnement à ${args.organizationName}`,
      text,
      to: args.to,
    });
    return null;
  },
  returns: v.null(),
});

const sendStatusSubscriberEmail = async (
  ctx: ActionCtx,
  email: {
    component: Parameters<typeof render>[0];
    subject: string;
    to: string;
    unsubscribeUrl: string;
  }
): Promise<void> => {
  const isSuppressed = await ctx.runQuery(
    internal.email.suppression.isEmailSuppressed,
    { email: email.to }
  );
  if (isSuppressed) {
    return;
  }

  await ctx.runMutation(internal.email.send.sendEmail, {
    from: defaultFrom,
    headers: [
      { name: "List-Unsubscribe", value: email.unsubscribeUrl },
      { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
    ],
    html: await render(email.component),
    replyTo: SUPPORT_EMAIL,
    subject: email.subject,
    text: await render(email.component, { plainText: true }),
    to: email.to,
  });
};

export const sendStatusIncidentEmail = internalAction({
  args: {
    ...statusIncidentEmailFields,
    to: v.string(),
    unsubscribeUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { to, ...props } = args;
    await sendStatusSubscriberEmail(ctx, {
      component: StatusIncidentEmail(props),
      subject: `${args.organizationName} - ${args.title}`,
      to,
      unsubscribeUrl: args.unsubscribeUrl,
    });
    return null;
  },
  returns: v.null(),
});

export const sendStatusMaintenanceEmail = internalAction({
  args: {
    ...statusMaintenanceEmailFields,
    to: v.string(),
    unsubscribeUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { to, ...props } = args;
    await sendStatusSubscriberEmail(ctx, {
      component: StatusMaintenanceEmail(props),
      subject: `${args.organizationName} - Maintenance planifiée : ${args.title}`,
      to,
      unsubscribeUrl: args.unsubscribeUrl,
    });
    return null;
  },
  returns: v.null(),
});

export const sendWeeklyDigestEmail = internalAction({
  args: {
    dashboardUrl: v.string(),
    newFeedbackCount: v.number(),
    organizationName: v.string(),
    statusChanges: v.array(
      v.object({
        from: v.string(),
        title: v.string(),
        to: v.string(),
      })
    ),
    to: v.string(),
    topFeedback: v.array(
      v.object({
        status: v.string(),
        title: v.string(),
        url: v.string(),
        voteCount: v.number(),
      })
    ),
    totalVotes: v.number(),
    unsubscribeUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { WeeklyDigestEmail } = await import(
      "@reflet/email/templates/weekly-digest-email"
    );

    const component = WeeklyDigestEmail({
      dashboardUrl: args.dashboardUrl,
      newFeedbackCount: args.newFeedbackCount,
      organizationName: args.organizationName,
      statusChanges: args.statusChanges,
      topFeedback: args.topFeedback,
      totalVotes: args.totalVotes,
      unsubscribeUrl: args.unsubscribeUrl,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      html,
      replyTo: SUPPORT_EMAIL,
      subject: `${args.organizationName} - Weekly Digest`,
      text,
      to: args.to,
    });
  },
});

export const sendFeedbackShippedEmail = internalAction({
  args: {
    feedbackTitle: v.string(),
    feedbackUrl: v.string(),
    organizationName: v.string(),
    releaseTitle: v.string(),
    releaseUrl: v.string(),
    to: v.string(),
    unsubscribeUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { FeedbackShippedEmail } = await import(
      "@reflet/email/templates/feedback-shipped-email"
    );

    const component = FeedbackShippedEmail({
      feedbackTitle: args.feedbackTitle,
      feedbackUrl: args.feedbackUrl,
      organizationName: args.organizationName,
      releaseTitle: args.releaseTitle,
      releaseUrl: args.releaseUrl,
      unsubscribeUrl: args.unsubscribeUrl,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      headers: [
        { name: "List-Unsubscribe", value: args.unsubscribeUrl },
        { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
      ],
      html,
      replyTo: SUPPORT_EMAIL,
      subject: `${args.organizationName} - Your feedback has shipped!`,
      text,
      to: args.to,
    });
  },
});

export const sendPlatformAlertEmail = internalAction({
  args: {
    details: v.array(v.string()),
    subject: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const component = PlatformAlertEmail({
      details: args.details,
      title: args.title,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      html,
      subject: `[Reflet] ${args.subject}`,
      text,
      to: SUPPORT_EMAIL,
    });
  },
});
