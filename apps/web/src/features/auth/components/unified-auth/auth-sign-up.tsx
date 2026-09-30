"use client";

import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";
import { H1, Muted } from "@/components/ui/typography";
import type { AuthMode } from "./hooks/use-auth-form";
import { titleVariants } from "./lib/auth-validation";

interface AuthHeaderProps {
  mode: AuthMode;
}

function getTitle(mode: AuthMode): string {
  if (!mode) {
    return "Sign in or create an account";
  }
  return mode === "signIn" ? "Welcome back" : "Create your account";
}

function getDescription(mode: AuthMode): string {
  if (!mode) {
    return "Enter your email to continue.";
  }
  return mode === "signIn"
    ? "Enter your password to sign in."
    : "Choose a password to finish creating your account.";
}

export function AuthHeader({ mode }: AuthHeaderProps) {
  return (
    <div aria-live="polite" className="mb-6 text-center">
      <LazyMotion features={domAnimation}>
        <AnimatePresence initial={false} mode="wait">
          <m.div
            animate="animate"
            exit="exit"
            initial="initial"
            key={mode ?? "initial"}
            variants={titleVariants}
          >
            <H1 className="mb-2" variant="page">
              {getTitle(mode)}
            </H1>
            <Muted>{getDescription(mode)}</Muted>
          </m.div>
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
