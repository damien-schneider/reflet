"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { env } from "@reflet-v2/env/web";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";

import { authClient } from "./auth-client";

const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

const convex = new ConvexReactClient(convexUrl);

export function Providers({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <ConvexBetterAuthProvider
        authClient={authClient}
        client={convex}
        initialToken={initialToken}
      >
        {children}
      </ConvexBetterAuthProvider>
    </ThemeProvider>
  );
}
