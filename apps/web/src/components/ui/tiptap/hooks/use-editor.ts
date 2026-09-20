"use client";

import { useDebouncedCallback } from "@tanstack/react-pacer";
import { type Editor, useEditor as useTiptapEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";
import { createEditorProps, createExtensions } from "../editor-extensions";
import { type MediaUploadResult, useMediaUpload } from "../use-media-upload";

const getMarkdown = (storage: unknown): string => {
  const storageWithMarkdown = storage as {
    markdown?: { getMarkdown?: () => string };
  };
  return storageWithMarkdown?.markdown?.getMarkdown?.() ?? "";
};

interface UseTiptapMarkdownEditorOptions {
  autoFocus?: boolean;
  debounceMs?: number;
  disabled?: boolean;
  editable?: boolean;
  maxLength?: number;
  minimal?: boolean;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  value: string;
}

interface UseTiptapMarkdownEditorReturn {
  characterCount: number;
  editor: Editor | null;
  handleImageChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  handleImageUpload: () => void;
  handleVideoChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  handleVideoUpload: () => void;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  isAtLimit: boolean;
  isNearLimit: boolean;
  isUploading: boolean;
  uploadProgress: string | null;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useTiptapMarkdownEditor(
  options: UseTiptapMarkdownEditorOptions
): UseTiptapMarkdownEditorReturn {
  const {
    value,
    onChange,
    placeholder = "Write something... Type '/' for commands",
    disabled = false,
    maxLength,
    autoFocus = false,
    editable = true,
    minimal = false,
    debounceMs = 0,
    onSubmit,
  } = options;

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ReturnType<typeof useTiptapEditor>>(null);
  const hasInitializedRef = useRef(false);
  const initialValueRef = useRef(value);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const debouncedOnChange = useDebouncedCallback(onChange, {
    wait: debounceMs,
  });
  const effectiveOnChange = debounceMs > 0 ? debouncedOnChange : onChange;

  const { uploadMedia, isUploading, uploadProgress } = useMediaUpload({
    onError: (error: Error) => {
      console.error("Media upload failed:", error);
    },
    onSuccess: (result: MediaUploadResult) => {
      const ed = editorRef.current;
      if (!ed) return;

      if (result.type === "image") {
        ed.chain().focus().setImage({ src: result.url }).run();
      } else if (result.type === "video") {
        ed.chain()
          .focus()
          .insertContent(
            `<p><video src="${result.url}" controls class="tiptap-video"></video></p>`
          )
          .run();
      }
    },
  });

  const handleImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleVideoUpload = () => {
    videoInputRef.current?.click();
  };

  const handleMediaChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadMedia(file);
    }
    event.target.value = "";
  };

  const handleSubmit = () => {
    onSubmitRef.current?.();
  };

  const extensions = createExtensions({
    maxLength,
    onImageUpload: handleImageUpload,
    onSubmit: onSubmit ? handleSubmit : undefined,
    onVideoUpload: handleVideoUpload,
    placeholder,
  });

  const editorProps = createEditorProps({
    minimal,
    uploadMedia,
  });

  const editor = useTiptapEditor({
    autofocus: autoFocus,
    content: value,
    editable: editable && !disabled,
    editorProps,
    extensions,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const markdown = getMarkdown(ed.storage);
      effectiveOnChange(markdown);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const currentMarkdown = getMarkdown(editor.storage);
      if (initialValueRef.current !== currentMarkdown) {
        editor.commands.setContent(initialValueRef.current);
      }
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const currentMarkdown = getMarkdown(editor.storage);
    if (value !== currentMarkdown) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable && !disabled);
  }, [editor, editable, disabled]);

  const characterCount = editor?.storage.characterCount?.characters() ?? 0;
  const isNearLimit = maxLength ? characterCount > maxLength * 0.9 : false;
  const isAtLimit = maxLength ? characterCount >= maxLength : false;

  return {
    characterCount,
    editor,
    handleImageChange: handleMediaChange,
    handleImageUpload,
    handleVideoChange: handleMediaChange,
    handleVideoUpload,
    imageInputRef,
    isAtLimit,
    isNearLimit,
    isUploading,
    uploadProgress,
    videoInputRef,
  };
}
