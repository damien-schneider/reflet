"use client";

import { Code, Copy } from "@phosphor-icons/react";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

interface IntegrationGuideProps {
  publicKey: string;
}

export function IntegrationGuide({ publicKey }: IntegrationGuideProps) {
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
            <code>useOrgConfig()</code> - Org config
          </li>
          <li>
            <code>useRoadmap()</code> - Roadmap data
          </li>
        </ul>
      </div>
    </div>
  );
}
