export function generateFeedbackButtonPrompt(publicKey: string): string {
  return `# Reflet Feedback Button Integration Request

I want to add an in-app feedback button to my application using Reflet. Users should be able to submit feedback (features, bugs, questions) with a single click.

## My API Credentials

\`\`\`
PUBLIC_KEY=${publicKey}
\`\`\`

## Your Task

Please analyze my codebase and integrate the Reflet \`<FeedbackButton />\` following best practices.

### Step 1: Analyze My Codebase

Before writing any code, check:
1. **Framework**: Am I using React/Next.js, Vue, Svelte, or vanilla JS/TS?
2. **Package manager**: Check for \`bun.lockb\`, \`pnpm-lock.yaml\`, \`yarn.lock\`, or \`package-lock.json\`
3. **Auth system**: Am I using an auth library? If so, extract the current user info for identified feedback.
4. **Existing UI**: Where should the feedback button go? (e.g., sidebar footer, header, floating)
5. **Styling**: Identify my styling approach (Tailwind, CSS modules, styled-components, etc.)

### Step 2: Install the SDK

\`\`\`bash
# Use my project's package manager:
npm install reflet-sdk
\`\`\`

### Step 3: Choose Integration Pattern

#### Pattern A: Simplest — One line, anonymous feedback

\`\`\`tsx
import { FeedbackButton } from 'reflet-sdk/react';

// Drop this anywhere in your app — works instantly
<FeedbackButton publicKey="${publicKey}" />
\`\`\`

This renders a styled "Feedback" button. When clicked, it opens a dialog (or bottom sheet on mobile) where users can submit feedback. No user identification required — feedback is anonymous.

#### Pattern B: With user identification

If you have access to the current user, pass their info to associate feedback with them:

\`\`\`tsx
import { FeedbackButton } from 'reflet-sdk/react';

<FeedbackButton
  publicKey="${publicKey}"
  user={{
    id: currentUser.id,
    email: currentUser.email,
    name: currentUser.name,
  }}
/>
\`\`\`

#### Pattern C: Using RefletProvider (recommended for apps with auth)

Wrap your app once with \`<RefletProvider>\`, then use \`<FeedbackButton />\` anywhere without repeating config:

\`\`\`tsx
// layout.tsx or _app.tsx — wrap once
import { RefletProvider } from 'reflet-sdk/react';

<RefletProvider
  publicKey="${publicKey}"
  user={currentUser ? { id: currentUser.id, email: currentUser.email, name: currentUser.name } : undefined}
>
  <App />
</RefletProvider>

// anywhere in the app — zero props needed
import { FeedbackButton } from 'reflet-sdk/react';
<FeedbackButton />
\`\`\`

#### Pattern D: Custom trigger (headless)

Use your own button/element as the trigger:

\`\`\`tsx
import { FeedbackButton } from 'reflet-sdk/react';

<FeedbackButton publicKey="${publicKey}" asChild>
  <button className="my-custom-button">
    💬 Send Feedback
  </button>
</FeedbackButton>
\`\`\`

#### Pattern E: Controlled dialog

For full control over when the dialog opens:

\`\`\`tsx
import { useState } from 'react';
import { FeedbackDialog } from 'reflet-sdk/react';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Share Feedback</button>
      <FeedbackDialog
        open={open}
        onOpenChange={setOpen}
        publicKey="${publicKey}"
      />
    </>
  );
}
\`\`\`

### Step 4: Customize (Optional)

\`\`\`tsx
<FeedbackButton
  publicKey="${publicKey}"
  theme="auto"              // "light" | "dark" | "auto"
  primaryColor="#6366f1"     // Your brand color
  defaultCategory="feature"  // "feature" | "bug" | "question"
  categories={["feature", "bug"]}  // Which categories to show
  labels={{
    trigger: "Feedback",
    title: "Send Feedback",
    submit: "Submit",
    successTitle: "Thank you!",
    successMessage: "We appreciate your feedback.",
  }}
  onSubmit={(result) => console.log("Submitted:", result)}
/>
\`\`\`

## Configuration Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| publicKey | string | — | Your Reflet public API key |
| user | object | — | \`{ id, email?, name?, avatar? }\` for identified feedback |
| userToken | string | — | Server-signed JWT (alternative to user) |
| theme | "light" \\| "dark" \\| "auto" | "auto" | Color theme |
| primaryColor | string | "#6366f1" | Primary brand color |
| defaultCategory | string | "feature" | Default selected category |
| categories | string[] | ["feature", "bug", "question"] | Categories to show |
| labels | object | — | Custom text labels for i18n |
| asChild | boolean | false | Use child element as trigger |
| className | string | — | Custom CSS class for trigger button |
| onSubmit | function | — | Callback after successful submission |
| onOpen | function | — | Callback when dialog opens |
| onClose | function | — | Callback when dialog closes |

## Implementation Requirements

1. **Match my design** — Place the button where it fits naturally (sidebar footer, header, or floating)
2. **Theme matching** — Use \`theme="auto"\` if my app supports dark mode
3. **User identification** — If I have auth, pass user info for richer feedback
4. **Non-intrusive** — Button should be discoverable but not disruptive
5. **Mobile-friendly** — The dialog automatically becomes a bottom sheet on mobile

## After Implementation

Please provide:
1. **Summary of changes**: List all files created/modified
2. **Testing instructions**: How to verify the feedback flow works
3. **Customization tips**: How to adjust appearance or behavior`;
}
