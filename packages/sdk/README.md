# reflet-sdk

Official SDK for integrating Reflet feedback collection into your application. Collect user feedback, feature requests, and bug reports directly from your app.

## Installation

```bash
npm install reflet-sdk
# or
yarn add reflet-sdk
# or
pnpm add reflet-sdk
# or
bun add reflet-sdk
```

## Quick Start

### 1. Get Your API Keys

Go to your Reflet dashboard → Settings → API Keys & Widget to generate your keys:

- **Public Key** (`fb_pub_...`) - Safe to use in frontend code
- **Secret Key** (`fb_sec_...`) - Keep secure, use only on your server

### 2. Basic Usage (Any JavaScript/TypeScript Environment)

The core SDK works in any JavaScript environment - browser, Node.js, Deno, Bun, or any framework.

```typescript
import { Reflet } from 'reflet-sdk';

// Initialize the client
const reflet = new Reflet({
  publicKey: 'fb_pub_your_key_here',
  user: {
    id: 'user_123',           // Required: unique user ID from your system
    email: 'jane@example.com', // Optional: for notifications
    name: 'Jane Doe',          // Optional: display name
  },
});

// List feedback
const { items } = await reflet.list({ status: 'open' });

// Get single feedback with comments
const feedback = await reflet.get('feedback_id');

// Create new feedback
const { feedbackId } = await reflet.create({
  title: 'Dark mode support',
  description: 'Would love to have a dark theme option!',
});

// Vote on feedback (toggles vote on/off)
await reflet.vote('feedback_id');

// Add a comment
await reflet.comment({
  feedbackId: 'feedback_id',
  body: 'This would be amazing!',
});
```

### 3. React Integration

For React applications, use the provided hooks for a better developer experience.

```tsx
import { RefletProvider, useFeedbackList, useVote, useCreateFeedback } from 'reflet-sdk/react';

// 1. Wrap your app with the provider (do this once at the root)
function App() {
  // Get the current user from your authentication system
  const currentUser = getCurrentUser(); // Replace with your auth logic

  return (
    <RefletProvider
      publicKey="fb_pub_your_key_here"
      user={currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
      } : undefined}
    >
      <YourApp />
    </RefletProvider>
  );
}

// 2. Use hooks anywhere in your app
function FeedbackPage() {
  const { data, isLoading, error } = useFeedbackList({ sortBy: 'votes' });
  const { mutate: vote } = useVote();
  const { mutate: createFeedback } = useCreateFeedback();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.items.map((item) => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <button onClick={() => vote({ feedbackId: item.id })}>
            {item.hasVoted ? 'Voted' : 'Vote'} ({item.voteCount})
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 4. Server-Side User Signing (Recommended for Production)

For production apps, sign user tokens on your server to prevent client-side spoofing.

**On your server** (works with any backend: Express, Fastify, Hono, serverless functions, etc.):

```typescript
import { signUser } from 'reflet-sdk/server';

// This function uses Web Crypto API - works in Node.js 18+,
// Deno, Bun, Cloudflare Workers, Vercel Edge, etc.
export async function generateUserToken(user: YourUserType) {
  const { token, expiresAt } = await signUser(
    {
      id: user.id,        // Required: unique identifier
      email: user.email,  // Optional
      name: user.name,    // Optional
      avatar: user.avatar, // Optional
    },
    process.env.REFLET_SECRET_KEY! // Your secret key from Reflet dashboard
  );

  return { token, expiresAt };
}
```

**On the client** (pass the token from your server):

```typescript
import { Reflet } from 'reflet-sdk';

const reflet = new Reflet({
  publicKey: 'fb_pub_your_key_here',
  userToken: tokenFromServer, // JWT received from your server
});
```

---

## Important: What NOT To Do

### Security

```typescript
// ❌ WRONG: Never expose your secret key in client-side code
const reflet = new Reflet({
  publicKey: 'fb_pub_xxx',
  secretKey: 'fb_sec_xxx', // NEVER DO THIS - secret keys are for servers only
});

// ❌ WRONG: Never hardcode secret keys
const token = await signUser(user, 'fb_sec_hardcoded_key');

// ✅ CORRECT: Use environment variables on the server
const token = await signUser(user, process.env.REFLET_SECRET_KEY!);
```

### User Identification

```typescript
// ❌ WRONG: Don't use unstable or guessable user IDs
const reflet = new Reflet({
  publicKey: 'fb_pub_xxx',
  user: { id: 'user@email.com' }, // Email as ID - can change, easily guessed
});

// ❌ WRONG: Don't use sequential IDs
const reflet = new Reflet({
  publicKey: 'fb_pub_xxx',
  user: { id: '1' }, // Sequential - easily enumerable
});

// ✅ CORRECT: Use your system's stable, unique user identifier
const reflet = new Reflet({
  publicKey: 'fb_pub_xxx',
  user: { id: 'usr_a1b2c3d4e5' }, // UUID, CUID, or database ID
});
```

### Client Initialization

```typescript
// ❌ WRONG: Don't create multiple client instances
function handleVote(id: string) {
  const reflet = new Reflet({ publicKey: 'fb_pub_xxx' }); // New instance every call
  await reflet.vote(id);
}

// ✅ CORRECT: Create one instance and reuse it
const reflet = new Reflet({ publicKey: 'fb_pub_xxx', user: currentUser });

function handleVote(id: string) {
  await reflet.vote(id);
}
```

### React Provider

```tsx
// ❌ WRONG: Don't use hooks outside the provider
function App() {
  return (
    <div>
      <FeedbackList /> {/* Error: No RefletProvider */}
      <RefletProvider publicKey="fb_pub_xxx">
        <OtherStuff />
      </RefletProvider>
    </div>
  );
}

// ✅ CORRECT: Wrap at the root, use hooks inside
function App() {
  return (
    <RefletProvider publicKey="fb_pub_xxx" user={currentUser}>
      <FeedbackList />
      <OtherStuff />
    </RefletProvider>
  );
}
```

### Token Handling

```typescript
// ❌ WRONG: Don't sign tokens on the client
import { signUser } from 'reflet-sdk/server';
// This exposes your secret key in client bundle!

// ❌ WRONG: Don't mix user and userToken
const reflet = new Reflet({
  publicKey: 'fb_pub_xxx',
  user: { id: '123' },
  userToken: 'jwt_token', // Pick one, not both
});

// ✅ CORRECT: Use user for simple cases (client-side identification)
const reflet = new Reflet({
  publicKey: 'fb_pub_xxx',
  user: { id: '123', email: 'user@example.com' },
});

// ✅ CORRECT: Use userToken for production (server-signed)
const reflet = new Reflet({
  publicKey: 'fb_pub_xxx',
  userToken: tokenFromYourServer,
});
```

---

## API Reference

### `Reflet` Client

```typescript
const reflet = new Reflet(config: RefletConfig);
```

#### Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `publicKey` | `string` | Yes | Your organization's public API key (`fb_pub_...`) |
| `user` | `RefletUser` | No | User information for client-side identification |
| `userToken` | `string` | No | Signed JWT from your server (use instead of `user` for production) |
| `baseUrl` | `string` | No | Custom API endpoint (defaults to Reflet production API) |

> **Note:** Provide either `user` OR `userToken`, not both. If neither is provided, the user can only read feedback (no voting, commenting, or creating).

#### Methods

| Method | Description | Requires User |
|--------|-------------|---------------|
| `list(params?)` | List feedback with optional filtering | No |
| `get(feedbackId)` | Get single feedback with full details | No |
| `getConfig()` | Get organization configuration | No |
| `getRoadmap()` | Get roadmap data | No |
| `getChangelog(limit?)` | Get changelog entries | No |
| `create(params)` | Submit new feedback | **Yes** |
| `vote(feedbackId, type?)` | Vote on feedback (toggle) | **Yes** |
| `comment(params)` | Add a comment | **Yes** |
| `getComments(feedbackId)` | Get comments for a feedback | No |
| `subscribe(feedbackId)` | Subscribe to updates | **Yes** |
| `unsubscribe(feedbackId)` | Unsubscribe from updates | **Yes** |

### React Hooks

All hooks must be used inside a `<RefletProvider>`.

| Hook | Description | Requires User |
|------|-------------|---------------|
| `useFeedbackList(options?)` | Fetch feedback list with filters | No |
| `useFeedback(feedbackId)` | Fetch single feedback item | No |
| `useComments(feedbackId)` | Fetch comments for feedback | No |
| `useOrganizationConfig()` | Fetch organization configuration | No |
| `useRoadmap()` | Fetch roadmap data | No |
| `useChangelog(limit?)` | Fetch changelog entries | No |
| `useVote()` | Vote mutation hook | **Yes** |
| `useCreateFeedback()` | Create feedback mutation hook | **Yes** |
| `useAddComment()` | Add comment mutation hook | **Yes** |
| `useSubscription()` | Subscribe/unsubscribe hooks | **Yes** |

### Server Utilities

Works in any JavaScript runtime with Web Crypto API support: Node.js 18+, Deno, Bun, Cloudflare Workers, Vercel Edge, AWS Lambda, etc.

```typescript
import { signUser, verifyUser } from 'reflet-sdk/server';

// Sign a user token (async - uses Web Crypto API)
const { token, expiresAt } = await signUser(
  { id: 'user_123', email: 'user@example.com', name: 'Jane' },
  secretKey,
  expiresInSeconds // Optional, defaults to 24 hours
);

// Verify a token (optional - for server-side validation)
const user = await verifyUser(token, secretKey);
// Returns user data if valid, null if invalid/expired
```

---

## Types

```typescript
interface RefletUser {
  id: string;       // Required: unique identifier from your system
  email?: string;   // Optional: used for notifications
  name?: string;    // Optional: display name
  avatar?: string;  // Optional: avatar URL
}

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  status: FeedbackStatus;
  voteCount: number;
  commentCount: number;
  hasVoted: boolean;        // Whether current user voted
  author?: FeedbackAuthor;
  tags: FeedbackTag[];
  createdAt: string;
}

interface FeedbackDetail extends FeedbackItem {
  isSubscribed: boolean;    // Whether current user is subscribed
  comments: Comment[];
}

type FeedbackStatus =
  | 'open'
  | 'under_review'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'closed';
```

---

## Error Handling

The SDK provides typed errors for precise error handling:

```typescript
import { RefletError, RefletAuthError, RefletNotFoundError } from 'reflet-sdk';

try {
  await reflet.vote('feedback_id');
} catch (error) {
  if (error instanceof RefletNotFoundError) {
    // Feedback item doesn't exist
    console.log('Feedback not found');
  } else if (error instanceof RefletAuthError) {
    // User not identified or invalid token
    console.log('Please sign in to vote');
  } else if (error instanceof RefletError) {
    // Other API errors (rate limit, server error, etc.)
    console.log('Error:', error.message, 'Status:', error.status);
  }
}
```

### Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| `RefletAuthError` | No user/token provided | Pass `user` or `userToken` to the client |
| `RefletAuthError` | Invalid or expired token | Generate a new token on your server |
| `RefletNotFoundError` | Invalid feedback ID | Check the ID exists |
| `RefletError` (403) | Organization is private | Use a secret key or make organization public |
| `RefletError` (429) | Rate limited | Reduce request frequency |

---

## Framework Integration Examples

### Generic Pattern (Any Framework)

```typescript
// 1. Create a singleton client instance
// feedback-client.ts
import { Reflet } from 'reflet-sdk';

let refletInstance: Reflet | null = null;

export function getRefletClient(user?: { id: string; email?: string; name?: string }) {
  if (!refletInstance || user) {
    refletInstance = new Reflet({
      publicKey: process.env.REFLET_PUBLIC_KEY || 'fb_pub_xxx',
      user,
    });
  }
  return refletInstance;
}

// 2. Use it anywhere
const reflet = getRefletClient(currentUser);
const feedback = await reflet.list();
```

### Server-Side Token Generation (Any Backend)

```typescript
// api/reflet-token.ts (or your preferred API route pattern)
import { signUser } from 'reflet-sdk/server';

export async function handleTokenRequest(authenticatedUser: YourUserType) {
  // Verify user is authenticated with YOUR auth system first
  if (!authenticatedUser) {
    throw new Error('Unauthorized');
  }

  const { token, expiresAt } = await signUser(
    {
      id: authenticatedUser.id,
      email: authenticatedUser.email,
      name: authenticatedUser.displayName,
    },
    process.env.REFLET_SECRET_KEY!
  );

  return { token, expiresAt };
}
```

### React with Any State Management

```tsx
// Works with Redux, Zustand, Jotai, MobX, or plain React state
import { RefletProvider } from 'reflet-sdk/react';

function App() {
  // Get user from your state management solution
  const user = useYourAuthHook(); // useSelector, useStore, useAtom, etc.

  return (
    <RefletProvider
      publicKey="fb_pub_xxx"
      user={user ? { id: user.id, email: user.email, name: user.name } : undefined}
    >
      <YourApp />
    </RefletProvider>
  );
}
```

### Vanilla JavaScript (No Framework)

```html
<script type="module">
  import { Reflet } from 'https://esm.sh/reflet-sdk';

  const reflet = new Reflet({
    publicKey: 'fb_pub_xxx',
    user: { id: 'user_123' },
  });

  // Load and display feedback
  const { items } = await reflet.list();

  document.getElementById('feedback-list').innerHTML = items
    .map(item => `
      <div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <button onclick="vote('${item.id}')">${item.voteCount} votes</button>
      </div>
    `)
    .join('');

  window.vote = async (id) => {
    await reflet.vote(id);
    location.reload(); // Simple refresh, or update DOM manually
  };
</script>
```

---

## Troubleshooting

### "Authentication required" error

**Cause:** Trying to vote, comment, or create feedback without user identification.

**Solution:** Provide `user` or `userToken` when initializing the client:

```typescript
const reflet = new Reflet({
  publicKey: 'fb_pub_xxx',
  user: { id: 'your_user_id' }, // Add this
});
```

### "Organization not found" or 404 errors

**Cause:** Invalid public key or organization doesn't exist.

**Solution:**
1. Verify your public key in Reflet dashboard → Settings → API Keys
2. Ensure the organization exists and is active

### "Network error" or connection issues

**Cause:** Cannot reach Reflet API.

**Solution:**
1. Check your internet connection
2. Verify no firewall/proxy is blocking requests
3. The SDK connects to `https://harmless-clam-802.convex.site` by default

### Token expired errors

**Cause:** Server-signed token has expired (default: 24 hours).

**Solution:** Generate and send a fresh token from your server:

```typescript
// On your server
const { token } = await signUser(user, secretKey, 86400); // 24 hours

// Refresh before expiry or on 401 errors
```

---

## License

MIT
