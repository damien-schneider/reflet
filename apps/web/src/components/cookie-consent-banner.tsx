"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CONSENT_KEY, getCookieConsent } from "@/lib/cookie-consent";

const subscribeToNothing = () => () => undefined;
const hasStoredConsent = () => getCookieConsent() !== null;
const hasStoredConsentOnServer = () => true;

export function CookieConsentBanner() {
  const pathname = usePathname();
  const storedConsent = useSyncExternalStore(
    subscribeToNothing,
    hasStoredConsent,
    hasStoredConsentOnServer
  );
  const [dismissed, setDismissed] = useState(false);
  const visible = !(storedConsent || dismissed);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setDismissed(true);
    window.location.reload();
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setDismissed(true);
  };

  if (!visible) {
    return null;
  }

  return (
    <section
      aria-label="Cookie consent"
      className={cn(
        "fixed inset-x-3 z-50",
        pathname.startsWith("/dashboard") ? "bottom-28 sm:bottom-3" : "bottom-3"
      )}
    >
      <div className="mx-auto flex max-w-xl flex-wrap items-center gap-x-3 gap-y-2 rounded-(--radius-panel) border border-border bg-popover p-3 text-popover-foreground shadow-sm">
        <p className="min-w-48 flex-1 text-pretty text-body text-muted-foreground">
          Allow analytics cookies to help us improve Reflet?{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href="/cookies"
          >
            Cookie policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button onClick={handleReject} size="sm" variant="ghost">
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            size="sm"
            tone="primary"
            variant="solid"
          >
            Allow
          </Button>
        </div>
      </div>
    </section>
  );
}
