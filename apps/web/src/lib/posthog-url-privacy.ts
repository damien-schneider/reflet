import type { BeforeSendFn, Properties } from "posthog-js";

const URL_PROPERTY = /(?:url|referrer)$/i;

function withoutQueryAndHash(href: string): string {
  try {
    const url = new URL(href);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return href;
  }
}

function stripUrlProperties(
  properties: Properties | undefined
): Properties | undefined {
  if (!properties) {
    return properties;
  }
  const stripped = { ...properties };
  for (const [key, value] of Object.entries(stripped)) {
    if (URL_PROPERTY.test(key) && typeof value === "string") {
      stripped[key] = withoutQueryAndHash(value);
    }
  }
  return stripped;
}

/**
 * Invitation and unsubscribe tokens travel in query strings, so no analytics
 * event may carry a URL past its path.
 */
export const stripUrlQueriesBeforeSend: BeforeSendFn = (event) => {
  if (!event) {
    return event;
  }
  return {
    ...event,
    $set: stripUrlProperties(event.$set),
    $set_once: stripUrlProperties(event.$set_once),
    properties: stripUrlProperties(event.properties) ?? {},
  };
};
