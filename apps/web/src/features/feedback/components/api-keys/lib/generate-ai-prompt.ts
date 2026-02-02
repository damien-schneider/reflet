export function generateAiPrompt(publicKey: string): string {
  return `# Reflet SDK Integration Request

I want to integrate Reflet feedback collection into my application. Please analyze my codebase and implement the integration following best practices.

## My API Credentials

\`\`\`
NEXT_PUBLIC_REFLET_KEY=${publicKey}
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
REFLET_SECRET_KEY=<I_WILL_ADD_MY_SECRET_KEY>
\`\`\`

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
  useOrgConfig,
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

  const { token, expiresAt } = await signUser(
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
2. **Environment variables**: Remind me to add \`REFLET_SECRET_KEY\` for server-side token signing
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
useOrgConfig()
useRoadmap()
useChangelog(limit?)

// Core client (for non-React or advanced usage)
import { Reflet } from 'reflet-sdk';
const reflet = new Reflet({ publicKey, user?, userToken? });

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
