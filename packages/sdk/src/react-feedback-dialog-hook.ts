import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Reflet } from "./client";
import { RefletContext } from "./react-context";
import {
  AUTO_CLOSE_DELAY,
  DEFAULT_LABELS,
  type FeedbackCategory,
  type FeedbackDialogProps,
} from "./react-feedback-dialog-types";
import { injectFeedbackStyles } from "./react-feedback-styles";

export function useFeedbackDialog({
  open,
  onOpenChange,
  publicKey: publicKeyProp,
  baseUrl,
  user: userProp,
  userToken: userTokenProp,
  primaryColor,
  defaultCategory = "feature",
  labels: labelsProp,
  onSubmit,
  onOpen,
  onClose,
}: Omit<FeedbackDialogProps, "theme" | "categories">) {
  const context = useContext(RefletContext);
  const publicKey = publicKeyProp ?? context?.publicKey;
  const user = userProp ?? context?.user;
  const userToken = userTokenProp ?? context?.userToken;

  const labels = { ...DEFAULT_LABELS, ...labelsProp };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>(defaultCategory);
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const isAnonymous = !(user || userToken);

  // Inject styles on mount
  useEffect(() => {
    injectFeedbackStyles();
  }, []);

  // Apply primary color
  useEffect(() => {
    if (!(primaryColor && dialogRef.current)) {
      return;
    }
    const el = dialogRef.current.closest("[data-reflet-feedback]");
    if (el instanceof HTMLElement) {
      el.style.setProperty("--reflet-primary", primaryColor);
    }
  }, [primaryColor]);

  // Focus management
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      onOpen?.();
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
      });
    }
  }, [open, onOpen]);

  // Escape key
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // Lock body scroll
  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setEmail("");
    setCategory(defaultCategory);
    setHoneypot("");
    setError(null);
    setIsSuccess(false);
    setIsSubmitting(false);
  }, [defaultCategory]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onOpenChange(false);
      onClose?.();
      resetForm();
      // Restore focus
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }, 200);
  }, [onOpenChange, onClose, resetForm]);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Honeypot check (spam prevention)
      if (honeypot) {
        setIsSuccess(true);
        return;
      }

      if (!publicKey) {
        setError(
          "Missing publicKey. Provide it as a prop or via RefletProvider."
        );
        return;
      }

      if (!title.trim()) {
        setError(labels.required);
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const client = new Reflet({
          publicKey,
          baseUrl,
          user,
          userToken,
        });

        const categoryPrefix = `[${category.charAt(0).toUpperCase() + category.slice(1)}] `;
        const fullDescription = description.trim()
          ? description.trim()
          : "No additional details provided.";

        const result = await client.create({
          title: title.trim(),
          description: `${categoryPrefix}${fullDescription}${isAnonymous && email ? `\n\n---\nContact: ${email}` : ""}`,
        });

        setIsSuccess(true);
        onSubmit?.(result);

        setTimeout(() => {
          handleClose();
        }, AUTO_CLOSE_DELAY);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      honeypot,
      publicKey,
      title,
      description,
      email,
      category,
      baseUrl,
      user,
      userToken,
      isAnonymous,
      labels.required,
      onSubmit,
      handleClose,
    ]
  );

  const handleTrapFocus = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, input, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    // biome-ignore lint/style/useAtIndex: NodeListOf doesn't support .at()
    const last = focusable[focusable.length - 1];

    if (!(first && last)) {
      return;
    }

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  return {
    labels,
    title,
    setTitle,
    description,
    setDescription,
    email,
    setEmail,
    category,
    setCategory,
    honeypot,
    setHoneypot,
    isSubmitting,
    isSuccess,
    error,
    setError,
    isClosing,
    isAnonymous,
    titleInputRef,
    dialogRef,
    handleClose,
    handleSubmit,
    handleTrapFocus,
  };
}
