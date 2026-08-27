"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { Children, createContext, isValidElement, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { CodeChrome, CodeDensity, CodeHighlight, CodeOverflow } from "@/components/control-ui/contracts";
import type { CodeKnobStyle } from "@/components/control-ui/knob-contracts";
import { useCopyToClipboard } from "@/components/control-ui/hooks/use-copy-to-clipboard";
import { cn } from "@/components/control-ui/lib/cn";
import { type CodeTokenLines, highlightToTokens } from "@/components/control-ui/lib/code-tokens";
import { Button } from "@/components/control-ui/ui/button";
import { ScrollArea } from "@/components/control-ui/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/control-ui/ui/tooltip";

/* Line numbers sit in select-none cells so a text selection copies clean source. CodeDiff and the
 * markdown fence renderer build on this same token renderer and row shape. */

// virtualizes past this line count even without explicit `virtualize` prop
const VIRTUALIZE_THRESHOLD = 200;
// estimate only — measureElement corrects it after paint
const ESTIMATED_LINE_HEIGHT = 20;

type CodeContextValue = { chrome: CodeChrome; density: CodeDensity; overflow: CodeOverflow; hasHeader: boolean };

const CodeContext = createContext<CodeContextValue | null>(null);

function useCodeContext(): CodeContextValue {
  const context = useContext(CodeContext);
  if (!context) throw new Error("Code compound parts must be rendered inside <Code>.");
  return context;
}

export type CodeProps = Omit<ComponentProps<"figure">, "style"> & {
  overflow?: CodeOverflow;
  chrome?: CodeChrome;
  density?: CodeDensity;
  style?: CSSProperties & CodeKnobStyle;
};

function hasCodeHeader(children: ReactNode) {
  return Children.toArray(children).some((child) => isValidElement(child) && child.type === CodeHeader);
}

export function Code({ overflow = "scroll", chrome = "standalone", density = "default", className, children, ...props }: CodeProps) {
  const isEmbedded = chrome === "embedded";
  const hasHeader = hasCodeHeader(children);

  return (
    <CodeContext.Provider value={{ chrome, density, overflow, hasHeader }}>
      <figure
        data-control-ui="code"
        data-control-family="code"
        data-slot="root"
        data-surface="panel"
        data-chrome={chrome}
        data-density={density}
        data-header={hasHeader ? "true" : undefined}
        className={cn(
          "min-w-0 [--nest-gap:0.5rem]",
          !hasHeader && "relative",
          isEmbedded ? "my-0 overflow-hidden" : "my-4 overflow-hidden",
          className,
        )}
        {...props}
      >
        {children}
      </figure>
    </CodeContext.Provider>
  );
}

export type CodeHeaderProps = Omit<ComponentProps<"figcaption">, "style"> & { style?: CSSProperties & CodeKnobStyle };

export function CodeHeader({ className, ...props }: CodeHeaderProps) {
  return (
    <figcaption
      data-control-ui="code"
      data-control-family="code"
      data-slot="header"
      className={cn("flex min-h-10 items-center justify-between gap-3 px-3 py-1.5", className)}
      {...props}
    />
  );
}

export type CodeTitleProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & CodeKnobStyle };

export function CodeTitle({ className, ...props }: CodeTitleProps) {
  return (
    <span
      data-control-ui="code"
      data-control-family="code"
      data-slot="title"
      className={cn("block min-w-0 truncate", className)}
      {...props}
    />
  );
}

export type CodeActionsProps = ComponentProps<"div"> & { style?: CSSProperties & CodeKnobStyle };

export function CodeActions({ className, ...props }: CodeActionsProps) {
  return (
    <div
      data-control-ui="code"
      data-control-family="code"
      data-slot="actions"
      className={cn("flex shrink-0 items-center gap-1 ms-auto", className)}
      {...props}
    />
  );
}

export type CodeCopyProps = Omit<ComponentProps<typeof Button>, "children" | "onClick"> & {
  value: string;
  children?: ReactNode;
  copiedLabel?: ReactNode;
  copiedAriaLabel?: string;
};

/* Shared by header, floating overlay, and diff, and it IS library Button, so no code surface grows bespoke copy chrome. */
export function CodeCopy({
  value,
  copiedLabel,
  copiedAriaLabel = "Copied",
  children,
  className,
  "aria-label": ariaLabel,
  ...props
}: CodeCopyProps) {
  const { isCopied, handleCopy } = useCopyToClipboard({ text: value });
  const isIconOnly = children === undefined;
  // text mode already carries its name in label
  const label = ariaLabel ?? (isIconOnly ? "Copy code" : undefined);
  const copied = copiedLabel ?? (isIconOnly ? <CheckIcon aria-hidden="true" className="size-3.5" /> : "Copied");

  const button = (
    <Button
      type="button"
      variant="quiet"
      size="xs"
      aria-live="polite"
      aria-label={label && isCopied ? copiedAriaLabel : label}
      className={cn(isIconOnly && "size-7 p-0", className)}
      {...props}
      onClick={handleCopy}
    >
      {isCopied ? copied : (children ?? <CopyIcon aria-hidden="true" className="size-3.5" />)}
    </Button>
  );

  if (!isIconOnly) return button;

  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger render={button} />
        <TooltipContent side="left">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export type CodeFloatingCopyProps = Omit<CodeCopyProps, "children" | "copiedLabel">;

export function CodeFloatingCopy({ className, ...props }: CodeFloatingCopyProps) {
  return <CodeCopy data-code-floating="true" className={cn("absolute top-2 right-2 z-10", className)} {...props} />;
}

/** Null until resolved, and whenever highlighting is off or language is unknown — callers fall back to plain text. */
export function useCodeTokens({
  code,
  lang,
  tokens,
  highlight,
}: {
  code: string;
  lang?: string;
  tokens?: CodeTokenLines | null;
  highlight: CodeHighlight;
}): CodeTokenLines | null {
  const requestKey = `${lang ?? ""}\n${code}`;
  const [clientTokens, setClientTokens] = useState<{ key: string; tokens: CodeTokenLines | null } | null>(null);

  useEffect(() => {
    if (highlight === "none" || tokens !== undefined || !lang) return;
    let cancelled = false;
    void highlightToTokens(code, lang)
      .then((result) => {
        if (!cancelled) setClientTokens({ key: requestKey, tokens: result });
      })
      .catch(() => {
        if (!cancelled) setClientTokens({ key: requestKey, tokens: null });
      });
    return () => {
      cancelled = true;
    };
  }, [code, lang, tokens, highlight, requestKey]);

  if (highlight === "none") return null;
  if (tokens !== undefined) return tokens;
  return clientTokens?.key === requestKey ? clientTokens.tokens : null;
}

export function CodeTokenLine({ tokens, plain }: { tokens: CodeTokenLines[number] | null; plain: string }): ReactNode {
  if (!tokens || tokens.length === 0) return plain;
  return tokens.map((token, index) => {
    const style: CSSProperties = { ...token.style };
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: token order is the identity within a line
      <span key={index} style={style}>
        {token.content}
      </span>
    );
  });
}

// kept flat so selection over code column copies clean source
function CodeRow({
  index,
  number,
  tokens,
  plain,
  overflow,
  showLineNumbers,
  measureRef,
  style,
}: {
  index?: number;
  number: number;
  tokens: CodeTokenLines[number] | null;
  plain: string;
  overflow: CodeOverflow;
  showLineNumbers: boolean;
  measureRef?: (node: HTMLDivElement | null) => void;
  style?: CSSProperties;
}) {
  return (
    <div
      ref={measureRef}
      data-index={index}
      data-control-ui="code"
      data-control-family="code"
      data-slot="line"
      className="flex min-h-5 w-full"
      style={style}
    >
      {showLineNumbers ? (
        <span
          data-control-ui="code"
          data-control-family="code"
          data-slot="gutter"
          aria-hidden="true"
          className="shrink-0 select-none pr-3 pl-4"
          style={{ minWidth: "3.5rem" }}
        >
          {number}
        </span>
      ) : null}
      <code
        className={cn(
          "min-w-0 flex-1 pr-4",
          overflow === "wrap" ? "whitespace-pre-wrap break-words" : "whitespace-pre",
          !showLineNumbers && "pl-4",
        )}
      >
        <CodeTokenLine tokens={tokens} plain={plain} />
      </code>
    </div>
  );
}

export type CodeContentProps = Omit<ComponentProps<"div">, "children" | "style"> & {
  code: string;
  lang?: string;
  tokens?: CodeTokenLines | null;
  highlight?: CodeHighlight;
  showLineNumbers?: boolean;
  startLine?: number;
  maxHeight?: string;
  virtualize?: boolean;
  style?: CSSProperties & CodeKnobStyle;
};

export function CodeContent({
  code,
  lang,
  tokens,
  highlight = "auto",
  showLineNumbers = false,
  startLine = 1,
  maxHeight = "32rem",
  virtualize,
  className,
  ref,
  style,
  ...props
}: CodeContentProps) {
  const { chrome, density, overflow, hasHeader } = useCodeContext();
  const resolvedTokens = useCodeTokens({ code, lang, tokens, highlight });
  const plainLines = useMemo(() => code.split("\n"), [code]);
  const isCompact = density === "compact";

  const scrollRef = useRef<HTMLDivElement>(null);
  function setScrollElement(node: HTMLDivElement | null) {
    scrollRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }
  const shouldVirtualize = virtualize ?? plainLines.length > VIRTUALIZE_THRESHOLD;
  const useScrollArea = density !== "compact" || overflow !== "wrap";

  // react-doctor-disable-next-line react-hooks-js/incompatible-library
  const virtualizer = useVirtualizer({
    count: plainLines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_LINE_HEIGHT,
    overscan: 24,
    enabled: shouldVirtualize,
  });

  const gridClassName = cn(isCompact ? "py-2" : "py-3", overflow === "scroll" ? "w-max min-w-full" : "w-full");
  const textStyle = style;

  const grid = shouldVirtualize ? (
    <>
      <pre data-control-ui="code" data-control-family="code" data-slot="accessible-source" className="sr-only">
        <code>{code}</code>
      </pre>
      <div
        data-control-ui="code"
        data-control-family="code"
        data-slot="grid"
        data-density={isCompact ? "compact" : "default"}
        aria-hidden="true"
        className={gridClassName}
        style={{ ...textStyle, position: "relative", height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <CodeRow
            key={item.key}
            index={item.index}
            number={startLine + item.index}
            tokens={resolvedTokens?.[item.index] ?? null}
            plain={plainLines[item.index] ?? ""}
            overflow={overflow}
            showLineNumbers={showLineNumbers}
            measureRef={virtualizer.measureElement}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${item.start}px)` }}
          />
        ))}
      </div>
    </>
  ) : (
    <div
      data-control-ui="code"
      data-control-family="code"
      data-slot="grid"
      data-density={isCompact ? "compact" : "default"}
      className={gridClassName}
      style={textStyle}
    >
      {plainLines.map((plain, index) => (
        <CodeRow
          // biome-ignore lint/suspicious/noArrayIndexKey: line position is the row identity
          key={index}
          number={startLine + index}
          tokens={resolvedTokens?.[index] ?? null}
          plain={plain}
          overflow={overflow}
          showLineNumbers={showLineNumbers}
        />
      ))}
    </div>
  );

  const content = useScrollArea ? (
    <ScrollArea
      maxHeight={maxHeight}
      viewportClassName={className}
      viewportProps={{
        ...props,
        "data-control-ui": "code",
        "data-control-family": "code",
        "data-slot": "content",
        style,
      }}
      viewportRef={setScrollElement}
    >
      {grid}
    </ScrollArea>
  ) : (
    <div
      ref={setScrollElement}
      data-control-ui="code"
      data-control-family="code"
      data-slot="content"
      className={cn("overflow-auto", className)}
      style={{ ...style, maxHeight }}
      {...props}
    >
      {grid}
    </div>
  );

  // embedded means host frames block and owns copy control
  if (hasHeader || chrome === "embedded") return content;

  // reserves exactly overlay's footprint (top-2 + size-7) so no dead band is left
  return (
    <div className={cn("relative", isCompact ? "pt-7" : "pt-6")}>
      <CodeFloatingCopy value={code} />
      {content}
    </div>
  );
}
