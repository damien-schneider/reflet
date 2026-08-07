export function generateSetupPrompt(publicKey = "fb_pub_xxx"): string {
  return `Add the Reflet feedback widget to this app.

Reflet is a feedback tool. The widget is a floating button that opens a panel
where a user writes a report; it screenshots the current viewport
automatically. On React it also lets them draw on that screenshot and point at
an element, so the report carries that element's selector and markup — plus the
component stack and source location when the build exposes them.

Read this codebase first: which package manager it uses, which framework
renders it, which file every page goes through, and how it reads the current
user. Everything below adapts to what you find — nothing here assumes Next.js.

## 1. Pick a path

- Renders React (Next.js, Vite, React Router, Remix, TanStack Start, Expo web,
  Astro islands…) → §2, the npm package. Full annotation and element picker.
- Anything else (Vue, Svelte, Angular, Rails, Django, Laravel, plain HTML) →
  §3, the script tag. Report, screenshot and board; no annotation or picker.

## 2. React

Install \`reflet-sdk\` with the package manager this repo already uses.

Mount the widget exactly once, as the last child of the app shell — the single
component every page renders through. Find that file; it is usually one of:

- Next.js App Router → \`app/layout.tsx\`, just before \`</body>\`. The widget
  ships its own \`"use client"\`, so the layout stays a Server Component.
- Next.js Pages Router → \`pages/_app.tsx\`, sibling of \`<Component />\`.
- Vite → beside \`<App />\` in \`src/main.tsx\`.
- React Router / Remix → before \`</body>\` in \`app/root.tsx\`.
- TanStack Start → the root route's shell component.

\`\`\`tsx
import { RefletFeedback } from "reflet-sdk/feedback";

<RefletFeedback publicKey={/* see §4 */} />
\`\`\`

## 3. Any other stack

Serve one script tag on every page, from the layout or base template this app
already has:

\`\`\`html
<script
  src="https://www.reflet.app/widget/reflet-feedback.v1.js"
  data-public-key="${publicKey}"
  data-position="bottom-right"
  data-theme="auto"
  defer
></script>
\`\`\`

Anything beyond key, position, colour and theme goes through a config object
declared before the script loads:

\`\`\`html
<script>
  window.Reflet = {
    publicKey: "${publicKey}",
    user: { id: "user_123", email: "jane@example.com", name: "Jane Doe" },
  };
</script>
\`\`\`

## 4. The public key

\`${publicKey}\`

It is safe in the browser and comes from Reflet Dashboard → In-App. Put it in
whichever env file this framework reads, under whichever prefix that framework
exposes to the browser — \`NEXT_PUBLIC_\`, \`VITE_\`, \`NUXT_PUBLIC_\`,
\`PUBLIC_\`, \`EXPO_PUBLIC_\`, \`REACT_APP_\`. Read it the way the rest of this
codebase reads its own public env vars; do not invent a second convention.

## 5. Identity

Reports carry an identity instead of asking for an email. Find how this
codebase reads its session and reuse it — do not invent an auth hook. If there
is no auth, skip this section.

Unsigned, when the app is not security-sensitive about who files a report:

\`\`\`tsx
<RefletFeedback publicKey={KEY} user={{ id: user.id, email: user.email, name: user.name }} />
\`\`\`

Signed, so a browser cannot impersonate another user — sign on the server and
hand the token down. \`signUser\` is runtime-agnostic (Node, Deno, Bun, Edge,
Cloudflare Workers, Convex), so it fits a route handler, a server function, a
middleware or a controller alike:

\`\`\`ts
import { signUser } from "reflet-sdk/server";

const { token } = await signUser(
  { id: user.id, email: user.email, name: user.name },
  REFLET_SECRET_KEY
);
\`\`\`

\`\`\`tsx
<RefletFeedback publicKey={KEY} userToken={token} />
\`\`\`

The secret key never reaches the browser: read it from a server-only env var,
never one carrying a public prefix. The script tag takes the same \`userToken\`
through \`window.Reflet\`.

## 6. Options worth setting when they match this app

- \`position\` — "bottom-right" (default), "bottom-left", "top-right",
  "top-left". Check what already sits in that corner before choosing.
- \`primaryColor\` — any CSS colour, to match the product's brand.
- \`theme\` — "auto" (default), "light", "dark". If this app owns a theme
  toggle, pass its current value rather than leaving it on "auto".
- \`enabled\` — gate the launcher on an app-owned boolean, for example
  \`enabled={user.email === "you@example.com"}\` while dogfooding.
- \`dismissForDays\` — let a reporter hide the launcher for that many days.
- \`hotkey\` — e.g. "mod+shift+f"; off by default so nothing is hijacked.
- \`captureConsole\` — set to false to stop recording console errors.
- \`metadata\` — a flat string record merged into every report (plan, tenant…).

## Constraints

- Mount it exactly once. Two widgets means two floating buttons.
- Do not wrap it in \`RefletProvider\` unless the app already uses one; the
  widget works standalone with a \`publicKey\`.
- It needs the DOM: keep it out of server-only files other than the app shell.
- Do not commit a real key if this repo commits its env files.
- Match this codebase's conventions — its formatter, its import style, its file
  layout. The integration should read like the code around it.

When you are done, run the app, click the button and confirm the panel opens
with a screenshot preview.`;
}

export const SETUP_PROMPT = generateSetupPrompt();
