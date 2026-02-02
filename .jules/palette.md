## 2025-02-27 - Nested Interactions & Tooltips
**Learning:** Interactive elements like Vote Buttons often reside within clickable cards or list items. Without explicit `stopPropagation` and `preventDefault`, clicking the action triggers the parent's navigation, frustrating users. Also, "obvious" actions like upvoting benefit from tooltips for all users, not just unauthenticated ones, to clarify intent (e.g., "Remove vote").
**Action:** Always verify event propagation for action buttons in lists/cards and ensure tooltips cover all user states (auth/unauth, active/inactive).

## 2025-02-27 - Accessible Tooltip Triggers
**Learning:** `TooltipTrigger` components often render a `<button>` element by default. Nesting a custom `<Button>` component inside it creates invalid HTML (nested buttons) and can lead to accessibility issues or layout bugs.
**Action:** Instead of nesting, apply button styles directly to the `TooltipTrigger` using utility classes (e.g., `buttonVariants`) and pass standard button props (like `onClick` and `aria-label`) directly to the trigger.
