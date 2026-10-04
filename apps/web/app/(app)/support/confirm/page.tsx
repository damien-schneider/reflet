import type { Metadata } from "next";
import { Suspense } from "react";
import {
  ContactConfirmation,
  ContactConfirmationPending,
} from "@/features/support/components/thread-link/contact-confirmation";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Confirm your email",
};

export default function SupportContactConfirmPage() {
  return (
    <Suspense fallback={<ContactConfirmationPending />}>
      <ContactConfirmation />
    </Suspense>
  );
}
