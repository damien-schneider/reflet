import type { WidgetConfig, WidgetMessage } from "./types";

declare const __CONVEX_URL__: string;

async function callConvex<T>(
  kind: "query" | "mutation",
  path: string,
  args: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`${__CONVEX_URL__}/api/${kind}`, {
    body: JSON.stringify({ args, format: "json", path }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const data: unknown = await response.json().catch(() => null);
  if (typeof data !== "object" || data === null || !("status" in data)) {
    throw new Error(response.statusText || "Unexpected response");
  }
  if (data.status !== "success" || !("value" in data)) {
    const message =
      "errorMessage" in data && typeof data.errorMessage === "string"
        ? data.errorMessage
        : response.statusText;
    throw new Error(message);
  }
  return data.value as T;
}

interface VisitorArgs {
  visitorId: string;
  widgetId: string;
}

export function fetchWidgetConfig(
  widgetId: string
): Promise<WidgetConfig | null> {
  return callConvex("query", "widget/public:getConfig", { widgetId });
}

export function fetchConversation(
  visitor: VisitorArgs
): Promise<{ conversationId: string; guestEmail?: string } | null> {
  return callConvex("query", "widget/public:getConversation", { ...visitor });
}

export function sendMessage(
  visitor: VisitorArgs,
  body: string,
  metadata: { referrer?: string; url?: string; userAgent?: string }
): Promise<{ conversationId: string; messageId: string }> {
  return callConvex("mutation", "widget/public:sendMessage", {
    ...visitor,
    body,
    metadata,
  });
}

export function fetchMessages(visitor: VisitorArgs): Promise<WidgetMessage[]> {
  return callConvex("query", "widget/public:listMessages", { ...visitor });
}

export function markMessagesAsRead(visitor: VisitorArgs): Promise<boolean> {
  return callConvex("mutation", "widget/public:markMessagesAsRead", {
    ...visitor,
  });
}

export function setEmail(
  visitor: VisitorArgs,
  email: string
): Promise<{ confirmationRequired: boolean }> {
  return callConvex("mutation", "widget/public:setEmail", {
    ...visitor,
    email,
  });
}

export function fetchUnreadCount(visitor: VisitorArgs): Promise<number> {
  return callConvex("query", "widget/public:getUnreadCount", { ...visitor });
}
