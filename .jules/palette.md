## 2026-01-20 - Convex Mutation Loading States
**Learning:** Convex `useMutation` hook does not provide a built-in `isLoading` or `isPending` state. Interactive elements triggering mutations need manual local state management to provide immediate visual feedback (loading spinners, disabled states).
**Action:** Always wrap `useMutation` calls with a local `useState` (e.g., `isSubmitting`) or `useTransition` to manage UI feedback during async operations, ensuring buttons are disabled and show loading indicators.
