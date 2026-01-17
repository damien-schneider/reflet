import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowUpRight, MessageSquare, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/dashboard/$orgSlug/")({
  component: OrgDashboard,
});

function OrgDashboard() {
  const { orgSlug } = Route.useParams();
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
          <h2 className="font-semibold text-xl">Organization not found</h2>
          <p className="mt-2 text-muted-foreground">
            The organization you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">{org.name}</h1>
            <p className="text-muted-foreground">
              {org.isPublic ? "Public" : "Private"} organization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={org.subscriptionTier === "pro" ? "default" : "secondary"}
            >
              {org.subscriptionTier === "pro" ? "Pro" : "Free"}
            </Badge>
            <Link params={{ orgSlug }} target="_blank" to="/$orgSlug">
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
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {stats?.feedbackCount ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">Across all boards</p>
          </CardContent>
        </Card>
      </div>

      {/* Boards List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Boards</h2>
          <Link params={{ orgSlug }} to="/dashboard/$orgSlug/boards">
            <Button>Create Board</Button>
          </Link>
        </div>

        {boards && boards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Link
                key={board._id}
                params={{ orgSlug, boardSlug: board.slug }}
                to="/dashboard/$orgSlug/boards/$boardSlug"
              >
                <Card className="cursor-pointer transition-colors hover:bg-accent">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {board.name}
                      {board.isPublic ? (
                        <Badge variant="outline">Public</Badge>
                      ) : (
                        <Badge variant="secondary">Private</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {board.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="font-semibold text-lg">No boards yet</h3>
              <p className="mb-4 text-muted-foreground">
                Create your first board to start collecting feedback.
              </p>
              <Link params={{ orgSlug }} to="/dashboard/$orgSlug/boards">
                <Button>Create Board</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
