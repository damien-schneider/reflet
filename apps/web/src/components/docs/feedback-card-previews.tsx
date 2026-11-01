"use client";

import {
  SweepCorner,
  SweepCornerBadge,
  SweepCornerCard,
  SweepCornerContent,
  SweepCornerFooter,
  SweepCornerTag,
  SweepCornerTags,
  SweepCornerTitle,
} from "@reflet/ui/feedback-sweep-corner";

function SweepCornerPreview() {
  return (
    <div className="w-full max-w-sm">
      <SweepCorner defaultDownvotes={3} defaultUpvotes={24}>
        <SweepCornerCard>
          <SweepCornerContent>
            <SweepCornerTitle>
              Add keyboard shortcuts for common actions
            </SweepCornerTitle>
            <SweepCornerTags>
              <SweepCornerTag color="purple">UX</SweepCornerTag>
              <SweepCornerTag color="green">Feature</SweepCornerTag>
            </SweepCornerTags>
          </SweepCornerContent>
          <SweepCornerFooter comments={7} time="3 days ago" />
        </SweepCornerCard>
        <SweepCornerBadge />
      </SweepCorner>
    </div>
  );
}

export { SweepCornerPreview };
