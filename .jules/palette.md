## 2024-05-22 - Interactive Components in List Items
**Learning:** Interactive components (like vote buttons) nested within clickable list items often lack `e.stopPropagation()`, causing unintended navigation when trying to interact with the child component. Also, `button` within `button` nesting was observed.
**Action:** Always ensure nested interactive elements stop event propagation. Prefer using `div` with `role="button"` for outer clickable containers if they must contain other buttons, or restructure to avoid nesting. Ensure icon-only buttons always have `aria-label`.
