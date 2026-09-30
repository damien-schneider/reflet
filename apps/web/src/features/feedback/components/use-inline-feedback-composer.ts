import { useImperativeHandle, useRef, useState } from "react";
import type {
  InlineFeedbackInputHandle,
  InlineSubmitData,
} from "./inline-feedback-input";

export const MAX_TITLE_LENGTH = 100;
const TITLE_COUNTER_THRESHOLD = 90;
const CONFIRMATION_MS = 2500;

const INITIAL_STATE: InlineSubmitData = {
  attachments: [],
  description: "",
  email: "",
  tagId: undefined,
  title: "",
};

interface FeedbackDraft {
  form: InlineSubmitData;
  hasContent: boolean;
  isTitleOverLimit: boolean;
  resetForm: () => void;
  showTitleCounter: boolean;
  titleLength: number;
  trimmedTitle: string;
  updateForm: (patch: Partial<InlineSubmitData>) => void;
}

export interface InlineFeedbackComposerState extends FeedbackDraft {
  canSubmit: boolean;
  confirmation: string;
  error: string | null;
  handleCancel: () => void;
  handleSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export function useComposerExpansion(
  ref: React.Ref<InlineFeedbackInputHandle> | undefined
) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  const collapse = () => {
    setIsExpanded(false);
    requestAnimationFrame(() => openButtonRef.current?.focus());
  };

  const expandAndFocus = () => {
    setIsExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useImperativeHandle(ref, () => ({
    focus: expandAndFocus,
    scrollIntoView: () => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      expandAndFocus();
    },
  }));

  return {
    collapse,
    containerRef,
    expandAndFocus,
    inputRef,
    isExpanded,
    openButtonRef,
  };
}

function useFeedbackDraft(): FeedbackDraft {
  const [form, setForm] = useState(INITIAL_STATE);
  const titleLength = form.title.length;
  const updateForm = (patch: Partial<InlineSubmitData>) =>
    setForm((f) => ({ ...f, ...patch }));
  const resetForm = () => setForm(INITIAL_STATE);

  return {
    form,
    hasContent: Boolean(
      form.title ||
        form.description ||
        form.email ||
        form.attachments.length > 0 ||
        form.tagId
    ),
    isTitleOverLimit: titleLength > MAX_TITLE_LENGTH,
    resetForm,
    showTitleCounter: titleLength >= TITLE_COUNTER_THRESHOLD,
    titleLength,
    trimmedTitle: form.title.trim(),
    updateForm,
  };
}

function useConfirmation() {
  const [confirmation, setConfirmation] = useState("");
  const showConfirmation = (message: string) => {
    setConfirmation(message);
    setTimeout(() => setConfirmation(""), CONFIRMATION_MS);
  };
  return { confirmation, showConfirmation };
}

function useFeedbackSubmission({
  draft,
  onSubmit,
  onSent,
}: {
  draft: FeedbackDraft;
  onSubmit: (data: InlineSubmitData) => Promise<void>;
  onSent: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { form, trimmedTitle } = draft;
  const canSubmit =
    !isSubmitting && trimmedTitle.length > 0 && !draft.isTitleOverLimit;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        description: form.description.trim(),
        email: form.email.trim(),
        title: trimmedTitle,
      });
    } catch {
      setIsSubmitting(false);
      setError(
        "Couldn’t send your feedback. Check your connection and try again."
      );
      return;
    }
    setIsSubmitting(false);
    onSent();
  };

  return { canSubmit, error, handleSubmit, isSubmitting, setError };
}

export function useInlineFeedbackForm({
  onSubmit,
  collapse,
}: {
  onSubmit: (data: InlineSubmitData) => Promise<void>;
  collapse: () => void;
}): InlineFeedbackComposerState {
  const draft = useFeedbackDraft();
  const { confirmation, showConfirmation } = useConfirmation();
  const { setError, ...submission } = useFeedbackSubmission({
    draft,
    onSent: () => {
      draft.resetForm();
      collapse();
      showConfirmation("Thanks, your feedback was sent.");
    },
    onSubmit,
  });

  const handleCancel = () => {
    draft.resetForm();
    setError(null);
    collapse();
  };

  return { ...draft, ...submission, confirmation, handleCancel };
}
