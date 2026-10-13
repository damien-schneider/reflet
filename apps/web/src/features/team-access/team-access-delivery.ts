const TEAM_ACCESS_MESSAGE_TYPE = "reflet:team-access";
const RETURN_CODE_PARAM = "reflet-team-code";
const RETURN_ERROR_PARAM = "reflet-team-error";
const RETURN_STATE_PARAM = "reflet-team-state";

export type TeamAccessOutcome = { code: string } | { error: "cancelled" };

export interface TeamAccessReturn {
  origin: string;
  returnTo: string | null;
  state: string;
}

type OpenerWindow = Pick<Window, "closed" | "postMessage">;

function isOpenerWindow(value: unknown): value is OpenerWindow {
  return (
    typeof value === "object" &&
    value !== null &&
    "postMessage" in value &&
    "closed" in value
  );
}

export function readOpener(): OpenerWindow | null {
  const opener: unknown = window.opener;
  return isOpenerWindow(opener) && !opener.closed ? opener : null;
}

export function isSameOriginUrl(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

export function returnUrlFor(
  target: { returnTo: string; state: string },
  outcome: TeamAccessOutcome
): string {
  const url = new URL(target.returnTo);
  url.searchParams.set(RETURN_STATE_PARAM, target.state);
  if ("code" in outcome) {
    url.searchParams.set(RETURN_CODE_PARAM, outcome.code);
  } else {
    url.searchParams.set(RETURN_ERROR_PARAM, outcome.error);
  }
  return url.href;
}

/** Popups opened by reflet-sdk 0.7.1 and earlier still wait for a message from this page. */
function postToOpener(target: TeamAccessReturn, outcome: TeamAccessOutcome) {
  const opener = readOpener();
  opener?.postMessage(
    { ...outcome, state: target.state, type: TEAM_ACCESS_MESSAGE_TYPE },
    target.origin
  );
  return opener !== null;
}

export type TeamAccessDelivery = "returning" | "posted" | "unreachable";

export function deliverTeamAccess(
  target: TeamAccessReturn,
  outcome: TeamAccessOutcome
): TeamAccessDelivery {
  if (target.returnTo) {
    window.location.assign(
      returnUrlFor({ returnTo: target.returnTo, state: target.state }, outcome)
    );
    return "returning";
  }
  if (!postToOpener(target, outcome)) {
    return "unreachable";
  }
  window.close();
  return "posted";
}
