/**
 * Shared helpers used by multiple coding adapters.
 */

import type { ActivityLogEntry } from "./types";

export const log = (
  agent: ActivityLogEntry["agent"],
  level: ActivityLogEntry["level"],
  message: string,
  details?: string
): ActivityLogEntry => ({
  agent,
  level,
  message,
  details,
  timestamp: Date.now(),
});
