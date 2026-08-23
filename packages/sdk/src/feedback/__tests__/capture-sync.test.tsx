import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { captureViewport } from "../core/capture";
import { RefletFeedback } from "../widget";

vi.mock("../core/capture", () => ({
  capturedFromCanvas: vi.fn(async () => null),
  captureViewport: vi.fn(async () => ({
    blob: new Blob(["png"]),
    height: 600,
    mimeType: "image/png",
    objectUrl: "blob:mock-capture",
    width: 800,
  })),
  releaseCapture: vi.fn(),
  WIDGET_MARKER: "data-reflet-widget",
}));

interface CapturedCreate {
  context?: {
    scroll?: { x: number; y: number };
    url?: string;
  };
}

function isCapturedCreate(value: unknown): value is CapturedCreate {
  return typeof value === "object" && value !== null && "context" in value;
}

const createBodies: CapturedCreate[] = [];

function stubFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      const respond = (body: object) =>
        new Response(JSON.stringify(body), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });

      if (url.includes("/feedback/create")) {
        const parsed: unknown = JSON.parse(String(init?.body ?? "{}"));
        if (!isCapturedCreate(parsed)) {
          throw new Error("Unexpected create payload in test");
        }
        createBodies.push(parsed);
        return respond({ feedbackId: "fb_test_1" });
      }
      if (url.includes("/screenshot/upload-url")) {
        return respond({ uploadUrl: "https://upload.test/blob-1" });
      }
      if (url.startsWith("https://upload.test/")) {
        return respond({ storageId: "st_test_1" });
      }
      if (url.includes("/screenshot/save")) {
        return respond({ screenshotId: "sc_test_1" });
      }

      throw new Error(`Unexpected fetch in test: ${url}`);
    })
  );
}

function shadow(): ShadowRoot {
  const host = document.querySelector("[data-reflet-widget]");
  if (!(host instanceof HTMLElement && host.shadowRoot)) {
    throw new Error("Widget did not mount a shadow root");
  }
  return host.shadowRoot;
}

function launcher(): HTMLButtonElement {
  const button = shadow().querySelector(".launcher");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Launcher missing");
  }
  return button;
}

function submitFeedback(): void {
  const panel = shadow();
  const textarea = panel.querySelector("textarea");
  const submit = panel.querySelector(".submit");
  if (
    !(
      textarea instanceof HTMLTextAreaElement &&
      submit instanceof HTMLButtonElement
    )
  ) {
    throw new Error("Panel controls missing");
  }

  act(() => {
    fireEvent.change(textarea, { target: { value: "Something looks off" } });
  });
  act(() => {
    submit.click();
  });
}

describe("capture and page context sync", () => {
  beforeEach(() => {
    createBodies.length = 0;
    vi.clearAllMocks();
    stubFetch();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("reports the route of the latest screenshot, refreshed across SPA navigation", async () => {
    window.history.pushState({}, "", "/settings/profile");
    render(<RefletFeedback publicKey="fb_pub_test" />);

    act(() => {
      launcher().click();
    });

    await waitFor(() => expect(captureViewport).toHaveBeenCalledTimes(1));

    act(() => {
      window.history.pushState({}, "", "/billing/invoices");
    });

    await waitFor(() => expect(captureViewport).toHaveBeenCalledTimes(2));

    submitFeedback();

    await waitFor(() => expect(createBodies).toHaveLength(1));

    expect(createBodies[0]?.context?.url).toContain("/billing/invoices");
    expect(createBodies[0]?.context?.scroll).toEqual({ x: 0, y: 0 });
  });

  it("retakes the capture when the window is resized while composing", async () => {
    render(<RefletFeedback publicKey="fb_pub_test" />);

    act(() => {
      launcher().click();
    });

    await waitFor(() => expect(captureViewport).toHaveBeenCalledTimes(1));

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => expect(captureViewport).toHaveBeenCalledTimes(2), {
      timeout: 2000,
    });
  });

  it("still submits the written feedback when every capture fails", async () => {
    vi.mocked(captureViewport).mockRejectedValue(new Error("no shot"));

    render(<RefletFeedback publicKey="fb_pub_test" />);
    act(() => {
      launcher().click();
    });

    await waitFor(() => expect(captureViewport).toHaveBeenCalled());

    submitFeedback();

    await waitFor(() => expect(createBodies).toHaveLength(1));

    expect(createBodies[0]?.context?.url).toContain(window.location.pathname);
  });
});
