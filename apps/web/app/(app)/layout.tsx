import { Toaster } from "@ctrl-ui/react/ui/toast";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { Providers } from "@/lib/providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {children}
      <Toaster />
      <AuthDialog />
    </Providers>
  );
}
