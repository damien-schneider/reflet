"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  authDialogMessageAtom,
  authDialogOpenAtom,
  closeAuthDialogAtom,
} from "@/store/auth";
import UnifiedAuthForm from "./unified-auth/unified-auth-form";

export function AuthDialog() {
  const [isOpen, setIsOpen] = useAtom(authDialogOpenAtom);
  const closeDialog = useSetAtom(closeAuthDialogAtom);
  const message = useAtomValue(authDialogMessageAtom);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Authentification</DialogTitle>
          <DialogDescription>
            Connectez-vous ou créez un compte
          </DialogDescription>
        </DialogHeader>
        {message && (
          <div className="px-6 pt-6 pb-0">
            <div className="rounded-lg border border-olive-200 bg-olive-50 p-4 dark:border-olive-800 dark:bg-olive-950/50">
              <p className="text-center text-muted-foreground text-sm">
                {message}
              </p>
            </div>
          </div>
        )}
        <UnifiedAuthForm onSuccess={closeDialog} />
      </DialogContent>
    </Dialog>
  );
}
