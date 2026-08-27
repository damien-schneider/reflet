"use client";

import type { ChangeEvent, ComponentProps, CSSProperties } from "react";
import { createContext, useContext } from "react";
import { hasSkinAdornment, skinAdornment } from "@/components/control-ui/adornments";
import type { ChatComposerProps } from "@/components/control-ui/contracts";
import type { ChatComposerKnobStyle } from "@/components/control-ui/knob-contracts";
import { useChatComposer } from "@/components/control-ui/hooks/use-chat-composer";
import { cn } from "@/components/control-ui/lib/cn";
import { Button } from "@/components/control-ui/ui/button";

type ChatComposerContextValue = ReturnType<typeof useChatComposer>;

const ChatComposerContext = createContext<ChatComposerContextValue | null>(null);

// exported so opt-in editor shares this context without dragging ProseMirror into base file
export function useChatComposerContext() {
  const context = useContext(ChatComposerContext);

  if (!context) throw new Error("ChatComposer compound components must be rendered inside <ChatComposer>.");
  return context;
}

export function ChatComposer({
  value,
  defaultValue,
  onValueChange,
  onSubmit,
  state = "idle",
  density = "comfortable",
  disabled = false,
  className,
  children,
  ...props
}: ChatComposerProps) {
  const input = useChatComposer({
    value,
    defaultValue,
    onValueChange,
    onSubmit,
    state,
    density,
    disabled,
    trackSends: hasSkinAdornment("chat-composer", "send-layer"),
  });
  const sendLayer = skinAdornment("chat-composer", "send-layer", { sendCount: input.sendCount });

  return (
    <ChatComposerContext.Provider value={input}>
      <form
        data-control-ui="chat-composer"
        data-control-family="chat-composer"
        data-slot="root"
        data-state={state}
        data-density={density}
        onSubmit={input.handleSubmit}
        className={cn("sticky bottom-0 w-full px-2 pb-2 pt-1", className)}
        {...props}
      >
        {/* component owns this position contract and skin supplies only visuals — no skin, no DOM */}
        {sendLayer !== undefined && sendLayer !== null ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-clip contain-paint">
            {sendLayer}
          </div>
        ) : null}
        {children}
      </form>
    </ChatComposerContext.Provider>
  );
}

export type ChatComposerShellProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ChatComposerKnobStyle };

export function ChatComposerShell({ className, ...props }: ChatComposerShellProps) {
  const input = useChatComposerContext();

  return (
    <div
      data-control-ui="chat-composer"
      data-control-family="chat-composer"
      data-slot="shell"
      data-state={input.state}
      className={cn("relative overflow-hidden", className)}
      {...props}
    />
  );
}

export type ChatComposerAccentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ChatComposerKnobStyle };

export function ChatComposerAccent({ className, ...props }: ChatComposerAccentProps) {
  return (
    <div
      data-control-ui="chat-composer"
      data-control-family="chat-composer"
      data-slot="accent"
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-x-5 top-0 h-px", className)}
      {...props}
    />
  );
}

export type ChatComposerTextareaProps = Omit<ComponentProps<"textarea">, "style"> & {
  style?: CSSProperties & ChatComposerKnobStyle;
};

export function ChatComposerTextarea({ className, rows, disabled, onChange, ...props }: ChatComposerTextareaProps) {
  const input = useChatComposerContext();

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange?.(event);
    if (!event.defaultPrevented) input.setValue(event.currentTarget.value);
  }

  return (
    <textarea
      {...props}
      data-control-ui="chat-composer"
      data-control-family="chat-composer"
      data-slot="textarea"
      aria-label="Message"
      value={input.value}
      onChange={handleChange}
      disabled={disabled ?? input.isDisabled}
      rows={rows ?? input.rows}
      className={cn(
        "field-sizing-content min-h-16 max-h-[40dvh] w-full resize-none px-[var(--padding-x)] py-[var(--padding-y)] disabled:cursor-not-allowed",
        className,
      )}
    />
  );
}

export type ChatComposerToolbarProps = ComponentProps<"div"> & { style?: CSSProperties & ChatComposerKnobStyle };

export function ChatComposerToolbar({ className, ...props }: ChatComposerToolbarProps) {
  return (
    <div
      data-control-ui="chat-composer"
      data-control-family="chat-composer"
      data-slot="toolbar"
      className={cn("flex min-h-10 items-center justify-between gap-2 px-2.5 pb-2", className)}
      {...props}
    />
  );
}

export type ChatComposerToolsProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ChatComposerKnobStyle };

export function ChatComposerTools({ className, ...props }: ChatComposerToolsProps) {
  return (
    <div
      data-control-ui="chat-composer"
      data-control-family="chat-composer"
      data-slot="tools"
      className={cn("flex min-w-0 items-center gap-1.5", className)}
      {...props}
    />
  );
}

export type ChatComposerFooterProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ChatComposerKnobStyle };

export function ChatComposerFooter({ className, ...props }: ChatComposerFooterProps) {
  return (
    <div
      data-control-ui="chat-composer"
      data-control-family="chat-composer"
      data-slot="footer"
      className={cn("px-3 pb-2", className)}
      {...props}
    />
  );
}

export type ChatComposerSubmitProps = ComponentProps<typeof Button>;

export function ChatComposerSubmit({ className, disabled, children = "Send", ...props }: ChatComposerSubmitProps) {
  const input = useChatComposerContext();

  return (
    <Button
      data-control-ui="chat-composer"
      data-slot="submit"
      type="submit"
      variant="solid"
      tone="primary"
      size="xs"
      disabled={disabled ?? !input.canSubmit}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
