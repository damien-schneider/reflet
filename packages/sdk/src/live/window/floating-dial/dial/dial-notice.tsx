import { Button } from "@ctrl-ui/react/ui/button";
import { Text } from "@ctrl-ui/react/ui/typography";

export interface DialNoticeAction {
  label: string;
  onClick: () => void;
}

export function DialNotice({
  actions,
  description,
  isFailure = false,
  title,
}: {
  actions: DialNoticeAction[];
  description: string;
  isFailure?: boolean;
  title?: string;
}) {
  return (
    <div
      className="live-dial-notice absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-full px-7"
      role={isFailure ? "alert" : "status"}
    >
      <div className="flex flex-col gap-0.5">
        {title && (
          <Text size="label" weight="semibold">
            {title}
          </Text>
        )}
        <Text
          className="line-clamp-4"
          size="caption"
          title={description}
          tone={isFailure ? "destructive" : "muted"}
        >
          {description}
        </Text>
      </div>
      <div className="flex flex-col items-stretch gap-1">
        {actions.map((action, index) => (
          <Button
            key={action.label}
            onClick={action.onClick}
            size="xs"
            tone={index === 0 ? "primary" : "neutral"}
            variant={index === 0 ? "solid" : "ghost"}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
