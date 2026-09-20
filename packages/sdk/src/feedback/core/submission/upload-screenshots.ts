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
): Promise<PreparedScreenshot[]> {
  const { closeUp, image, annotations, context } = screenshot;
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
    const prepared: PreparedScreenshot[] = [
      {
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
      },
    ];
    if (closeUp) {
      prepared.push({
        captureSource: "element",
        filename: `element-${index + 1}.png`,
        height: closeUp.height,
        mimeType: closeUp.mimeType,
        pageUrl: context.url,
        size: closeUp.blob.size,
        storageId: await uploadImage(transport, closeUp),
        width: closeUp.width,
      });
    }
    return prepared;
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
  return results.flatMap((result) => {
    if (result.status === "rejected") {
      throw result.reason;
    }
    return result.value;
  });
}
