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
      to: args.to,
      subject: "Vérifiez votre adresse email",
      html,
      text,
      replyTo: SUPPORT_EMAIL,
    });
  },
});

// Send password reset email using react-email template
export const sendPasswordResetEmail = internalAction({
  args: {
    to: v.string(),
    userName: v.optional(v.string()),
    resetUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { PasswordResetEmail } = await import(
      "@reflet/email/templates/password-reset-email"
    );

    const component = PasswordResetEmail({
      userName: args.userName,
      resetUrl: args.resetUrl,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: "Réinitialisez votre mot de passe",
      html,
      text,
      replyTo: SUPPORT_EMAIL,
    });
  },
});

// Send welcome email using react-email template
export const sendWelcomeEmail = internalAction({
  args: {
    to: v.string(),
    userName: v.optional(v.string()),
    dashboardUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const siteUrl = process.env.SITE_URL ?? "";
    const dashboardUrl = args.dashboardUrl
      ? `${siteUrl}${args.dashboardUrl}`
      : `${siteUrl}/dashboard`;

    const component = WelcomeEmail({
      userName: args.userName,
      dashboardUrl,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: "Bienvenue sur Reflet",
      html,
      text,
      replyTo: SUPPORT_EMAIL,
    });
  },
});

// Send invitation email using react-email template
export const sendInvitationEmail = internalAction({
  args: {
    to: v.string(),
    organizationName: v.string(),
    inviterName: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    acceptUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const component = InvitationEmail({
      organizationName: args.organizationName,
      inviterName: args.inviterName,
      role: args.role,
      acceptUrl: args.acceptUrl,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: `Invitation à rejoindre ${args.organizationName}`,
      html,
      text,
      replyTo: SUPPORT_EMAIL,
    });
  },
});

// Generic action to render any template and send
export const sendTemplatedEmail = internalAction({
  args: {
    to: v.union(v.string(), v.array(v.string())),
    subject: v.string(),
    template: v.union(v.literal("verification"), v.literal("welcome")),
    templateProps: v.object({
      userName: v.optional(v.string()),
      verificationUrl: v.optional(v.string()),
      dashboardUrl: v.optional(v.string()),
    }),
    replyTo: v.optional(v.union(v.string(), v.array(v.string()))),
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
          userName: args.templateProps.userName,
          dashboardUrl,
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
      to: args.to,
      subject: args.subject,
      html,
      text,
      replyTo: args.replyTo ?? SUPPORT_EMAIL,
    });
  },
});

// Send changelog notification email using react-email template
export const sendChangelogNotificationEmail = internalAction({
  args: {
    to: v.string(),
    organizationName: v.string(),
    releaseTitle: v.string(),
    releaseVersion: v.optional(v.string()),
    releaseDescription: v.string(),
    releaseUrl: v.string(),
    unsubscribeUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { ChangelogNotificationEmail } = await import(
      "@reflet/email/templates/changelog-notification-email"
    );

    const component = ChangelogNotificationEmail({
      organizationName: args.organizationName,
      releaseTitle: args.releaseTitle,
      releaseVersion: args.releaseVersion,
      releaseDescription: args.releaseDescription,
      releaseUrl: args.releaseUrl,
      unsubscribeUrl: args.unsubscribeUrl,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: `${args.organizationName} - ${args.releaseTitle}`,
      html,
      text,
      replyTo: SUPPORT_EMAIL,
      headers: [
        { name: "List-Unsubscribe", value: `<${args.unsubscribeUrl}>` },
        { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
      ],
    });
  },
});

// Send weekly digest email using react-email template
export const sendWeeklyDigestEmail = internalAction({
  args: {
    to: v.string(),
    organizationName: v.string(),
    newFeedbackCount: v.number(),
    totalVotes: v.number(),
    topFeedback: v.array(
      v.object({
        title: v.string(),
        voteCount: v.number(),
        status: v.string(),
        url: v.string(),
      })
    ),
    statusChanges: v.array(
      v.object({
        title: v.string(),
        from: v.string(),
        to: v.string(),
      })
    ),
    dashboardUrl: v.string(),
    unsubscribeUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { WeeklyDigestEmail } = await import(
      "@reflet/email/templates/weekly-digest-email"
    );

    const component = WeeklyDigestEmail({
      organizationName: args.organizationName,
      newFeedbackCount: args.newFeedbackCount,
      totalVotes: args.totalVotes,
      topFeedback: args.topFeedback,
      statusChanges: args.statusChanges,
      dashboardUrl: args.dashboardUrl,
      unsubscribeUrl: args.unsubscribeUrl,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: `${args.organizationName} - Weekly Digest`,
      html,
      text,
      replyTo: SUPPORT_EMAIL,
    });
  },
});

// Send feedback shipped notification email
export const sendFeedbackShippedEmail = internalAction({
  args: {
    to: v.string(),
    organizationName: v.string(),
    feedbackTitle: v.string(),
    releaseTitle: v.string(),
    feedbackUrl: v.string(),
    releaseUrl: v.string(),
    unsubscribeUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { FeedbackShippedEmail } = await import(
      "@reflet/email/templates/feedback-shipped-email"
    );

    const component = FeedbackShippedEmail({
      organizationName: args.organizationName,
      feedbackTitle: args.feedbackTitle,
      releaseTitle: args.releaseTitle,
      feedbackUrl: args.feedbackUrl,
      releaseUrl: args.releaseUrl,
      unsubscribeUrl: args.unsubscribeUrl,
    });
    const html = await render(component);
    const text = await render(component, { plainText: true });

    await ctx.runMutation(internal.email.send.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: `${args.organizationName} - Your feedback has shipped!`,
      html,
      text,
      replyTo: SUPPORT_EMAIL,
      headers: [
        { name: "List-Unsubscribe", value: `<${args.unsubscribeUrl}>` },
        { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
      ],
    });
  },
});
