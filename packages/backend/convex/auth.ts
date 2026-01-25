import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL ?? "";
const isProduction = process.env.NODE_ENV === "production";

export const authComponent = createClient<DataModel>(components.betterAuth);

function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      // Only require email verification in production
      requireEmailVerification: isProduction,
      // Send verification email on signup in production
      sendOnSignUp: isProduction,
      // Automatically sign in user after email verification
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => {
        // Skip email sending in development
        if (!isProduction) {
          // Log verification URL in development for testing
          console.log("[DEV] Email verification URL:", url);
          console.log("[DEV] User:", user.email);
          return;
        }

        // Schedule the email action to run immediately
        // This uses the Convex Resend component for reliable delivery
        ctx.scheduler
          .runAfter(0, internal.email_renderer.sendVerificationEmail, {
            to: user.email,
            userName: user.name,
            verificationUrl: url,
          })
          .catch((error: unknown) => {
            console.error("Failed to schedule verification email:", error);
          });
      },
      sendResetPassword: ({ user, url }) => {
        // Skip email sending in development
        if (!isProduction) {
          // Log reset URL in development for testing
          console.log("[DEV] Password reset URL:", url);
          console.log("[DEV] User:", user.email);
          return;
        }

        // Schedule the email action to run immediately
        ctx.scheduler
          .runAfter(0, internal.email_renderer.sendPasswordResetEmail, {
            to: user.email,
            userName: user.name,
            resetUrl: url,
          })
          .catch((error: unknown) => {
            console.error("Failed to schedule password reset email:", error);
          });
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
