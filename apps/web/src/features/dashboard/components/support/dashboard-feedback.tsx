"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { ChatTeardropText } from "@phosphor-icons/react";
import { env } from "@reflet/env/web";
import { useTheme } from "next-themes";
import { RefletFeedback } from "reflet-sdk/feedback";
import { authClient } from "@/lib/auth-client";

export function DashboardFeedback() {
  const { data: session } = authClient.useSession();
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <RefletFeedback
      publicKey={env.NEXT_PUBLIC_REFLET_PUBLIC_KEY}
      renderTrigger={(props) => (
        <Button
          {...props}
          aria-label="Send feedback to Reflet"
          className="shrink-0"
          iconOnly
          title="Send feedback to Reflet"
          variant="ghost"
        >
          <ChatTeardropText className="size-4" />
        </Button>
      )}
      theme={theme}
      user={
        session?.user && {
          email: session.user.email,
          id: session.user.id,
          name: session.user.name,
        }
      }
    />
  );
}
