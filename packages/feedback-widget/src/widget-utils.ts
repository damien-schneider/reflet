const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_IN_WEEK = 7;

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

  return date.toLocaleDateString();
}

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

const TOKEN_EXPIRY_SECONDS = 86_400;

export function generateSimpleToken(user: {
  id: string;
  email?: string;
  name?: string;
}): string {
  const payload = {
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
    iat: Math.floor(Date.now() / 1000),
    id: user.id,
    name: user.name,
  };
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payloadB64 = btoa(JSON.stringify(payload));
  return `${header}.${payloadB64}.`;
}
