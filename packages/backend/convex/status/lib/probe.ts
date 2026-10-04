import { type Infer, v } from "convex/values";
import { monitorMethod } from "../tableFields";

export const CHECK_TIMEOUT_MS = 10_000;

export const dueMonitor = v.object({
  _id: v.id("statusMonitors"),
  bodyKeyword: v.optional(v.string()),
  expectedStatusCodes: v.optional(v.array(v.number())),
  method: v.optional(monitorMethod),
  url: v.string(),
});

export type DueMonitor = Infer<typeof dueMonitor>;

export interface ProbeResult {
  errorMessage?: string;
  isUp: boolean;
  responseTimeMs: number;
  statusCode?: number;
}

type StatusVerdict = Pick<ProbeResult, "errorMessage" | "isUp">;

export const judgeStatusCode = (
  expectedStatusCodes: number[] | undefined,
  statusCode: number,
  passesByDefault: boolean
): StatusVerdict => {
  if (!expectedStatusCodes) {
    return { isUp: passesByDefault };
  }
  if (expectedStatusCodes.includes(statusCode)) {
    return { isUp: true };
  }
  const expected =
    expectedStatusCodes.length === 1
      ? `${expectedStatusCodes[0]}`
      : `one of ${expectedStatusCodes.join(", ")}`;
  return {
    errorMessage: `Expected status ${expected}, got ${statusCode}`,
    isUp: false,
  };
};

export const probeConfirmingFailure = async (
  probe: (failedProbe?: ProbeResult) => Promise<ProbeResult | null>
): Promise<ProbeResult | null> => {
  const firstProbe = await probe();
  if (!firstProbe || firstProbe.isUp) {
    return firstProbe;
  }
  return await probe(firstProbe);
};
