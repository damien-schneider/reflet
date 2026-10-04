"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { describeFetchFailure } from "../shared/outbound/public_fetch";
import { fetchPublicUrlPinned } from "../shared/outbound/public_fetch_node";
import {
  CHECK_TIMEOUT_MS,
  type DueMonitor,
  dueMonitor,
  judgeStatusCode,
  type ProbeResult,
  probeConfirmingFailure,
} from "./lib/probe";

const MAX_KEYWORD_SCAN_BYTES = 1_000_000;

const probeKeywordOnce = async (
  url: string,
  bodyKeyword: string,
  expectedStatusCodes: number[] | undefined
): Promise<ProbeResult> => {
  const startedAt = Date.now();
  try {
    const response = await fetchPublicUrlPinned(url, {
      headers: {},
      maxBytes: MAX_KEYWORD_SCAN_BYTES,
      timeoutMs: CHECK_TIMEOUT_MS,
    });
    const responseTimeMs = Date.now() - startedAt;
    const statusVerdict = judgeStatusCode(
      expectedStatusCodes,
      response.status,
      response.ok
    );
    if (statusVerdict.isUp && !response.text.includes(bodyKeyword)) {
      return {
        errorMessage: `Keyword "${bodyKeyword}" not found`,
        isUp: false,
        responseTimeMs,
        statusCode: response.status,
      };
    }
    return { ...statusVerdict, responseTimeMs, statusCode: response.status };
  } catch (error) {
    return {
      errorMessage: describeFetchFailure(error),
      isUp: false,
      responseTimeMs: Date.now() - startedAt,
    };
  }
};

export const checkKeywordMonitors = internalAction({
  args: { monitors: v.array(dueMonitor) },
  handler: async (ctx, args) => {
    const checkKeywordMonitor = async ({
      _id,
      bodyKeyword,
      expectedStatusCodes,
      url,
    }: DueMonitor) => {
      if (bodyKeyword === undefined) {
        return;
      }
      const probe = await probeConfirmingFailure(() =>
        probeKeywordOnce(url, bodyKeyword, expectedStatusCodes)
      );
      if (probe) {
        await ctx.runMutation(internal.status.healthCheck.recordCheck, {
          ...probe,
          monitorId: _id,
        });
      }
    };
    await Promise.all(args.monitors.map(checkKeywordMonitor));
  },
  returns: v.null(),
});
