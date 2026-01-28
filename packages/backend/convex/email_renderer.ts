"use node";

import { render } from "@react-email/render";
import { InvitationEmail } from "@reflet-v2/email/templates/invitation-email";
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
    console.log("=== EMAIL RENDERER: sendVerificationEmail called ===");
    console.log("[Email] To:", args.to);
    console.log("[Email] From:", defaultFrom);
    console.log(
      "[Email] RESEND_FROM_EMAIL env:",
      process.env.RESEND_FROM_EMAIL
    );

    const html = await render(
      VerificationEmail({
        userName: args.userName,
        verificationUrl: args.verificationUrl,
      })
    );
    console.log("[Email] HTML rendered, length:", html.length);

    try {
      await ctx.runMutation(internal.email.sendEmail, {
        from: defaultFrom,
        to: args.to,
        subject: "Vérifiez votre adresse email",
        html,
      });
      console.log("[Email] sendEmail mutation called successfully");
    } catch (error) {
      console.error("[Email] Error calling sendEmail:", error);
      throw error;
    }
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
      "@reflet-v2/email/templates/password-reset-email"
    );

    const html = await render(
      PasswordResetEmail({
        userName: args.userName,
        resetUrl: args.resetUrl,
      })
    );

    await ctx.runMutation(internal.email.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: "Réinitialisez votre mot de passe",
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
    const html = await render(
      InvitationEmail({
        organizationName: args.organizationName,
        inviterName: args.inviterName,
        role: args.role,
        acceptUrl: args.acceptUrl,
      })
    );

    await ctx.runMutation(internal.email.sendEmail, {
      from: defaultFrom,
      to: args.to,
      subject: `Invitation à rejoindre ${args.organizationName}`,
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
