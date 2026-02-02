"use client";

import { AnimatePresence, motion } from "motion/react";
import { H1, Muted } from "@/components/ui/typography";
import type { AuthMode } from "./hooks/use-auth-form";
import { titleVariants } from "./lib/auth-validation";

interface AuthHeaderProps {
  mode: AuthMode;
}

function getTitle(mode: AuthMode): string {
  if (!mode) {
    return "Authentication";
  }
  return mode === "signIn" ? "Welcome back" : "Create an account";
}

function getDescription(mode: AuthMode): string {
  if (!mode) {
    return "Enter your email to continue";
  }
  return mode === "signIn"
    ? "Sign in with your email and password"
    : "Complete the information to create your account";
}

export function AuthHeader({ mode }: AuthHeaderProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate="animate"
        exit="exit"
        initial="initial"
        key={mode || "initial"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        variants={titleVariants}
      >
        <H1 className="mb-2 text-center" variant="page">
          {getTitle(mode)}
        </H1>
        <Muted className="mb-6 text-center">{getDescription(mode)}</Muted>
      </motion.div>
    </AnimatePresence>
  );
}
