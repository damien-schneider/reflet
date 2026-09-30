"use client";

import { Alert, AlertDescription } from "@ctrl-ui/react/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
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
          <DialogTitle>Sign in to Reflet</DialogTitle>
          <DialogDescription>Sign in or create an account</DialogDescription>
        </DialogHeader>
        {message && (
          <div className="px-6 pt-6">
            <Alert>
              <AlertDescription className="text-center">
                {message}
              </AlertDescription>
            </Alert>
          </div>
        )}
        <UnifiedAuthForm onSuccess={closeDialog} />
      </DialogContent>
    </Dialog>
  );
}
