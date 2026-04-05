# Reflet Design System

> **For AI agents:** This document defines how to build UI for Reflet. Use shadcn CSS variable classes and component variants — never hardcoded colors. When in doubt, check `components/ui/` for existing components before building anything custom.

---

## 1. Visual Theme & Atmosphere

Reflet's visual identity is **warm, tactile, and paper-like** — a calm workspace that feels analog despite being digital.

**Key Characteristics:**
- Warm cream/paper backgrounds with subtle yellow-brown undertones (oklch hue ~85)
- Olive-green brand accent that feels natural and grounded
- Serif display headings (Instrument Serif) paired with clean sans-serif body (Inter)
- Low-contrast surfaces with crisp text — readable without being harsh
- Rounded corners (`--radius: 0.625rem`) for a soft, approachable feel
- Dark mode uses warm earthy tones, not cool grays

**Design Density:**
- Compact but not cramped — default button height is `h-8` (32px), inputs match
- Generous whitespace between sections, tight spacing within groups
- Cards use `py-4 px-4` padding, small variant drops to `py-3 px-3`

---

## 2. Color Palette & Semantic Tokens

**Never use raw hex/rgb/oklch values in components.** Always use Tailwind classes mapped to shadcn CSS variables.

### Core Semantic Tokens

| Token | Tailwind Class | Role |
|-------|---------------|------|
| `background` | `bg-background` | Page background — warm cream (light), warm dark brown (dark) |
| `foreground` | `text-foreground` | Primary text — near-black (light), near-white (dark) |
| `card` | `bg-card` | Card/surface — slightly lighter than background |
| `card-foreground` | `text-card-foreground` | Text on cards |
| `primary` | `bg-primary`, `text-primary` | Brand olive — buttons, links, active states |
| `primary-foreground` | `text-primary-foreground` | Text on primary surfaces |
| `secondary` | `bg-secondary` | Neutral elevated surface |
| `secondary-foreground` | `text-secondary-foreground` | Text on secondary surfaces |
| `muted` | `bg-muted` | Subtle backgrounds — disabled, hover states |
| `muted-foreground` | `text-muted-foreground` | Secondary text, placeholders, captions |
| `accent` | `bg-accent` | Highlighted/hovered surfaces |
| `accent-foreground` | `text-accent-foreground` | Text on accent surfaces |
| `destructive` | `bg-destructive`, `text-destructive` | Errors, danger actions |
| `destructive-foreground` | `text-destructive-foreground` | Text on destructive surfaces |
| `border` | `border-border` | Default borders |
| `input` | `border-input` | Input field borders |
| `ring` | `ring-ring` | Focus ring color |

### Brand Colors

| Token | Tailwind Class | Role |
|-------|---------------|------|
| `brand` | `bg-brand`, `text-brand` | Alias for `olive-600` — primary brand color |
| `brand-foreground` | `text-brand-foreground` | Text on brand surfaces (`olive-100`) |

### Chart Colors

Use `chart-1` through `chart-5` for data visualization. These map to the olive palette and adapt between light/dark modes automatically.

| Token | Tailwind Class |
|-------|---------------|
| `chart-1` | `fill-chart-1`, `stroke-chart-1` |
| `chart-2` | `fill-chart-2`, `stroke-chart-2` |
| `chart-3` | `fill-chart-3`, `stroke-chart-3` |
| `chart-4` | `fill-chart-4`, `stroke-chart-4` |
| `chart-5` | `fill-chart-5`, `stroke-chart-5` |

### Sidebar Tokens

The sidebar has its own semantic tokens for independent theming:

`sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border`, `sidebar-ring`

### Tag Colors (Notion-style)

Tag colors are the **one exception** where hardcoded values exist — they live inside `Badge` and `Button` (pill variant) component internals. Agents should **never copy these hex values**. Instead, use the `color` prop:

```tsx
<Badge color="blue">Label</Badge>
<Button variant="pill" color="green" active>Active</Button>
```

Available colors: `default`, `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red`

---

## 3. Typography

### Font Families

| Token | Tailwind Class | Font | Usage |
|-------|---------------|------|-------|
| `--font-sans` | `font-sans` | Inter | Body text, UI elements, labels |
| `--font-display` | `font-display` | Instrument Serif | Headings (H1, H2, H3) |
| `--font-mono` | `font-mono` | System monospace stack | Code, technical content |

### Heading Components & Variants

Use the typed `H1`, `H2`, `H3` components from `@/components/ui/typography` — not raw `<h1>` tags with manual classes.

**H1 Variants:**

| Variant | Usage | Size |
|---------|-------|------|
| `default` | Standard page titles | `text-5xl` |
| `hero` | Landing hero headlines | `text-4xl` → `text-7xl` responsive |
| `page` | Dashboard page headers | `text-4xl` → `text-5xl` responsive |
| `landing` | Landing section titles | `clamp(2.5rem, 6vw, 5rem)` fluid |

**H2 Variants:**

| Variant | Usage | Size |
|---------|-------|------|
| `default` | Section headings | `text-3xl` |
| `section` | Large section headers | `text-4xl` → `text-5xl` responsive |
| `card` | Card titles | `text-xl font-medium` |
| `landing` | Landing subsections | `clamp(1.8rem, 4vw, 3rem)` fluid |

**H3 Variants:**

| Variant | Usage | Size |
|---------|-------|------|
| `default` | Subsection headings | `text-2xl` |
| `card` | Card subtitles | `text-xl font-medium` |
| `cardBold` | Emphasized card titles | `text-xl font-semibold` |
| `section` | Small section labels | `text-base font-medium` (uses `font-sans`) |
| `landing` | Landing feature titles | `clamp(1.4rem, 3vw, 2rem)` fluid |

### Text Components & Variants

Use the `Text` component for body copy. Available variants:

| Variant | Usage | Classes |
|---------|-------|---------|
| `body` | Default body text | `text-base leading-relaxed` |
| `bodyLarge` | Emphasized paragraphs | `text-lg leading-relaxed` |
| `bodySmall` | Compact body text | `text-sm leading-relaxed` |
| `caption` | Timestamps, metadata | `text-xs text-muted-foreground` |
| `label` | Form labels, small headers | `text-sm font-medium` |
| `labelBold` | Emphasized labels | `text-sm font-semibold` |
| `overline` | Section category labels | `text-xs uppercase tracking-wider text-muted-foreground` |
| `eyebrow` | Landing page kickers | `text-[11px] uppercase tracking-[0.15em] text-olive-600` |
| `link` | Inline text links | `text-olive-600 underline` |

**Additional text components:** `Lead` (intro paragraphs), `Muted` (secondary text), `Large` (emphasized), `Small` (fine print), `InlineCode`, `Blockquote`.

---

## 4. Component Variants

Always use existing component variants — never override with arbitrary classes. Import from `@/components/ui/`.

### Button

```tsx
import { Button } from "@/components/ui/button";
```

**Variants:**

| Variant | Usage | Look |
|---------|-------|------|
| `default` | Primary CTAs | Solid olive background |
| `outline` | Secondary actions | Border with transparent background |
| `secondary` | Soft emphasis | Light olive background |
| `ghost` | Tertiary, toolbar actions | No background until hover |
| `destructive` | Delete, danger actions | Red tinted background |
| `link` | Inline text actions | Olive text with underline on hover |
| `pill` | Filter chips, tags | Rounded full — use with `color` and `active` props |

**Sizes:** `default` (h-8), `xs` (h-6), `sm` (h-7), `lg` (h-9), `icon` (32x32), `icon-xs` (24x24), `icon-sm` (28x28), `icon-lg` (36x36), `pill` (h-7 rounded-full)

### Badge

```tsx
import { Badge } from "@/components/ui/badge";
```

**Variants:** `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`
**Color variants:** `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `red` — or use the `color` prop with a `TagColor` value.

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
```

**Sizes:** `default` (py-4 px-4), `sm` (py-3 px-3)

Cards use `bg-card` with a subtle `ring-foreground/10` border — no heavy box shadows.

### Alert

**Variants:** `default` (card background), `destructive` (red text on card)

### Toggle

**Variants:** `default` (transparent), `outline` (bordered)
**Sizes:** `default` (h-8), `sm` (h-7), `lg` (h-9)

### Input

Single variant — `h-8`, rounded-lg, `border-input` border, focus shows `border-ring` with `ring-ring/50` glow. Matches button height for alignment.

---

## 5. Layout Principles

### Spacing Scale

Use Tailwind's default spacing scale. Common patterns in Reflet:

| Context | Spacing |
|---------|---------|
| Card padding | `p-4` (default), `p-3` (small) |
| Section gaps | `gap-6` to `gap-8` |
| Card grid gaps | `gap-4` |
| Inline element gaps | `gap-1` to `gap-2` |
| Button icon gaps | `gap-1.5` (default), `gap-1` (small) |
| Page container | `max-w-3xl mx-auto px-4 pt-12 pb-8` (admin pages) |

### Grid & Layout Patterns

- Use CSS Grid or Flexbox — no fixed-width layouts
- `min-w-0` on flex children that contain truncatable text
- `text-balance` on headings, `text-pretty` on body text
- Container queries (`@container`) for card-level responsive layouts

### ScrollArea Pattern

Padding goes on the viewport, not the container:

```tsx
<ScrollArea classNameViewport="p-4">...</ScrollArea>
```

---

## 6. Depth & Elevation

Reflet uses a **flat design with subtle borders** rather than shadows for depth.

| Level | Treatment | Usage |
|-------|-----------|-------|
| Flat | No border, no shadow | Page background |
| Surface | `ring-1 ring-foreground/10` | Cards (the default `Card` style) |
| Bordered | `border border-border` | Inputs, outlined buttons |
| Elevated | `shadow-sm` to `shadow-md` | Popovers, dropdowns, dialogs |
| Footer | `bg-muted/50 border-t` | Card footers, section dividers |

**Dark mode depth:** Surfaces differentiate via oklch lightness steps (0.18 → 0.21 → 0.24 → 0.26), not shadows.

---

## 7. Responsive Behavior

### Breakpoints

Standard Tailwind breakpoints apply:

| Name | Width | Usage |
|------|-------|-------|
| Default | < 640px | Mobile — single column, stacked layouts |
| `sm` | >= 640px | Small tablets — 2-column grids begin |
| `md` | >= 768px | Tablets — sidebar appears, text size adjusts |
| `lg` | >= 1024px | Desktop — full layout |
| `xl` | >= 1280px | Wide desktop |

### Responsive Patterns

- Typography uses `clamp()` or responsive prefixes (`sm:text-6xl`) — never fixed sizes on headings
- Buttons maintain `h-8` across breakpoints — don't enlarge on mobile
- Touch targets: minimum 44x44px tap area on mobile (use padding, not just icon size)
- Input text: `text-base` on mobile (prevents iOS zoom), `md:text-sm` on desktop

---

## 8. Accessibility & States

### Focus States

All interactive elements use a consistent focus pattern:
- `focus-visible:border-ring` — border color change
- `focus-visible:ring-[3px] focus-visible:ring-ring/50` — soft 3px glow ring

### Disabled States

- `disabled:pointer-events-none disabled:opacity-50` on buttons/inputs
- `disabled:bg-input/50 dark:disabled:bg-input/80` on inputs specifically

### Aria Invalid States

Form elements show validation errors via:
- `aria-invalid:border-destructive` — red border
- `aria-invalid:ring-[3px] aria-invalid:ring-destructive/20` — red glow

### Aria Expanded States

Trigger buttons show their active state:
- `aria-expanded:bg-muted aria-expanded:text-foreground` (ghost/outline variants)

### View Transitions

The app uses the View Transitions API for page navigation:
- Root transitions: 200ms fade
- Board views: 250ms slide with cubic-bezier easing
- Feedback cards: named view transitions via CSS custom properties

---

## 9. Do's and Don'ts

### Do

- Use semantic token classes (`bg-primary`, `text-muted-foreground`, `border-border`)
- Use component variants (`variant="outline"`, `size="sm"`) for styling
- Use `cn()` from `@/lib/utils` for conditional class composition
- Use `font-display` class for headings, default `font-sans` for body
- Use `transition-colors` or `transition-shadow` — list specific properties
- Check `components/ui/` for existing components before creating custom ones
- Handle all data states: loading + error + empty + success

### Don't

- Don't use hardcoded colors (`#fff`, `rgb(...)`, `hsl(...)`, `oklch(...)`)
- Don't use inline `style={{}}` — Tailwind only
- Don't use `transition-all` — always list specific transition properties
- Don't use CSS modules, styled-components, Emotion, or SCSS
- Don't use `overflow-hidden` as a layout band-aid — fix the responsive layout
- Don't create one-off components — extract to `components/ui/` if it'll be reused
- Don't override `components/ui/` internals — those are shadcn primitives, leave as-is
- Don't use `className` template literals — use `cn()` instead
