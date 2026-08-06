export function generateSetupPrompt(publicKey = "fb_pub_xxx"): string {
  return `Add the Reflet feedback widget to this app.

Reflet is a feedback tool. The widget is a floating button that opens a panel
where a user writes a report; it screenshots the current viewport
automatically, lets them draw on that screenshot, and lets them point at a
specific element so the report carries the React component and its source
location.

Do this:

1. Install the SDK with the package manager this repo already uses:
   \`reflet-sdk\`

2. Mount the widget once, as the last child of the app shell, so it renders on
   every page:

   - Next.js App Router → \`app/layout.tsx\` (or \`src/app/layout.tsx\`), just
     before \`</body>\`. The widget ships its own \`"use client"\` directive, so
     the layout can stay a Server Component.
   - Next.js Pages Router → \`pages/_app.tsx\`, as a sibling of
     \`<Component {...pageProps} />\` inside a fragment.
   - Vite / React Router → next to \`<App />\` in \`src/main.tsx\`, or before
     \`</body>\` in \`app/root.tsx\`.

   \`\`\`tsx
   import { RefletFeedback } from "reflet-sdk/feedback";

   <RefletFeedback publicKey={process.env.NEXT_PUBLIC_REFLET_PUBLIC_KEY} />
   \`\`\`

   With Vite, read the key from \`import.meta.env.VITE_REFLET_PUBLIC_KEY\`
   instead.

3. Add this public key to the env file the framework reads:

   \`${publicKey}\`

   Use \`.env.local\` for Next.js or \`.env\` for Vite. The key is safe to
   expose in the browser and comes from Reflet Dashboard → In-App.

4. If the app knows who the user is, pass it — reports then carry an identity
   instead of asking for an email:

   \`\`\`tsx
   <RefletFeedback
     publicKey={process.env.NEXT_PUBLIC_REFLET_PUBLIC_KEY}
     user={{ id: user.id, email: user.email, name: user.name }}
   />
   \`\`\`

   Use the app's real current-user object. Do not invent an auth hook: find how
   this codebase reads the session and reuse it. If there is no auth, leave
   \`user\` out.

5. Options worth setting when they match this app:
   - \`position\` — "bottom-right" (default), "bottom-left", "top-right", "top-left"
   - \`primaryColor\` — any CSS color, to match the product's brand
   - \`theme\` — "auto" (default), "light", "dark"
   - \`enabled\` — target specific people with an app-owned boolean, for example
     \`enabled={["user_1", "user_2"].includes(user.id)}\`
   - \`dismissForDays\` — let a reporter hide the launcher for that many days
   - \`hotkey\` — e.g. "mod+shift+f"; off by default so nothing is hijacked
   - \`captureConsole\` — set to false to stop recording console errors
   - \`metadata\` — a flat string record merged into every report (plan, tenant…)

Constraints:
- Mount it exactly once. Two widgets means two floating buttons.
- Do not wrap it in \`RefletProvider\` unless the app already uses one; the
  widget works standalone with a \`publicKey\`.
- Do not add it to a server-only file other than a layout — it needs the DOM.
- Do not commit a real key if this repo commits its env files.

When you are done, run the app, click the button and confirm the panel opens
with a screenshot preview.`;
}

export const SETUP_PROMPT = generateSetupPrompt();
