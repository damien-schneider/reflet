import { describe, expect, it } from "vitest";
import { saveScreenshotSchema } from "../public_api/schemas";

describe("public screenshot annotations", () => {
  it("accepts a spotlight drawn by the SDK", () => {
    expect(
      saveScreenshotSchema.safeParse({
        annotations: [
          { height: 100, type: "spotlight", width: 200, x: 10, y: 10 },
        ],
        feedbackId: "feedback",
        storageId: "image",
      }).success
    ).toBe(true);
  });
});
