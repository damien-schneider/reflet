import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  client: {
    EXPO_PUBLIC_CONVEX_SITE_URL: z.url(),
    EXPO_PUBLIC_CONVEX_URL: z.url(),
  },
  clientPrefix: "EXPO_PUBLIC_",
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
});
