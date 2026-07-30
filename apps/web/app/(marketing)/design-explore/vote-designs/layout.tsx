import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Interactive design exploration for vote button layouts, interaction models, and feedback patterns.",
  title: "Vote Button Designs - Reflet Design Exploration",
};

export default function VoteDesignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
