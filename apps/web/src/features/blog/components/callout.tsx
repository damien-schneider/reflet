import { AlertCircle, CheckCircle, Info, Lightbulb } from "lucide-react";

import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "tip" | "warning" | "success";

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const styles: Record<
  CalloutType,
  { bg: string; border: string; icon: React.ReactNode; title: string }
> = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    title: "Note",
  },
  tip: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    icon: <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    title: "Tip",
  },
  warning: {
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-800",
    icon: <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
    title: "Warning",
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: (
      <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
    ),
    title: "Success",
  },
};

export function Callout({ type = "info", title, children }: CalloutProps) {
  const style = styles[type];

  return (
    <div className={cn("my-6 rounded-lg border p-4", style.border, style.bg)}>
      <div className="flex gap-3">
        <div className="flex-shrink-0">{style.icon}</div>
        <div>
          <Text className="mb-1 font-semibold">{title ?? style.title}</Text>
          <div className="text-muted-foreground text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
