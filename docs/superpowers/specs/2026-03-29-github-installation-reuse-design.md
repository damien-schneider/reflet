# GitHub Connection Redesign: User-Level Installation

## Problem

GitHub App installations are tied to a **GitHub account**, not to a Reflet org. The current model stores the installation on the org, so:

- Connecting a second Reflet org with the same GitHub account fails (GitHub redirects to existing installation settings instead of firing the callback)
- The connection is conceptually wrong — it's a user's GitHub account, not an org's

## New Model

**GitHub connection belongs to the user, not the org.** An org links a repo by borrowing a team member's GitHub installation.

### Concepts

| Concept | Description |
|---------|-------------|
| **User GitHub Connection** | A user installs the GitHub App once. Stored on their user identity. One per user. |
| **Org Repo Link** | An admin links a repo from their (or a teammate's) available repos to an org. The link records which user's installation is being used. |

### User Stories

1. **Solo user, multiple orgs:** User connects GitHub once. Links repo A to Org 1, repo B to Org 2. Both work off the same installation.
2. **Team scenario:** User A (GitHub connected) links repo X to the org. User B (no GitHub) benefits from synced releases, issues, etc. User B doesn't need GitHub connected.
3. **Multiple team members with GitHub:** User A has access to repos in GitHub Org Alpha. User B has access to repos in GitHub Org Beta. Both can link repos to the same Reflet org from their respective installations.
4. **Member leaves:** User A linked the repo and leaves the org. The repo link is marked as disconnected. Another admin with GitHub connected re-links it.

## Schema Changes

### New table: `userGithubConnections`

Replaces the user-identity aspect of the current `githubConnections` table.

```
userGithubConnections: defineTable({
  userId: v.string(),                    // auth user ID (same as organizationMembers.userId)
  installationId: v.string(),
  accountType: v.union(v.literal("user"), v.literal("organization")),
  accountLogin: v.string(),
  accountAvatarUrl: v.optional(v.string()),
  status: githubConnectionStatus,        // "connected" | "disconnected" | "error"
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_installation", ["installationId"])
```

### Modify table: `githubConnections` → becomes the org repo link

The existing `githubConnections` table stays but its meaning changes. It becomes "which repo is linked to this org, and via whose installation."

Add field:
- `linkedByUserId: v.string()` — the user whose installation powers this link

The `installationId` field stays (denormalized for quick token generation). The `accountLogin`/`accountAvatarUrl` fields stay (for display). The `status` field gains a new state: `"owner_left"` — set when the linking user leaves the org.

### Validators update

Add `"owner_left"` to `githubConnectionStatus` in `shared/validators.ts`.

## Flow Changes

### Connect GitHub (user-level)

**Where:** User profile/account settings, or inline from the org settings page when no team member has GitHub connected.

1. User clicks "Connect GitHub"
2. Redirect to `/api/github/install?userId=<userId>` (no orgId needed)
3. GitHub App installation flow
4. Callback creates/updates `userGithubConnections` row for this user
5. User is redirected back

### Link Repo to Org

**Where:** Org GitHub settings page (replaces current "Connect GitHub" + "Select Repository" flow).

1. Page loads → query finds all team members who have `userGithubConnections` with `status: "connected"`
2. **If at least one exists:**
   - Show available installations: "Link a repository using @username's GitHub" (for each connected member)
   - Admin picks an installation → fetch repos via that installation's token → admin picks a repo
   - Creates/updates `githubConnections` row with `organizationId`, `installationId`, `linkedByUserId`, repo details
3. **If none exist and current user is admin:**
   - Show "No team member has GitHub connected. Connect your GitHub account to get started."
   - Button links to the GitHub connect flow (step above)
   - After connecting, returns to this page where the user can now link a repo

### Member Leaves Org

When a member is removed from an org:
1. Check if any `githubConnections` in that org have `linkedByUserId` matching the removed user
2. If so, set those connections' status to `"owner_left"`
3. The org settings page shows: "GitHub connection lost — @username who linked this repo is no longer a member. An admin with GitHub connected can re-link."
4. Any admin can re-link by selecting from available installations (same flow as initial linking)

### GitHub App Uninstalled (webhook)

When GitHub sends an `installation.deleted` webhook:
1. Find `userGithubConnections` by `installationId` → mark as `"disconnected"`
2. Find ALL `githubConnections` with that `installationId` → mark as `"disconnected"`, clean up related data (releases, events, mappings)

## Backend Changes Summary

### New files
- None — changes fit in existing files

### Modified files

**`packages/backend/convex/shared/validators.ts`**
- Add `"owner_left"` to `githubConnectionStatus`

**`packages/backend/convex/integrations/github/tableFields.ts`**
- Add `userGithubConnections` table definition
- Add `linkedByUserId: v.string()` to `githubConnections`

**`packages/backend/convex/integrations/github/queries.ts`**
- `getUserGithubConnection(userId)` — get the current user's GitHub connection
- `getOrgAvailableInstallations(organizationId)` — find all org members who have a `userGithubConnection`, return their installation info
- Existing queries (`getConnectionStatus`, etc.) remain mostly unchanged — they read from `githubConnections` which still exists

**`packages/backend/convex/integrations/github/mutations.ts`**
- `saveUserInstallation(...)` — create/update `userGithubConnections` for a user
- `linkRepoToOrg(organizationId, userGithubConnectionId, repositoryId, ...)` — create/update `githubConnections` with `linkedByUserId`
- `handleMemberRemoved(organizationId, userId)` — mark connections as `"owner_left"` (called from member removal mutation)
- Update `handleInstallationDeleted` — also handle `userGithubConnections` + all org connections sharing that `installationId`

**`packages/backend/convex/integrations/github/actions.ts`**
- `saveInstallationFromCallback` — now creates a `userGithubConnections` row instead of an org-level one

**`apps/web/app/api/github/install/route.ts`**
- Remove `organizationId` requirement — only needs a return URL
- State param carries `userId` (or we infer from session) and optional `orgSlug` for redirect-back

**`apps/web/app/api/github/callback/route.ts`**
- Call `saveUserInstallation` instead of `saveInstallationInternal`
- Redirect back to org settings if `orgSlug` was in state, otherwise to account settings

### Frontend changes

**`apps/web/src/features/github/hooks/use-github-settings.ts`**
- Add query for `getUserGithubConnection` (current user's connection)
- Add query for `getOrgAvailableInstallations` (team's connections)
- Replace `connectHref` logic: if user has no GitHub connection, link to GitHub install; if they do, go straight to repo selection
- Add `handleLinkRepo` mutation call
- Add `handleRelinkRepo` for re-linking after owner leaves

**`apps/web/src/features/github/components/github-connection-card.tsx`**
- When not connected: show available installations from team, or prompt to connect GitHub
- When status is `"owner_left"`: show re-link prompt

**`apps/web/app/(app)/dashboard/[orgSlug]/settings/github/page.tsx`**
- Adapt to new data flow (available installations instead of single connect button)

## Migration

### Data migration needed

Existing `githubConnections` rows don't have `linkedByUserId`. Migration steps:

1. For each existing `githubConnections` row:
   - Find an admin member of that org
   - Create a `userGithubConnections` row for that admin with the `installationId` and account info
   - Set `linkedByUserId` on the `githubConnections` row to that admin's userId
2. Make `linkedByUserId` optional during migration, required after

### Schema deployment order

1. Deploy schema with `linkedByUserId` as optional + new `userGithubConnections` table
2. Run migration to backfill
3. Deploy schema with `linkedByUserId` as required (or keep optional for safety)

## Edge Cases

### Token generation
`getInstallationToken` takes an `installationId`. It works the same — the installation is valid regardless of which user or org triggered it. No change needed.

### Repo picker shows repos from another user's installation
This is intentional. If User A connected GitHub and has access to repos X, Y, Z, then any admin in the org can link one of those repos. They're borrowing User A's installation access.

### Same repo linked to multiple orgs
Supported. Two orgs can link the same repo — they each have their own `githubConnections` row, potentially using different (or the same) user's installation.

### User reconnects GitHub with a different account
The `userGithubConnections` row is updated (upsert by userId). Any org repo links using the old installation need to verify they still work — if the new installation doesn't have access to the same repos, those links become stale. We should check installation validity when repos are accessed and surface errors.

## Testing

- `saveUserInstallation` — creates and updates correctly
- `getOrgAvailableInstallations` — returns installations from all org members, not just the current user
- `linkRepoToOrg` — requires admin, links correctly
- `handleMemberRemoved` — sets `"owner_left"` on affected connections
- `handleInstallationDeleted` — cleans up both `userGithubConnections` and all related `githubConnections`
- Component tests for the new repo-linking UI states (no installations, available installations, owner_left state)
