# Bolt's Journal - Critical Learnings

## 2024-05-22 - Stabilizing Callbacks for Memoization
**Learning:** `React.memo` is ineffective if props are unstable. A common anti-pattern is passing inline arrow functions like `onDragStart={(e) => onDragStart(e, item)}`.
**Action:** Move the item-specific logic *inside* the child component or use a data attribute, allowing the parent to pass a stable function reference. In `RoadmapItemCard`, we updated the signature to accept `(e, item)` but let the child handle the binding, allowing `RoadmapLaneColumn` to pass `onDragStart` directly.
