# Feedback Card Style Setting

## Summary

Add an organization-level setting that lets admins choose which feedback card design to use across both the dashboard and public board. Three styles are available: Sweep Corner, Minimal Notch (default), and Editorial Feed.

## Decisions

- **Setting location:** New page at `/dashboard/[orgSlug]/settings/feedback`
- **Scope:** Applies to both dashboard and public board
- **Default:** `minimal-notch` for existing orgs without a selection

## Schema

Add `cardStyle` to the existing `feedbackSettings` object in `convex/schema.ts`:

```typescript
cardStyle: v.optional(v.union(
  v.literal("sweep-corner"),
  v.literal("minimal-notch"),
  v.literal("editorial-feed")
))
```

## Mutations

Update `organizations_actions.ts` update mutation to accept and persist `cardStyle`. No new queries needed since org data already includes `feedbackSettings`.

## Rendering

In `FeedFeedbackView`, read the org's `cardStyle` and render the matching component:

| Value | Component |
|---|---|
| `"sweep-corner"` | `SweepCornerCard` |
| `"minimal-notch"` | `MinimalNotchCard` (default) |
| `"editorial-feed"` | `EditorialFeedCard` |

All three card components already share the same props interface: `{ feedback, onClick, className }`.

## Settings UI

New route: `app/dashboard/[orgSlug]/settings/feedback/page.tsx`

- Visual radio group with 3 card style options
- Each option: name, brief description, visual indicator (colored border when selected)
- Save via existing org update mutation
- Admin/owner access only (matching other settings pages)
- Follows same layout pattern as the branding settings page

## Existing Components

Card designs already implemented at `src/features/feedback/components/card-designs/`:
- `SweepCornerCard` - Corner vote badge with sweep animation
- `MinimalNotchCard` - Left-edge notch vote indicator
- `EditorialFeedCard` - Editorial layout with header, description, inline voting
