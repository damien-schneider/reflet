import type { Metadata } from "next";

import { MarketingSubpage } from "@/features/homepage/components/marketing-subpage";
import { generatePageMetadata } from "@/lib/seo-config";

export const metadata: Metadata = generatePageMetadata({
  description:
    "Learn about product feedback management, roadmap planning, and building products users love. Guides, tutorials, and best practices from the Reflet team.",
  keywords: [
    "product management blog",
    "feedback management",
    "roadmap planning",
    "product development",
  ],
  path: "/blog",
  title: "Blog",
});

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MarketingSubpage>{children}</MarketingSubpage>;
}
