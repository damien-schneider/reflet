# Tag Filter Bar with Emoji Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a horizontal scrollable tag filter bar above the feedback board with Notion-style color picker and emoji support using Frimousse.

**Architecture:** Add `icon` field to tags schema, create CSS variables for Notion-style named colors, build a horizontal tag filter component with single-select behavior, and create reusable Notion-style color picker and emoji picker components using Frimousse.

**Tech Stack:** Convex (database), React, Tailwind CSS, Frimousse (emoji picker), Radix UI (popover)

---

## Task 1: Install Frimousse

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install frimousse package**

Run: `cd /Users/damienschneider/Documents/GitHub/reflet-v2 && bun add frimousse --filter @reflet-v2/web`

**Step 2: Verify installation**

Run: `grep frimousse apps/web/package.json`
Expected: `"frimousse": "^0.3.0"` or similar version

---

## Task 2: Add icon field to tags schema

**Files:**
- Modify: `packages/backend/convex/schema.ts:212-233`

**Step 1: Add icon field to tags table**

In `packages/backend/convex/schema.ts`, update the tags table definition:

```typescript
tags: defineTable({
  organizationId: v.id("organizations"),
  name: v.string(),
  slug: v.string(),
  color: v.string(), // Now stores color name (e.g., "blue", "red") instead of hex
  icon: v.optional(v.string()), // Emoji character (e.g., "🔥", "📦")
  description: v.optional(v.string()),
  // ... rest of fields unchanged
})
```

**Step 2: Verify schema compiles**

Run: `cd /Users/damienschneider/Documents/GitHub/reflet-v2 && bun run --filter @reflet-v2/backend dev`
Expected: Convex dev server starts without errors

---

## Task 3: Update tags mutations to handle icon

**Files:**
- Modify: `packages/backend/convex/tags.ts`

**Step 1: Update create mutation to accept icon**

Add `icon: v.optional(v.string())` to the args and include it in the insert:

```typescript
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.optional(v.string()),
    color: v.string(),
    icon: v.optional(v.string()), // Add this
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ... existing code ...
    const tagId = await ctx.db.insert("tags", {
      organizationId: args.organizationId,
      name: args.name,
      slug,
      color: args.color,
      icon: args.icon, // Add this
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
    return tagId;
  },
});
```

**Step 2: Update update mutation to accept icon**

Add `icon: v.optional(v.string())` to the args.

---

## Task 4: Add CSS variables for Notion-style tag colors

**Files:**
- Modify: `apps/web/app/globals.css`

**Step 1: Add tag color CSS variables after the olive palette in :root**

```css
:root {
  /* ... existing variables ... */

  /* Tag colors - Notion style */
  --tag-default-bg: 245 245 245;
  --tag-default-text: 115 115 115;
  --tag-gray-bg: 241 241 241;
  --tag-gray-text: 120 119 116;
  --tag-brown-bg: 244 238 238;
  --tag-brown-text: 151 109 87;
  --tag-orange-bg: 251 236 221;
  --tag-orange-text: 204 119 47;
  --tag-yellow-bg: 251 243 219;
  --tag-yellow-text: 194 146 67;
  --tag-green-bg: 237 243 236;
  --tag-green-text: 84 129 100;
  --tag-blue-bg: 231 243 248;
  --tag-blue-text: 72 124 165;
  --tag-purple-bg: 244 240 247;
  --tag-purple-text: 144 101 176;
  --tag-pink-bg: 250 241 245;
  --tag-pink-text: 179 84 136;
  --tag-red-bg: 255 226 221;
  --tag-red-text: 196 85 77;
}

.dark {
  /* ... existing variables ... */

  /* Tag colors - Notion style (dark mode) */
  --tag-default-bg: 55 55 55;
  --tag-default-text: 175 175 175;
  --tag-gray-bg: 60 60 60;
  --tag-gray-text: 175 175 170;
  --tag-brown-bg: 74 54 44;
  --tag-brown-text: 201 159 137;
  --tag-orange-bg: 84 54 34;
  --tag-orange-text: 254 169 97;
  --tag-yellow-bg: 84 74 44;
  --tag-yellow-text: 244 196 117;
  --tag-green-bg: 44 64 54;
  --tag-green-text: 134 179 150;
  --tag-blue-bg: 44 64 84;
  --tag-blue-text: 122 174 215;
  --tag-purple-bg: 64 54 74;
  --tag-purple-text: 194 151 226;
  --tag-pink-bg: 74 44 64;
  --tag-pink-text: 229 134 186;
  --tag-red-bg: 84 44 44;
  --tag-red-text: 246 135 127;
}
```

---

## Task 5: Create tag color utilities

**Files:**
- Create: `apps/web/src/lib/tag-colors.ts`

**Step 1: Create the tag colors utility file**

```typescript
export const TAG_COLORS = [
  "default",
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const TAG_COLOR_LABELS: Record<TagColor, string> = {
  default: "Default",
  gray: "Gray",
  brown: "Brown",
  orange: "Orange",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  purple: "Purple",
  pink: "Pink",
  red: "Red",
};

export function getTagColorStyles(color: string): React.CSSProperties {
  const validColor = TAG_COLORS.includes(color as TagColor) ? color : "default";
  return {
    backgroundColor: `rgb(var(--tag-${validColor}-bg))`,
    color: `rgb(var(--tag-${validColor}-text))`,
    borderColor: `rgb(var(--tag-${validColor}-text) / 0.3)`,
  };
}

export function isValidTagColor(color: string): color is TagColor {
  return TAG_COLORS.includes(color as TagColor);
}

// Migration helper: convert old hex colors to new named colors
export function migrateHexToNamedColor(hexColor: string): TagColor {
  const hexMap: Record<string, TagColor> = {
    "#ef4444": "red",
    "#f97316": "orange",
    "#eab308": "yellow",
    "#22c55e": "green",
    "#14b8a6": "green",
    "#3b82f6": "blue",
    "#8b5cf6": "purple",
    "#a855f7": "purple",
    "#ec4899": "pink",
    "#6b7280": "gray",
  };
  return hexMap[hexColor.toLowerCase()] ?? "default";
}
```

---

## Task 6: Create Notion-style color picker component

**Files:**
- Create: `apps/web/src/components/ui/notion-color-picker.tsx`

**Step 1: Create the component**

```typescript
"use client";

import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { TAG_COLORS, TAG_COLOR_LABELS, type TagColor } from "@/lib/tag-colors";

interface NotionColorPickerProps {
  value: TagColor;
  onChange: (color: TagColor) => void;
}

export function NotionColorPicker({ value, onChange }: NotionColorPickerProps) {
  return (
    <div className="space-y-1">
      <p className="px-1 text-muted-foreground text-xs">Colors</p>
      <div className="space-y-0.5">
        {TAG_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
              value === color && "bg-accent"
            )}
          >
            <div
              className="h-4 w-4 rounded-sm"
              style={{
                backgroundColor: `rgb(var(--tag-${color}-bg))`,
                border: `1px solid rgb(var(--tag-${color}-text) / 0.3)`,
              }}
            />
            <span className="flex-1 text-left">{TAG_COLOR_LABELS[color]}</span>
            {value === color && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Task 7: Create emoji picker component using Frimousse

**Files:**
- Create: `apps/web/src/components/ui/emoji-picker.tsx`

**Step 1: Create the emoji picker component**

```typescript
"use client";

import { EmojiPicker as FrimousseEmojiPicker } from "frimousse";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smiley } from "@phosphor-icons/react";
import { useState } from "react";

interface EmojiPickerProps {
  value?: string;
  onChange: (emoji: string | undefined) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          {value ? (
            <span className="text-base">{value}</span>
          ) : (
            <Smiley className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="flex flex-col">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="border-b px-3 py-2 text-left text-sm hover:bg-accent"
            >
              Remove icon
            </button>
          )}
          <FrimousseEmojiPicker.Root
            onEmojiSelect={(emoji) => handleSelect(emoji.emoji)}
            className="h-[300px]"
          >
            <FrimousseEmojiPicker.Search
              className="mx-2 my-2 h-8 w-[calc(100%-16px)] rounded-md border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search emoji..."
            />
            <FrimousseEmojiPicker.Viewport className="px-2 pb-2">
              <FrimousseEmojiPicker.Loading className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Loading...
              </FrimousseEmojiPicker.Loading>
              <FrimousseEmojiPicker.Empty className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No emoji found.
              </FrimousseEmojiPicker.Empty>
              <FrimousseEmojiPicker.List
                className="select-none"
                components={{
                  CategoryHeader: ({ category }) => (
                    <div className="sticky top-0 bg-popover px-1 py-1.5 text-muted-foreground text-xs">
                      {category.label}
                    </div>
                  ),
                  Emoji: ({ emoji }) => (
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent"
                    >
                      {emoji.emoji}
                    </button>
                  ),
                }}
              />
            </FrimousseEmojiPicker.Viewport>
          </FrimousseEmojiPicker.Root>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## Task 8: Create horizontal tag filter bar component

**Files:**
- Create: `apps/web/src/features/feedback/components/tag-filter-bar.tsx`

**Step 1: Create the tag filter bar component**

```typescript
"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { getTagColorStyles, isValidTagColor } from "@/lib/tag-colors";

interface Tag {
  _id: string;
  name: string;
  color: string;
  icon?: string;
}

interface TagFilterBarProps {
  tags: Tag[];
  selectedTagId: string | null;
  onTagSelect: (tagId: string | null) => void;
}

export const TagFilterBar = memo(function TagFilterBar({
  tags,
  selectedTagId,
  onTagSelect,
}: TagFilterBarProps) {
  const isAllSelected = selectedTagId === null;

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
      {/* All button */}
      <button
        type="button"
        onClick={() => onTagSelect(null)}
        className={cn(
          "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
          isAllSelected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground hover:bg-accent"
        )}
      >
        All
      </button>

      {/* Tag buttons */}
      {tags.map((tag) => {
        const isSelected = selectedTagId === tag._id;
        const colorStyles = isValidTagColor(tag.color)
          ? getTagColorStyles(tag.color)
          : { backgroundColor: tag.color, color: "inherit" };

        return (
          <button
            key={tag._id}
            type="button"
            onClick={() => onTagSelect(isSelected ? null : tag._id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
              isSelected
                ? "ring-2 ring-ring ring-offset-2"
                : "hover:ring-1 hover:ring-ring/50"
            )}
            style={{
              ...colorStyles,
              borderColor: isSelected
                ? "transparent"
                : (colorStyles.borderColor ?? colorStyles.color),
            }}
          >
            {tag.icon && <span>{tag.icon}</span>}
            <span>{tag.name}</span>
          </button>
        );
      })}
    </div>
  );
});
```

---

## Task 9: Update feedback board to use tag filter bar

**Files:**
- Modify: `apps/web/src/features/feedback/components/feedback-board.tsx`
- Modify: `apps/web/src/features/feedback/hooks/use-board-filters.ts`

**Step 1: Update use-board-filters hook for single tag selection**

Add a new state variable for single tag selection mode:

```typescript
// In use-board-filters.ts, add:
const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

// Update the return to include:
return {
  // ... existing
  selectedTagId,
  setSelectedTagId,
};
```

**Step 2: Import and add TagFilterBar to feedback-board.tsx**

Add after the toolbar and before the content:

```tsx
import { TagFilterBar } from "./tag-filter-bar";

// Inside FeedbackBoardContent, add after the toolbar div and before content:
{/* Tag filter bar */}
{tags && tags.length > 0 && (
  <TagFilterBar
    tags={tags}
    selectedTagId={selectedTagId}
    onTagSelect={setSelectedTagId}
  />
)}
```

**Step 3: Update filteredFeedback to use single tag filter**

```typescript
const filteredFeedback = useMemo(() => {
  if (!feedback) return [];

  let result = (feedback as FeedbackItem[]).map((item) =>
    applyOptimisticVote(item, optimisticVotes.get(item._id))
  );

  // Single tag filtering (from tag filter bar)
  if (selectedTagId) {
    result = result.filter((item) =>
      item.tags?.some((tag) => tag && tag._id === selectedTagId)
    );
  }
  // Multi-tag filtering (from dropdown, only if no single tag selected)
  else if (selectedTagIds.length > 0) {
    result = result.filter((item) =>
      item.tags?.some((tag) => tag && selectedTagIds.includes(tag._id))
    );
  }

  return sortFeedback(result, sortBy);
}, [feedback, sortBy, optimisticVotes, selectedTagId, selectedTagIds]);
```

---

## Task 10: Update tag form dialog with new color picker and emoji picker

**Files:**
- Modify: `apps/web/src/features/tags/components/tag-form-dialog.tsx`

**Step 1: Replace color picker and add emoji picker**

```typescript
"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { type TagColor, isValidTagColor, migrateHexToNamedColor } from "@/lib/tag-colors";

interface TagFormDialogProps {
  organizationId: Id<"organizations">;
  editingTag: {
    _id: string;
    name: string;
    color: string;
    icon?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TagFormDialog({
  organizationId,
  editingTag,
  open,
  onOpenChange,
  onSuccess,
}: TagFormDialogProps) {
  const createTag = useMutation(api.tag_manager_actions.create);
  const updateTag = useMutation(api.tag_manager_actions.update);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    color: TagColor;
    icon?: string;
  }>({
    name: "",
    color: "blue",
    icon: undefined,
  });

  useEffect(() => {
    if (editingTag) {
      // Migrate old hex colors to new named colors
      const color = isValidTagColor(editingTag.color)
        ? editingTag.color
        : migrateHexToNamedColor(editingTag.color);
      setFormData({
        name: editingTag.name,
        color,
        icon: editingTag.icon,
      });
    } else {
      setFormData({
        name: "",
        color: "blue",
        icon: undefined,
      });
    }
  }, [editingTag]);

  const handleCreateTag = async () => {
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await createTag({
        organizationId,
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag) return;

    setIsSubmitting(true);
    try {
      await updateTag({
        id: editingTag._id as Id<"tags">,
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon,
      });
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  let buttonLabel = "Create";
  if (isSubmitting) {
    buttonLabel = "Saving...";
  } else if (editingTag) {
    buttonLabel = "Save";
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTag ? "Edit tag" : "Create tag"}</DialogTitle>
          <DialogDescription>
            {editingTag
              ? "Update the tag details."
              : "Create a new tag to categorize feedback."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-3">
            <EmojiPicker
              value={formData.icon}
              onChange={(icon) => setFormData({ ...formData, icon })}
            />
            <div className="flex-1">
              <Label htmlFor="name" className="sr-only">Name</Label>
              <Input
                id="name"
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Tag name..."
                value={formData.name}
              />
            </div>
          </div>
          <NotionColorPicker
            value={formData.color}
            onChange={(color) => setFormData({ ...formData, color })}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={editingTag ? handleUpdateTag : handleCreateTag}
          >
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Task 11: Update tag filter dropdown with emoji support

**Files:**
- Modify: `apps/web/src/features/tags/components/tag-filter-dropdown.tsx`

**Step 1: Update Tag interface and display**

Add `icon?: string` to the Tag interface and display emoji in tag items:

```typescript
interface Tag {
  _id: string;
  name: string;
  color: string;
  icon?: string; // Add this
}

// In CommandItem, update the tag display:
<span className="flex-1 truncate">
  {tag.icon && <span className="mr-1">{tag.icon}</span>}
  {tag.name}
</span>
```

---

## Task 12: Update tag mutations in tag_manager_actions

**Files:**
- Check/Modify: `packages/backend/convex/tag_manager_actions.ts` (if exists) or `packages/backend/convex/tags.ts`

**Step 1: Ensure create and update mutations accept icon parameter**

Verify the mutations accept `icon: v.optional(v.string())` and pass it through.

---

## Task 13: Run linting and fix any issues

**Step 1: Run ultracite fix**

Run: `cd /Users/damienschneider/Documents/GitHub/reflet-v2 && bun x ultracite fix`

**Step 2: Run ultracite check**

Run: `cd /Users/damienschneider/Documents/GitHub/reflet-v2 && bun x ultracite check`
Expected: No errors

---

## Task 14: Test the implementation

**Step 1: Start the dev server**

Run: `cd /Users/damienschneider/Documents/GitHub/reflet-v2 && bun run dev`

**Step 2: Manual testing checklist**

- [ ] Tag filter bar appears above feedback board (both feed and roadmap views)
- [ ] "All" button is selected by default
- [ ] Clicking a tag filters feedback to that tag only
- [ ] Clicking the same tag again deselects it (returns to "All")
- [ ] Tag form dialog shows emoji picker
- [ ] Tag form dialog shows Notion-style color picker with named colors
- [ ] Creating a tag with emoji and color works
- [ ] Editing a tag preserves emoji and color
- [ ] Tags display with emoji in filter bar
- [ ] Colors look correct in both light and dark mode

---

## Task 15: Commit the changes

**Step 1: Stage and commit**

```bash
git add -A
git commit -m "feat: add horizontal tag filter bar with emoji support

- Add icon field to tags schema for emoji storage
- Add Notion-style named colors with CSS variables
- Create tag color utilities with light/dark mode support
- Create NotionColorPicker component matching Notion's design
- Create EmojiPicker component using Frimousse
- Create TagFilterBar component with single-select behavior
- Update tag form dialog with new color picker and emoji picker
- Update feedback board to show tag filter bar above content

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
