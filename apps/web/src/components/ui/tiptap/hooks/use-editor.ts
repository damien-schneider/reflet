"use client";

import { useDebouncedCallback } from "@tanstack/react-pacer";
import { type Editor, useEditor as useTiptapEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef } from "react";
import { createEditorProps, createExtensions } from "../editor-extensions";
import { type MediaUploadResult, useMediaUpload } from "../use-media-upload";

const getMarkdown = (storage: unknown): string => {
  const storageWithMarkdown = storage as {
    markdown?: { getMarkdown?: () => string };
  };
  return storageWithMarkdown?.markdown?.getMarkdown?.() ?? "";
};

interface UseTiptapMarkdownEditorOptions {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  editable?: boolean;
  minimal?: boolean;
  debounceMs?: number;
  onSubmit?: () => void;
}

interface UseTiptapMarkdownEditorReturn {
  editor: Editor | null;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: () => void;
  handleVideoUpload: () => void;
  handleImageChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  handleVideoChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;
  isUploading: boolean;
  uploadProgress: string | null;
  characterCount: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
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

  // Keep ref updated with latest onSubmit
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  const debouncedOnChange = useDebouncedCallback(onChange, {
    wait: debounceMs,
  });
  const effectiveOnChange = debounceMs > 0 ? debouncedOnChange : onChange;

  const { uploadMedia, isUploading, uploadProgress } = useMediaUpload({
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
    onError: (error: Error) => {
      console.error("Media upload failed:", error);
    },
  });

  const handleImageUpload = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleVideoUpload = useCallback(() => {
    videoInputRef.current?.click();
  }, []);

  const handleImageChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await uploadMedia(file);
      }
      event.target.value = "";
    },
    [uploadMedia]
  );

  const handleVideoChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await uploadMedia(file);
      }
      event.target.value = "";
    },
    [uploadMedia]
  );

  // Stable callback that always calls the latest onSubmit
  const handleSubmit = useCallback(() => {
    onSubmitRef.current?.();
  }, []);

  const extensions = createExtensions({
    placeholder,
    maxLength,
    onImageUpload: handleImageUpload,
    onVideoUpload: handleVideoUpload,
    onSubmit: onSubmit ? handleSubmit : undefined,
  });

  const editorProps = createEditorProps({
    uploadMedia,
    minimal,
  });

  const editor = useTiptapEditor({
    immediatelyRender: false,
    extensions,
    content: value,
    editable: editable && !disabled,
    autofocus: autoFocus,
    editorProps,
    onUpdate: ({ editor: ed }) => {
      const markdown = getMarkdown(ed.storage);
      effectiveOnChange(markdown);
    },
  });

  useEffect(() => {
    (editorRef as React.MutableRefObject<typeof editor>).current = editor;
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
    editor.setEditable(editable && !disabled);
  }, [editor, editable, disabled]);

  const characterCount = editor?.storage.characterCount?.characters() ?? 0;
  const isNearLimit = maxLength ? characterCount > maxLength * 0.9 : false;
  const isAtLimit = maxLength ? characterCount >= maxLength : false;

  return {
    editor,
    imageInputRef,
    videoInputRef,
    handleImageUpload,
    handleVideoUpload,
    handleImageChange,
    handleVideoChange,
    isUploading,
    uploadProgress,
    characterCount,
    isNearLimit,
    isAtLimit,
  };
}
