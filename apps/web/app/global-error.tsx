"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { ArrowClockwise, House, Warning } from "@phosphor-icons/react";
import { ThemeProvider } from "@/lib/theme-provider";

import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html
      data-skin="refined"
      data-theme="reflet"
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          <main
            className="flex min-h-svh flex-col items-center justify-center p-8 text-center"
            role="alert"
          >
            <span
              aria-hidden="true"
              className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive-text"
            >
              <Warning className="size-6" weight="fill" />
            </span>
            <h1 className="mt-6 text-balance font-semibold text-2xl text-foreground">
              Something went wrong
            </h1>
            <p className="mt-2 max-w-md text-pretty text-muted-foreground">
              Reflet couldn’t load. Try again, or go back to the home page.
            </p>

            {process.env.NODE_ENV === "development" && error.message ? (
              <code className="mt-4 max-w-lg overflow-auto rounded-md bg-muted px-4 py-2 text-muted-foreground text-sm">
                {error.message}
              </code>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={reset} tone="primary" variant="solid">
                <ArrowClockwise
                  aria-hidden="true"
                  className="size-4"
                  data-icon="inline-start"
                />
                Try again
              </Button>
              <ButtonLink href="/" variant="ghost">
                <House
                  aria-hidden="true"
                  className="size-4"
                  data-icon="inline-start"
                />
                Go home
              </ButtonLink>
            </div>

            {error.digest ? (
              <p className="mt-4 text-caption text-muted-foreground">
                Error reference:{" "}
                <span className="select-all font-mono">{error.digest}</span>
              </p>
            ) : null}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
