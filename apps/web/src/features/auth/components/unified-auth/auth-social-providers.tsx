"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { GithubLogo, GoogleLogo } from "@phosphor-icons/react";
import { capture } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

export function AuthSocialProviders() {
  return (
    <div className="mb-6 space-y-2">
      <Button
        className="w-full"
        onClick={() => {
          capture("sign_in_completed", { method: "google" });
          authClient.signIn.social({
            callbackURL: "/dashboard",
            provider: "google",
          });
        }}
        type="button"
        variant="surface"
      >
        <GoogleLogo className="mr-2 size-5" weight="bold" />
        Continue with Google
      </Button>
      <Button
        className="w-full"
        onClick={() => {
          capture("sign_in_completed", { method: "github" });
          authClient.signIn.social({
            callbackURL: "/dashboard",
            provider: "github",
          });
        }}
        type="button"
        variant="surface"
      >
        <GithubLogo className="mr-2 size-5" weight="fill" />
        Continue with GitHub
      </Button>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">
          Or continue with email
        </span>
      </div>
    </div>
  );
}
