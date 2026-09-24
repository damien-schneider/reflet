import { createDevtoolsHandler, type DevtoolsHandler } from "./handler";
import type { DevtoolsServerOptions } from "./options";

export type { DevtoolsServerOptions } from "./options";

export interface DevtoolsRoute {
  GET: DevtoolsHandler;
  POST: DevtoolsHandler;
}

/**
 * Route handlers for `app/api/reflet-devtools/[...path]/route.ts`. They answer
 * only under `next dev`; production builds get an empty 404.
 */
export function createDevtoolsRoute(
  options: DevtoolsServerOptions = {}
): DevtoolsRoute {
  let handler: DevtoolsHandler | null = null;
  const handle: DevtoolsHandler = async (request) => {
    if (process.env.NODE_ENV !== "development") {
      return new Response(null, { status: 404 });
    }
    handler ??= createDevtoolsHandler(options);
    return await handler(request);
  };
  return { GET: handle, POST: handle };
}

const defaultRoute = createDevtoolsRoute();

export const GET = defaultRoute.GET;
export const POST = defaultRoute.POST;
