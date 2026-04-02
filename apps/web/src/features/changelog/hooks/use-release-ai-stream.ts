import { useState } from "react";

export function useReleaseAiStream(
  setDescription: (value: string) => void,
  setTitle: (value: string) => void,
  setShouldAutoMatchFeedback: (value: boolean) => void
) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");

  const handleStreamStart = () => {
    setIsStreaming(true);
    setStreamedContent("");
  };

  const handleStreamChunk = (content: string) => {
    setStreamedContent(content);
  };

  const handleStreamComplete = (content: string) => {
    setIsStreaming(false);
    setStreamedContent("");
    if (content) {
      setDescription(content);
      setShouldAutoMatchFeedback(true);
    }
  };

  const handleTitleGenerated = (generatedTitle: string) => {
    setTitle(generatedTitle);
  };

  return {
    isStreaming,
    streamedContent,
    handleStreamStart,
    handleStreamChunk,
    handleStreamComplete,
    handleTitleGenerated,
  };
}
