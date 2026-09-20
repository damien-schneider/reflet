"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { CheckCircle, Copy, LinkedinLogo, XLogo } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { use, useState } from "react";
import { toId } from "@/lib/convex-helpers";

const COPIED_RESET_MS = 2000;

export default function ShippedCardClient({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: string }>;
}) {
  const { orgSlug, feedbackId } = use(params);
  const [copied, setCopied] = useState(false);

  const meta = useQuery(api.feedback.queries.getShippedMeta, {
    id: toId("feedback", feedbackId),
  });

  const shareUrl =
    typeof window === "undefined"
      ? `/${orgSlug}/shipped/${feedbackId}`
      : window.location.href;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

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
            <CardTitle>Not found</CardTitle>
            <CardDescription>
              This feedback item doesn&apos;t exist or isn&apos;t public.
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
          <div className="mx-auto mb-4 flex items-center gap-2 rounded-full bg-success-subtle px-4 py-2 text-success-text">
            <CheckCircle size={20} weight="fill" />
            <span className="font-medium text-sm">Shipped</span>
          </div>
          <CardTitle className="text-2xl">&ldquo;{meta.title}&rdquo;</CardTitle>
          <CardDescription>
            {meta.releaseTitle
              ? `Included in ${meta.releaseTitle}`
              : `Shipped by ${meta.orgName}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {meta.description && (
            <p className="text-center text-muted-foreground text-sm">
              {meta.description.length > 200
                ? `${meta.description.slice(0, 200)}...`
                : meta.description}
            </p>
          )}

          <div className="flex flex-col items-center gap-3">
            <p className="text-muted-foreground text-sm">Share this update</p>
            <div className="flex gap-2">
              <ButtonLink
                href={twitterUrl}
                rel="noopener noreferrer"
                size="xs"
                target="_blank"
                variant="surface"
              >
                <XLogo size={16} />
                <span>Twitter</span>
              </ButtonLink>
              <ButtonLink
                href={linkedinUrl}
                rel="noopener noreferrer"
                size="xs"
                target="_blank"
                variant="surface"
              >
                <LinkedinLogo size={16} />
                <span>LinkedIn</span>
              </ButtonLink>
              <Button onClick={handleCopy} size="xs" variant="surface">
                <Copy size={16} />
                <span>{copied ? "Copied!" : "Copy link"}</span>
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
