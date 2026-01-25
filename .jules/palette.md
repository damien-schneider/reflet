## 2024-05-23 - Form Submission & Accessibility
**Learning:** Users expect "Enter" key to submit forms, especially in dialogs. Missing `form` tags breaks this expectation and accessibility tools. Also, explicit loading states (spinners) reduce uncertainty.
**Action:** Always wrap input groups in `<form>` tags, even in dialogs/modals. Ensure `onSubmit` prevents default and handles logic. Use `autoFocus` on the primary input.
