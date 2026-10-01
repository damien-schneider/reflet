import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";
import { platformAdminAuthProvider } from "./shared/platform_admin";

export default {
  providers: [getAuthConfigProvider(), platformAdminAuthProvider],
} satisfies AuthConfig;
