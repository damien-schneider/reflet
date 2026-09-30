import type { JSX } from "react";

import {
  ExpandedAiMockup,
  ExpandedApiMockup,
  ExpandedGithubMockup,
  ExpandedRealtimeMockup,
  ExpandedWidgetMockup,
} from "./feature-mockups-expanded";

const MOCKUPS = {
  ai: {
    label:
      "AI analysis of a feature request: auto-tags, priority, complexity, and a detected duplicate",
    Mockup: ExpandedAiMockup,
  },
  api: {
    label: "REST endpoints for feedback and the webhook events Reflet sends",
    Mockup: ExpandedApiMockup,
  },
  github: {
    label:
      "GitHub activity: an issue is created, its pull request merges, and the feedback moves to shipped",
    Mockup: ExpandedGithubMockup,
  },
  realtime: {
    label:
      "Live activity feed with teammates voting, commenting, and moving feedback",
    Mockup: ExpandedRealtimeMockup,
  },
  widget: {
    label: "React code that adds the Reflet feedback button to an app",
    Mockup: ExpandedWidgetMockup,
  },
} satisfies Record<string, { Mockup: () => JSX.Element; label: string }>;

export type FeatureMockupId = keyof typeof MOCKUPS;

export function FeatureMockup({ id }: { id: FeatureMockupId }) {
  const { Mockup, label } = MOCKUPS[id];
  return (
    <div
      aria-label={label}
      className="pointer-events-none w-full select-none"
      role="img"
    >
      <Mockup />
    </div>
  );
}
