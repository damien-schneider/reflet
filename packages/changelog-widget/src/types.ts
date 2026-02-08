/**
 * Configuration options for the changelog widget
 */
export interface ChangelogWidgetConfig {
  /** Board's public API key */
  publicKey: string;
  /** Display mode: card (floating notification), popup (modal overlay), trigger (dropdown attached to element) */
  mode?: "card" | "popup" | "trigger";
  /** Position for card/popup mode */
  position?: "bottom-right" | "bottom-left";
  /** Color theme */
  theme?: "light" | "dark" | "auto";
  /** Primary brand color */
  primaryColor?: string;
  /** Maximum number of entries to display */
  maxEntries?: number;
  /** CSS selector for trigger elements (trigger mode) */
  triggerSelector?: string;
  /** Whether to auto-open when new entries are available */
  autoOpenForNew?: boolean;
  /** Widget locale */
  locale?: string;
  /** Callbacks */
  onOpen?: () => void;
  onClose?: () => void;
  onEntryClick?: (entry: ChangelogEntry) => void;
}

/**
 * Internal widget state
 */
export interface ChangelogWidgetState {
  isOpen: boolean;
  isLoading: boolean;
  entries: ChangelogEntry[];
  unreadCount: number;
  error: string | null;
}

/**
 * A single changelog entry from the API
 */
export interface ChangelogEntry {
  id: string;
  title: string;
  description?: string;
  version?: string;
  publishedAt?: number;
  feedback: { id: string; title: string }[];
}
