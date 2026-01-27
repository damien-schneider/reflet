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

const siteUrl = process.env.SITE_URL ?? "";
const additionalOrigins =
  process.env.ADDITIONAL_TRUSTED_ORIGINS?.split(",").filter(Boolean) ?? [];

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
  // Build social providers configuration conditionally
  const githubProvider =
    githubClientId && githubClientSecret
      ? {
          id: "github" as const,
          clientId: githubClientId,
          clientSecret: githubClientSecret,
        }
      : null;

  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl, ...additionalOrigins],
    database: authComponent.adapter(ctx),
    socialProviders: githubProvider ? [githubProvider] : undefined,
    emailAndPassword: {
      enabled: true,
      // Require email verification in all environments
      requireEmailVerification: true,
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
      sendOnSignUp: true,
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
