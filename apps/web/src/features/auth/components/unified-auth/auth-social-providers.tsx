"use client";

import { GithubLogo, GoogleLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function AuthSocialProviders() {
  return (
    <div className="mb-6 space-y-2">
      <Button
        className="w-full"
        onClick={() => {
          authClient.signIn.social({
            provider: "google",
            callbackURL: "/dashboard",
          });
        }}
        type="button"
        variant="outline"
      >
        <GoogleLogo className="mr-2 size-5" weight="bold" />
        Continue with Google
      </Button>
      <Button
        className="w-full"
        onClick={() => {
          authClient.signIn.social({
            provider: "github",
            callbackURL: "/dashboard",
          });
        }}
        type="button"
        variant="outline"
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
