import { useAtom, useSetAtom } from "jotai";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  authDialogModeAtom,
  authDialogOpenAtom,
  closeAuthDialogAtom,
} from "@/store/auth";

export function AuthDialog() {
  const [isOpen, setIsOpen] = useAtom(authDialogOpenAtom);
  const [mode, setMode] = useAtom(authDialogModeAtom);
  const closeDialog = useSetAtom(closeAuthDialogAtom);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {mode === "signIn" ? "Sign In" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signIn"
              ? "Sign in to your account"
              : "Create a new account"}
          </DialogDescription>
        </DialogHeader>
        <div className="p-6">
          {mode === "signIn" ? (
            <SignInForm
              onSuccess={closeDialog}
              onSwitchToSignUp={() => setMode("signUp")}
            />
          ) : (
            <SignUpForm
              onSuccess={closeDialog}
              onSwitchToSignIn={() => setMode("signIn")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
