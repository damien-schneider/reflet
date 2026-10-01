"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  type AccountTab,
  accountTabSchema,
} from "@/features/account/lib/account-tabs";

export function useAccountTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsedTab = accountTabSchema.safeParse(searchParams.get("tab"));
  const activeTab = parsedTab.success ? parsedTab.data : "profile";
  const setActiveTab = (tab: AccountTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/dashboard/account?${params}`, { scroll: false });
  };
  return { activeTab, setActiveTab };
}
