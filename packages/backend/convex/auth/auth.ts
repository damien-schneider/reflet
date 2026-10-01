import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { ConvexError } from "convex/values";
import { components, internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import { PLATFORM_ADMIN_ISSUER } from "../shared/platform_admin";
import { createAuthEmailRateLimitHook } from "./email_rate_limit";

// GitHub OAuth configuration (optional)
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

// Google OAuth configuration (optional)
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

// Skip email verification for e2e tests
const skipEmailVerification = process.env.SKIP_EMAIL_VERIFICATION === "true";

const siteUrl = process.env.SITE_URL ?? "";
const additionalOrigins =
  process.env.ADDITIONAL_TRUSTED_ORIGINS?.split(",").filter(Boolean) ?? [];

const betterAuthClient = createClient<DataModel>(components.betterAuth);

type AuthUserCtx = Parameters<typeof betterAuthClient.safeGetAuthUser>[0];

const isPlatformAdminCaller = async (ctx: AuthUserCtx): Promise<boolean> =>
  (await ctx.auth.getUserIdentity())?.issuer === PLATFORM_ADMIN_ISSUER;

export const authComponent = {
  ...betterAuthClient,
  getAuthUser: async (ctx: AuthUserCtx) => {
    if (await isPlatformAdminCaller(ctx)) {
      throw new ConvexError("Unauthenticated");
    }
    return await betterAuthClient.getAuthUser(ctx);
  },
  safeGetAuthUser: async (ctx: AuthUserCtx) =>
    (await isPlatformAdminCaller(ctx))
      ? undefined
      : await betterAuthClient.safeGetAuthUser(ctx),
};

function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
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
        if (!("scheduler" in ctx)) {
          console.error("[Auth] Cannot schedule password reset email");
          return;
        }

        try {
          await ctx.scheduler.runAfter(
            0,
            internal.email.renderer.sendPasswordResetEmail,
            {
              resetUrl: url,
              to: user.email,
              userName: user.name,
            }
          );
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
      autoSignInAfterVerification: true,
      sendOnSignUp: !skipEmailVerification,
      sendVerificationEmail: async ({
        user,
        url,
      }: {
        user: { email: string; name: string };
        url: string;
      }) => {
        if (!("scheduler" in ctx)) {
          console.error("[Auth] Cannot schedule verification email");
          return;
        }

        try {
          await ctx.scheduler.runAfter(
            0,
            internal.email.renderer.sendVerificationEmail,
            {
              to: user.email,
              userName: user.name,
              verificationUrl: url,
            }
          );
        } catch (error: unknown) {
          console.error("[Auth] Failed to schedule verification email:", error);
        }
      },
    },
    hooks: {
      before: createAuthEmailRateLimitHook(ctx),
    },
    plugins: [
      convex({
        authConfig,
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
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
    socialProviders: {
      ...(githubClientId &&
        githubClientSecret && {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          },
        }),
      ...(googleClientId &&
        googleClientSecret && {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }),
    },
    trustedOrigins: [siteUrl, ...additionalOrigins],
  });
}

export { createAuth };
