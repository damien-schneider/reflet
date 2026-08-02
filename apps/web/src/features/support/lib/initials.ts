const INITIALS_SPLIT_PATTERN = /[\s@]/;

export function getInitials(name?: string, email?: string): string {
  const source = name || email || "?";
  return source
    .split(INITIALS_SPLIT_PATTERN)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
