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
  draft: string;
  hasConversation: boolean;
  isLoading: boolean;
  isOpen: boolean;
  messages: WidgetMessage[];
  sendFailed: boolean;
  unreadCount: number;
  visitorId: string;
}
