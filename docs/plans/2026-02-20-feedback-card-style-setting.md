# Feedback Card Style Setting — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let org admins choose between 3 feedback card designs (Sweep Corner, Minimal Notch, Editorial Feed) via a new settings page, applying to both dashboard and public board.

**Architecture:** Add `cardStyle` to the org's `feedbackSettings` in Convex schema. The value flows from `page.tsx` → `FeedbackBoard` → `FeedFeedbackView` as a prop. `FeedFeedbackView` renders the matching card design component. A new settings page at `/settings/feedback` lets admins pick the style with autosave.

**Tech Stack:** Convex (schema + mutations), React (Next.js App Router), Tailwind CSS, Phosphor Icons

---

## Task 1: Add `cardStyle` to Convex schema

**Files:**
- Modify: `packages/backend/convex/schema.ts:129-140`

**Step 1: Add the field to feedbackSettings**

In `packages/backend/convex/schema.ts`, find the `feedbackSettings` object (line 130) and add `cardStyle`:

```typescript
feedbackSettings: v.optional(
  v.object({
    allowAnonymousVoting: v.optional(v.boolean()),
    cardStyle: v.optional(
      v.union(
        v.literal("sweep-corner"),
        v.literal("minimal-notch"),
        v.literal("editorial-feed")
      )
    ),
    defaultTagId: v.optional(v.id("tags")),
    defaultView: v.optional(
      v.union(v.literal("roadmap"), v.literal("feed"))
    ),
    requireApproval: v.optional(v.boolean()),
    defaultStatus: v.optional(feedbackStatus),
  })
),
```

**Step 2: Run Convex to verify schema pushes**

Run: `cd packages/backend && npx convex dev --once`
Expected: Schema pushes successfully, no errors.

**Step 3: Commit**

```
feat: add cardStyle field to feedbackSettings schema
```

---

## Task 2: Add `feedbackSettings` to the `organizations.update` mutation

**Files:**
- Modify: `packages/backend/convex/organizations.ts:426-494`

**Step 1: Add feedbackSettings to the mutation args**

In `packages/backend/convex/organizations.ts`, find the `update` mutation (line 426). Add `feedbackSettings` to its args object, after `customCss`:

```typescript
export const update = mutation({
  args: {
    id: v.id("organizations"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    logo: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    primaryColor: v.optional(v.string()),
    customCss: v.optional(v.string()),
    changelogSettings: v.optional(
      v.object({
        autoPublishImported: v.optional(v.boolean()),
        autoVersioning: v.optional(v.boolean()),
        pushToGithubOnPublish: v.optional(v.boolean()),
        syncDirection: v.optional(v.string()),
        targetBranch: v.optional(v.string()),
        versionIncrement: v.optional(v.string()),
        versionPrefix: v.optional(v.string()),
      })
    ),
    feedbackSettings: v.optional(
      v.object({
        allowAnonymousVoting: v.optional(v.boolean()),
        cardStyle: v.optional(
          v.union(
            v.literal("sweep-corner"),
            v.literal("minimal-notch"),
            v.literal("editorial-feed")
          )
        ),
        defaultTagId: v.optional(v.id("tags")),
        defaultView: v.optional(
          v.union(v.literal("roadmap"), v.literal("feed"))
        ),
        requireApproval: v.optional(v.boolean()),
        defaultStatus: v.optional(feedbackStatus),
      })
    ),
  },
  // handler stays the same — it already does: const { id, ...updates } = args; await ctx.db.patch(id, updates);
```

No handler changes needed — the existing spread-patch pattern (`const { id, ...updates } = args; await ctx.db.patch(id, updates);`) automatically persists any new args fields.

**Step 2: Verify**

Run: `cd packages/backend && npx convex dev --once`
Expected: No errors.

**Step 3: Commit**

```
feat: accept feedbackSettings in organizations.update mutation
```

---

## Task 3: Create the CardStyle type and card resolver utility

**Files:**
- Create: `apps/web/src/features/feedback/lib/card-styles.ts`

**Step 1: Create the shared type and resolver**

```typescript
import type { ComponentType } from "react";

import { EditorialFeedCard } from "../components/card-designs/editorial-feed-card";
import { MinimalNotchCard } from "../components/card-designs/minimal-notch-card";
import { SweepCornerCard } from "../components/card-designs/sweep-corner-card";

export type CardStyle = "sweep-corner" | "minimal-notch" | "editorial-feed";

export const DEFAULT_CARD_STYLE: CardStyle = "minimal-notch";

export const CARD_STYLE_OPTIONS = [
  {
    value: "minimal-notch" as const,
    label: "Minimal Notch",
    description: "Clean layout with a left-edge notch vote indicator.",
  },
  {
    value: "sweep-corner" as const,
    label: "Sweep Corner",
    description: "Corner vote badge with a sweep animation on click.",
  },
  {
    value: "editorial-feed" as const,
    label: "Editorial Feed",
    description: "Rich editorial layout with author details and inline voting.",
  },
] as const;

const CARD_COMPONENTS: Record<CardStyle, ComponentType<any>> = {
  "sweep-corner": SweepCornerCard,
  "minimal-notch": MinimalNotchCard,
  "editorial-feed": EditorialFeedCard,
};

export function getCardComponent(style: CardStyle): ComponentType<any> {
  return CARD_COMPONENTS[style];
}
```

**Step 2: Commit**

```
feat: add CardStyle type and card resolver utility
```

---

## Task 4: Pass `cardStyle` through FeedbackBoard to FeedFeedbackView

**Files:**
- Modify: `apps/web/app/dashboard/[orgSlug]/page.tsx:58-72`
- Modify: `apps/web/src/features/feedback/components/feedback-board.tsx:32-44, 46-53, 308-326`
- Modify: `apps/web/src/features/feedback/components/feed-feedback-view.tsx:50-66, 118-134, 174-186`

**Step 1: Pass cardStyle from page.tsx to FeedbackBoard**

In `apps/web/app/dashboard/[orgSlug]/page.tsx`, read `cardStyle` from the org and pass it:

```typescript
const defaultView = org.feedbackSettings?.defaultView ?? "feed";
const cardStyle = org.feedbackSettings?.cardStyle ?? "minimal-notch";

return (
  <FeedbackBoard
    cardStyle={cardStyle}
    defaultView={defaultView}
    isAdmin={isAdmin}
    isMember={isMember}
    isPublic={org.isPublic ?? false}
    organizationId={org._id}
    orgSlug={orgSlug}
    primaryColor={primaryColor}
  />
);
```

**Step 2: Thread through FeedbackBoard props and content**

In `apps/web/src/features/feedback/components/feedback-board.tsx`:

Add to `FeedbackBoardProps` interface (line 32):
```typescript
import type { CardStyle } from "../lib/card-styles";

export interface FeedbackBoardProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
  primaryColor?: string;
  isMember: boolean;
  isAdmin: boolean;
  isPublic: boolean;
  defaultView?: BoardViewType;
  cardStyle?: CardStyle;
}
```

Add `cardStyle` to `FeedbackBoardContent` destructured props (line 46-53):
```typescript
function FeedbackBoardContent({
  organizationId,
  primaryColor,
  isMember,
  isAdmin,
  isPublic,
  defaultView = "feed",
  cardStyle,
}: Omit<FeedbackBoardProps, "orgSlug">) {
```

Pass `cardStyle` to `FeedFeedbackView` (around line 309):
```typescript
<FeedFeedbackView
  cardStyle={cardStyle}
  feedback={filteredFeedback}
  // ... rest of existing props
/>
```

**Step 3: Accept and use cardStyle in FeedFeedbackView**

In `apps/web/src/features/feedback/components/feed-feedback-view.tsx`:

Add to imports:
```typescript
import type { CardStyle } from "../lib/card-styles";
import { DEFAULT_CARD_STYLE, getCardComponent } from "../lib/card-styles";
```

Add to `FeedFeedbackViewProps` (line 50):
```typescript
export interface FeedFeedbackViewProps {
  cardStyle?: CardStyle;
  feedback: FeedbackItem[];
  // ... rest unchanged
}
```

Add `cardStyle` to the destructured props (line 118):
```typescript
export function FeedFeedbackView({
  cardStyle,
  feedback,
  // ... rest
}: FeedFeedbackViewProps) {
```

Replace the card rendering (lines 174-186). Change:
```typescript
<FeedbackCardWithMorphingDialog feedback={item} />
```
to:
```typescript
{(() => {
  const style = cardStyle ?? DEFAULT_CARD_STYLE;
  if (style === "minimal-notch") {
    return <FeedbackCardWithMorphingDialog feedback={item} />;
  }
  const CardComponent = getCardComponent(style);
  return (
    <CardComponent
      feedback={item}
      onClick={() => onFeedbackClick?.(item._id)}
    />
  );
})()}
```

Note: We keep `FeedbackCardWithMorphingDialog` for `"minimal-notch"` since it's the current default and has admin context menu + delete dialog. The other card designs handle their own click/vote internally. We'll need to get `onFeedbackClick` from the FeedbackBoard context:

Add to the component body (after the `filtersBarProps` declaration):
```typescript
const { onFeedbackClick } = useFeedbackBoard();
```

And add the import:
```typescript
import { useFeedbackBoard } from "./feedback-board/feedback-board-context";
```

**Step 4: Verify build**

Run: `cd /path/to/project && bun run build`
Expected: Build succeeds (6/6 tasks).

**Step 5: Commit**

```
feat: thread cardStyle from org settings through to card rendering
```

---

## Task 5: Add "Feedback" nav item to settings layout

**Files:**
- Modify: `apps/web/app/dashboard/[orgSlug]/settings/layout.tsx:4-11, 37-74`

**Step 1: Add the ChatText icon import and nav item**

Add `ChatText` to the Phosphor icons import (line 4):
```typescript
import {
  Buildings,
  ChatText,
  CreditCard,
  GithubLogo,
  Megaphone,
  PaintBrush,
  Users,
} from "@phosphor-icons/react";
```

Add the "Feedback" nav item after "Branding" in the `navItems` array (around line 49):
```typescript
{
  title: "Feedback",
  description: "Card style and display",
  icon: ChatText,
  href: `${basePath}/feedback`,
},
```

**Step 2: Commit**

```
feat: add Feedback nav item to settings sidebar
```

---

## Task 6: Create the feedback settings page

**Files:**
- Create: `apps/web/app/dashboard/[orgSlug]/settings/feedback/page.tsx`

**Step 1: Create the settings page**

Follow the same pattern as `branding/page.tsx`: query org, check admin, autosave with debounce, show save status.

```typescript
"use client";

import { Check, ChatText, Spinner } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { use, useCallback, useEffect, useRef, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H1, Text } from "@/components/ui/typography";
import {
  CARD_STYLE_OPTIONS,
  type CardStyle,
  DEFAULT_CARD_STYLE,
} from "@/features/feedback/lib/card-styles";
import { cn } from "@/lib/utils";

const AUTOSAVE_DEBOUNCE_MS = 800;

export default function FeedbackSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const currentMember = useQuery(
    api.members.getCurrentMember,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const updateOrg = useMutation(api.organizations.update);

  const [cardStyle, setCardStyle] = useState<CardStyle>(DEFAULT_CARD_STYLE);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  useEffect(() => {
    if (org?.feedbackSettings?.cardStyle) {
      setCardStyle(org.feedbackSettings.cardStyle);
    }
  }, [org?.feedbackSettings?.cardStyle]);

  const save = useCallback(
    async (style: CardStyle) => {
      if (!(org?._id && isAdmin)) {
        return;
      }
      setSaveStatus("saving");
      try {
        await updateOrg({
          id: org._id,
          feedbackSettings: {
            ...org.feedbackSettings,
            cardStyle: style,
          },
        });
        setSaveStatus("saved");
        if (savedTimerRef.current) {
          clearTimeout(savedTimerRef.current);
        }
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
      }
    },
    [org?._id, org?.feedbackSettings, isAdmin, updateOrg]
  );

  const handleStyleChange = (style: CardStyle) => {
    setCardStyle(style);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      save(style);
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Text>Loading...</Text>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <ChatText className="h-8 w-8 text-muted-foreground" />
          <div>
            <H1>Feedback Display</H1>
            <Text variant="bodySmall">
              Choose how feedback cards appear on your board
            </Text>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Card Style</CardTitle>
            <CardDescription>
              Select a visual style for feedback cards. This applies to both
              your dashboard and public board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {CARD_STYLE_OPTIONS.map((option) => (
                <button
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all",
                    cardStyle === option.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-border/80 hover:bg-accent/30",
                    !isAdmin && "pointer-events-none opacity-60"
                  )}
                  disabled={!isAdmin}
                  key={option.value}
                  onClick={() => handleStyleChange(option.value)}
                  type="button"
                >
                  <div className="mb-1 font-semibold text-sm">
                    {option.label}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {saveStatus !== "idle" && (
          <div className="flex items-center justify-end gap-2 text-muted-foreground text-sm">
            {saveStatus === "saving" && (
              <>
                <Spinner className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Saved</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Run lint and build**

Run: `bun x ultracite fix && bun run build`
Expected: No errors.

**Step 3: Commit**

```
feat: add feedback settings page with card style picker
```

---

## Task 7: Verify end-to-end flow

**Step 1: Manual verification**

1. Open `http://localhost:3003/dashboard/<org>/settings/feedback`
2. Verify the 3 card style options render with the current selection highlighted
3. Click a different style — verify "Saving..." then "Saved" indicator appears
4. Navigate to `http://localhost:3003/dashboard/<org>` (the feedback board)
5. Verify the feedback cards render with the newly selected style
6. Switch back to "Minimal Notch" — verify it returns to the default card design

**Step 2: Run full checks**

Run: `bun x ultracite check && bun run build`
Expected: Lint clean, build 6/6.

**Step 3: Final commit**

If any fixes were needed, commit them:
```
fix: address lint/build issues in card style feature
```
