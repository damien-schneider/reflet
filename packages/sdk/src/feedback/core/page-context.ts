import type { FeedbackContext } from "../../types";

interface AgentInfo {
  browser?: string;
  device: "desktop" | "mobile" | "tablet";
  os?: string;
}

const BROWSER_PATTERNS: [string, RegExp][] = [
  ["Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/],
  ["Opera", /OPR\/([\d.]+)/],
  ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
  ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
  ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
  ["Safari", /Version\/([\d.]+).*Safari/],
];

const OS_PATTERNS: [string, RegExp][] = [
  ["iOS", /iPhone|iPad|iPod/],
  ["Android", /Android/],
  ["Windows", /Windows NT/],
  ["macOS", /Mac OS X|Macintosh/],
  ["ChromeOS", /CrOS/],
  ["Linux", /Linux|X11/],
];

const MOBILE_HINT = /Mobile|iPhone|iPod/;
const TABLET_HINT = /iPad|Tablet/;
const TRAILING_ZERO = /\.0$/;
const ANDROID = /Android/;

function shortenVersion(version: string): string {
  return version.split(".").slice(0, 2).join(".").replace(TRAILING_ZERO, "");
}

function detectDevice(userAgent: string): AgentInfo["device"] {
  if (TABLET_HINT.test(userAgent)) {
    return "tablet";
  }
  if (MOBILE_HINT.test(userAgent)) {
    return "mobile";
  }
  return ANDROID.test(userAgent) ? "tablet" : "desktop";
}

export function parseUserAgent(userAgent: string): AgentInfo {
  const info: AgentInfo = { device: detectDevice(userAgent) };

  for (const [name, pattern] of BROWSER_PATTERNS) {
    const version = pattern.exec(userAgent)?.[1];
    if (version) {
      info.browser = `${name} ${shortenVersion(version)}`;
      break;
    }
  }

  for (const [name, pattern] of OS_PATTERNS) {
    if (pattern.test(userAgent)) {
      info.os = name;
      break;
    }
  }

  return info;
}

function optionalText(value: string | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}

function resolveTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Intl missing in some embedded webviews
  }
}

/** Everything about the page that a bug report needs and the DOM already knows. */
export function collectPageContext(options?: {
  sdkVersion?: string;
}): FeedbackContext {
  const userAgent = navigator.userAgent;
  const agent = parseUserAgent(userAgent);

  return {
    browser: agent.browser,
    device: agent.device,
    language: navigator.language,
    os: agent.os,
    pageTitle: optionalText(document.title),
    referrer: optionalText(document.referrer),
    screen: { height: window.screen.height, width: window.screen.width },
    sdkVersion: options?.sdkVersion,
    timezone: resolveTimezone(),
    url: window.location.href,
    userAgent,
    viewport: {
      devicePixelRatio: window.devicePixelRatio,
      height: window.innerHeight,
      width: window.innerWidth,
    },
  };
}
