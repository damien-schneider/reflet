const VISITOR_ID_LENGTH = 12;
const VISITOR_ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateVisitorId(): string {
  let result = "v_";
  for (let i = 0; i < VISITOR_ID_LENGTH; i++) {
    result +=
      VISITOR_ID_CHARS[Math.floor(Math.random() * VISITOR_ID_CHARS.length)];
  }
  return result;
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
