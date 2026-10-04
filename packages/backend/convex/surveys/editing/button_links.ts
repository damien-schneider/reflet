import { safeLinkUrl } from "@reflet/survey-core";
import { ConvexError } from "convex/values";

export const UNSAFE_BUTTON_LINK_MESSAGE =
  "Button links must start with http:// or https://.";

/** Survey buttons render on customer sites, so only http(s) or relative links may be stored. */
export const assertButtonLinksSafe = (content: {
  configs?: readonly ({ buttonUrl?: string } | undefined)[];
  endings?: readonly { buttonUrl?: string }[];
}): void => {
  const urls = [
    ...(content.configs ?? []).map((config) => config?.buttonUrl),
    ...(content.endings ?? []).map((ending) => ending.buttonUrl),
  ];
  const hasUnsafeLink = urls.some(
    (url) => url !== undefined && url !== "" && safeLinkUrl(url) === null
  );
  if (hasUnsafeLink) {
    throw new ConvexError(UNSAFE_BUTTON_LINK_MESSAGE);
  }
};
