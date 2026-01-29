"use client";

import {
  Buildings,
  CreditCard,
  Gear as GearIcon,
  GithubLogo,
  PaintBrush,
  Users,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { use } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H1, Text } from "@/components/ui/typography";

export default function GearPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="font-semibold text-xl">Organization not found</h2>
          <p className="mt-2 text-muted-foreground">
            The organization you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  const settingsItems = [
    {
      title: "General",
      description: "Manage organization name, description, and visibility",
      icon: Buildings,
      href: `/dashboard/${orgSlug}/settings/general`,
    },
    {
      title: "Branding",
      description: "Customize logo and colors for public pages",
      icon: PaintBrush,
      href: `/dashboard/${orgSlug}/settings/branding`,
    },
    {
      title: "Members",
      description: "Invite and manage team members",
      icon: Users,
      href: `/dashboard/${orgSlug}/settings/members`,
    },
    {
      title: "GitHub",
      description: "Connect GitHub to sync releases and automate changelog",
      icon: GithubLogo,
      href: `/dashboard/${orgSlug}/settings/github`,
    },
    {
      title: "Billing",
      description: "Manage subscription and payment methods",
      icon: CreditCard,
      href: `/dashboard/${orgSlug}/settings/billing`,
    },
  ];

  return (
    <div className="admin-container">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <GearIcon className="h-8 w-8 text-muted-foreground" />
          <div>
            <H1>Gear</H1>
            <Text variant="bodySmall">Manage settings for {org.name}</Text>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{org.name}</CardTitle>
                <CardDescription>
                  {org.isPublic ? "Public" : "Private"} organization
                </CardDescription>
              </div>
              <Badge
                variant={
                  org.subscriptionTier === "pro" ? "default" : "secondary"
                }
              >
                {org.subscriptionTier === "pro" ? "Pro" : "Free"}
              </Badge>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => (
          <Link href={item.href} key={item.title}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
