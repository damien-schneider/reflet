"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import {
  Check,
  CheckCircle,
  Copy,
  LinkedinLogo,
  WarningCircle,
  XLogo,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { use } from "react";
import { useCopyFeedback } from "@/hooks/use-copy-feedback";
import { toId } from "@/lib/convex-helpers";

const COPY_LINK_LABEL = {
  copied: "Link copied",
  failed: "Couldn’t copy link",
  idle: "Copy link",
} as const;

const COPY_LINK_ICON = {
  copied: Check,
  failed: WarningCircle,
  idle: Copy,
} as const;

export default function ShippedCardClient({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: string }>;
}) {
  const { orgSlug, feedbackId } = use(params);
  const { copy, state: copyState } = useCopyFeedback();
  const CopyLinkIcon = COPY_LINK_ICON[copyState];

  const meta = useQuery(api.feedback.queries.getShippedMeta, {
    id: toId("feedback", feedbackId),
  });

  const shareUrl =
    typeof window === "undefined"
      ? `/${orgSlug}/shipped/${feedbackId}`
      : window.location.href;

  if (meta === undefined) {
    return (
      <div className="container mx-auto flex max-w-2xl justify-center px-4 py-16">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="container mx-auto flex max-w-2xl justify-center px-4 py-16">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle>Update not found</CardTitle>
            <CardDescription>
              This feedback doesn’t exist or isn’t public.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`"${meta.title}" has been shipped by ${meta.orgName}! 🚀`)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="container mx-auto flex max-w-2xl justify-center px-4 py-16">
      <Card className="w-full">
        <CardHeader className="text-center">
          <Badge className="mx-auto mb-4" color="green" size="md">
            <CheckCircle aria-hidden weight="fill" />
            Shipped
          </Badge>
          <CardTitle className="text-balance text-2xl">
            &ldquo;{meta.title}&rdquo;
          </CardTitle>
          <CardDescription>
            {meta.releaseTitle
              ? `Included in ${meta.releaseTitle}`
              : `Shipped by ${meta.orgName}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {meta.description && (
            <p className="mx-auto max-w-prose text-pretty text-center text-muted-foreground text-sm">
              {meta.description.length > 200
                ? `${meta.description.slice(0, 200).trimEnd()}…`
                : meta.description}
            </p>
          )}

          <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-sm">Share this update</p>
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink
                href={twitterUrl}
                rel="noopener noreferrer"
                size="xs"
                target="_blank"
                variant="surface"
              >
                <XLogo aria-hidden data-icon="inline-start" />
                <span>Share on X</span>
              </ButtonLink>
              <ButtonLink
                href={linkedinUrl}
                rel="noopener noreferrer"
                size="xs"
                target="_blank"
                variant="surface"
              >
                <LinkedinLogo aria-hidden data-icon="inline-start" />
                <span>Share on LinkedIn</span>
              </ButtonLink>
              <Button
                onClick={() => copy(shareUrl).catch(() => undefined)}
                size="xs"
                variant="surface"
              >
                <CopyLinkIcon aria-hidden data-icon="inline-start" />
                <span aria-live="polite">{COPY_LINK_LABEL[copyState]}</span>
              </Button>
            </div>
          </div>

          <div className="text-center">
            <ButtonLink
              render={<Link href={`/${orgSlug}/feedback/${feedbackId}`} />}
            >
              View full feedback
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
