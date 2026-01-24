"use node";

import { render } from "@react-email/render";
import { VerificationEmail } from "@reflet-v2/email/templates/verification-email";
import { WelcomeEmail } from "@reflet-v2/email/templates/welcome-email";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";
const fromName = "Reflet";
const defaultFrom = `${fromName} <${fromEmail}>`;

// Send verification email using react-email template
export const sendVerificationEmail = internalAction({
  args: {
    to: v.string(),
    userName: v.optional(v.string()),
    verificationUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      VerificationEmail({
        userName: args.userName,
        verificationUrl: args.verificationUrl,
      })
    );

    await ctx.runMutation(internal.email.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: "Vérifiez votre adresse email",
      html,
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

    const html = await render(
      WelcomeEmail({
        userName: args.userName,
        dashboardUrl,
      })
    );

    await ctx.runMutation(internal.email.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: "Bienvenue sur Reflet",
      html,
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
    let html: string;

    switch (args.template) {
      case "verification": {
        if (!args.templateProps.verificationUrl) {
          throw new Error("verificationUrl is required for verification email");
        }
        html = await render(
          VerificationEmail({
            userName: args.templateProps.userName,
            verificationUrl: args.templateProps.verificationUrl,
          })
        );
        break;
      }
      case "welcome": {
        const siteUrl = process.env.SITE_URL ?? "";
        const dashboardUrl = args.templateProps.dashboardUrl
          ? `${siteUrl}${args.templateProps.dashboardUrl}`
          : `${siteUrl}/dashboard`;

        html = await render(
          WelcomeEmail({
            userName: args.templateProps.userName,
            dashboardUrl,
          })
        );
        break;
      }
      default:
        throw new Error(`Unknown template: ${args.template}`);
    }

    await ctx.runMutation(internal.email.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: args.subject,
      html,
      replyTo: args.replyTo,
    });
  },
});
