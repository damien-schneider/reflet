import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";
import MilestoneTimelinePageClient from "./page-client";

export const metadata: Metadata = generatePageMetadata({
  title: "Milestone Timeline Design Exploration",
  description:
    "Interactive design exploration for milestone timeline layouts, roadmap progress, and delivery status patterns.",
  path: "/design-explore/milestone-timeline",
});

export default function MilestoneTimelineDesignExploration() {
  return <MilestoneTimelinePageClient />;
}
