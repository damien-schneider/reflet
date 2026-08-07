import { Crown } from "@phosphor-icons/react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoProBannerProps {
  orgSlug: string;
}

export function GoProBanner({ orgSlug }: GoProBannerProps) {
  return (
    <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
      <Link
        className={cn(
          buttonVariants({ size: "sm", variant: "ghost" }),
          "w-full justify-start"
        )}
        href={`/dashboard/${orgSlug}/project/billing`}
      >
        <Crown className="size-4" />
        Upgrade
      </Link>
    </div>
  );
}
