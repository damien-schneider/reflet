"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { FieldSeparator } from "@ctrl-ui/react/ui/field";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { GithubLogo, GoogleLogo } from "@phosphor-icons/react";
import { useState } from "react";
import { capture } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

type SocialProvider = "google" | "github";

interface AuthSocialProvidersProps {
  redirectTo?: string;
}

export function AuthSocialProviders({ redirectTo }: AuthSocialProvidersProps) {
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
    null
  );

  const signInWith = async (provider: SocialProvider) => {
    setPendingProvider(provider);
    capture("sign_in_completed", { method: provider });
    try {
      const result = await authClient.signIn.social({
        callbackURL: redirectTo ?? "/dashboard",
        provider,
      });
      if (result?.error) {
        setPendingProvider(null);
      }
    } catch {
      setPendingProvider(null);
    }
  };

  return (
    <div className="mb-6 space-y-2">
      <Button
        className="w-full"
        disabled={pendingProvider !== null}
        onClick={() => signInWith("google")}
        type="button"
        variant="surface"
      >
        {pendingProvider === "google" ? (
          <Spinner data-icon="inline-start" size="xs" />
        ) : (
          <GoogleLogo aria-hidden data-icon="inline-start" weight="bold" />
        )}
        Continue with Google
      </Button>
      <Button
        className="w-full"
        disabled={pendingProvider !== null}
        onClick={() => signInWith("github")}
        type="button"
        variant="surface"
      >
        {pendingProvider === "github" ? (
          <Spinner data-icon="inline-start" size="xs" />
        ) : (
          <GithubLogo aria-hidden data-icon="inline-start" weight="fill" />
        )}
        Continue with GitHub
      </Button>
    </div>
  );
}

export function AuthDivider() {
  return (
    <FieldSeparator className="mb-6 text-xs">
      Or continue with email
    </FieldSeparator>
  );
}
