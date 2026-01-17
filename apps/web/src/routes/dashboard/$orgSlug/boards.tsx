import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/$orgSlug/boards")({
  component: BoardsLayout,
});

/**
 * Layout component for the boards section.
 * This renders an Outlet to display either:
 * - The boards list (boards/index.tsx) at /dashboard/$orgSlug/boards
 * - A specific board detail (boards/$boardSlug/index.tsx) at /dashboard/$orgSlug/boards/$boardSlug
 */
function BoardsLayout() {
  return <Outlet />;
}
