"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { AuthMode } from "./hooks/use-auth-form";
import { animationVariants } from "./lib/auth-validation";

interface AuthSubmitButtonProps {
  mode: AuthMode;
  isSubmitting: boolean;
  isCheckingEmail: boolean;
  isFormValid: boolean;
  apiError: string | null;
}

function getButtonText(mode: AuthMode, isSubmitting: boolean): string {
  if (isSubmitting) {
    return "Chargement...";
  }
  if (!mode) {
    return "Continuer";
  }
  return mode === "signIn" ? "Se connecter" : "Créer mon compte";
}

export function AuthSubmitButton({
  mode,
  isSubmitting,
  isCheckingEmail,
  isFormValid,
  apiError,
}: AuthSubmitButtonProps) {
  return (
    <>
      {apiError && (
        <FieldError className="absolute" errors={[{ message: apiError }]} />
      )}
      <Button
        className="mt-6 w-full"
        data-testid="submit-button"
        disabled={isSubmitting || isCheckingEmail || !isFormValid}
        type="submit"
      >
        {getButtonText(mode, isSubmitting)}
      </Button>
    </>
  );
}

interface AuthHelperTextProps {
  mode: AuthMode;
  onResetMode: () => void;
}

export function AuthHelperText({ mode, onResetMode }: AuthHelperTextProps) {
  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          animate="animate"
          className="text-center"
          exit="exit"
          initial="initial"
          transition={{ duration: 0.3, ease: "easeInOut" }}
          variants={animationVariants}
        >
          <p className="text-muted-foreground text-sm">
            {mode === "signIn" ? (
              <>
                Vous n'avez pas de compte ?{" "}
                <button
                  className="font-medium text-olive-600 hover:underline"
                  onClick={onResetMode}
                  type="button"
                >
                  Utiliser un autre email
                </button>
              </>
            ) : (
              <>
                Vous avez déjà un compte ?{" "}
                <button
                  className="font-medium text-olive-600 hover:underline"
                  onClick={onResetMode}
                  type="button"
                >
                  Utiliser un autre email
                </button>
              </>
            )}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
