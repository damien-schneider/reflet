"use client";

import { useRouter } from "next/navigation";
import { use, useEffect } from "react";

export default function AIPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/${orgSlug}/project`);
  }, [orgSlug, router]);

  return null;
}
