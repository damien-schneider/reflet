import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { Crown } from "@phosphor-icons/react";
import Link from "next/link";

interface GoProBannerProps {
  orgSlug: string;
}

export function GoProBanner({ orgSlug }: GoProBannerProps) {
  return (
    <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
      <ButtonLink
        className="w-full justify-start"
        render={<Link href={`/dashboard/${orgSlug}/project/billing`} />}
        size="xs"
      >
        <Crown className="size-4" />
        Upgrade
      </ButtonLink>
    </div>
  );
}
