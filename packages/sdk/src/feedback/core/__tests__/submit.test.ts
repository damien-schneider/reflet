import { describe, expect, it, vi } from "vitest";
import type {
  CreateFeedbackParams,
  SaveScreenshotParams,
} from "../../../types";
import type { Annotation, CapturedImage } from "../../types";
import {
  buildDescription,
  deriveTitle,
  type FeedbackTransport,
  submitWidgetFeedback,
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

function submission(overrides: Record<string, unknown> = {}) {
  return {
    annotated: null,
    annotations: [] as Annotation[],
    category: "bug" as const,
    context: { url: "https://app.test/billing" },
    isAnonymous: false,
    message: "The invoice total is wrong",
    screenshot: null,
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

    const result = await submitWidgetFeedback(transport, submission());

    expect(result).toEqual({ feedbackId: "fb_1", screenshotSaved: false });
    expect(created[0]).toEqual({
      context: { url: "https://app.test/billing" },
      description: "[Bug] The invoice total is wrong",
      title: "The invoice total is wrong",
    });
  });

  it("uploads the screenshot and links it to the feedback", async () => {
    const { transport, saved, uploads } = stubTransport();

    const result = await submitWidgetFeedback(
      transport,
      submission({ screenshot: capture() })
    );

    expect(uploads).toEqual(["https://upload.test/a"]);
    expect(saved[0]).toMatchObject({
      feedbackId: "fb_1",
      height: 800,
      mimeType: "image/png",
      pageUrl: "https://app.test/billing",
      storageId: "storage_1",
      width: 1280,
    });
    expect(saved[0]?.annotatedStorageId).toBeUndefined();
    expect(result.screenshotSaved).toBe(true);
  });

  it("uploads the annotated copy alongside the original", async () => {
    const { transport, saved, uploads } = stubTransport();
    const annotations: Annotation[] = [
      {
        color: "#ef4444",
        end: { x: 100, y: 100 },
        id: "a1",
        start: { x: 10, y: 10 },
        tool: "arrow",
      },
    ];

    await submitWidgetFeedback(
      transport,
      submission({
        annotated: capture({ objectUrl: "blob:annotated" }),
        annotations,
        screenshot: capture(),
      })
    );

    expect(uploads).toHaveLength(2);
    expect(saved[0]?.annotatedStorageId).toBe("storage_2");
    expect(saved[0]?.annotations).toEqual([
      { color: "#ef4444", endX: 100, endY: 100, type: "arrow", x: 10, y: 10 },
    ]);
  });

  it("keeps the feedback when the screenshot upload fails", async () => {
    const { transport, created } = stubTransport({
      uploadImage: () => Promise.reject(new Error("network down")),
    });

    const result = await submitWidgetFeedback(
      transport,
      submission({ screenshot: capture() })
    );

    expect(result).toEqual({ feedbackId: "fb_1", screenshotSaved: false });
    expect(created).toHaveLength(1);
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
