import { Alert, AlertDescription, AlertTitle } from "@ctrl-ui/react/ui/alert";
import { WarningCircle } from "@phosphor-icons/react";

type SendingPauseReason = "complaint_rate" | "bounce_rate" | "platform";

const PAUSE_DESCRIPTIONS: Record<SendingPauseReason, string> = {
  bounce_rate:
    "Too many replies bounced. Check that customer addresses are correct, then contact Reflet support to resume sending.",
  complaint_rate:
    "Too many customers marked your emails as spam. Contact Reflet support to resume sending.",
  platform:
    "Reflet paused email sending for this organization. Contact Reflet support to learn more.",
};

export function SendingPausedAlert({
  reason,
}: {
  reason: SendingPauseReason | undefined;
}) {
  return (
    <Alert variant="destructive">
      <WarningCircle aria-hidden />
      <AlertTitle>Customer emails are paused</AlertTitle>
      <AlertDescription>
        {reason
          ? PAUSE_DESCRIPTIONS[reason]
          : "Contact Reflet support to resume sending."}{" "}
        Replies still appear on the customer’s conversation page.
      </AlertDescription>
    </Alert>
  );
}
