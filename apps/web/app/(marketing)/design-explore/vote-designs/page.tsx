import type { Metadata } from "next";

import { generatePageMetadata } from "@/lib/seo-config";
import VoteDesignsPageClient from "./page-client";

export const metadata: Metadata = generatePageMetadata({
  title: "Vote Button Design Exploration",
  description:
    "Interactive design exploration for vote button layouts, interaction models, and feedback patterns.",
  path: "/design-explore/vote-designs",
});

export default function VoteDesignsPage() {
  return <VoteDesignsPageClient />;
}
