import { describe, expect, it } from "vitest";

import { metadata as milestoneTimelineMetadata } from "./milestone-timeline/page";
import { metadata as voteDesignsMetadata } from "./vote-designs/page";

const designPages = [
  {
    metadata: milestoneTimelineMetadata,
    path: "/design-explore/milestone-timeline",
    title: "Milestone Timeline Design Exploration",
  },
  {
    metadata: voteDesignsMetadata,
    path: "/design-explore/vote-designs",
    title: "Vote Button Design Exploration",
  },
] as const;

describe("design exploration page metadata", () => {
  it("declares page-level metadata for share previews", () => {
    for (const page of designPages) {
      expect(page.metadata.title).toBe(page.title);
      expect(String(page.metadata.alternates?.canonical)).toContain(page.path);
      expect(page.metadata.description).toContain("design");
    }
  });
});
