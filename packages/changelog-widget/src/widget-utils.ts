const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_IN_WEEK = 7;
const DAYS_IN_MONTH = 30;

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / MILLISECONDS_PER_DAY);

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < DAYS_IN_WEEK) {
    return `${diffDays} days ago`;
  }
  if (diffDays < DAYS_IN_MONTH) {
    const weeks = Math.floor(diffDays / DAYS_IN_WEEK);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
