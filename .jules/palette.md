## 2026-01-27 - Semantic Forms for Dialogs
**Learning:** Wrapping dialog inputs in a `<form>` element is a critical low-hanging fruit for accessibility. It enables the "Enter" key to submit the form naturally and allows for native browser validation (like `required`), which is often missed in "controlled input" React patterns.
**Action:** Always wrap input groups in a semantic `<form>` tag, even inside modals/dialogs, and handle `onSubmit` to prevent default page reload.
