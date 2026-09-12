import { describe, expect, it, vi } from "vitest";
import type {
  CreateFeedbackParams,
  SaveScreenshotParams,
} from "../../../types";
import type { CapturedImage, ScreenshotDraft } from "../../types";
import {
  attachPreparedScreenshots,
  buildDescription,
  deriveTitle,
  type FeedbackTransport,
  submitWidgetFeedback,
  type WidgetSubmission,
} from "../submit";

function capture(overrides: Partial<CapturedImage> = {}): CapturedImage {
  return {
    blob: new Blob(["png"], { type: "image/png" }),
    height: 800,
    mimeType: "image/png",
    objectUrl: "blob:capture",
    width: 1280,
    ...overrides,
  };
}

function stubTransport(overrides: Partial<FeedbackTransport> = {}) {
  const created: CreateFeedbackParams[] = [];
  const saved: SaveScreenshotParams[] = [];
  const uploads: string[] = [];

  const transport: FeedbackTransport = {
    create: (params) => {
      created.push(params);
      return Promise.resolve({ feedbackId: "fb_1", isApproved: true });
    },
    getScreenshotUploadUrl: () =>
      Promise.resolve({ uploadUrl: "https://upload.test/a" }),
    saveScreenshot: (params) => {
      saved.push(params);
      return Promise.resolve({ screenshotId: "sh_1" });
    },
    uploadImage: (url) => {
      uploads.push(url);
      return Promise.resolve(`storage_${uploads.length}`);
    },
    ...overrides,
  };

  return { created, saved, transport, uploads };
}

vi.mock("../annotation-renderer", () => ({
  renderAnnotatedImage: vi.fn(async () =>
    capture({ objectUrl: "blob:annotated" })
  ),
}));
vi.mock("../capture", () => ({ releaseCapture: vi.fn() }));

function screenshot(overrides: Partial<ScreenshotDraft> = {}): ScreenshotDraft {
  return {
    annotations: [],
    context: { url: "https://app.test/billing" },
    id: "first",
    image: capture(),
    source: "manual",
    ...overrides,
  };
}

function submission(
  overrides: Partial<WidgetSubmission> = {}
): WidgetSubmission {
  return {
    category: "bug",
    context: { url: "https://app.test/billing" },
    element: null,
    isAnonymous: false,
    message: "The invoice total is wrong",
    screenshots: [],
    ...overrides,
  };
}

describe("deriveTitle", () => {
  it("uses the first line of the message", () => {
    expect(deriveTitle("Total is wrong\n\nIt shows 0 for me")).toBe(
      "Total is wrong"
    );
  });

  it("trims surrounding whitespace and blank leading lines", () => {
    expect(deriveTitle("\n\n  Dark mode please  \n")).toBe("Dark mode please");
  });

  it("truncates on a word boundary", () => {
    const title = deriveTitle(`${"invoice ".repeat(30)}end`);

    expect(title.length).toBeLessThanOrEqual(100);
    expect(title.endsWith("…")).toBe(true);
    expect(title).not.toContain("invoic…");
  });

  it("returns an empty string for an empty message", () => {
    expect(deriveTitle("   \n  ")).toBe("");
  });
});

describe("buildDescription", () => {
  it("prefixes the category", () => {
    expect(
      buildDescription({
        category: "bug",
        isAnonymous: false,
        message: "Broken",
      })
    ).toBe("[Bug] Broken");
  });

  it("appends a contact block for anonymous reporters", () => {
    const description = buildDescription({
      category: "idea",
      email: "jane@example.com",
      isAnonymous: true,
      message: "Add dark mode",
    });

    expect(description).toBe(
      "[Idea] Add dark mode\n\n---\nContact: jane@example.com"
    );
  });

  it("ignores the email of an identified user", () => {
    const description = buildDescription({
      category: "question",
      email: "jane@example.com",
      isAnonymous: false,
      message: "How do I export?",
    });

    expect(description).not.toContain("Contact");
  });
});

describe("submitWidgetFeedback", () => {
  it("creates the feedback with its derived title and context", async () => {
    const { transport, created } = stubTransport();
    expect(await submitWidgetFeedback(transport, submission())).toEqual({
      feedbackId: "fb_1",
      pendingScreenshots: [],
    });
    expect(created[0]).toEqual({
      context: { url: "https://app.test/billing" },
      description: "[Bug] The invoice total is wrong",
      title: "The invoice total is wrong",
    });
  });

  it("uploads every screenshot with its own page and annotations", async () => {
    const { transport, created, saved, uploads } = stubTransport();
    const result = await submitWidgetFeedback(
      transport,
      submission({
        screenshots: [
          screenshot(),
          screenshot({
            annotations: [
              {
                color: "#ef4444",
                end: { x: 100, y: 100 },
                id: "mark",
                start: { x: 10, y: 10 },
                tool: "spotlight",
              },
            ],
            context: { url: "https://app.test/settings" },
            id: "second",
          }),
        ],
      })
    );
    expect(created).toHaveLength(1);
    expect(saved).toHaveLength(2);
    expect(uploads).toHaveLength(3);
    expect(saved[0]).toMatchObject({
      feedbackId: "fb_1",
      filename: "screenshot-1.png",
      height: 800,
      mimeType: "image/png",
      pageUrl: "https://app.test/billing",
      storageId: "storage_1",
      width: 1280,
    });
    expect(saved[0]?.annotatedStorageId).toBeUndefined();
    expect(saved[1]).toMatchObject({
      annotatedStorageId: "storage_3",
      annotations: [
        {
          color: "#ef4444",
          height: 90,
          type: "spotlight",
          width: 90,
          x: 10,
          y: 10,
        },
      ],
      filename: "screenshot-2.png",
      pageUrl: "https://app.test/settings",
    });
    expect(result.pendingScreenshots).toEqual([]);
  });

  it.each([false, true])(
    "attaches an element close-up with a viewport: %s",
    async (withViewport) => {
      const { transport, saved } = stubTransport();
      await submitWidgetFeedback(
        transport,
        submission({
          element: capture({ height: 40, width: 120 }),
          screenshots: withViewport ? [screenshot()] : [],
        })
      );
      expect(saved.map((entry) => entry.captureSource)).toEqual(
        withViewport ? ["widget", "element"] : ["element"]
      );
      expect(saved.at(-1)).toMatchObject({
        filename: "element.png",
        height: 40,
        width: 120,
      });
    }
  );

  it("leaves the draft unsent if any image upload fails", async () => {
    const { transport, created } = stubTransport({
      uploadImage: () => Promise.reject(new Error("network down")),
    });
    await expect(
      submitWidgetFeedback(
        transport,
        submission({ screenshots: [screenshot()] })
      )
    ).rejects.toThrow("network down");
    expect(created).toHaveLength(0);
  });

  it("retries only missing attachments without creating another report or uploading again", async () => {
    const saveScreenshot = vi
      .fn<FeedbackTransport["saveScreenshot"]>()
      .mockResolvedValueOnce({ screenshotId: "first" })
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValueOnce({ screenshotId: "second" });
    const { transport, created, uploads } = stubTransport({ saveScreenshot });
    const result = await submitWidgetFeedback(
      transport,
      submission({ screenshots: [screenshot(), screenshot({ id: "second" })] })
    );
    expect(result.pendingScreenshots).toHaveLength(1);
    expect(result.pendingScreenshots[0]?.storageId).toBe("storage_2");
    expect(await attachPreparedScreenshots(transport, result)).toEqual({
      feedbackId: "fb_1",
      pendingScreenshots: [],
    });
    expect(created).toHaveLength(1);
    expect(uploads).toHaveLength(2);
    expect(saveScreenshot).toHaveBeenCalledTimes(3);
  });

  it("propagates a failure to create the feedback itself", async () => {
    const { transport } = stubTransport({
      create: () => Promise.reject(new Error("rate limited")),
    });
    await expect(submitWidgetFeedback(transport, submission())).rejects.toThrow(
      "rate limited"
    );
  });

  it("refuses an empty message before touching the network", async () => {
    const create = vi.fn();
    const { transport } = stubTransport({ create });
    await expect(
      submitWidgetFeedback(transport, submission({ message: "   " }))
    ).rejects.toThrow(/describe/i);
    expect(create).not.toHaveBeenCalled();
  });
});
