export interface WidgetConfig {
  widgetId: string;
  organizationName: string;
  primaryColor: string;
  position: "bottom-right" | "bottom-left";
  welcomeMessage: string;
  greetingMessage?: string;
  showLauncher: boolean;
  autoOpen: boolean;
  zIndex: number;
}

export interface WidgetMessage {
  id: string;
  body: string;
  senderType: "user" | "admin";
  isOwnMessage: boolean;
  createdAt: number;
}

export interface WidgetState {
  isOpen: boolean;
  isLoading: boolean;
  config: WidgetConfig | null;
  conversationId: string | null;
  visitorId: string | null;
  messages: WidgetMessage[];
  unreadCount: number;
}

export interface ConvexClientConfig {
  url: string;
}
