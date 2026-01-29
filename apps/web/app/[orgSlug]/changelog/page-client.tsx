"use client";

import { Bell, Calendar, Check, Envelope as Mail } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import DOMPurify from "isomorphic-dompurify";
import { use, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { H1, Lead } from "@/components/ui/typography";

export default function PublicChangelogPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const releases = useQuery(
    api.changelog.listPublished,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const subscribeToChangelog = useMutation(
    api.changelog_subscriptions.subscribeByEmail
  );

  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!(email.trim() && org?._id)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await subscribeToChangelog({
        organizationId: org._id as Id<"organizations">,
        email: email.trim().toLowerCase(),
      });
      setSubscribed(true);
    } catch (_error) {
      // Error handling
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!org) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="text-center md:text-left">
          <H1 variant="page">Changelog</H1>
          <Lead className="mt-2">
            Stay up to date with the latest updates and improvements.
          </Lead>
        </div>
        <Button onClick={() => setShowSubscribeDialog(true)} variant="outline">
          <Bell className="mr-2 h-4 w-4" />
          Subscribe
        </Button>
      </div>

      {releases && releases.length > 0 ? (
        <div className="space-y-8">
          {releases.map((release, index) => (
            <div key={release._id}>
              {index > 0 && <Separator className="mb-8" />}
              <article>
                <div className="mb-4 flex items-center gap-3">
                  <Badge
                    className="border-[var(--color-primary)] text-[var(--color-primary)]"
                    variant="outline"
                  >
                    {release.version}
                  </Badge>
                  <span className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Calendar className="h-4 w-4" />
                    {release.publishedAt
                      ? new Date(release.publishedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "Draft"}
                  </span>
                </div>
                <h2 className="mb-3 font-bold text-2xl">{release.title}</h2>
                {release.description && (
                  <div
                    className="prose prose-neutral dark:prose-invert max-w-none"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized changelog content
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(release.description),
                    }}
                  />
                )}
                {release.feedback && release.feedback.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 font-medium text-muted-foreground text-sm">
                      Shipped Features
                    </h3>
                    <ul className="space-y-2">
                      {release.feedback.filter(Boolean).map((item) => (
                        <li
                          className="flex items-center gap-2 text-sm"
                          key={item?._id}
                        >
                          <Check className="h-4 w-4 text-[var(--color-primary)]" />
                          {item?.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="font-semibold text-lg">No updates yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              We haven&apos;t published any changelog entries yet. Subscribe to
              be notified when we do!
            </p>
            <Button onClick={() => setShowSubscribeDialog(true)}>
              <Bell className="mr-2 h-4 w-4" />
              Subscribe
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog onOpenChange={setShowSubscribeDialog} open={showSubscribeDialog}>
        <DialogContent>
          {subscribed ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  Subscribed!
                </DialogTitle>
                <DialogDescription>
                  You&apos;ll receive an email whenever we publish a new update.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setShowSubscribeDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Subscribe to changelog</DialogTitle>
                <DialogDescription>
                  Get notified when we publish new updates and features.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEmail(e.target.value)
                    }
                    placeholder="your@email.com"
                    type="email"
                    value={email}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => setShowSubscribeDialog(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isSubmitting || !email.trim()}
                  onClick={handleSubscribe}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Subscribing..." : "Subscribe"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
