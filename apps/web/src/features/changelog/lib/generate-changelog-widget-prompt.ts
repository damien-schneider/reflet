export function generateChangelogWidgetPrompt(publicKey: string): string {
  return `# Reflet Changelog Widget Integration Request

I want to add a changelog / "What's New" widget to my application using Reflet. This widget will display product updates to my users directly inside my app.

## My API Credentials

\`\`\`
PUBLIC_KEY=${publicKey}
\`\`\`

## Your Task

Please analyze my codebase and integrate the Reflet changelog widget following best practices.

### Step 1: Analyze My Codebase

Before writing any code, check:
1. **Framework**: Am I using React/Next.js, Vue, Svelte, or vanilla JS/TS?
2. **Package manager**: Check for \`bun.lockb\`, \`pnpm-lock.yaml\`, \`yarn.lock\`, or \`package-lock.json\`
3. **Existing UI**: Where should the changelog indicator/button go? (e.g., header, sidebar, nav bar)
4. **Styling**: Identify my styling approach (Tailwind, CSS modules, styled-components, etc.)

### Step 2: Choose Integration Method

#### Option A: Script Tag (Simplest - works everywhere)

Add this script to my HTML \`<head>\` or before \`</body>\`:

\`\`\`html
<!-- Card mode: floating notification card in corner -->
<script
  src="https://cdn.reflet.app/widget/reflet-changelog.v1.js"
  data-public-key="${publicKey}"
  data-mode="card"
  data-theme="auto"
  data-position="bottom-right">
</script>
\`\`\`

Available modes:
- \`card\` - Floating notification card showing latest update with unread badge
- \`popup\` - Full modal overlay with scrollable changelog list
- \`trigger\` - Dropdown panel attached to custom trigger elements

#### Option B: React SDK (Recommended for React/Next.js)

Install the SDK:
\`\`\`bash
# Use my project's package manager:
npm install reflet-sdk
\`\`\`

Use the \`ChangelogWidget\` component:
\`\`\`tsx
import { ChangelogWidget } from 'reflet-sdk/react';

export function MyApp() {
  return (
    <>
      {/* Card mode: shows a floating notification card */}
      <ChangelogWidget
        publicKey="${publicKey}"
        mode="card"
        theme="auto"
        position="bottom-right"
      />

      {/* OR Popup mode: full modal overlay */}
      <ChangelogWidget
        publicKey="${publicKey}"
        mode="popup"
        theme="auto"
        autoOpenForNew
      />

      {/* OR Trigger mode: attaches to custom elements */}
      <ChangelogWidget
        publicKey="${publicKey}"
        mode="trigger"
        triggerSelector="[data-reflet-changelog]"
        theme="auto"
      />
    </>
  );
}
\`\`\`

### Step 3: Custom Trigger Button (for trigger mode)

If I want a custom "What's New" button in my nav/header:

\`\`\`tsx
import { ChangelogWidget, useUnreadChangelogCount } from 'reflet-sdk/react';

function WhatsNewButton() {
  const { unreadCount, markAsRead } = useUnreadChangelogCount('${publicKey}');

  return (
    <>
      <button data-reflet-changelog onClick={markAsRead}>
        What's New
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>
      <ChangelogWidget
        publicKey="${publicKey}"
        mode="trigger"
        triggerSelector="[data-reflet-changelog]"
        theme="auto"
      />
    </>
  );
}
\`\`\`

For vanilla HTML:
\`\`\`html
<button data-reflet-changelog>
  What's New
  <span data-reflet-changelog-badge></span>
</button>
\`\`\`

### Step 4: Programmatic Control (Optional)

Control the widget from JavaScript:
\`\`\`javascript
// Open the changelog panel
window.Reflet('open_changelog');

// Close the changelog panel
window.Reflet('close_changelog');

// Get unread count
const count = window.Reflet('get_unread_changelog_count');

// Mark all entries as read
window.Reflet('mark_changelog_read');
\`\`\`

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| publicKey | string | (required) | Your Reflet public API key |
| mode | "card" \\| "popup" \\| "trigger" | "card" | Display mode |
| position | "bottom-right" \\| "bottom-left" | "bottom-right" | Widget position |
| theme | "light" \\| "dark" \\| "auto" | "light" | Color theme |
| primaryColor | string | "#6366f1" | Brand color |
| maxEntries | number | 10 | Max entries to display |
| triggerSelector | string | "[data-reflet-changelog]" | CSS selector for trigger elements |
| autoOpenForNew | boolean | false | Auto-open when new entries exist |

## Implementation Requirements

1. **Match my design** - Place the widget trigger where it makes sense in my app's navigation
2. **Theme matching** - Use \`theme="auto"\` if my app supports dark mode, or match my app's theme
3. **Non-intrusive** - The widget should enhance, not disrupt the user experience
4. **Accessible** - Ensure proper ARIA labels and keyboard navigation

## After Implementation

Please provide:
1. **Summary of changes**: List all files created/modified
2. **Testing instructions**: How to verify the widget works
3. **Customization tips**: How to adjust colors, position, or behavior`;
}
