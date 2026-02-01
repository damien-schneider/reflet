## 2025-02-27 - Nested Interactions & Tooltips
**Learning:** Interactive elements like Vote Buttons often reside within clickable cards or list items. Without explicit `stopPropagation` and `preventDefault`, clicking the action triggers the parent's navigation, frustrating users. Also, "obvious" actions like upvoting benefit from tooltips for all users, not just unauthenticated ones, to clarify intent (e.g., "Remove vote").
**Action:** Always verify event propagation for action buttons in lists/cards and ensure tooltips cover all user states (auth/unauth, active/inactive).

## 2025-03-03 - Form Semantics & Keyboard Submission
**Learning:** Complex dialogs with multiple inputs (even rich text editors) should be wrapped in a `<form>` tag with `onSubmit` handling. This enables standard behavior like "Enter to submit" (especially in simple inputs) and proper accessibility exposure. Custom inputs (like Tiptap) may need manual wiring (`onEnter` prop) to trigger the form submission effectively.
**Action:** Wrap dialog content in `<form>` and wire up custom editors to trigger `onSubmit` on Enter where appropriate (e.g., titles).
