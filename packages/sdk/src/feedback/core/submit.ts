import type { Reflet } from "../../client";
import type {
  CreateFeedbackParams,
  CreateFeedbackResponse,
  FeedbackContext,
  SaveScreenshotParams,
} from "../../types";
import type {
  Annotation,
  CapturedImage,
  FeedbackWidgetCategory,
} from "../types";
import { toWireAnnotations } from "./annotations";

const MAX_TITLE_LENGTH = 100;
const NEWLINE = /\r?\n/;

export interface FeedbackTransport {
  create: (params: CreateFeedbackParams) => Promise<CreateFeedbackResponse>;
  getScreenshotUploadUrl: () => Promise<{ uploadUrl: string }>;
  saveScreenshot: (
    params: SaveScreenshotParams
  ) => Promise<{ screenshotId: string }>;
  uploadImage: (uploadUrl: string, image: CapturedImage) => Promise<string>;
}

export interface WidgetSubmission {
  annotated: CapturedImage | null;
  annotations: Annotation[];
  category: FeedbackWidgetCategory;
  context: FeedbackContext;
  /** Close-up of the picked element, captured when the reporter pointed at it. */
  element: CapturedImage | null;
  email?: string;
  isAnonymous: boolean;
  message: string;
  screenshot: CapturedImage | null;
}

export interface SubmitResult {
  feedbackId: string;
  screenshotSaved: boolean;
}

/** First line of the message, cut on a word boundary so titles stay readable. */
export function deriveTitle(message: string): string {
  const firstLine =
    message
      .split(NEWLINE)
      .map((line) => line.trim())
      .find(Boolean) ?? "";

  if (firstLine.length <= MAX_TITLE_LENGTH) {
    return firstLine;
  }

  const clipped = firstLine.slice(0, MAX_TITLE_LENGTH - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd()}…`;
}

export function buildDescription(params: {
  category: FeedbackWidgetCategory;
  email?: string;
  isAnonymous: boolean;
  message: string;
}): string {
  const { category, email, isAnonymous, message } = params;
  const label = category.charAt(0).toUpperCase() + category.slice(1);
  const contact = isAnonymous && email ? `\n\n---\nContact: ${email}` : "";

  return `[${label}] ${message.trim()}${contact}`;
}

async function upload(
  transport: FeedbackTransport,
  image: CapturedImage
): Promise<string> {
  const { uploadUrl } = await transport.getScreenshotUploadUrl();
  return await transport.uploadImage(uploadUrl, image);
}

async function attachScreenshot(
  transport: FeedbackTransport,
  feedbackId: string,
  submission: WidgetSubmission
): Promise<boolean> {
  const { annotated, annotations, context, screenshot } = submission;
  if (!screenshot) {
    return false;
  }

  const storageId = await upload(transport, screenshot);
  const annotatedStorageId = annotated
    ? await upload(transport, annotated)
    : undefined;
  const wireAnnotations = toWireAnnotations(annotations);

  await transport.saveScreenshot({
    annotatedStorageId,
    annotations: wireAnnotations.length > 0 ? wireAnnotations : undefined,
    captureSource: "widget",
    feedbackId,
    filename: "screenshot.png",
    height: screenshot.height,
    mimeType: screenshot.mimeType,
    pageUrl: context.url,
    size: screenshot.blob.size,
    storageId,
    width: screenshot.width,
  });

  return true;
}

async function attachElement(
  transport: FeedbackTransport,
  feedbackId: string,
  submission: WidgetSubmission
): Promise<void> {
  const { context, element } = submission;
  if (!element) {
    return;
  }

  await transport.saveScreenshot({
    captureSource: "element",
    feedbackId,
    filename: "element.png",
    height: element.height,
    mimeType: element.mimeType,
    pageUrl: context.url,
    size: element.blob.size,
    storageId: await upload(transport, element),
    width: element.width,
  });
}

/**
 * Creates the feedback first, then attaches the capture. A failed upload is
 * reported back but never discards what the user wrote.
 */
export async function submitWidgetFeedback(
  transport: FeedbackTransport,
  submission: WidgetSubmission
): Promise<SubmitResult> {
  const title = deriveTitle(submission.message);
  if (!title) {
    throw new Error("Please describe your feedback before sending it.");
  }

  const { feedbackId } = await transport.create({
    context: submission.context,
    description: buildDescription(submission),
    title,
  });

  const screenshotSaved = await attachScreenshot(
    transport,
    feedbackId,
    submission
  ).catch(() => false);
  await attachElement(transport, feedbackId, submission).catch(() => undefined);

  return { feedbackId, screenshotSaved };
}

function isStorageResponse(value: unknown): value is { storageId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "storageId") === "string"
  );
}

export function createFeedbackTransport(client: Reflet): FeedbackTransport {
  return {
    create: (params) => client.create(params),
    getScreenshotUploadUrl: () => client.getScreenshotUploadUrl(),
    saveScreenshot: (params) => client.saveScreenshot(params),
    uploadImage: async (uploadUrl, image) => {
      const response = await fetch(uploadUrl, {
        body: image.blob,
        headers: { "Content-Type": image.mimeType },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Screenshot upload failed (${response.status})`);
      }

      const payload: unknown = await response.json();
      if (!isStorageResponse(payload)) {
        throw new Error("Screenshot upload returned no storage id");
      }

      return payload.storageId;
    },
  };
}
