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

Go to your Reflet dashboard → Board Settings → API Keys & Widget to generate your keys:

- **Public Key** (`fb_pub_...`) - Safe to use in frontend code
- **Secret Key** (`fb_sec_...`) - Keep secure, use only on your server
- **Base URL** - Your Convex deployment URL (e.g., `https://your-deployment.convex.cloud`)

### 2. Basic Usage (Vanilla JavaScript/TypeScript)

```typescript
import { Reflet } from 'reflet-sdk';

const reflet = new Reflet({
  publicKey: 'fb_pub_your_key_here',
  baseUrl: 'https://your-deployment.convex.cloud', // Your Convex deployment URL
  user: {
    id: 'user_123',
    email: 'jane@example.com',
    name: 'Jane Doe',
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

// Vote on feedback
await reflet.vote('feedback_id');

// Add a comment
await reflet.comment({
  feedbackId: 'feedback_id',
  body: 'This would be amazing!',
});
```

### 3. React Usage

```tsx
import { RefletProvider, useFeedbackList, useVote, useCreateFeedback } from 'reflet-sdk/react';

// Wrap your app with the provider
function App() {
  const currentUser = useCurrentUser(); // Your auth system

  return (
    <RefletProvider
      publicKey="fb_pub_your_key_here"
      baseUrl="https://your-deployment.convex.cloud"
      user={currentUser}
    >
      <FeedbackPage />
    </RefletProvider>
  );
}

// Use hooks in your components
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

### 4. Server-Side User Signing (Most Secure)

For production apps, sign user tokens on your server to prevent spoofing:

```typescript
// On your server (Next.js API route, Express, etc.)
import { signUser } from 'reflet-sdk/server';

export async function getUserToken(user: User) {
  const { token, expiresAt } = signUser(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatarUrl,
    },
    process.env.REFLET_SECRET_KEY!
  );

  return { token, expiresAt };
}
```

```tsx
// On the client
import { Reflet } from 'reflet-sdk';

const reflet = new Reflet({
  publicKey: 'fb_pub_your_key_here',
  baseUrl: 'https://your-deployment.convex.cloud',
  userToken: tokenFromServer, // JWT from your server
});
```

## API Reference

### `Reflet` Client

```typescript
const reflet = new Reflet(config: RefletConfig);
```

#### Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `publicKey` | `string` | Yes | Your board's public API key |
| `baseUrl` | `string` | Yes | Your Convex deployment URL (e.g., `https://your-deployment.convex.cloud`) |
| `user` | `RefletUser` | No | User information for identification |
| `userToken` | `string` | No | Signed JWT from your server (alternative to `user`) |

#### Methods

| Method | Description |
|--------|-------------|
| `list(params?)` | List feedback with optional filtering |
| `get(feedbackId)` | Get single feedback with full details |
| `create(params)` | Submit new feedback |
| `vote(feedbackId, type?)` | Vote on feedback (toggle) |
| `comment(params)` | Add a comment |
| `subscribe(feedbackId)` | Subscribe to updates |
| `unsubscribe(feedbackId)` | Unsubscribe from updates |
| `getConfig()` | Get board configuration |
| `getRoadmap()` | Get roadmap data |
| `getChangelog(limit?)` | Get changelog entries |

### React Hooks

| Hook | Description |
|------|-------------|
| `useFeedbackList(options?)` | Fetch feedback list with filters |
| `useFeedback(feedbackId)` | Fetch single feedback item |
| `useComments(feedbackId)` | Fetch comments for feedback |
| `useVote()` | Vote mutation hook |
| `useCreateFeedback()` | Create feedback mutation hook |
| `useAddComment()` | Add comment mutation hook |
| `useSubscription()` | Subscribe/unsubscribe hooks |
| `useBoardConfig()` | Fetch board configuration |
| `useRoadmap()` | Fetch roadmap data |
| `useChangelog(limit?)` | Fetch changelog entries |

### Server Utilities

```typescript
import { signUser, verifyUser } from 'reflet-sdk/server';

// Sign a user token
const { token, expiresAt } = signUser(user, secretKey, expiresInSeconds?);

// Verify a token (optional - server-side validation)
const user = verifyUser(token, secretKey);
```

## Types

```typescript
interface RefletUser {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
}

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  status: FeedbackStatus;
  voteCount: number;
  commentCount: number;
  hasVoted: boolean;
  author?: FeedbackAuthor;
  tags: FeedbackTag[];
  createdAt: string;
}

interface FeedbackDetail extends FeedbackItem {
  isSubscribed: boolean;
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

## Error Handling

The SDK provides typed errors for better error handling:

```typescript
import { RefletError, RefletAuthError, RefletNotFoundError } from 'reflet-sdk';

try {
  await reflet.vote('invalid_id');
} catch (error) {
  if (error instanceof RefletNotFoundError) {
    console.log('Feedback not found');
  } else if (error instanceof RefletAuthError) {
    console.log('Authentication required');
  } else if (error instanceof RefletError) {
    console.log('API error:', error.message);
  }
}
```

## Examples

### Feedback Widget Component

```tsx
import { RefletProvider, useFeedbackList, useCreateFeedback, useVote } from 'reflet-sdk/react';
import { useState } from 'react';

function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { data, refetch } = useFeedbackList({ limit: 5, sortBy: 'votes' });
  const { mutate: createFeedback, isLoading } = useCreateFeedback();
  const { mutate: vote } = useVote();
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFeedback({ title, description: '' });
    setTitle('');
    refetch();
  };

  return (
    <div className="feedback-widget">
      <button onClick={() => setIsOpen(!isOpen)}>
        Feedback
      </button>

      {isOpen && (
        <div className="feedback-panel">
          <form onSubmit={handleSubmit}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind?"
            />
            <button type="submit" disabled={isLoading}>
              Submit
            </button>
          </form>

          <ul>
            {data?.items.map((item) => (
              <li key={item.id}>
                <button onClick={() => vote({ feedbackId: item.id })}>
                  {item.voteCount}
                </button>
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Next.js App Router Integration

```tsx
// app/providers.tsx
'use client';

import { RefletProvider } from 'reflet-sdk/react';
import { useSession } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <RefletProvider
      publicKey={process.env.NEXT_PUBLIC_REFLET_KEY!}
      baseUrl={process.env.NEXT_PUBLIC_REFLET_URL!}
      user={session?.user ? {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name!,
      } : undefined}
    >
      {children}
    </RefletProvider>
  );
}
```

## License

MIT
