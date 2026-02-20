"use client";

import { Copy, PuzzlePiece } from "@phosphor-icons/react";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

interface FeedbackButtonGuideProps {
  publicKey: string;
}

export function FeedbackButtonGuide({ publicKey }: FeedbackButtonGuideProps) {
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  const anonymousSnippet = `import { FeedbackButton } from 'reflet-sdk/react';

function App() {
  return (
    <FeedbackButton publicKey="${publicKey}" />
  );
}`;

  const withUserSnippet = `import { FeedbackButton } from 'reflet-sdk/react';

function App() {
  return (
    <FeedbackButton
      publicKey="${publicKey}"
      user={{
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
      }}
    />
  );
}`;

  const withProviderSnippet = `import { RefletProvider, FeedbackButton } from 'reflet-sdk/react';

function App() {
  return (
    <RefletProvider
      publicKey="${publicKey}"
      user={{ id: 'user_123', email: 'user@example.com', name: 'John' }}
    >
      <YourApp />
    </RefletProvider>
  );
}

// Anywhere in your app — inherits config from provider
function Toolbar() {
  return <FeedbackButton />;
}`;

  const customTriggerSnippet = `import { FeedbackButton } from 'reflet-sdk/react';

function App() {
  return (
    <FeedbackButton publicKey="${publicKey}" asChild>
      <button className="my-custom-button">
        Send Feedback
      </button>
    </FeedbackButton>
  );
}`;

  const themedSnippet = `import { FeedbackButton } from 'reflet-sdk/react';

function App() {
  return (
    <FeedbackButton
      publicKey="${publicKey}"
      theme="dark"
      primaryColor="#8b5cf6"
      labels={{
        triggerText: "Ideas?",
        title: "Share your thoughts",
        submitButton: "Send",
      }}
    />
  );
}`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">
          FeedbackButton — Drop-in React Component
        </h3>
        <p className="mt-1 text-muted-foreground">
          Add a feedback button to your app with a single line of code. Works
          anonymously by default — no user login required.
        </p>
      </div>

      <Accordion className="w-full" defaultValue={["anonymous"]}>
        <AccordionItem value="anonymous">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                1
              </span>
              Simplest — Anonymous Feedback
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              One line, zero config. Your users can submit feedback without
              signing in.
            </p>
            <CodeBlock
              code={anonymousSnippet}
              label="Anonymous feedback code"
              onCopy={copyToClipboard}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="user">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                2
              </span>
              With User Identity
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Pass user info to associate feedback with a specific user. Their
              name appears next to their submissions.
            </p>
            <CodeBlock
              code={withUserSnippet}
              label="User identity code"
              onCopy={copyToClipboard}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="provider">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                3
              </span>
              With RefletProvider (Shared Config)
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              If you already use RefletProvider for hooks like{" "}
              <code>useFeedbackList()</code>, FeedbackButton will inherit the
              public key and user automatically.
            </p>
            <CodeBlock
              code={withProviderSnippet}
              label="Provider integration code"
              onCopy={copyToClipboard}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="custom">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                4
              </span>
              Custom Trigger (asChild)
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Use your own button or element as the trigger. The{" "}
              <code>asChild</code> prop delegates the click to your child
              component.
            </p>
            <CodeBlock
              code={customTriggerSnippet}
              label="Custom trigger code"
              onCopy={copyToClipboard}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="themed">
          <AccordionTrigger>
            <span className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                5
              </span>
              Themed & Customized
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Customize colors, labels, theme, and categories to match your app.
            </p>
            <CodeBlock
              code={themedSnippet}
              label="Themed code"
              onCopy={copyToClipboard}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950">
        <h4 className="flex items-center gap-2 font-medium text-violet-800 dark:text-violet-200">
          <PuzzlePiece className="h-4 w-4" />
          FeedbackButton Props
        </h4>
        <ul className="mt-2 grid gap-1 text-sm text-violet-700 sm:grid-cols-2 dark:text-violet-300">
          <li>
            <code>publicKey</code> — Your Reflet public key
          </li>
          <li>
            <code>user</code> — Optional user identity
          </li>
          <li>
            <code>theme</code> — &quot;light&quot; | &quot;dark&quot; |
            &quot;auto&quot;
          </li>
          <li>
            <code>primaryColor</code> — Accent color (hex)
          </li>
          <li>
            <code>labels</code> — Custom UI text
          </li>
          <li>
            <code>categories</code> — Feedback categories
          </li>
          <li>
            <code>asChild</code> — Use your own trigger
          </li>
          <li>
            <code>onSubmit</code> — Success callback
          </li>
        </ul>
      </div>
    </div>
  );
}

function CodeBlock({
  code,
  label,
  onCopy,
}: {
  code: string;
  label: string;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="relative rounded-lg bg-muted p-4">
      <Button
        className="absolute top-2 right-2"
        onClick={() => onCopy(code, label)}
        size="sm"
        variant="ghost"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <pre className="overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}
