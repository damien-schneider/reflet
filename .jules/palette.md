# Palette's Journal

## 2025-02-18 - [Initial Setup]
**Learning:** Initialized Palette's journal.
**Action:** Log critical UX/accessibility learnings here.

## 2025-02-18 - [Playwright vs Browser Validation]
**Learning:** Browser native validation (HTML5) intercepts Playwright `click()` actions on submit buttons, preventing React Hook Form's `onSubmit` or `onError` handlers from running if fields are invalid according to HTML attributes (like `type="email"`).
**Action:** When verifying custom validation messages with Playwright, ensure inputs satisfy HTML validation first, or use `noValidate` on the form during testing if targetting Zod-specific validation.
