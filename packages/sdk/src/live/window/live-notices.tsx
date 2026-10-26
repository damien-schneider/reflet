import { Alert, AlertAction, AlertDescription } from "@ctrl-ui/react/ui/alert";
import { Button } from "@ctrl-ui/react/ui/button";
import { dismissNotice, useNotices } from "../../devtools/client/notices";

export function LiveNotices() {
  const notices = useNotices();
  return (
    <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
      {notices.map((notice) => (
        <Alert
          key={notice.id}
          role={notice.kind === "failure" ? "alert" : undefined}
          variant={notice.kind === "failure" ? "destructive" : "default"}
        >
          <AlertDescription>{notice.message}</AlertDescription>
          <AlertAction className="flex gap-1">
            {notice.action && (
              <Button
                onClick={() => {
                  dismissNotice(notice.id);
                  notice.action?.run();
                }}
                size="sm"
                variant="surface"
              >
                {notice.action.label}
              </Button>
            )}
            <Button
              onClick={() => dismissNotice(notice.id)}
              size="sm"
              variant="ghost"
            >
              Dismiss
            </Button>
          </AlertAction>
        </Alert>
      ))}
    </div>
  );
}
