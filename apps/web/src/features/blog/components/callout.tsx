import { CircleAlert, CircleCheck, Info, Lightbulb } from "lucide-react";

import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "tip" | "warning" | "success";

interface CalloutProps {
  children: React.ReactNode;
  title?: string;
  type?: CalloutType;
}

const styles: Record<
  CalloutType,
  { bg: string; border: string; icon: React.ReactNode; title: string }
> = {
  info: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/15",
    icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    title: "Note",
  },
  tip: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/15",
    icon: <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    title: "Tip",
  },
  warning: {
    bg: "bg-red-500/5",
    border: "border-red-500/15",
    icon: <CircleAlert className="h-5 w-5 text-red-600 dark:text-red-400" />,
    title: "Warning",
  },
  success: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/15",
    icon: (
      <CircleCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
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
