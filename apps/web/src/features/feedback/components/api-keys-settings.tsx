"use client";

import {
  BookOpen,
  Code,
  Copy,
  Eye,
  EyeSlash,
  Key,
  Plus,
  Robot,
  Warning,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ApiKeysSettingsProps {
  boardId: Id<"boards">;
}

// Generate AI prompt for SDK integration
function generateAiPrompt(publicKey: string): string {
  return `# Reflet SDK Integration Request

I want to integrate Reflet feedback collection into my application. Please analyze my codebase and implement the integration following best practices.

## My API Credentials

\`\`\`
NEXT_PUBLIC_REFLET_KEY=${publicKey}
NEXT_PUBLIC_REFLET_URL=<Your Convex deployment URL, e.g., https://your-deployment.convex.cloud>
REFLET_SECRET_KEY=<I will add this to my environment variables>
\`\`\`

## Your Task

Please complete these steps:

### Step 1: Analyze My Codebase

Before writing any code, please check:
1. **Package manager**: Check for \`bun.lockb\`, \`pnpm-lock.yaml\`, \`yarn.lock\`, or \`package-lock.json\` to determine which package manager I use
2. **Framework**: Identify if I'm using React, Next.js, Vue, Svelte, or vanilla JS/TS
3. **Authentication**: Find my existing auth system (NextAuth, Clerk, Supabase Auth, Firebase Auth, Better Auth, custom JWT, etc.) and how to get the current user
4. **UI Components**: Check if I have a component library (shadcn/ui, Radix, Chakra, MUI, Tailwind, etc.) to match the design system
5. **File structure**: Understand my project organization to place files correctly

### Step 2: Install the SDK

Use my project's package manager:
\`\`\`bash
# Use whichever is appropriate for my project:
npm install reflet-sdk
# or: yarn add reflet-sdk
# or: pnpm add reflet-sdk
# or: bun add reflet-sdk
\`\`\`

### Step 3: Set Up Environment Variables

Add to my \`.env.local\` (or \`.env\`, depending on my setup):
\`\`\`env
NEXT_PUBLIC_REFLET_KEY=${publicKey}
NEXT_PUBLIC_REFLET_URL=https://your-deployment.convex.cloud
REFLET_SECRET_KEY=<I_WILL_ADD_MY_SECRET_KEY>
\`\`\`

**IMPORTANT**: The \`NEXT_PUBLIC_REFLET_URL\` must be the Convex deployment URL where the Reflet backend is hosted. Ask me for this URL if needed.

### Step 4: Integrate with My Authentication

**CRITICAL**: Connect Reflet to my EXISTING auth system. Find where I get the current user and pass it to RefletProvider.

For React/Next.js apps, wrap my app with RefletProvider:

\`\`\`tsx
import { RefletProvider } from 'reflet-sdk/react';

// FIND MY AUTH HOOK - examples:
// - NextAuth: useSession()
// - Clerk: useUser()
// - Supabase: useSupabaseUser() or useUser()
// - Firebase: useAuthState(auth)
// - Better Auth: useSession()
// - Custom: useAuth(), useCurrentUser(), etc.

function Providers({ children }) {
  const { user } = useMyExistingAuthHook(); // <-- USE MY AUTH

  return (
    <RefletProvider
      publicKey={process.env.NEXT_PUBLIC_REFLET_KEY!}
      baseUrl={process.env.NEXT_PUBLIC_REFLET_URL!}
      user={user ? {
        id: user.id,           // Required: unique user ID
        email: user.email,     // Recommended
        name: user.name,       // Recommended
        avatar: user.image,    // Optional
      } : undefined}
    >
      {children}
    </RefletProvider>
  );
}
\`\`\`

### Step 5: Create Feedback Components

Create a feedback page/widget that matches my app's design:

\`\`\`tsx
import {
  useFeedbackList,
  useVote,
  useCreateFeedback,
  useFeedback,
  useAddComment,
  useSubscription,
  useBoardConfig,
  useRoadmap,
  useChangelog,
} from 'reflet-sdk/react';

// Each hook returns: { data, isLoading, error, refetch }
// Mutations return: { mutate, isLoading, error, data, reset }
\`\`\`

### Step 6: (Production) Server-Side Token Signing

For production security, create an API route to sign user tokens server-side:

\`\`\`typescript
// Next.js App Router: app/api/reflet-token/route.ts
// Next.js Pages: pages/api/reflet-token.ts
// Express/other: your route file

import { signUser } from 'reflet-sdk/server';

export async function GET(request: Request) {
  // USE MY EXISTING AUTH to get the user
  const user = await getMyAuthenticatedUser(request);

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token, expiresAt } = signUser(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.image,
    },
    process.env.REFLET_SECRET_KEY!
  );

  return Response.json({ token, expiresAt });
}
\`\`\`

Then fetch and use this token in RefletProvider:
\`\`\`tsx
<RefletProvider
  publicKey={process.env.NEXT_PUBLIC_REFLET_KEY!}
  baseUrl={process.env.NEXT_PUBLIC_REFLET_URL!}
  userToken={tokenFromMyApi}
/>
\`\`\`

## Implementation Requirements

1. **Match my design system** - Use my existing UI components, colors, and styling patterns
2. **Integrate with my auth** - Use my existing authentication, don't create separate auth
3. **Follow my conventions** - Match my code style, file naming, and project structure
4. **TypeScript** - Use proper types if my project uses TypeScript
5. **Error handling** - Add loading states, error boundaries, and user feedback
6. **Responsive** - Ensure the UI works on mobile and desktop

## After Implementation

Please provide:
1. **Summary of changes**: List all files created/modified
2. **Environment variables**: Remind me to add these to my env:
   - \`NEXT_PUBLIC_REFLET_URL\` - The Convex deployment URL (ask me for this)
   - \`REFLET_SECRET_KEY\` - My secret key for server-side token signing
3. **Testing instructions**: How to verify the integration works
4. **Next steps**: Any additional configuration or features I might want

## SDK API Reference

\`\`\`typescript
// React Hooks (use inside RefletProvider)
useFeedbackList({ status?, sortBy?, search?, limit?, offset? })
useFeedback(feedbackId)
useVote()           // { mutate: (feedbackId) => void }
useCreateFeedback() // { mutate: ({ title, description }) => void }
useAddComment()     // { mutate: ({ feedbackId, body }) => void }
useSubscription()   // { subscribe, unsubscribe }
useBoardConfig()
useRoadmap()
useChangelog(limit?)

// Core client (for non-React or advanced usage)
import { Reflet } from 'reflet-sdk';
const reflet = new Reflet({ publicKey, baseUrl, user?, userToken? });

await reflet.list(params?)
await reflet.get(feedbackId)
await reflet.create({ title, description })
await reflet.vote(feedbackId)
await reflet.comment({ feedbackId, body })
await reflet.subscribe(feedbackId)
await reflet.unsubscribe(feedbackId)
await reflet.getConfig()
await reflet.getRoadmap()
await reflet.getChangelog(limit?)
\`\`\`

---

Now please analyze my codebase and implement the complete Reflet SDK integration.`;
}

export function ApiKeysSettings({ boardId }: ApiKeysSettingsProps) {
  const apiKeys = useQuery(api.feedback_api_admin.getApiKeys, { boardId });
  const generateApiKeys = useMutation(api.feedback_api_admin.generateApiKeys);
  const regenerateSecretKey = useMutation(
    api.feedback_api_admin.regenerateSecretKey
  );
  const updateApiKeySettings = useMutation(
    api.feedback_api_admin.updateApiKeySettings
  );

  const [showSecretKey, setShowSecretKey] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [domainInput, setDomainInput] = useState("");

  const handleGenerateKeys = useCallback(async () => {
    try {
      const result = await generateApiKeys({ boardId });
      setNewSecretKey(result.secretKey);
      toast.success("API keys generated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate API keys"
      );
    }
  }, [boardId, generateApiKeys]);

  const handleRegenerateSecretKey = useCallback(async () => {
    setIsRegenerating(true);
    try {
      const result = await regenerateSecretKey({ boardId });
      setNewSecretKey(result.secretKey);
      setShowRegenerateDialog(false);
      toast.success("Secret key regenerated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to regenerate secret key"
      );
    } finally {
      setIsRegenerating(false);
    }
  }, [boardId, regenerateSecretKey]);

  const handleToggleActive = useCallback(
    async (isActive: boolean) => {
      try {
        await updateApiKeySettings({ boardId, isActive });
        toast.success(isActive ? "API keys activated" : "API keys deactivated");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update settings"
        );
      }
    },
    [boardId, updateApiKeySettings]
  );

  const handleAddDomain = useCallback(async () => {
    if (!domainInput.trim()) {
      return;
    }

    const newDomains = [...(apiKeys?.allowedDomains ?? []), domainInput.trim()];
    try {
      await updateApiKeySettings({ boardId, allowedDomains: newDomains });
      setDomainInput("");
      toast.success("Domain added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add domain"
      );
    }
  }, [boardId, domainInput, apiKeys?.allowedDomains, updateApiKeySettings]);

  const handleRemoveDomain = useCallback(
    async (domain: string) => {
      const newDomains = (apiKeys?.allowedDomains ?? []).filter(
        (d: string) => d !== domain
      );
      try {
        await updateApiKeySettings({ boardId, allowedDomains: newDomains });
        toast.success("Domain removed");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to remove domain"
        );
      }
    },
    [boardId, apiKeys?.allowedDomains, updateApiKeySettings]
  );

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  // Loading state
  if (apiKeys === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-10 w-full rounded bg-muted" />
        <div className="h-10 w-full rounded bg-muted" />
      </div>
    );
  }

  // No API keys yet - show generation prompt with docs/AI tabs
  if (apiKeys === null) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Enable SDK Integration</h3>
              <p className="mt-1 text-muted-foreground">
                Generate API keys to enable the Reflet SDK in your application.
                Your users will be able to submit feedback, vote on ideas, and
                leave comments directly from your app.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline">React Hooks</Badge>
                <Badge variant="outline">TypeScript</Badge>
                <Badge variant="outline">Server-side Signing</Badge>
                <Badge variant="outline">Full API Access</Badge>
              </div>
              <Button className="mt-4" onClick={handleGenerateKeys}>
                <Key className="mr-2 h-4 w-4" />
                Generate API Keys
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="ai">
          <TabsList>
            <TabsTrigger value="docs">
              <BookOpen className="mr-2 h-4 w-4" />
              Documentation
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Robot className="mr-2 h-4 w-4" />
              AI Prompt
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-6" value="docs">
            <IntegrationGuide publicKey="fb_pub_xxxxxxxxxxxxxxxx" />
          </TabsContent>

          <TabsContent className="mt-6" value="ai">
            <AiPromptSection publicKey="fb_pub_xxxxxxxxxxxxxxxx" />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* New secret key alert */}
      {newSecretKey && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            <Warning className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                Save your secret key now
              </h4>
              <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">
                This is the only time you&apos;ll see your secret key. Copy it
                and store it securely in your environment variables.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 rounded bg-amber-100 px-3 py-2 font-mono text-sm dark:bg-amber-900">
                  {newSecretKey}
                </code>
                <Button
                  onClick={() => copyToClipboard(newSecretKey, "Secret key")}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="mt-3"
                onClick={() => setNewSecretKey(null)}
                size="sm"
                variant="ghost"
              >
                I&apos;ve saved my secret key
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="keys">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keys">
            <Key className="mr-2 h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="docs">
            <BookOpen className="mr-2 h-4 w-4" />
            Documentation
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Robot className="mr-2 h-4 w-4" />
            AI Prompt
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6 space-y-6" value="keys">
          {/* Status toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">API Status</Label>
              <p className="text-muted-foreground text-sm">
                Enable or disable API access for this board
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={apiKeys.isActive ? "default" : "secondary"}>
                {apiKeys.isActive ? "Active" : "Inactive"}
              </Badge>
              <Switch
                checked={apiKeys.isActive}
                onCheckedChange={handleToggleActive}
              />
            </div>
          </div>

          {/* Public Key */}
          <div className="space-y-2">
            <Label>Public Key</Label>
            <p className="text-muted-foreground text-sm">
              Use this key in your frontend code. It&apos;s safe to expose in
              client-side JavaScript.
            </p>
            <div className="flex items-center gap-2">
              <Input className="font-mono" readOnly value={apiKeys.publicKey} />
              <Button
                onClick={() => copyToClipboard(apiKeys.publicKey, "Public key")}
                size="icon"
                variant="outline"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Secret Key */}
          <div className="space-y-2">
            <Label>Secret Key</Label>
            <p className="text-muted-foreground text-sm">
              Use this key server-side only for signing user tokens. Never
              expose in client code.
            </p>
            <div className="flex items-center gap-2">
              <Input
                className="font-mono"
                readOnly
                type={showSecretKey ? "text" : "password"}
                value="fb_sec_••••••••••••••••••••••••"
              />
              <Button
                onClick={() => setShowSecretKey(!showSecretKey)}
                size="icon"
                title={showSecretKey ? "Hide" : "Show"}
                variant="outline"
              >
                {showSecretKey ? (
                  <EyeSlash className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={() => setShowRegenerateDialog(true)}
                size="sm"
                variant="outline"
              >
                Regenerate
              </Button>
            </div>
          </div>

          {/* Allowed Domains */}
          <div className="space-y-2">
            <Label>Allowed Domains (Optional)</Label>
            <p className="text-muted-foreground text-sm">
              Restrict API access to specific domains. Leave empty to allow all
              domains.
            </p>
            <div className="flex flex-wrap gap-2">
              {apiKeys.allowedDomains?.map((domain: string) => (
                <Badge
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  key={domain}
                  onClick={() => handleRemoveDomain(domain)}
                  variant="secondary"
                >
                  {domain} &times;
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                placeholder="example.com"
                value={domainInput}
              />
              <Button onClick={handleAddDomain} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Usage info */}
          {apiKeys.lastUsedAt && (
            <div className="text-muted-foreground text-sm">
              Last used: {new Date(apiKeys.lastUsedAt).toLocaleDateString()}
            </div>
          )}
        </TabsContent>

        <TabsContent className="mt-6" value="docs">
          <IntegrationGuide publicKey={apiKeys.publicKey} />
        </TabsContent>

        <TabsContent className="mt-6" value="ai">
          <AiPromptSection publicKey={apiKeys.publicKey} />
        </TabsContent>
      </Tabs>

      {/* Regenerate Dialog */}
      <AlertDialog
        onOpenChange={setShowRegenerateDialog}
        open={showRegenerateDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Secret Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate your current secret key. Any server-side
              integrations using the old key will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isRegenerating}
              onClick={handleRegenerateSecretKey}
            >
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Integration Guide Component
function IntegrationGuide({ publicKey }: { publicKey: string }) {
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Quick Start Guide</h3>
        <p className="mt-1 text-muted-foreground">
          Follow these steps to integrate the Reflet SDK into your application.
        </p>
      </div>

      <Accordion className="w-full">
        <AccordionItem value="install">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                1
              </span>
              Install the SDK
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <code className="text-sm">npm install reflet-sdk</code>
            </div>
            <p className="text-muted-foreground text-sm">
              Or use yarn, pnpm, or bun.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="react">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                2
              </span>
              React Integration
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Wrap your app with the RefletProvider and use our React hooks:
            </p>
            <div className="relative rounded-lg bg-muted p-4">
              <Button
                className="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(
                    `import { RefletProvider, useFeedbackList, useVote } from 'reflet-sdk/react';

function App() {
  return (
    <RefletProvider
      publicKey="${publicKey}"
      user={{ id: 'user_123', email: 'user@example.com', name: 'John' }}
    >
      <FeedbackWidget />
    </RefletProvider>
  );
}

function FeedbackWidget() {
  const { data } = useFeedbackList({ sortBy: 'votes' });
  const { mutate: vote } = useVote();

  return data?.items.map((item) => (
    <div key={item.id}>
      <h3>{item.title}</h3>
      <button onClick={() => vote({ feedbackId: item.id })}>
        {item.voteCount} votes
      </button>
    </div>
  ));
}`,
                    "React code"
                  )
                }
                size="sm"
                variant="ghost"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <pre className="overflow-x-auto text-sm">
                <code>{`import { RefletProvider, useFeedbackList, useVote } from 'reflet-sdk/react';

function App() {
  return (
    <RefletProvider
      publicKey="${publicKey}"
      user={{ id: 'user_123', email: 'user@example.com', name: 'John' }}
    >
      <FeedbackWidget />
    </RefletProvider>
  );
}

function FeedbackWidget() {
  const { data } = useFeedbackList({ sortBy: 'votes' });
  const { mutate: vote } = useVote();

  return data?.items.map((item) => (
    <div key={item.id}>
      <h3>{item.title}</h3>
      <button onClick={() => vote({ feedbackId: item.id })}>
        {item.voteCount} votes
      </button>
    </div>
  ));
}`}</code>
              </pre>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vanilla">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                3
              </span>
              Vanilla JavaScript
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Use the Reflet client directly without React:
            </p>
            <div className="relative rounded-lg bg-muted p-4">
              <Button
                className="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(
                    `import { Reflet } from 'reflet-sdk';

const reflet = new Reflet({
  publicKey: '${publicKey}',
  user: { id: 'user_123', email: 'user@example.com' },
});

// List feedback
const { items } = await reflet.list({ status: 'open' });

// Create feedback
await reflet.create({ title: 'Feature request', description: '...' });

// Vote
await reflet.vote('feedback_id');`,
                    "JavaScript code"
                  )
                }
                size="sm"
                variant="ghost"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <pre className="overflow-x-auto text-sm">
                <code>{`import { Reflet } from 'reflet-sdk';

const reflet = new Reflet({
  publicKey: '${publicKey}',
  user: { id: 'user_123', email: 'user@example.com' },
});

// List feedback
const { items } = await reflet.list({ status: 'open' });

// Create feedback
await reflet.create({ title: 'Feature request', description: '...' });

// Vote
await reflet.vote('feedback_id');`}</code>
              </pre>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="server">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                4
              </span>
              Server-Side User Signing (Recommended)
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              For production apps, sign user tokens on your server to prevent
              spoofing:
            </p>
            <div className="relative rounded-lg bg-muted p-4">
              <Button
                className="absolute top-2 right-2"
                onClick={() =>
                  copyToClipboard(
                    `// Server-side (API route, Express, etc.)
import { signUser } from 'reflet-sdk/server';

const { token, expiresAt } = signUser(
  { id: user.id, email: user.email, name: user.name },
  process.env.REFLET_SECRET_KEY!
);

// Client-side
import { Reflet } from 'reflet-sdk';

const reflet = new Reflet({
  publicKey: '${publicKey}',
  userToken: token, // From your server
});`,
                    "Server code"
                  )
                }
                size="sm"
                variant="ghost"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <pre className="overflow-x-auto text-sm">
                <code>{`// Server-side (API route, Express, etc.)
import { signUser } from 'reflet-sdk/server';

const { token, expiresAt } = signUser(
  { id: user.id, email: user.email, name: user.name },
  process.env.REFLET_SECRET_KEY!
);

// Client-side
import { Reflet } from 'reflet-sdk';

const reflet = new Reflet({
  publicKey: '${publicKey}',
  userToken: token, // From your server
});`}</code>
              </pre>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <h4 className="flex items-center gap-2 font-medium text-blue-800 dark:text-blue-200">
          <Code className="h-4 w-4" />
          Available React Hooks
        </h4>
        <ul className="mt-2 grid gap-1 text-blue-700 text-sm sm:grid-cols-2 dark:text-blue-300">
          <li>
            <code>useFeedbackList()</code> - List feedback
          </li>
          <li>
            <code>useFeedback(id)</code> - Single item
          </li>
          <li>
            <code>useVote()</code> - Vote on feedback
          </li>
          <li>
            <code>useCreateFeedback()</code> - Submit new
          </li>
          <li>
            <code>useAddComment()</code> - Add comments
          </li>
          <li>
            <code>useSubscription()</code> - Subscribe
          </li>
          <li>
            <code>useBoardConfig()</code> - Board config
          </li>
          <li>
            <code>useRoadmap()</code> - Roadmap data
          </li>
        </ul>
      </div>
    </div>
  );
}

// AI Prompt Section Component
function AiPromptSection({ publicKey }: { publicKey: string }) {
  const prompt = generateAiPrompt(publicKey);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">AI Integration Prompt</h3>
        <p className="mt-1 text-muted-foreground">
          Copy this prompt and paste it into Claude, ChatGPT, or any AI coding
          assistant to help implement the Reflet SDK in your application.
        </p>
      </div>

      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950">
        <div className="flex items-start gap-3">
          <Robot className="mt-0.5 h-5 w-5 text-purple-600" />
          <div className="flex-1">
            <h4 className="font-medium text-purple-800 dark:text-purple-200">
              How to use this prompt
            </h4>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-purple-700 text-sm dark:text-purple-300">
              <li>Click the copy button below to copy the full prompt</li>
              <li>Open your preferred AI assistant (Claude, ChatGPT, etc.)</li>
              <li>Paste the prompt and describe your specific requirements</li>
              <li>The AI will generate customized code for your application</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="relative">
        <Button
          className="absolute top-3 right-3 z-10"
          onClick={() => copyToClipboard(prompt, "AI prompt")}
          size="sm"
          variant="secondary"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Prompt
        </Button>
        <div className="max-h-96 overflow-auto rounded-lg bg-muted p-4 font-mono text-sm">
          <pre className="whitespace-pre-wrap">{prompt}</pre>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() => copyToClipboard(prompt, "AI prompt")}
          variant="default"
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy Full Prompt
        </Button>
      </div>
    </div>
  );
}
