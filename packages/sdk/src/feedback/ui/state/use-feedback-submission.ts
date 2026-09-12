import { useCallback, useEffect, useRef, useState } from "react";
import type { Reflet } from "../../../client";
import {
  attachPreparedScreenshots,
  createFeedbackTransport,
  type SubmitResult,
  submitWidgetFeedback,
  type WidgetSubmission,
} from "../../core/submit";

export function useFeedbackSubmission(options: {
  client: Reflet | null;
  onError: (message: string | null) => void;
  onSubmitted: (feedbackId: string) => void;
  partialUploadMessage: string;
}) {
  const [activeRequest, setActiveRequest] = useState<object | null>(null);
  const [pendingReport, setPendingReport] = useState<SubmitResult | null>(null);
  const requestRef = useRef<object | null>(null);
  useEffect(
    () => () => {
      requestRef.current = null;
    },
    []
  );

  const resetSubmission = useCallback(() => {
    requestRef.current = null;
    setPendingReport(null);
    setActiveRequest(null);
  }, []);

  const finishSubmission = (result: SubmitResult) => {
    if (result.pendingScreenshots.length > 0) {
      setPendingReport(result);
      options.onError(options.partialUploadMessage);
      return;
    }
    setPendingReport(null);
    options.onSubmitted(result.feedbackId);
  };

  const submit = async (draft: WidgetSubmission) => {
    if (requestRef.current) {
      return;
    }
    if (!options.client) {
      options.onError(
        "Reflet is missing a publicKey. Pass one to RefletFeedback or RefletProvider."
      );
      return;
    }
    const request = {};
    requestRef.current = request;
    setActiveRequest(request);
    options.onError(null);
    try {
      const transport = createFeedbackTransport(options.client);
      const result = pendingReport
        ? await attachPreparedScreenshots(transport, pendingReport)
        : await submitWidgetFeedback(transport, draft);
      if (requestRef.current === request) {
        finishSubmission(result);
      }
    } catch (error) {
      if (requestRef.current === request) {
        options.onError(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again."
        );
      }
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setActiveRequest(null);
      }
    }
  };

  return {
    hasPendingAttachments: pendingReport !== null,
    isEditingDisabled: activeRequest !== null || pendingReport !== null,
    isSubmitting: activeRequest !== null,
    resetSubmission,
    submit,
  };
}
