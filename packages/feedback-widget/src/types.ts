/**
 * Widget configuration options
 */
export interface WidgetConfig {
  /** Board's public API key */
  publicKey: string;
  /** Widget display mode */
  mode?: "floating" | "inline" | "portal";
  /** Position for floating widget */
  position?: "bottom-right" | "bottom-left";
  /** Color theme */
  theme?: "light" | "dark" | "auto";
  /** Primary brand color */
  primaryColor?: string;
  /** Widget locale */
  locale?: string;
  /** URL to redirect unauthenticated users for login */
  loginUrl?: string;
  /** Target element ID for inline/portal mode */
  targetId?: string;
  /** Feature toggles */
  features?: {
    voting?: boolean;
    comments?: boolean;
    roadmap?: boolean;
    changelog?: boolean;
    createFeedback?: boolean;
  };
  /** User identification */
  user?: {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
  /** Pre-signed user token (alternative to user object) */
  userToken?: string;
  /** Callbacks */
  onFeedbackCreated?: (feedback: { id: string; title: string }) => void;
  onVote?: (feedbackId: string, voted: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Internal widget state
 */
export interface WidgetState {
  isOpen: boolean;
  isLoading: boolean;
  view: "list" | "detail" | "create" | "roadmap" | "changelog";
  boardConfig: BoardConfig | null;
  feedbackItems: FeedbackItem[];
  selectedFeedback: FeedbackItem | null;
  selectedFeedbackComments: Comment[];
  error: string | null;
}

/**
 * Board configuration from API
 */
export interface BoardConfig {
  id: string;
  name: string;
  slug: string;
  description?: string;
  organization: {
    id: string;
    name: string;
    logo?: string;
    primaryColor?: string;
  };
  statuses: Array<{
    id: string;
    name: string;
    color: string;
    order: number;
  }>;
}

/**
 * Feedback item from API
 */
export interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  commentCount: number;
  isPinned: boolean;
  hasVoted: boolean;
  createdAt: number;
  tags: Array<{ id: string; name: string; color: string }>;
  boardStatus: { id: string; name: string; color: string } | null;
  author: { name?: string; avatar?: string } | null;
}

/**
 * Comment from API
 */
export interface Comment {
  id: string;
  body: string;
  isOfficial: boolean;
  author: { name?: string; avatar?: string } | null;
  replies: Array<{
    id: string;
    body: string;
    author: { name?: string; avatar?: string } | null;
    createdAt: number;
  }>;
  createdAt: number;
}
