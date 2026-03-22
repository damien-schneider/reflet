/**
 * Widget configuration options
 */
export interface WidgetConfig {
  /** Feature toggles */
  features?: {
    voting?: boolean;
    comments?: boolean;
    roadmap?: boolean;
    changelog?: boolean;
    createFeedback?: boolean;
  };
  /** Widget locale */
  locale?: string;
  /** URL to redirect unauthenticated users for login */
  loginUrl?: string;
  /** Widget display mode */
  mode?: "floating" | "inline" | "portal";
  onClose?: () => void;
  /** Callbacks */
  onFeedbackCreated?: (feedback: { id: string; title: string }) => void;
  onOpen?: () => void;
  onVote?: (feedbackId: string, voted: boolean) => void;
  /** Position for floating widget */
  position?: "bottom-right" | "bottom-left";
  /** Primary brand color */
  primaryColor?: string;
  /** Board's public API key */
  publicKey: string;
  /** Target element ID for inline/portal mode */
  targetId?: string;
  /** Color theme */
  theme?: "light" | "dark" | "auto";
  /** User identification */
  user?: {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
  /** Pre-signed user token (alternative to user object) */
  userToken?: string;
}

/**
 * Internal widget state
 */
export interface WidgetState {
  boardConfig: BoardConfig | null;
  error: string | null;
  feedbackItems: FeedbackItem[];
  isLoading: boolean;
  isOpen: boolean;
  selectedFeedback: FeedbackItem | null;
  selectedFeedbackComments: Comment[];
  view: "list" | "detail" | "create" | "roadmap" | "changelog";
}

/**
 * Board configuration from API
 */
export interface BoardConfig {
  description?: string;
  id: string;
  name: string;
  organization: {
    id: string;
    name: string;
    logo?: string;
    primaryColor?: string;
  };
  slug: string;
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
  author: { name?: string; avatar?: string } | null;
  boardStatus: { id: string; name: string; color: string } | null;
  commentCount: number;
  createdAt: number;
  description: string;
  hasVoted: boolean;
  id: string;
  isPinned: boolean;
  status: string;
  tags: Array<{ id: string; name: string; color: string }>;
  title: string;
  voteCount: number;
}

/**
 * Comment from API
 */
export interface Comment {
  author: { name?: string; avatar?: string } | null;
  body: string;
  createdAt: number;
  id: string;
  isOfficial: boolean;
  replies: Array<{
    id: string;
    body: string;
    author: { name?: string; avatar?: string } | null;
    createdAt: number;
  }>;
}
