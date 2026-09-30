import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { modules } from "../../test.helpers";

const png = (content: string) => new Blob([content], { type: "image/png" });
const MAX_PUBLIC_SCREENSHOTS_PER_FEEDBACK = 10;

async function setup() {
  const test = convexTest(schema, modules);
  const seeded = await test.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", {
      createdAt: Date.now(),
      isPublic: true,
      name: "Demo",
      slug: "demo",
      subscriptionStatus: "none",
      subscriptionTier: "free",
    });
    const reporterId = await ctx.db.insert("externalUsers", {
      createdAt: Date.now(),
      externalId: "reporter",
      lastSeenAt: Date.now(),
      organizationId,
    });
    const feedbackId = await ctx.db.insert("feedback", {
      commentCount: 0,
      createdAt: Date.now(),
      description: "Two screens",
      externalUserId: reporterId,
      isApproved: true,
      isPinned: false,
      organizationId,
      status: "open",
      title: "Capture report",
      updatedAt: Date.now(),
      voteCount: 0,
    });
    return { feedbackId, organizationId, reporterId };
  });
  // convex-test drops the Blob type that production records from the upload's Content-Type.
  const upload = (blob: Blob) =>
    test.run(async (ctx) => {
      const storageId = await ctx.storage.store(blob);
      const patchSystemRow: (
        id: Id<"_storage">,
        value: { contentType: string }
      ) => Promise<void> = Reflect.get(ctx.db, "patch").bind(ctx.db);
      await patchSystemRow(storageId, { contentType: blob.type });
      return storageId;
    });
  const save = (storageId: Id<"_storage">, overrides = {}) =>
    test.mutation(internal.feedback.screenshots.saveScreenshotPublic, {
      captureSource: "widget",
      externalUserId: seeded.reporterId,
      feedbackId: seeded.feedbackId,
      filename: "screenshot.png",
      organizationId: seeded.organizationId,
      requireReporter: true,
      storageId,
      ...overrides,
    });
  return { ...seeded, save, test, upload };
}

describe("public screenshot attachments", () => {
  it("saves different images and reuses the attachment when a save is retried", async () => {
    const { save, test, upload } = await setup();
    const first = await upload(png("first"));
    const second = await upload(png("second"));

    const firstId = await save(first);
    const retryId = await save(first);
    const secondId = await save(second);

    expect(retryId).toBe(firstId);
    expect(secondId).not.toBe(firstId);
    const attachments = await test.run((ctx) =>
      ctx.db.query("feedbackScreenshots").collect()
    );
    expect(attachments).toHaveLength(2);
    expect(attachments[0]).toMatchObject({ mimeType: "image/png", size: 5 });
  });

  it("rejects a caller who did not report the feedback", async () => {
    const { save, test, upload, organizationId } = await setup();
    const strangerId = await test.run((ctx) =>
      ctx.db.insert("externalUsers", {
        createdAt: Date.now(),
        externalId: "stranger",
        lastSeenAt: Date.now(),
        organizationId,
      })
    );
    const image = await upload(png("defacement"));

    await expect(save(image, { externalUserId: strangerId })).rejects.toThrow(
      "only be attached by the reporter"
    );
    await expect(save(image, { externalUserId: undefined })).rejects.toThrow(
      "only be attached by the reporter"
    );
  });

  it("lets a secret-key caller attach to any feedback in its organization", async () => {
    const { save, upload } = await setup();
    const image = await upload(png("admin"));

    await expect(
      save(image, { externalUserId: undefined, requireReporter: false })
    ).resolves.toBeDefined();
  });

  it("caps reporter attachments per feedback but still accepts save retries", async () => {
    const { save, upload } = await setup();
    const first = await upload(png("shot-0"));
    const firstId = await save(first);
    for (let i = 1; i < MAX_PUBLIC_SCREENSHOTS_PER_FEEDBACK; i++) {
      await save(await upload(png(`shot-${i}`)));
    }
    const extra = await upload(png("one too many"));

    await expect(save(extra)).rejects.toThrow("maximum screenshots");
    expect(await save(first)).toBe(firstId);
  });

  it("rejects non-image uploads and uploads already attached elsewhere", async () => {
    const { save, test, upload, organizationId } = await setup();
    const html = await upload(new Blob(["<script>"], { type: "text/html" }));
    await expect(save(html)).rejects.toThrow("must be PNG");

    const image = await upload(png("shared"));
    await save(image);
    const otherFeedbackId = await test.run((ctx) =>
      ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Other",
        isApproved: true,
        isPinned: false,
        organizationId,
        status: "open",
        title: "Other report",
        updatedAt: Date.now(),
        voteCount: 0,
      })
    );
    await expect(
      save(image, {
        externalUserId: undefined,
        feedbackId: otherFeedbackId,
        requireReporter: false,
      })
    ).rejects.toThrow("Upload not found");
  });

  it("keeps a blob that another screenshot still references when one is deleted", async () => {
    const { feedbackId, organizationId, test, upload } = await setup();
    const shared = await upload(png("shared"));
    const [victimId, attackerId] = await test.run(async (ctx) => {
      const row = {
        captureSource: "upload" as const,
        createdAt: Date.now(),
        feedbackId,
        filename: "shot.png",
        mimeType: "image/png",
        organizationId,
        size: 6,
        storageId: shared,
      };
      return [
        await ctx.db.insert("feedbackScreenshots", row),
        await ctx.db.insert("feedbackScreenshots", row),
      ];
    });

    await test.mutation(internal.admin_api.screenshots.deleteScreenshot, {
      organizationId,
      screenshotId: attackerId,
    });
    expect(await test.run((ctx) => ctx.storage.getUrl(shared))).not.toBeNull();

    await test.mutation(internal.admin_api.screenshots.deleteScreenshot, {
      organizationId,
      screenshotId: victimId,
    });
    expect(await test.run((ctx) => ctx.storage.getUrl(shared))).toBeNull();
  });
});
