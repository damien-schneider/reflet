import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vote Button Designs - Reflet Design Exploration",
  description:
    "Interactive design exploration for vote button layouts, interaction models, and feedback patterns.",
};

export default function VoteDesignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
