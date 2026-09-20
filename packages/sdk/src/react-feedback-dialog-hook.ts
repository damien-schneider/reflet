import {
  type FormEvent,
  type RefObject,
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
  type FeedbackDialogProps,
} from "./react-feedback-dialog-types";
import { injectFeedbackStyles } from "./react-feedback-styles";

const CLOSE_ANIMATION_MS = 200;

function openDialog(dialog: HTMLDialogElement) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }
  dialog.open = true;
}

function closeDialog(dialog: HTMLDialogElement) {
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }
  dialog.open = false;
}

function useModalDialog(
  open: boolean,
  dialogRef: RefObject<HTMLDialogElement | null>,
  titleInputRef: RefObject<HTMLInputElement | null>
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!(open && dialog) || dialog.open) {
      return;
    }
    openDialog(dialog);
    titleInputRef.current?.focus();
    return () => closeDialog(dialog);
  }, [open, dialogRef, titleInputRef]);
}

function useBackdropDismiss(
  open: boolean,
  dialogRef: RefObject<HTMLDialogElement | null>,
  onDismiss: () => void
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!(open && dialog)) {
      return;
    }
    const dismiss = (event: MouseEvent) => {
      if (event.target === dialog) {
        onDismiss();
      }
    };
    dialog.addEventListener("click", dismiss);
    return () => dialog.removeEventListener("click", dismiss);
  }, [open, dialogRef, onDismiss]);
}

function useScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousGutter = root.style.getPropertyValue("scrollbar-gutter");
    root.style.setProperty("scrollbar-gutter", "stable");
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
      if (previousGutter) {
        root.style.setProperty("scrollbar-gutter", previousGutter);
      } else {
        root.style.removeProperty("scrollbar-gutter");
      }
    };
  }, [open]);
}

function usePrimaryColor(
  primaryColor: string | undefined,
  dialogRef: RefObject<HTMLDialogElement | null>
) {
  useEffect(() => {
    injectFeedbackStyles();
  }, []);

  useEffect(() => {
    if (!(primaryColor && dialogRef.current)) {
      return;
    }
    const host = dialogRef.current.closest("[data-reflet-feedback]");
    if (host instanceof HTMLElement) {
      host.style.setProperty("--reflet-primary", primaryColor);
    }
  }, [primaryColor, dialogRef]);
}

export function useFeedbackDialog({
  open,
  onOpenChange,
  publicKey: publicKeyProp,
  baseUrl,
  user: userProp,
  userToken: userTokenProp,
  primaryColor,
  labels: labelsProp,
  onSubmit,
  onOpen,
  onClose,
}: Omit<FeedbackDialogProps, "theme">) {
  const context = useContext(RefletContext);
  const publicKey = publicKeyProp ?? context?.publicKey;
  const user = userProp ?? context?.user;
  const userToken = userTokenProp ?? context?.userToken;

  const labels = { ...DEFAULT_LABELS, ...labelsProp };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isAnonymous = !(user || userToken);

  usePrimaryColor(primaryColor, dialogRef);
  useModalDialog(open, dialogRef, titleInputRef);
  useScrollLock(open);

  useEffect(() => {
    if (open) {
      onOpen?.();
    }
  }, [open, onOpen]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEmail("");
    setHoneypot("");
    setError(null);
    setIsSuccess(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onOpenChange(false);
      onClose?.();
      resetForm();
    }, CLOSE_ANIMATION_MS);
  };

  useBackdropDismiss(open, dialogRef, handleClose);

  const buildDescription = () => {
    const body = description.trim() || "No additional details provided.";
    const contact = isAnonymous && email ? `\n\n---\nContact: ${email}` : "";
    return `${body}${contact}`;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

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
      const client = new Reflet({ baseUrl, publicKey, user, userToken });
      const result = await client.create({
        description: buildDescription(),
        title: title.trim(),
      });

      setIsSuccess(true);
      onSubmit?.(result);
      setTimeout(handleClose, AUTO_CLOSE_DELAY);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    description,
    dialogRef,
    email,
    error,
    handleClose,
    handleSubmit,
    honeypot,
    isAnonymous,
    isClosing,
    isSubmitting,
    isSuccess,
    labels,
    setDescription,
    setEmail,
    setError,
    setHoneypot,
    setTitle,
    title,
    titleInputRef,
  };
}
