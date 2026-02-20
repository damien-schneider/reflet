"use client";

import {
  EditorialFeed,
  EditorialFeedComments,
  EditorialFeedContent,
  EditorialFeedItem,
  EditorialFeedMeta,
  EditorialFeedRule,
  EditorialFeedStatus,
  EditorialFeedTag,
  EditorialFeedTime,
  EditorialFeedTitle,
  EditorialFeedVote,
} from "@/components/ui/feedback-editorial-feed";
import {
  MinimalNotch,
  MinimalNotchCard,
  MinimalNotchMeta,
  MinimalNotchStatus,
  MinimalNotchTag,
  MinimalNotchTags,
  MinimalNotchTitle,
  MinimalNotchVote,
} from "@/components/ui/feedback-minimal-notch";
import {
  SweepCorner,
  SweepCornerBadge,
  SweepCornerCard,
  SweepCornerContent,
  SweepCornerFooter,
  SweepCornerTag,
  SweepCornerTags,
  SweepCornerTitle,
} from "@/components/ui/feedback-sweep-corner";

// ─── Sweep Corner ────────────────────────────────────────────────────────────

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

// ─── Minimal Notch ───────────────────────────────────────────────────────────

function MinimalNotchPreview() {
  return (
    <div className="w-full max-w-sm">
      <MinimalNotch defaultDownvotes={3} defaultUpvotes={24}>
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
      </MinimalNotch>
    </div>
  );
}

// ─── Editorial Feed ──────────────────────────────────────────────────────────

function EditorialFeedPreview() {
  return (
    <div className="w-full max-w-lg">
      <EditorialFeed>
        <EditorialFeedItem defaultDownvotes={3} defaultUpvotes={24}>
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
        <EditorialFeedItem defaultDownvotes={2} defaultUpvotes={41}>
          <EditorialFeedVote />
          <EditorialFeedRule />
          <EditorialFeedContent>
            <EditorialFeedTitle>
              Dark mode support for the dashboard
            </EditorialFeedTitle>
            <EditorialFeedMeta>
              <EditorialFeedStatus color="amber">
                In Progress
              </EditorialFeedStatus>
              <EditorialFeedTag>Design</EditorialFeedTag>
              <EditorialFeedComments count={12} />
              <EditorialFeedTime>1 day ago</EditorialFeedTime>
            </EditorialFeedMeta>
          </EditorialFeedContent>
        </EditorialFeedItem>
        <EditorialFeedItem defaultDownvotes={1} defaultUpvotes={8}>
          <EditorialFeedVote />
          <EditorialFeedRule />
          <EditorialFeedContent>
            <EditorialFeedTitle>Export feedback data as CSV</EditorialFeedTitle>
            <EditorialFeedMeta>
              <EditorialFeedStatus color="purple">
                Under Review
              </EditorialFeedStatus>
              <EditorialFeedTag>Data</EditorialFeedTag>
              <EditorialFeedComments count={3} />
              <EditorialFeedTime>5 days ago</EditorialFeedTime>
            </EditorialFeedMeta>
          </EditorialFeedContent>
        </EditorialFeedItem>
      </EditorialFeed>
    </div>
  );
}

// ─── All Cards (Overview) ────────────────────────────────────────────────────

function AllCardsPreview() {
  return (
    <div className="grid w-full gap-8 lg:grid-cols-3">
      <div>
        <p className="mb-2 font-medium text-muted-foreground text-xs">
          Sweep Corner
        </p>
        <SweepCorner defaultDownvotes={3} defaultUpvotes={24}>
          <SweepCornerCard>
            <SweepCornerContent>
              <SweepCornerTitle>Add keyboard shortcuts</SweepCornerTitle>
              <SweepCornerTags>
                <SweepCornerTag color="purple">UX</SweepCornerTag>
              </SweepCornerTags>
            </SweepCornerContent>
            <SweepCornerFooter comments={7} time="3d ago" />
          </SweepCornerCard>
          <SweepCornerBadge />
        </SweepCorner>
      </div>
      <div>
        <p className="mb-2 font-medium text-muted-foreground text-xs">
          Minimal Notch
        </p>
        <MinimalNotch defaultDownvotes={3} defaultUpvotes={24}>
          <MinimalNotchCard>
            <MinimalNotchTitle>Add keyboard shortcuts</MinimalNotchTitle>
            <MinimalNotchStatus color="blue">Planned</MinimalNotchStatus>
            <MinimalNotchTags>
              <MinimalNotchTag color="purple">UX</MinimalNotchTag>
            </MinimalNotchTags>
            <MinimalNotchMeta comments={7} time="3d ago" />
          </MinimalNotchCard>
          <MinimalNotchVote />
        </MinimalNotch>
      </div>
      <div>
        <p className="mb-2 font-medium text-muted-foreground text-xs">
          Editorial Feed
        </p>
        <EditorialFeed>
          <EditorialFeedItem defaultDownvotes={3} defaultUpvotes={24}>
            <EditorialFeedVote />
            <EditorialFeedRule />
            <EditorialFeedContent>
              <EditorialFeedTitle>Add keyboard shortcuts</EditorialFeedTitle>
              <EditorialFeedMeta>
                <EditorialFeedStatus color="blue">Planned</EditorialFeedStatus>
                <EditorialFeedTag>UX</EditorialFeedTag>
                <EditorialFeedComments count={7} />
                <EditorialFeedTime>3d ago</EditorialFeedTime>
              </EditorialFeedMeta>
            </EditorialFeedContent>
          </EditorialFeedItem>
        </EditorialFeed>
      </div>
    </div>
  );
}

export {
  SweepCornerPreview,
  MinimalNotchPreview,
  EditorialFeedPreview,
  AllCardsPreview,
};
