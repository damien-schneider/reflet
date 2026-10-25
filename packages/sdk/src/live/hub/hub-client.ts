import { sessionApiErrorSchema } from "../../sessions/protocol";
import {
  LIVE_HUB_ENDPOINTS,
  type LiveHubFeed,
  type LiveHubHealth,
  liveHubAddress,
  liveHubFeedSchema,
  liveHubHealthSchema,
} from "../protocol";
import { type LiveHubFile, readLiveHubFile } from "./hub-file";

const HEALTH_TIMEOUT_MS = 2000;
const FEED_TIMEOUT_MS = 10_000;

export async function fetchHubHealth(
  file: LiveHubFile
): Promise<LiveHubHealth | null> {
  try {
    const response = await fetch(
      `${liveHubAddress(file.port)}${LIVE_HUB_ENDPOINTS.health}`,
      {
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      }
    );
    const parsed = liveHubHealthSchema.safeParse(await response.json());
    return response.ok && parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function fetchHubFeed(): Promise<LiveHubFeed | null> {
  const file = await readLiveHubFile();
  if (!file) {
    return null;
  }
  let response: Response;
  try {
    response = await fetch(
      `${liveHubAddress(file.port)}${LIVE_HUB_ENDPOINTS.feed}`,
      {
        headers: { authorization: `Bearer ${file.secret}` },
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      }
    );
  } catch {
    return null;
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = sessionApiErrorSchema.safeParse(body);
    throw new Error(
      failure.success
        ? failure.data.error
        : `Reflet Live answered ${response.status}.`
    );
  }
  return liveHubFeedSchema.parse(body);
}
