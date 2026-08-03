import { describe, expect, it } from "vitest";
import { collectPageContext, parseUserAgent } from "../page-context";

const CHROME_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const EDGE_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0";
const FIREFOX_LINUX =
  "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0";
const CHROME_ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

describe("parseUserAgent", () => {
  it("reads Chrome on macOS", () => {
    expect(parseUserAgent(CHROME_MAC)).toEqual({
      browser: "Chrome 141",
      device: "desktop",
      os: "macOS",
    });
  });

  it("reads Safari on iOS as a mobile device", () => {
    expect(parseUserAgent(SAFARI_IPHONE)).toEqual({
      browser: "Safari 18.1",
      device: "mobile",
      os: "iOS",
    });
  });

  it("detects Edge before Chrome", () => {
    expect(parseUserAgent(EDGE_WINDOWS).browser).toBe("Edge 141");
    expect(parseUserAgent(EDGE_WINDOWS).os).toBe("Windows");
  });

  it("reads Firefox on Linux", () => {
    expect(parseUserAgent(FIREFOX_LINUX)).toEqual({
      browser: "Firefox 135",
      device: "desktop",
      os: "Linux",
    });
  });

  it("treats Android without the Mobile token as a tablet", () => {
    expect(parseUserAgent(CHROME_ANDROID_TABLET).device).toBe("tablet");
    expect(parseUserAgent(CHROME_ANDROID_TABLET).os).toBe("Android");
  });

  it("degrades to an empty result on an unknown agent", () => {
    expect(parseUserAgent("curl/8.4.0")).toEqual({ device: "desktop" });
  });
});

describe("collectPageContext", () => {
  it("captures the current url, viewport and locale", () => {
    const context = collectPageContext();

    expect(context.url).toBe(window.location.href);
    expect(context.viewport).toEqual({
      devicePixelRatio: window.devicePixelRatio,
      height: window.innerHeight,
      width: window.innerWidth,
    });
    expect(context.language).toBe(navigator.language);
    expect(context.timezone).toBeTypeOf("string");
  });

  it("keeps the page title and omits an empty referrer", () => {
    document.title = "Billing settings";

    const context = collectPageContext();

    expect(context.pageTitle).toBe("Billing settings");
    expect(context.referrer).toBeUndefined();
  });

  it("stamps the sdk version it was given", () => {
    expect(collectPageContext({ sdkVersion: "9.9.9" }).sdkVersion).toBe(
      "9.9.9"
    );
  });
});
