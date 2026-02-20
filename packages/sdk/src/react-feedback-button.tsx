import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import {
  type FeedbackCategory,
  FeedbackDialog,
  type FeedbackDialogLabels,
} from "./react-feedback-dialog";
import { injectFeedbackStyles } from "./react-feedback-styles";
import type { CreateFeedbackResponse, RefletUser } from "./types";

// ============================================
// Types
// ============================================

export interface FeedbackButtonProps {
  /** Public API key (falls back to RefletProvider context) */
  publicKey?: string;
  /** API base URL override */
  baseUrl?: string;
  /** User identification (falls back to RefletProvider context) */
  user?: RefletUser;
  /** Pre-signed user token */
  userToken?: string;
  /** Color theme */
  theme?: "light" | "dark" | "auto";
  /** Primary brand color (CSS value) */
  primaryColor?: string;
  /** Default selected category */
  defaultCategory?: FeedbackCategory;
  /** Categories to show */
  categories?: FeedbackCategory[];
  /** Custom labels / i18n */
  labels?: FeedbackDialogLabels & { trigger?: string };
  /** Called after successful submission */
  onSubmit?: (result: CreateFeedbackResponse) => void;
  /** Called when dialog opens */
  onOpen?: () => void;
  /** Called when dialog closes */
  onClose?: () => void;
  /** Custom CSS class for the default trigger button */
  className?: string;
  /**
   * Render as child element instead of the default button.
   * When true, the first child element receives the onClick handler.
   */
  asChild?: boolean;
  /** Custom trigger content or element (used with asChild) */
  children?: ReactNode;
}

// ============================================
// Feedback Icon SVG
// ============================================

function FeedbackIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ============================================
// Component
// ============================================

export function FeedbackButton({
  publicKey,
  baseUrl,
  user,
  userToken,
  theme = "auto",
  primaryColor,
  defaultCategory = "feature",
  categories,
  labels,
  onSubmit,
  onOpen,
  onClose,
  className,
  asChild = false,
  children,
}: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);

  // Inject styles so the trigger button is styled
  useState(() => {
    injectFeedbackStyles();
  });

  const handleClick = useCallback(() => {
    setOpen(true);
  }, []);

  // Render trigger
  let trigger: ReactNode;

  if (asChild && isValidElement(children)) {
    trigger = cloneElement(children as ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    });
  } else {
    const triggerLabel = labels?.trigger ?? "Feedback";
    trigger = (
      <div data-reflet-feedback="" data-theme={theme}>
        <button
          aria-label={triggerLabel}
          className={className ?? "reflet-trigger"}
          onClick={handleClick}
          style={
            primaryColor
              ? ({
                  "--reflet-primary": primaryColor,
                  "--reflet-primary-hover": primaryColor,
                } as React.CSSProperties)
              : undefined
          }
          type="button"
        >
          <FeedbackIcon />
          {triggerLabel}
        </button>
      </div>
    );
  }

  return (
    <>
      {trigger}
      <FeedbackDialog
        baseUrl={baseUrl}
        categories={categories}
        defaultCategory={defaultCategory}
        labels={labels}
        onClose={onClose}
        onOpen={onOpen}
        onOpenChange={setOpen}
        onSubmit={onSubmit}
        open={open}
        primaryColor={primaryColor}
        publicKey={publicKey}
        theme={theme}
        user={user}
        userToken={userToken}
      />
    </>
  );
}
