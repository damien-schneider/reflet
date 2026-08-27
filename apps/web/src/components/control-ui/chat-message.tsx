"use client";

import type { ComponentProps, CSSProperties } from "react";
import { createContext, useContext } from "react";

import type { ChatMessageProps } from "@/components/control-ui/contracts";
import type { ChatMessageKnobStyle } from "@/components/control-ui/knob-contracts";
import { useChatMessage } from "@/components/control-ui/hooks/use-chat-message";
import { cn } from "@/components/control-ui/lib/cn";

type ChatMessageContextValue = ReturnType<typeof useChatMessage>;

const ChatMessageContext = createContext<ChatMessageContextValue | null>(null);

function useChatMessageContext() {
  const context = useContext(ChatMessageContext);
  if (!context) throw new Error("ChatMessage compound components must be rendered inside <ChatMessage>.");
  return context;
}

export function ChatMessage({
  from,
  state = "idle",
  density = "comfortable",
  tone = "neutral",
  className,
  children,
  ...props
}: ChatMessageProps) {
  const message = useChatMessage({ from, state, density, tone });

  return (
    <ChatMessageContext.Provider value={message}>
      <article
        data-control-ui="chat-message"
        data-control-family="chat-message"
        data-slot="root"
        data-role={from}
        data-state={state}
        data-density={density}
        data-tone={tone}
        className={cn("w-full", className)}
        {...props}
      >
        {children}
      </article>
    </ChatMessageContext.Provider>
  );
}

export type ChatMessageRowProps = ComponentProps<"div"> & { style?: CSSProperties & ChatMessageKnobStyle };

export function ChatMessageRow({ className, children, ...props }: ChatMessageRowProps) {
  const message = useChatMessageContext();

  return (
    <div
      data-control-ui="chat-message"
      data-control-family="chat-message"
      data-slot="row"
      className={cn(
        "group flex w-full gap-2",
        message.isUser ? "justify-end" : "justify-start",
        message.isCompact ? "py-1" : "py-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type ChatMessageAvatarProps = Omit<ComponentProps<"div">, "style"> & {
  style?: CSSProperties & ChatMessageKnobStyle;
};

export function ChatMessageAvatar({ className, ...props }: ChatMessageAvatarProps) {
  return (
    <div
      data-control-ui="chat-message"
      data-control-family="chat-message"
      data-slot="avatar"
      className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center", className)}
      {...props}
    />
  );
}

export type ChatMessageBodyProps = ComponentProps<"div"> & { style?: CSSProperties & ChatMessageKnobStyle };

export function ChatMessageBody({ className, ...props }: ChatMessageBodyProps) {
  const message = useChatMessageContext();

  return (
    <div
      data-control-ui="chat-message"
      data-control-family="chat-message"
      data-slot="body"
      className={cn("min-w-0", message.isUser ? "max-w-[76%]" : "max-w-[80%] flex-1", className)}
      {...props}
    />
  );
}

export type ChatMessageHeaderProps = Omit<ComponentProps<"div">, "style"> & {
  style?: CSSProperties & ChatMessageKnobStyle;
};

export function ChatMessageHeader({ className, ...props }: ChatMessageHeaderProps) {
  return (
    <div
      data-control-ui="chat-message"
      data-control-family="chat-message"
      data-slot="header"
      className={cn("mb-1 flex items-center gap-2 px-1", className)}
      {...props}
    />
  );
}

export type ChatMessageContentProps = Omit<ComponentProps<"div">, "style"> & {
  style?: CSSProperties & ChatMessageKnobStyle;
};

export function ChatMessageContent({ className, ...props }: ChatMessageContentProps) {
  const message = useChatMessageContext();

  return (
    <div
      data-control-ui="chat-message"
      data-control-family="chat-message"
      data-slot="content"
      data-role={message.from}
      data-streaming={message.isStreaming ? "" : undefined}
      className={cn(message.isUser && "px-[var(--padding-x)] py-[var(--padding-y)]", className)}
      {...props}
    />
  );
}

export type ChatMessageActionsProps = Omit<ComponentProps<"div">, "style"> & {
  style?: CSSProperties & ChatMessageKnobStyle;
};

export function ChatMessageActions({ className, ...props }: ChatMessageActionsProps) {
  return (
    <div
      data-control-ui="chat-message"
      data-control-family="chat-message"
      data-slot="actions"
      className={cn("mt-1 flex items-center gap-1", className)}
      {...props}
    />
  );
}
