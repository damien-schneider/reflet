import type { Metadata } from "next";
import { ThreadLinkView } from "@/features/support/components/thread-link/thread-link-view";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Support conversation",
};

export default async function SupportThreadLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ThreadLinkView token={token} />;
}
