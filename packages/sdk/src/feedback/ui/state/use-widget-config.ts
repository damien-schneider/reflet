import { useContext, useMemo } from "react";
import { Reflet } from "../../../client";
import { RefletContext } from "../../../react-context";
import type { RefletFeedbackProps } from "../../types";

function dismissalDuration(days: number | undefined) {
  return days !== undefined && Number.isFinite(days) && days > 0 ? days : null;
}

export function useWidgetConfig(props: RefletFeedbackProps) {
  const context = useContext(RefletContext);
  const publicKey = props.publicKey ?? context?.publicKey;
  const baseUrl = props.baseUrl ?? context?.baseUrl;
  const user = props.user ?? context?.user;
  const userToken = props.userToken ?? context?.userToken;
  const client = useMemo(
    () =>
      publicKey ? new Reflet({ baseUrl, publicKey, user, userToken }) : null,
    [baseUrl, publicKey, user, userToken]
  );
  return {
    client,
    dismissalKey: `reflet-feedback-dismissed:${publicKey ?? "default"}:${user?.id ?? "anonymous"}`,
    dismissForDays: dismissalDuration(props.dismissForDays),
    isAnonymous: !(user || userToken),
  };
}
