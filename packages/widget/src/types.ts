export interface WidgetConfig {
  autoOpen: boolean;
  greetingMessage?: string;
  hideBranding?: boolean;
  organizationName: string;
  position: "bottom-right" | "bottom-left";
  primaryColor: string;
  showLauncher: boolean;
  welcomeMessage: string;
  widgetId: string;
  zIndex: number;
}

export interface WidgetMessage {
  body: string;
  createdAt: number;
  id: string;
  isOwnMessage: boolean;
  senderType: "user" | "admin";
}

export interface WidgetState {
  config: WidgetConfig | null;
  conversationId: string | null;
  isLoading: boolean;
  isOpen: boolean;
  messages: WidgetMessage[];
  unreadCount: number;
  visitorId: string | null;
}

export interface ConvexClientConfig {
  url: string;
}
