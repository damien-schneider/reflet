"use node";

import { render } from "@react-email/render";
import { InvitationEmail } from "@reflet/email/templates/invitation-email";
import { VerificationEmail } from "@reflet/email/templates/verification-email";
import { WelcomeEmail } from "@reflet/email/templates/welcome-email";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "notifications@mail.reflet.app";
const fromName = "Reflet";
const defaultFrom = `${fromName} <${fromEmail}>`;
const SUPPORT_EMAIL = "support@reflet.app";

// Send verification email using react-email template
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

// Send password reset email using react-email template
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

// Send welcome email using react-email template
export const sendWelcomeEmail = internalAction({
  args: {
    dashboardUrl: v.optional(v.string()),
    to: v.string(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const siteUrl = process.env.SITE_URL ?? "";
    const dashboardUrl = args.dashboardUrl
      ? `${siteUrl}${args.dashboardUrl}`
      : `${siteUrl}/dashboard`;

    const component = WelcomeEmail({
      dashboardUrl,
      userName: args.userName,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      html,
      replyTo: SUPPORT_EMAIL,
      subject: "Bienvenue sur Reflet",
      text,
      to: args.to,
    });
  },
});

// Send invitation email using react-email template
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

// Generic action to render any template and send
export const sendTemplatedEmail = internalAction({
  args: {
    replyTo: v.optional(v.union(v.string(), v.array(v.string()))),
    subject: v.string(),
    template: v.union(v.literal("verification"), v.literal("welcome")),
    templateProps: v.object({
      dashboardUrl: v.optional(v.string()),
      userName: v.optional(v.string()),
      verificationUrl: v.optional(v.string()),
    }),
    to: v.union(v.string(), v.array(v.string())),
  },
  handler: async (ctx, args) => {
    let component: React.JSX.Element;

    switch (args.template) {
      case "verification": {
        if (!args.templateProps.verificationUrl) {
          throw new Error("verificationUrl is required for verification email");
        }
        component = VerificationEmail({
          userName: args.templateProps.userName,
          verificationUrl: args.templateProps.verificationUrl,
        });
        break;
      }
      case "welcome": {
        const siteUrl = process.env.SITE_URL ?? "";
        const dashboardUrl = args.templateProps.dashboardUrl
          ? `${siteUrl}${args.templateProps.dashboardUrl}`
          : `${siteUrl}/dashboard`;

        component = WelcomeEmail({
          dashboardUrl,
          userName: args.templateProps.userName,
        });
        break;
      }
      default:
        throw new Error(`Unknown template: ${args.template}`);
    }

    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      html,
      replyTo: args.replyTo ?? SUPPORT_EMAIL,
      subject: args.subject,
      text,
      to: args.to,
    });
  },
});

// Send changelog notification email using react-email template
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

// Send weekly digest email using react-email template
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

// Send feedback shipped notification email
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
