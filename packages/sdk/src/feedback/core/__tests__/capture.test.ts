import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSnapdomOptions,
  fitWithin,
  inlineExternalImages,
  restoreInlinedImages,
  WIDGET_MARKER,
} from "../capture";

function mockImageFetch(responses: Record<string, boolean>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      const found = responses[url] !== undefined && responses[url] !== false;
      const body = found ? "\u0089PNG" : "no-entry";
      const contentType = found ? "image/png" : "text/plain";
      const response = new Response(body, {
        headers: { "Content-Type": contentType },
        status: found ? 200 : 404,
      });
      vi.spyOn(response, "blob").mockResolvedValue(
        new Blob([body], { type: contentType })
      );
      return response;
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("inlineExternalImages", () => {
  it("swaps a cross-origin image for a data url and restores the original", async () => {
    mockImageFetch({ "https://cdn.test/avatar.png": true });
    const img = document.createElement("img");
    img.setAttribute("src", "https://cdn.test/avatar.png");
    document.body.appendChild(img);

    const swaps = await inlineExternalImages(document.body);

    expect(img.getAttribute("src")).toMatch(/^data:image\//);
    restoreInlinedImages(swaps);
    expect(img.getAttribute("src")).toBe("https://cdn.test/avatar.png");
  });

  it("leaves data urls and same-origin images untouched", async () => {
    mockImageFetch({});
    const fetchSpy = vi.mocked(fetch);
    const data = document.createElement("img");
    data.src = "data:image/png;base64,AAA";
    const sameOrigin = document.createElement("img");
    sameOrigin.src = `${window.location.origin}/local.png`;
    document.body.append(data, sameOrigin);

    const swaps = await inlineExternalImages(document.body);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(swaps).toEqual([]);
    expect(data.src).toBe("data:image/png;base64,AAA");
    expect(sameOrigin.src).toBe(`${window.location.origin}/local.png`);
  });

  it("drops srcset while swapped and brings it back on restore", async () => {
    mockImageFetch({ "https://cdn.test/pic.png": true });
    const img = document.createElement("img");
    img.setAttribute("src", "https://cdn.test/pic.png");
    img.setAttribute("srcset", "https://cdn.test/pic.png 2x");
    img.setAttribute("sizes", "28px");
    document.body.appendChild(img);

    const swaps = await inlineExternalImages(document.body);

    expect(img.hasAttribute("srcset")).toBe(false);
    expect(img.hasAttribute("sizes")).toBe(false);
    restoreInlinedImages(swaps);
    expect(img.getAttribute("srcset")).toBe("https://cdn.test/pic.png 2x");
    expect(img.getAttribute("sizes")).toBe("28px");
  });

  it("falls back to a transparent pixel when the image cannot be fetched", async () => {
    mockImageFetch({ "https://cdn.test/private.png": false });
    const img = document.createElement("img");
    img.setAttribute("src", "https://cdn.test/private.png");
    document.body.appendChild(img);

    const swaps = await inlineExternalImages(document.body);

    expect(img.getAttribute("src")).toBe(
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    );
    restoreInlinedImages(swaps);
    expect(img.getAttribute("src")).toBe("https://cdn.test/private.png");
  });

  it("inlines external urls inside inline background-image styles", async () => {
    mockImageFetch({ "https://cdn.test/glow.png": true });
    const glow = document.createElement("span");
    glow.setAttribute(
      "style",
      'background-image: url("https://cdn.test/glow.png")'
    );
    document.body.appendChild(glow);

    const swaps = await inlineExternalImages(document.body);

    expect(glow.getAttribute("style")).toMatch(
      /background-image: url\("data:image\/png[^)]*"\)/
    );
    restoreInlinedImages(swaps);
    expect(glow.getAttribute("style")).toBe(
      'background-image: url("https://cdn.test/glow.png")'
    );
  });
});

describe("buildSnapdomOptions", () => {
  it("always excludes the widget so it never lands in its own screenshot", () => {
    expect(buildSnapdomOptions({}).exclude).toContain(`[${WIDGET_MARKER}]`);
  });

  it("clips to the viewport when capturing the whole page", () => {
    expect(buildSnapdomOptions({}).clip).toBe("viewport");
  });

  it("captures a picked element in full instead of clipping", () => {
    const element = document.createElement("div");

    expect(buildSnapdomOptions({ element }).clip).toBeUndefined();
  });

  it("appends caller supplied selectors", () => {
    const options = buildSnapdomOptions({
      excludeSelectors: [".intercom-launcher", "#cookie-banner"],
    });

    expect(options.exclude).toEqual([
      `[${WIDGET_MARKER}]`,
      ".intercom-launcher",
      "#cookie-banner",
    ]);
  });

  it("caps the pixel ratio so retina captures stay uploadable", () => {
    expect(buildSnapdomOptions({ devicePixelRatio: 3 }).dpr).toBe(2);
    expect(buildSnapdomOptions({ devicePixelRatio: 1 }).dpr).toBe(1);
  });

  it("falls back to a ratio of one when the browser reports nothing", () => {
    expect(buildSnapdomOptions({ devicePixelRatio: 0 }).dpr).toBe(1);
  });

  it("embeds fonts so text is not rendered with fallback glyphs", () => {
    expect(buildSnapdomOptions({}).embedFonts).toBe(true);
  });

  it("reconciles the clone against the live dom so layouts do not drift", () => {
    expect(buildSnapdomOptions({}).reconcile).toBe(true);
  });
});

describe("fitWithin", () => {
  it("leaves a capture that is already small enough untouched", () => {
    expect(fitWithin({ height: 800, width: 1280 }, 2000)).toEqual({
      height: 800,
      scale: 1,
      width: 1280,
    });
  });

  it("scales an oversized capture down proportionally", () => {
    expect(fitWithin({ height: 2000, width: 3000 }, 1500)).toEqual({
      height: 1000,
      scale: 0.5,
      width: 1500,
    });
  });

  it("never returns a zero dimension", () => {
    expect(fitWithin({ height: 1, width: 4000 }, 100).height).toBe(1);
  });
});
