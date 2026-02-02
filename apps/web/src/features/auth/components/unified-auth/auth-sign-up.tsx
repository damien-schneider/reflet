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
    return "Authentification";
  }
  return mode === "signIn" ? "Bon retour parmi nous" : "Créer un compte";
}

function getDescription(mode: AuthMode): string {
  if (!mode) {
    return "Entrez votre email pour continuer";
  }
  return mode === "signIn"
    ? "Connectez-vous avec votre email et mot de passe"
    : "Complétez les informations pour créer votre compte";
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
