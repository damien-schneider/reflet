# Contributing to Reflet

Use a development Convex deployment and test service credentials. Do not connect local development or browser tests to production data.

## Run the app locally

You need Git, Bun 1.3.14 (the version in `package.json`), and Node.js `^22.18.0 || >=24.11.0`. The setup below uses a managed [Convex](https://www.convex.dev/) project. See [self-hosting](docs/self-hosting.md) for deployment options.

```sh
git clone https://github.com/damien-schneider/reflet.git
cd reflet
bun install --frozen-lockfile
bun run dev:setup
cp apps/web/.env.example apps/web/.env.local
```

`dev:setup` runs `convex dev --configure --until-success` in `packages/backend`. Select or create a development project. Convex writes its CLI deployment configuration to `packages/backend/.env.local` and generates backend types.

### Configure the two environments

Do not copy the backend environment file into the web app. The Convex deployment runs backend functions; Next.js runs the web server. They have separate environment stores.

1. In `apps/web/.env.local`, set `NEXT_PUBLIC_CONVEX_URL` to the deployment's client API URL and `NEXT_PUBLIC_CONVEX_SITE_URL` to its HTTP actions URL. Get both from the Convex dashboard. Keep `NEXT_PUBLIC_SITE_URL=http://localhost:3003`.
2. Generate a VAPID pair with `bunx web-push generate-vapid-keys`. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in the web file. It is required by `packages/env/src/web.ts`, even if you are not testing push delivery.
3. Generate an auth secret with `openssl rand -base64 32`. From `packages/backend`, set the backend values using the CLI:

```sh
cd packages/backend
bunx convex env set SITE_URL http://localhost:3003
bunx convex env set BETTER_AUTH_SECRET '<generated secret>'
```

Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` on the same Convex deployment for normal email/password registration, verification, and password resets. Use a verified sender you control. Optional Google/GitHub sign-in and other integrations are listed in the [self-hosting guide](docs/self-hosting.md#enable-integrations).

`packages/backend/.env.example` lists backend variables, but placing secrets in a local file does not upload them to Convex. Use `bunx convex env set NAME value` from `packages/backend` or the deployment dashboard. Never put secrets in `NEXT_PUBLIC_*` variables: those values are sent to browsers.

### Start development

Return to the repository root:

```sh
bun run dev
```

Open [http://localhost:3003](http://localhost:3003). The web script binds to `127.0.0.1`; Convex watches backend changes, and the widget packages rebuild their static bundles. The first web start fetches missing Switzer font files from Fontshare, so it needs network access.

To run only one part, use `bun run dev:web` or `bun run dev:server`. Restart the web process after changing its environment.

## Find the code

| Path | Responsibility |
| --- | --- |
| `apps/web/app` | Next.js App Router pages, MDX docs/blog, and API routes |
| `apps/web/src/features` | Feature UI and hooks |
| `apps/web/src/lib` | Shared web utilities and auth clients |
| `apps/web/proxy.ts` | Hostname routing and auth-page redirects |
| `packages/backend/convex` | Database schema, queries, mutations, actions, scheduled jobs, and HTTP endpoints |
| `packages/backend/convex/auth` | Better Auth configuration backed by a Convex component |
| `packages/env/src` | Public and server-only web environment validation |
| `packages/sdk`, `packages/cli` | Application integrations and command-line client |
| `packages/widget`, `packages/feedback-widget`, `packages/changelog-widget` | Standalone browser bundles copied into the web app's public directory |
| `packages/ui`, `packages/email`, `packages/survey-core` | Shared UI, email templates, and survey logic |

The UI uses Convex React subscriptions. Convex owns application data and file storage. Next.js proxies Better Auth requests through `/api/auth`; the auth implementation and session data live in Convex. Organization membership and backend access checks determine permissions, not the presence of a browser cookie alone.

See [repository docs](docs/README.md) for design and operations references, including [feedback properties](docs/operations/feedback-properties.md).

## Check a change

Run commands from the repository root unless noted:

| Command | What it does |
| --- | --- |
| `bun x ultracite check` | Checks formatting and lint rules |
| `bun x ultracite fix` | Applies formatting and automatic lint fixes |
| `bun run check-types` | Runs workspace type checks; the backend also runs Convex code generation |
| `bun run test:unit` | Runs each workspace's `test:unit` script through Turbo |
| `bun run build` | Builds workspace packages and the production web app |
| `bun run test:e2e --project=chromium --workers=1` | Runs headless browser tests against local port 3003 |

For a narrower unit run, use the workspace script, for example `cd apps/web && bun run test:unit`, then pass Vitest's file filters as needed. There is no root `test` script.

### Prepare browser tests

Install browsers from `apps/web` with `bun run test:e2e:install`. Playwright can start Next.js or reuse the server on port 3003; it does not start Convex. Keep `bun run dev:server` running in another terminal.

Authenticated tests create accounts and organizations. On a disposable development deployment only, set `SKIP_EMAIL_VERIFICATION=true` with the Convex CLI and `NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true` in `apps/web/.env.local`. Restart the web server. These flags must agree, and neither belongs in a public or production deployment. Remove the flags when finished.

The Playwright configuration includes Chromium, Firefox, and WebKit. Omitting `--project=chromium` runs all three. It defaults to two local workers and one in CI.

## Submit a contribution

Open an issue for a substantial behavior or API change before implementing it. Keep a pull request focused, explain the user-visible result, and include the checks you ran. Add regression coverage at the level that exercises the change, and update the relevant docs rather than duplicating instructions.

The pre-commit hook checks whitespace and runs Ultracite plus backend type checking. It does not replace unit tests, browser tests, or a build. The checked-in GitHub Actions workflow submits the production sitemap to IndexNow; it is not a build/test pipeline.

Follow [SECURITY.md](SECURITY.md) for vulnerabilities, not a public issue. Contributions are governed by the repository's [LICENSE](LICENSE), including its contribution and commercial-use terms.
