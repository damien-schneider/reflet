import type { ChatDensity, ChatMessageProps, ChatRole, ChatState, ChatTone } from "../contracts";

export type ChatMessageContext = {
  from: ChatRole;
  state: ChatState;
  density: ChatDensity;
  tone: ChatTone;
  isUser: boolean;
  isAssistant: boolean;
  isSystem: boolean;
  isTool: boolean;
  isCompact: boolean;
  isStreaming: boolean;
  isError: boolean;
};

function getChatMessageContext({
  from,
  state,
  density,
  tone,
}: Required<Pick<ChatMessageProps, "from" | "state" | "density" | "tone">>): ChatMessageContext {
  return {
    from,
    state,
    density,
    tone,
    isUser: from === "user",
    isAssistant: from === "assistant",
    isSystem: from === "system",
    isTool: from === "tool",
    isCompact: density === "compact",
    isStreaming: state === "streaming",
    isError: state === "error",
  };
}

export function useChatMessage({
  from,
  state = "idle",
  density = "comfortable",
  tone = "neutral",
}: Pick<ChatMessageProps, "from" | "state" | "density" | "tone">) {
  return getChatMessageContext({ from, state, density, tone });
}
