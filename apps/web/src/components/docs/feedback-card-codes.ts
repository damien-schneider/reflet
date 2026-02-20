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

const MINIMAL_NOTCH_CODE = `<MinimalNotch defaultUpvotes={24} defaultDownvotes={3}>
  <MinimalNotchCard>
    <MinimalNotchTitle>
      Add keyboard shortcuts for common actions
    </MinimalNotchTitle>
    <MinimalNotchStatus color="blue">Planned</MinimalNotchStatus>
    <MinimalNotchTags>
      <MinimalNotchTag color="purple">UX</MinimalNotchTag>
      <MinimalNotchTag color="green">Feature</MinimalNotchTag>
    </MinimalNotchTags>
    <MinimalNotchMeta comments={7} time="3 days ago" />
  </MinimalNotchCard>
  <MinimalNotchVote />
</MinimalNotch>`;

const EDITORIAL_FEED_CODE = `<EditorialFeed>
  <EditorialFeedItem defaultUpvotes={24} defaultDownvotes={3}>
    <EditorialFeedVote />
    <EditorialFeedRule />
    <EditorialFeedContent>
      <EditorialFeedTitle>
        Add keyboard shortcuts for common actions
      </EditorialFeedTitle>
      <EditorialFeedMeta>
        <EditorialFeedStatus color="blue">Planned</EditorialFeedStatus>
        <EditorialFeedTag>UX</EditorialFeedTag>
        <EditorialFeedTag>Feature</EditorialFeedTag>
        <EditorialFeedComments count={7} />
        <EditorialFeedTime>3 days ago</EditorialFeedTime>
      </EditorialFeedMeta>
    </EditorialFeedContent>
  </EditorialFeedItem>
  <EditorialFeedItem defaultUpvotes={41} defaultDownvotes={2}>
    <EditorialFeedVote />
    <EditorialFeedRule />
    <EditorialFeedContent>
      <EditorialFeedTitle>
        Dark mode support for the dashboard
      </EditorialFeedTitle>
      <EditorialFeedMeta>
        <EditorialFeedStatus color="amber">In Progress</EditorialFeedStatus>
        <EditorialFeedTag>Design</EditorialFeedTag>
        <EditorialFeedComments count={12} />
        <EditorialFeedTime>1 day ago</EditorialFeedTime>
      </EditorialFeedMeta>
    </EditorialFeedContent>
  </EditorialFeedItem>
  <EditorialFeedItem defaultUpvotes={8} defaultDownvotes={1}>
    <EditorialFeedVote />
    <EditorialFeedRule />
    <EditorialFeedContent>
      <EditorialFeedTitle>Export feedback data as CSV</EditorialFeedTitle>
      <EditorialFeedMeta>
        <EditorialFeedStatus color="purple">Under Review</EditorialFeedStatus>
        <EditorialFeedTag>Data</EditorialFeedTag>
        <EditorialFeedComments count={3} />
        <EditorialFeedTime>5 days ago</EditorialFeedTime>
      </EditorialFeedMeta>
    </EditorialFeedContent>
  </EditorialFeedItem>
</EditorialFeed>`;

export { SWEEP_CORNER_CODE, MINIMAL_NOTCH_CODE, EDITORIAL_FEED_CODE };
