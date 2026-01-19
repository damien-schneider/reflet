import { useAtom, useSetAtom } from "jotai";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UnifiedAuthForm from "@/components/unified-auth-form";
import { authDialogOpenAtom, closeAuthDialogAtom } from "@/store/auth";

export function AuthDialog() {
  const [isOpen, setIsOpen] = useAtom(authDialogOpenAtom);
  const closeDialog = useSetAtom(closeAuthDialogAtom);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Authentification</DialogTitle>
          <DialogDescription>
            Connectez-vous ou créez un compte
          </DialogDescription>
        </DialogHeader>
        <UnifiedAuthForm onSuccess={closeDialog} />
      </DialogContent>
    </Dialog>
  );
}
