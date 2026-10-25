import {
  type LiveCommand,
  type LivePresence,
  type LiveStatus,
  liveAppApiRoute,
  liveStatusSchema,
} from "../../../live/protocol";
import { DEVTOOLS_ENDPOINTS } from "../../protocol";
import { callDevRoute } from "../route/dev-route";

export async function postPresence(
  presence: LivePresence
): Promise<LiveStatus> {
  return liveStatusSchema.parse(
    await callDevRoute<unknown>(DEVTOOLS_ENDPOINTS.livePresence, {
      body: presence,
      method: "POST",
    })
  );
}

export async function sendLiveCommand(
  action: LiveCommand
): Promise<LiveStatus> {
  return liveStatusSchema.parse(
    await callDevRoute<unknown>(DEVTOOLS_ENDPOINTS.liveCommand, {
      body: { action },
      method: "POST",
    })
  );
}

export function liveTransport<T>(
  apiPath: string,
  init: { body?: unknown; query?: Record<string, string> } = {}
): Promise<T> {
  return callDevRoute<T>(liveAppApiRoute(apiPath), {
    body: init.body,
    method: init.body === undefined ? "GET" : "POST",
    query: init.query,
  });
}
