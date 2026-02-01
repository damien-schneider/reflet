import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

// GitHub OAuth configuration (optional)
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

// Skip email verification for e2e tests
const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === "true";

const siteUrl = process.env.SITE_URL ?? "";
const additionalOrigins =
  process.env.ADDITIONAL_TRUSTED_ORIGINS?.split(",").filter(Boolean) ?? [];

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl, ...additionalOrigins],
    database: authComponent.adapter(ctx),
    session: {
      // Enable cookie caching to reduce database calls and improve session persistence
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes cache duration
      },
      // Session expires after 30 days
      expiresIn: 60 * 60 * 24 * 30,
      // Refresh session when it's 7 days old
      updateAge: 60 * 60 * 24 * 7,
    },
    socialProviders:
      githubClientId && githubClientSecret
        ? {
            github: {
              clientId: githubClientId,
              clientSecret: githubClientSecret,
            },
          }
        : undefined,
    emailAndPassword: {
      enabled: true,
      // Require email verification (can be disabled for e2e tests via SKIP_EMAIL_VERIFICATION=true)
      requireEmailVerification: !skipEmailVerification,
      // Password reset callback
      sendResetPassword: async ({
        user,
        url,
      }: {
        user: { email: string; name: string };
        url: string;
      }) => {
        console.log("=== PASSWORD RESET EMAIL CALLBACK INVOKED ===");
        console.log("[Auth] User:", user.email);
        console.log("[Auth] Reset URL:", url);

        if (!("scheduler" in ctx)) {
          console.error("[Auth] ERROR: Context does not have scheduler");
          return;
        }

        try {
          await ctx.scheduler.runAfter(
            0,
            internal.email_renderer.sendPasswordResetEmail,
            {
              to: user.email,
              userName: user.name,
              resetUrl: url,
            }
          );
          console.log("[Auth] Password reset email scheduled successfully");
        } catch (error: unknown) {
          console.error(
            "[Auth] Failed to schedule password reset email:",
            error
          );
        }
      },
    },
    // Email verification config is separate from emailAndPassword
    emailVerification: {
      sendOnSignUp: !skipEmailVerification,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({
        user,
        url,
      }: {
        user: { email: string; name: string };
        url: string;
      }) => {
        console.log("=== VERIFICATION EMAIL CALLBACK INVOKED ===");
        console.log("[Auth] User:", JSON.stringify(user));
        console.log("[Auth] URL:", url);
        console.log("[Auth] Context has scheduler:", "scheduler" in ctx);

        if (!("scheduler" in ctx)) {
          console.error(
            "[Auth] ERROR: Context does not have scheduler - cannot send email"
          );
          console.error("[Auth] Context keys:", Object.keys(ctx));
          return;
        }

        try {
          console.log("[Auth] Scheduling verification email via Resend...");
          await ctx.scheduler.runAfter(
            0,
            internal.email_renderer.sendVerificationEmail,
            {
              to: user.email,
              userName: user.name,
              verificationUrl: url,
            }
          );
          console.log("[Auth] Verification email scheduled successfully");
        } catch (error: unknown) {
          console.error("[Auth] Failed to schedule verification email:", error);
        }
      },
    },
    plugins: [
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
  });
}

export { createAuth };

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});
