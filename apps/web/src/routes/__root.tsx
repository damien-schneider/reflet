import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";

import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";
import { getToken } from "@/lib/auth-server";

import appCss from "../index.css?url";

const getAuth = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

export interface RouterAppContext {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "My App",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
  beforeLoad: async (ctx) => {
    const token = await getAuth();
    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }
    return {
      isAuthenticated: !!token,
      token,
    };
  },
});

function RootDocument() {
  const context = useRouteContext({ from: Route.id });
  return (
    <ConvexBetterAuthProvider
      authClient={authClient}
      client={context.convexQueryClient.convexClient}
      initialToken={context.token}
    >
      <html className="dark" lang="en">
        <head>
          <HeadContent />
          <script defer src="//unpkg.com/react-grab/dist/index.global.js" />
        </head>
        <body>
          <div className="grid h-svh grid-rows-[auto_1fr]">
            <Outlet />
          </div>
          <Toaster richColors />
          <TanStackRouterDevtools position="bottom-left" />
          <Scripts />
        </body>
      </html>
    </ConvexBetterAuthProvider>
  );
}
