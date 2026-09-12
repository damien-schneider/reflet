import type { SaveScreenshotParams } from "../../../types";
import type { CapturedImage, ScreenshotDraft } from "../../types";
import { renderAnnotatedImage } from "../annotation-renderer";
import { toWireAnnotations } from "../annotations";
import { releaseCapture } from "../capture";
import type { FeedbackTransport, WidgetSubmission } from "../submit";

export type PreparedScreenshot = Omit<SaveScreenshotParams, "feedbackId">;

async function uploadImage(transport: FeedbackTransport, image: CapturedImage) {
  const { uploadUrl } = await transport.getScreenshotUploadUrl();
  return transport.uploadImage(uploadUrl, image);
}

async function prepareScreenshot(
  transport: FeedbackTransport,
  screenshot: ScreenshotDraft,
  index: number
): Promise<PreparedScreenshot> {
  const { image, annotations, context } = screenshot;
  const annotated =
    annotations.length > 0
      ? await renderAnnotatedImage(image, annotations)
      : null;
  if (annotations.length > 0 && !annotated) {
    throw new Error("Could not render your annotations. Please try again.");
  }
  try {
    const storageId = await uploadImage(transport, image);
    const annotatedStorageId = annotated
      ? await uploadImage(transport, annotated)
      : undefined;
    return {
      annotatedStorageId,
      annotations:
        annotations.length > 0 ? toWireAnnotations(annotations) : undefined,
      captureSource: "widget",
      filename: `screenshot-${index + 1}.png`,
      height: image.height,
      mimeType: image.mimeType,
      pageUrl: context.url,
      size: image.blob.size,
      storageId,
      width: image.width,
    };
  } finally {
    releaseCapture(annotated);
  }
}

export async function uploadScreenshots(
  transport: FeedbackTransport,
  submission: WidgetSubmission
) {
  const results = await Promise.allSettled(
    submission.screenshots.map((screenshot, index) =>
      prepareScreenshot(transport, screenshot, index)
    )
  );
  const prepared = results.map((result) => {
    if (result.status === "rejected") {
      throw result.reason;
    }
    return result.value;
  });
  const element = submission.element;
  if (element) {
    prepared.push({
      captureSource: "element",
      filename: "element.png",
      height: element.height,
      mimeType: element.mimeType,
      pageUrl: submission.context.url,
      size: element.blob.size,
      storageId: await uploadImage(transport, element),
      width: element.width,
    });
  }
  return prepared;
}
