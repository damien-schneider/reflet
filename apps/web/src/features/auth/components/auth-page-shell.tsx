import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { H1, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function AuthPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className={cn("w-full max-w-md", className)}>{children}</div>
    </main>
  );
}

type AuthStatusTone = "brand" | "success" | "destructive";

const TONE_CLASS: Record<AuthStatusTone, string> = {
  brand: "bg-secondary text-brand-text",
  destructive: "bg-destructive-subtle text-destructive-text",
  success: "bg-success-subtle text-success-text",
};

interface AuthStatusProps {
  actions?: ReactNode;
  children: ReactNode;
  icon: Icon;
  title: string;
  tone: AuthStatusTone;
}

export function AuthStatus({
  actions,
  children,
  icon: StatusIcon,
  title,
  tone,
}: AuthStatusProps) {
  return (
    <AuthPageShell className="text-center">
      <div
        className={cn(
          "mx-auto mb-6 flex size-14 items-center justify-center rounded-full",
          TONE_CLASS[tone]
        )}
      >
        <StatusIcon aria-hidden className="size-7" weight="duotone" />
      </div>
      <H1 className="mb-2" variant="page">
        {title}
      </H1>
      <Muted className="mb-6 text-pretty">{children}</Muted>
      {actions && <div className="flex flex-col gap-3">{actions}</div>}
    </AuthPageShell>
  );
}
