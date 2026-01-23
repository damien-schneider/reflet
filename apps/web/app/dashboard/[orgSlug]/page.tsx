"use client";

import {
  ArrowUpRight,
  Chat as MessageSquare,
  TrendUp,
  Users,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";
import { use } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H1, H2, Muted } from "@/components/ui/typography";

export default function OrgDashboard({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const boards = useQuery(
    api.boards.list,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const stats = useQuery(
    api.organizations_actions.getStats,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access.
          </Muted>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <H1 variant="page">{org.name}</H1>
            <Muted>{org.isPublic ? "Public" : "Private"} organization</Muted>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={org.subscriptionTier === "pro" ? "default" : "secondary"}
            >
              {org.subscriptionTier === "pro" ? "Pro" : "Free"}
            </Badge>
            <Link href={`/${orgSlug}`} target="_blank">
              <Button size="sm" variant="outline">
                View public page
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Total Boards</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats?.boardsCount ?? 0}</div>
            <p className="text-muted-foreground text-xs">
              {org.subscriptionTier === "free" ? "1 max (Free)" : "5 max (Pro)"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats?.membersCount ?? 0}</div>
            <p className="text-muted-foreground text-xs">
              {org.subscriptionTier === "free"
                ? "3 max (Free)"
                : "10 max (Pro)"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">
              Total Feedback
            </CardTitle>
            <TrendUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {stats?.feedbackCount ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">Across all boards</p>
          </CardContent>
        </Card>
      </div>

      {/* Boards Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <H2 variant="card">Boards</H2>
          <Link href={`/dashboard/${orgSlug}/boards`}>
            <Button size="sm" variant="outline">
              View all boards
            </Button>
          </Link>
        </div>
        {boards && boards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boards.slice(0, 6).map((board) => (
              <Link
                href={`/dashboard/${orgSlug}/boards/${board.slug}`}
                key={board._id}
              >
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader>
                    <CardTitle className="text-lg">{board.name}</CardTitle>
                    <CardDescription>{board.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No boards yet. Create your first board to start collecting
                feedback.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
