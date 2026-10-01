"use client";

import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import { FEEDBACK_PROPERTIES } from "@reflet/backend/convex/feedback/property_values";
import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { useState } from "react";
import {
  type AnalysisEditor,
  type AnalysisPropertyProps,
  analysisValueUpdate,
  CLEAR_PROPERTY,
  RESET_PROPERTY,
} from "@/features/feedback/components/properties/analysis/property-definition";

type AnalysisUpdate = Omit<
  FunctionArgs<typeof api.feedback.triage_actions.updateAnalysis>,
  "feedbackId"
>;

export function useAnalysisEditor({
  feedbackId,
  name,
}: Pick<AnalysisPropertyProps, "feedbackId" | "name">): AnalysisEditor {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const update = useMutation(api.feedback.triage_actions.updateAnalysis);
  async function persist(change: AnalysisUpdate | undefined) {
    setSaving(true);
    try {
      if (change) {
        await update({ feedbackId, ...change });
      }
      setOpen(false);
    } catch (error) {
      toast.error(
        `Could not update ${FEEDBACK_PROPERTIES[name].label.toLowerCase()}`,
        {
          description: error instanceof Error ? error.message : "Try again",
        }
      );
    } finally {
      setSaving(false);
    }
  }
  return {
    changeSource: (reset) =>
      persist(reset ? RESET_PROPERTY[name] : CLEAR_PROPERTY[name]),
    open,
    save: (value) => persist(analysisValueUpdate(name, value)),
    saving,
    setOpen,
  };
}
