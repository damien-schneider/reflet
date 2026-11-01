// Code strings for documentation previews.
// This file intentionally has NO "use client" directive so it can be imported
// by both server components (doc pages) and client components (previews).

const SWEEP_CORNER_CODE = `<SweepCorner defaultUpvotes={24} defaultDownvotes={3}>
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
</SweepCorner>`;

export { SWEEP_CORNER_CODE };
