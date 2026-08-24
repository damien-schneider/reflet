import { afterEach, describe, expect, it, vi } from "vitest";
import { captureViewport } from "../capture";

vi.mock("@zumer/snapdom", () => ({
  snapdom: { toCanvas: vi.fn() },
}));

const { snapdom } = await import("@zumer/snapdom");

const fakeCanvas = () =>
  ({
    height: 50,
    toBlob: (callback: (blob: Blob | null) => void) =>
      callback(new Blob(["png"])),
    width: 100,
  }) as unknown as HTMLCanvasElement;

function stubObjectUrls(): void {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: () => "blob:mock",
    revokeObjectURL: () => undefined,
  });
}

const ORIGINAL_SRC = "https://cdn.test/avatar.png";

describe("captureViewport watchdog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("retries without images when the first capture hangs", async () => {
    stubObjectUrls();
    const toCanvas = vi.mocked(snapdom.toCanvas);
    toCanvas
      .mockImplementationOnce(() => new Promise(() => undefined))
      .mockResolvedValueOnce(fakeCanvas());

    const img = document.createElement("img");
    img.setAttribute("src", ORIGINAL_SRC);
    document.body.appendChild(img);

    const capture = await captureViewport({ timeout: 30 });

    expect(toCanvas).toHaveBeenCalledTimes(2);
    const retryOptions = toCanvas.mock.calls[1]?.[1] as {
      filter?: (element: Element) => boolean;
    };
    expect(retryOptions.filter?.(img)).toBe(false);
    expect(retryOptions.filter?.(document.body)).toBe(true);
    expect(capture).not.toBeNull();
    expect(img.getAttribute("src")).toBe(ORIGINAL_SRC);
  });

  it("returns null when both attempts hang, within the timeout budget", async () => {
    stubObjectUrls();
    const toCanvas = vi.mocked(snapdom.toCanvas);
    toCanvas.mockImplementation(() => new Promise(() => undefined));

    const started = Date.now();
    const capture = await captureViewport({ timeout: 25 });

    expect(capture).toBeNull();
    expect(toCanvas).toHaveBeenCalledTimes(2);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("does not retry when the first capture succeeds", async () => {
    stubObjectUrls();
    const toCanvas = vi.mocked(snapdom.toCanvas);
    toCanvas.mockResolvedValue(fakeCanvas());

    const capture = await captureViewport({ timeout: 500 });

    expect(toCanvas).toHaveBeenCalledTimes(1);
    expect(capture).not.toBeNull();
  });
});
