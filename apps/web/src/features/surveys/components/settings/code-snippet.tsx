import { CopyButton } from "@/components/copy-button";

export function CodeSnippet({
  code,
  copyLabel,
}: {
  code: string;
  copyLabel: string;
}) {
  return (
    <div className="relative min-w-0">
      <div className="absolute top-1.5 right-1.5">
        <CopyButton label={copyLabel} value={code} />
      </div>
      <pre className="overflow-x-auto rounded-lg bg-muted p-3 pr-12 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
