"use client";

import { CheckCircle, Copy, LinkedinLogo, XLogo } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";
import { use, useCallback, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShippedCardClient({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: string }>;
}) {
  const { orgSlug, feedbackId } = use(params);
  const [copied, setCopied] = useState(false);

  const meta = useQuery(api.feedback.queries.getShippedMeta, {
    id: feedbackId as Id<"feedback">,
  });

  const shareUrl =
    typeof window === "undefined"
      ? `/${orgSlug}/shipped/${feedbackId}`
      : window.location.href;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shareUrl]);

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
          <div className="mx-auto mb-4 flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-green-800 dark:bg-green-900/30 dark:text-green-400">
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
              <a
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={twitterUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <XLogo size={16} />
                <span>Twitter</span>
              </a>
              <a
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={linkedinUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <LinkedinLogo size={16} />
                <span>LinkedIn</span>
              </a>
              <Button onClick={handleCopy} size="sm" variant="outline">
                <Copy size={16} />
                <span>{copied ? "Copied!" : "Copy link"}</span>
              </Button>
            </div>
          </div>

          <div className="text-center">
            <Link
              className={buttonVariants({ variant: "link" })}
              href={`/${orgSlug}/feedback/${feedbackId}`}
            >
              View full feedback
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
