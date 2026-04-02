"use client";

/*
 * Feature mockup orchestrator.
 * Maps feature IDs to their mini (bento grid) and expanded (/features page) mockup components.
 */

import type { JSX } from "react";

import {
  ExpandedAiMockup,
  ExpandedApiMockup,
  ExpandedGithubMockup,
  ExpandedIntegrationsMockup,
  ExpandedRealtimeMockup,
  ExpandedWidgetMockup,
} from "@/features/homepage/components/feature-expanded-mockups";
import {
  MiniAiTriage,
  MiniApi,
  MiniGithubSync,
  MiniIntegrations,
  MiniRealtime,
  MiniWidget,
} from "@/features/homepage/components/feature-mini-mockups";

// ─── Compact mockups (for landing bento grid) ────────────────────────────────

export const COMPACT_MOCKUPS: Record<string, () => JSX.Element> = {
  ai: MiniAiTriage,
  widget: MiniWidget,
  github: MiniGithubSync,
  realtime: MiniRealtime,
  api: MiniApi,
  integrations: MiniIntegrations,
};

// ─── Expanded mockups (for /features page) ───────────────────────────────────

const EXPANDED_MOCKUPS: Record<string, () => JSX.Element> = {
  ai: ExpandedAiMockup,
  widget: ExpandedWidgetMockup,
  github: ExpandedGithubMockup,
  realtime: ExpandedRealtimeMockup,
  api: ExpandedApiMockup,
  integrations: ExpandedIntegrationsMockup,
};

// ─── Client wrapper for RSC pages ────────────────────────────────────────────

export function FeatureMockup({ id }: { id: string }) {
  const Mockup = EXPANDED_MOCKUPS[id];
  if (!Mockup) {
    return null;
  }
  return <Mockup />;
}
