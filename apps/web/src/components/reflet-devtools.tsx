"use client";

import { env } from "@reflet/env/web";
import { RefletFeedback } from "reflet-sdk/feedback";

export function RefletDevtools() {
  return (
    <RefletFeedback
      captureConsole={false}
      enabled={false}
      publicKey={env.NEXT_PUBLIC_REFLET_PUBLIC_KEY}
    />
  );
}
