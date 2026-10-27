# Reflet SDK

Use `reflet-sdk` to read and submit feedback, build React interfaces, deliver surveys, or add development and team recording tools.

## Install

```sh
npm install reflet-sdk
```

The core client uses `fetch`. Server helpers require Node.js 18+ or a runtime with Web Crypto. React entry points require React and React DOM 18 or 19; the Vite plugin requires Vite 5+.

## Submit feedback

Create an API key in your Reflet organization's settings. Use its public key in browser code and allow your app's origin in the key settings.

```ts
import { Reflet, RefletError } from "reflet-sdk";

const reflet = new Reflet({ publicKey: "fb_pub_YOUR_PUBLIC_KEY" });

try {
  const result = await reflet.create({
    title: "Keep filters when returning to the list",
    description: "Opening an item and going back resets my selected filters.",
  });

  const feedback = await reflet.get(result.feedbackId);
} catch (error) {
  if (error instanceof RefletError) {
    throw new Error(`Reflet ${error.status}: ${error.message}`);
  }
  throw error;
}
```

Creation can be anonymous. Voting, comments, and subscriptions require a user token signed on your server with `await signUser(...)` from `reflet-sdk/server`. The `user` option is an unverified client assertion, not trusted sign-in. Never ship your secret key to the browser.

## Choose an integration

| Import | Guide |
| --- | --- |
| `reflet-sdk` | [Client methods and errors](https://www.reflet.app/docs/sdk/client) |
| `reflet-sdk/server` | [Trusted user identity](https://www.reflet.app/docs/sdk/installation#user-signing) |
| `reflet-sdk/react` | [Provider and hooks](https://www.reflet.app/docs/sdk/react-hooks) |
| `reflet-sdk/feedback` | [Floating feedback widget](https://www.reflet.app/docs/widget/floating-feedback) |
| `reflet-sdk/surveys` | [Survey delivery and custom rendering](https://www.reflet.app/docs/sdk/surveys) |
| `reflet-sdk/devtools/next`, `reflet-sdk/devtools/vite` | [Devtools, notes, and sessions](https://www.reflet.app/docs/sdk/devtools) |
| `reflet-sdk/desktop` | [Desktop team-tools bridge](https://www.reflet.app/docs/sdk/desktop-live#desktop) |
| `reflet-sdk/live-hub` | [Node Live hub integrations](https://www.reflet.app/docs/sdk/desktop-live#live-hub) |

Devtools source access is development-only. Production team tools need a separate member sign-in. Recording starts only after an explicit action and microphone permission; [capture boundaries and handoff](https://www.reflet.app/docs/sdk/devtools#sessions) describe what leaves the device.

[Documentation](https://www.reflet.app/docs/sdk) · [CLI and Live workflow](https://www.reflet.app/docs/cli) · [Release history](./CHANGELOG.md)

MIT licensed.
