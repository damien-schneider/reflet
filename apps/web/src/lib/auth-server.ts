import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { env } from "@reflet/env/web";

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexSiteUrl: env.NEXT_PUBLIC_CONVEX_SITE_URL,
  convexUrl: env.NEXT_PUBLIC_CONVEX_URL,
});
