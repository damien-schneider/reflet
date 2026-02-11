import { Crown } from "@phosphor-icons/react";
import Link from "next/link";

interface GoProBannerProps {
  orgSlug: string;
}

export function GoProBanner({ orgSlug }: GoProBannerProps) {
  return (
    <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
      <div className="space-y-2 rounded-lg border border-violet-600/20 bg-violet-600/5 p-3">
        <div className="flex items-center gap-2">
          <Crown className="size-4 shrink-0 text-violet-600" weight="fill" />
          <h3 className="font-medium text-sm text-violet-600">
            Passer au plan Pro
          </h3>
        </div>
        <p className="text-muted-foreground text-xs">
          Membres illimités, feedbacks illimités et plus encore.
        </p>
        <Link
          className="flex h-7 w-full items-center justify-center rounded-md bg-violet-600 font-medium text-white text-xs hover:bg-violet-700"
          href={`/dashboard/${orgSlug}/settings/billing`}
        >
          Go Pro
        </Link>
      </div>
    </div>
  );
}
