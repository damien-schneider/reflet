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

export interface WidgetAttachment {
  filename: string;
  url: string | null;
}

export interface WidgetMessage {
  attachments: WidgetAttachment[];
  body: string;
  createdAt: number;
  id: string;
  isOwnMessage: boolean;
  senderType: "user" | "admin";
}

export type EmailPrompt =
  | "awaitingFirstMessage"
  | "form"
  | "saving"
  | "failed"
  | "confirmationSent"
  | "subscribed"
  | "emailOnFile";

export interface WidgetState {
  config: WidgetConfig | null;
  draft: string;
  emailDraft: string;
  emailPrompt: EmailPrompt;
  hasConversation: boolean;
  isLoading: boolean;
  isOpen: boolean;
  messages: WidgetMessage[];
  sendFailed: boolean;
  unreadCount: number;
  visitorId: string;
}
