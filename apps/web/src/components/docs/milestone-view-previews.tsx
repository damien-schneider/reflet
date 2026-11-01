"use client";

import { MilestoneTrackView } from "@reflet/ui/milestone-track-view";

const MOCK_MILESTONES = [
  {
    colorHex: "#0b6e99",
    emoji: "🚀",
    horizonLabel: "Now",
    horizonShort: "Now",
    id: "m1",
    name: "Public Beta Launch",
    progress: { completed: 5, inProgress: 2, percentage: 63, total: 8 },
    targetDate: "Mar 15",
  },
  {
    colorHex: "#6940a5",
    emoji: "⚡",
    horizonLabel: "Now",
    horizonShort: "Now",
    id: "m2",
    name: "API v2",
    progress: { completed: 1, inProgress: 2, percentage: 20, total: 5 },
    targetDate: "Mar 28",
  },
  {
    colorHex: "#0f7b6c",
    emoji: "📱",
    horizonLabel: "Next Quarter",
    horizonShort: "3mo",
    id: "m3",
    name: "Mobile App",
    progress: { completed: 0, inProgress: 1, percentage: 0, total: 12 },
    targetDate: "Jun 1",
  },
  {
    colorHex: "#d9730d",
    emoji: "🏢",
    horizonLabel: "6 Months",
    horizonShort: "6mo",
    id: "m4",
    name: "Enterprise Features",
    progress: { completed: 0, inProgress: 0, percentage: 0, total: 6 },
    targetDate: null,
  },
];

function TrackViewPreview() {
  return <MilestoneTrackView milestones={MOCK_MILESTONES} />;
}

export { TrackViewPreview };
