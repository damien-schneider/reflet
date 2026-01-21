## 2024-05-22 - Nested Interactive Elements & Tooltips
**Learning:** Shadcn UI `TooltipTrigger` wraps children in a button by default, causing invalid HTML (button inside button) when used with custom Button components. This also breaks accessibility and event propagation.
**Action:** Always use `asChild` on `TooltipTrigger` when wrapping a custom interactive component, and ensure the child component forwards refs. Also apply `e.stopPropagation()` on the child's click handler if nested in a clickable card.
