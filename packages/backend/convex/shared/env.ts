/**
 * Convex-compatible env validation.
 *
 * We cannot import `@reflet/env/server` directly inside Convex functions because
 * that module starts with `import "dotenv/config"`, which has a side effect that
 * crashes the Convex isolate (no filesystem). Instead, we mirror the SAME schema
 * here using `@t3-oss/env-core` against `process.env`, which is populated by
 * Convex from the deployment's configured environment variables.
 *
 * Keep this in sync with `packages/env/src/server.ts`.
 */
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    SITE_URL: z.url().optional(),
    // GitHub OAuth configuration
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    // GitHub App configuration
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_APP_SLUG: z.string().optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    // Google OAuth configuration
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // Email verification toggle ("true" / "1" enables skip)
    SKIP_EMAIL_VERIFICATION: z.string().optional(),
    // Resend transactional email
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM_EMAIL: z.string().optional(),
    // Stripe billing
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
    STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
    // Convex site URL (used inside actions calling back to convex http)
    CONVEX_SITE_URL: z.url().optional(),
    // Comma-separated super admin emails
    SUPER_ADMIN_EMAILS: z.string().optional(),
    // Vercel domain management
    VERCEL_API_TOKEN: z.string().optional(),
    VERCEL_TEAM_ID: z.string().optional(),
    VERCEL_PROJECT_ID: z.string().optional(),
    // Comma-separated list of additional trusted origins for auth CORS
    ADDITIONAL_TRUSTED_ORIGINS: z.string().optional(),
    // Web Push (VAPID) configuration
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().optional(),
    // Exa.ai search API key
    EXA_API_KEY: z.string().optional(),
    // ScrapeCreators API key
    SCRAPECREATORS_API_KEY: z.string().optional(),
    // Social automation integrations
    BUFFER_ACCESS_TOKEN: z.string().optional(),
    TYPEFULLY_API_KEY: z.string().optional(),
    // OpenRouter API key (for AI features)
    OPENROUTER_API_KEY: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  // Convex isolates always run server-side. The default heuristic
  // (typeof window === "undefined") is unreliable under edge-runtime
  // test environments where `window` is defined.
  isServer: true,
});
