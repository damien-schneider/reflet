import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";
import { CODE_FRAME } from "./code-block";

interface InstallCommandProps {
  command: string;
}

function InstallCommand({ command }: InstallCommandProps) {
  return (
    <div className={cn("flex items-center gap-2 py-1 pr-1.5 pl-4", CODE_FRAME)}>
      <pre className="min-w-0 flex-1 overflow-x-auto py-1.5 font-mono text-foreground text-label">
        <code>
          <span aria-hidden className="select-none text-muted-foreground">
            ${" "}
          </span>
          {command}
        </code>
      </pre>
      <CopyButton label="Copy command" value={command} />
    </div>
  );
}

export { InstallCommand };
