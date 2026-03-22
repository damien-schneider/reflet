/**
 * Configuration options for the changelog widget
 */
export interface ChangelogWidgetConfig {
  /** Whether to auto-open when new entries are available */
  autoOpenForNew?: boolean;
  /** Widget locale */
  locale?: string;
  /** Maximum number of entries to display */
  maxEntries?: number;
  /** Display mode: card (floating notification), popup (modal overlay), trigger (dropdown attached to element) */
  mode?: "card" | "popup" | "trigger";
  onClose?: () => void;
  onEntryClick?: (entry: ChangelogEntry) => void;
  /** Callbacks */
  onOpen?: () => void;
  /** Position for card/popup mode */
  position?: "bottom-right" | "bottom-left";
  /** Primary brand color */
  primaryColor?: string;
  /** Board's public API key */
  publicKey: string;
  /** Color theme */
  theme?: "light" | "dark" | "auto";
  /** CSS selector for trigger elements (trigger mode) */
  triggerSelector?: string;
}

/**
 * Internal widget state
 */
export interface ChangelogWidgetState {
  entries: ChangelogEntry[];
  error: string | null;
  isLoading: boolean;
  isOpen: boolean;
  unreadCount: number;
}

/**
 * A single changelog entry from the API
 */
export interface ChangelogEntry {
  description?: string;
  feedback: { id: string; title: string }[];
  id: string;
  publishedAt?: number;
  title: string;
  version?: string;
}
