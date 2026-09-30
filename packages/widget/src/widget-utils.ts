const VISITOR_ID_BYTES = 16;

export function generateVisitorId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(VISITOR_ID_BYTES));
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return `v_${hex}`;
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const HTML_SPECIAL_CHARS = /[&<>"']/g;
const HTML_ENTITIES: Record<string, string> = {
  "'": "&#39;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

export function escapeHtml(text: string): string {
  return text.replace(
    HTML_SPECIAL_CHARS,
    (char) => HTML_ENTITIES[char] ?? char
  );
}
