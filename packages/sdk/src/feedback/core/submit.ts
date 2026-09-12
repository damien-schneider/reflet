import type { Reflet } from "../../client";
import type {
  CreateFeedbackParams,
  CreateFeedbackResponse,
  FeedbackContext,
  SaveScreenshotParams,
} from "../../types";
import type {
  CapturedImage,
  FeedbackWidgetCategory,
  ScreenshotDraft,
} from "../types";
import {
  type PreparedScreenshot,
  uploadScreenshots,
} from "./submission/upload-screenshots";

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
  category: FeedbackWidgetCategory;
  context: FeedbackContext;
  element: CapturedImage | null;
  email?: string;
  isAnonymous: boolean;
  message: string;
  screenshots: ScreenshotDraft[];
}

export interface SubmitResult {
  feedbackId: string;
  pendingScreenshots: PreparedScreenshot[];
}

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

export async function attachPreparedScreenshots(
  transport: FeedbackTransport,
  result: SubmitResult
): Promise<SubmitResult> {
  const results = await Promise.allSettled(
    result.pendingScreenshots.map((screenshot) =>
      transport.saveScreenshot({
        ...screenshot,
        feedbackId: result.feedbackId,
      })
    )
  );
  const pendingScreenshots = result.pendingScreenshots.filter(
    (_, index) => results[index]?.status === "rejected"
  );
  return { feedbackId: result.feedbackId, pendingScreenshots };
}

async function createReportWithScreenshots(
  transport: FeedbackTransport,
  submission: WidgetSubmission,
  pendingScreenshots: PreparedScreenshot[]
) {
  const { feedbackId } = await transport.create({
    context: submission.context,
    description: buildDescription(submission),
    title: deriveTitle(submission.message),
  });
  return attachPreparedScreenshots(transport, {
    feedbackId,
    pendingScreenshots,
  });
}

export async function submitWidgetFeedback(
  transport: FeedbackTransport,
  submission: WidgetSubmission
): Promise<SubmitResult> {
  const title = deriveTitle(submission.message);
  if (!title) {
    throw new Error("Please describe your feedback before sending it.");
  }
  const pendingScreenshots = await uploadScreenshots(transport, submission);
  return createReportWithScreenshots(transport, submission, pendingScreenshots);
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
