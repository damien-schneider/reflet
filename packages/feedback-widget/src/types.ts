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
  /** Survey callbacks */
  survey?: SurveyCallbacks;
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

/**
 * Survey data from API
 */
export interface SurveyData {
  _id: string;
  description?: string;
  questions: SurveyQuestion[];
  title: string;
  triggerConfig?: {
    pageUrl?: string;
    delayMs?: number;
    sampleRate?: number;
  };
  triggerType: string;
}

/**
 * Survey question
 */
export interface SurveyQuestion {
  _id: string;
  conditionalLogic?: {
    conditions: Array<{
      questionId: string;
      operator:
        | "equals"
        | "not_equals"
        | "contains"
        | "greater_than"
        | "less_than";
      value: string | number | boolean;
    }>;
    action: "show" | "skip";
    logicType: "and" | "or";
  };
  config?: {
    minValue?: number;
    maxValue?: number;
    minLabel?: string;
    maxLabel?: string;
    choices?: string[];
    placeholder?: string;
    maxLength?: number;
  };
  description?: string;
  order: number;
  required: boolean;
  title: string;
  type:
    | "rating"
    | "nps"
    | "text"
    | "single_choice"
    | "multiple_choice"
    | "boolean";
}

/**
 * Callbacks for survey lifecycle events
 */
export interface SurveyCallbacks {
  onQuestionAnswer?: (data: {
    surveyId: string;
    questionId: string;
    questionIndex: number;
    value: string | number | boolean | string[];
  }) => void;
  onSurveyComplete?: (data: {
    surveyId: string;
    responseId: string;
    totalQuestions: number;
    answeredQuestions: number;
  }) => void;
  onSurveyDismiss?: (data: {
    surveyId: string;
    questionIndex: number;
    answeredCount: number;
  }) => void;
  onSurveyStart?: (data: { surveyId: string; title: string }) => void;
}
