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
    bg: "bg-chart-2/10",
    border: "border-chart-2/30",
    icon: <Info className="h-5 w-5 text-chart-2-text" />,
    title: "Note",
  },
  success: {
    bg: "bg-success-subtle",
    border: "border-success/30",
    icon: <CircleCheck className="h-5 w-5 text-success-text" />,
    title: "Success",
  },
  tip: {
    bg: "bg-warning-subtle",
    border: "border-warning/30",
    icon: <Lightbulb className="h-5 w-5 text-warning-text" />,
    title: "Tip",
  },
  warning: {
    bg: "bg-destructive-subtle",
    border: "border-destructive/30",
    icon: <CircleAlert className="h-5 w-5 text-destructive-text" />,
    title: "Warning",
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
