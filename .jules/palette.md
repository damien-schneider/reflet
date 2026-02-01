## 2025-02-27 - Nested Interactions & Tooltips
**Learning:** Interactive elements like Vote Buttons often reside within clickable cards or list items. Without explicit `stopPropagation` and `preventDefault`, clicking the action triggers the parent's navigation, frustrating users. Also, "obvious" actions like upvoting benefit from tooltips for all users, not just unauthenticated ones, to clarify intent (e.g., "Remove vote").
**Action:** Always verify event propagation for action buttons in lists/cards and ensure tooltips cover all user states (auth/unauth, active/inactive).

## 2025-02-27 - Loading States & Feedback
**Learning:** Convex useMutation hooks lack built-in loading states. Interactive elements must implement manual local state (e.g., useState) and visual feedback (Spinner) to prevent user uncertainty.
**Action:** Always check if a loading state is visually handled when adding mutations and add a Spinner if missing.
