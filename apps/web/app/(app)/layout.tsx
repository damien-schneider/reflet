import { Agentation } from "agentation";
import { Toaster } from "@/components/ui/sonner";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { Providers } from "@/lib/providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      {children}
      <Toaster richColors />
      <AuthDialog />
      {process.env.NODE_ENV === "development" && <Agentation />}
    </Providers>
  );
}
