import type { WidgetConfig, WidgetMessage } from "./types";

declare const __CONVEX_URL__: string;

const CONVEX_URL =
  typeof __CONVEX_URL__ !== "undefined"
    ? __CONVEX_URL__
    : "https://grateful-butterfly-1.convex.cloud";

async function convexQuery<T>(
  fnName: string,
  args: Record<string, unknown>
): Promise<T | null> {
  const url = `${CONVEX_URL}/api/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: fnName,
      args,
      format: "json",
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("status" in data) ||
    !("value" in data)
  ) {
    return null;
  }
  if (data.status === "error") {
    return null;
  }

  return (data.value as T) ?? null;
}

async function convexMutation<T>(
  fnName: string,
  args: Record<string, unknown>
): Promise<T | null> {
  const url = `${CONVEX_URL}/api/mutation`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: fnName,
      args,
      format: "json",
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("status" in data) ||
    !("value" in data)
  ) {
    return null;
  }
  if (data.status === "error") {
    return null;
  }

  return (data.value as T) ?? null;
}

export function fetchWidgetConfig(
  widgetId: string
): Promise<WidgetConfig | null> {
  return convexQuery<WidgetConfig>("widget_public:getConfig", { widgetId });
}

export function getOrCreateConversation(
  widgetId: string,
  visitorId: string,
  metadata?: { userAgent?: string; url?: string; referrer?: string }
): Promise<{
  conversationId: string;
  visitorId: string;
  isNew: boolean;
} | null> {
  return convexMutation("widget_public:getOrCreateConversation", {
    widgetId,
    visitorId,
    metadata,
  });
}

export function sendMessage(
  widgetId: string,
  visitorId: string,
  conversationId: string,
  body: string
): Promise<{ messageId: string } | null> {
  return convexMutation("widget_public:sendMessage", {
    widgetId,
    visitorId,
    conversationId,
    body,
  });
}

export async function fetchMessages(
  widgetId: string,
  visitorId: string,
  conversationId: string
): Promise<WidgetMessage[]> {
  const result = await convexQuery<WidgetMessage[]>(
    "widget_public:listMessages",
    {
      widgetId,
      visitorId,
      conversationId,
    }
  );
  return result ?? [];
}

export async function markMessagesAsRead(
  widgetId: string,
  visitorId: string,
  conversationId: string
): Promise<boolean> {
  const result = await convexMutation<boolean>(
    "widget_public:markMessagesAsRead",
    {
      widgetId,
      visitorId,
      conversationId,
    }
  );
  return result ?? false;
}

export async function fetchUnreadCount(
  widgetId: string,
  visitorId: string,
  conversationId: string
): Promise<number> {
  const result = await convexQuery<number>("widget_public:getUnreadCount", {
    widgetId,
    visitorId,
    conversationId,
  });
  return result ?? 0;
}
