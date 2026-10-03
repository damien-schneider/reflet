import { cn } from "@ctrl-ui/react/lib/cn";
import { CopyButton } from "@/components/copy-button";

const CODE_FRAME =
  "overflow-hidden rounded-lg border border-border bg-secondary";

interface CodeSurfaceProps {
  code: string;
  maxHeightClassName?: string;
  wrap?: boolean;
}

function CodeSurface({ code, maxHeightClassName, wrap }: CodeSurfaceProps) {
  return (
    <pre
      className={cn(
        "overflow-auto p-4 font-mono text-foreground text-label leading-relaxed",
        wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        maxHeightClassName
      )}
    >
      <code>{code}</code>
    </pre>
  );
}

interface CodeBlockProps {
  className?: string;
  code: string;
  /** What the copy button copies, e.g. "code" or "prompt". */
  copySubject?: string;
  maxHeightClassName?: string;
  /** Caption shown in the header, e.g. "Example request". */
  title?: string;
  wrap?: boolean;
}

function CodeBlock({
  code,
  copySubject = "code",
  title,
  className,
  maxHeightClassName,
  wrap,
}: CodeBlockProps) {
  if (!title) {
    return (
      <div className={cn("relative", CODE_FRAME, className)}>
        <div className="absolute top-1.5 right-1.5">
          <CopyButton label={`Copy ${copySubject}`} value={code} />
        </div>
        <div className="pr-11">
          <CodeSurface
            code={code}
            maxHeightClassName={maxHeightClassName}
            wrap={wrap}
          />
        </div>
      </div>
    );
  }

  return (
    <figure className={cn(CODE_FRAME, className)}>
      <figcaption className="flex items-center justify-between gap-2 border-border border-b py-1 pr-1.5 pl-4">
        <span className="truncate font-medium text-caption text-muted-foreground">
          {title}
        </span>
        <CopyButton label={`Copy ${copySubject}`} value={code} />
      </figcaption>
      <CodeSurface
        code={code}
        maxHeightClassName={maxHeightClassName}
        wrap={wrap}
      />
    </figure>
  );
}

export { CODE_FRAME, CodeBlock, CodeSurface };
