# Deploy Reflet

Run a Next.js server, a Convex backend with database/file storage, and the static widget bundles. The web server alone is not a complete deployment. Read the [license](../LICENSE) before offering a hosted service.

For local development, use [CONTRIBUTING.md](../CONTRIBUTING.md).

## Choose a backend

- Managed Convex: use separate development and production deployments. The checked-in Vercel configuration uses this path.
- Self-hosted Convex: provision the server, persistent database/storage, client API endpoint, HTTP actions endpoint, and admin key using [Convex's guide](https://docs.convex.dev/self-hosting). Reflet's use of self-hosted Convex has not been verified end to end.

The repository has Vercel and Railpack configuration, not a Docker/Compose or Kubernetes deployment.

## Configure the web app

Use Bun 1.3.14 and Node.js `^22.18.0 || >=24.11.0`. Run `bun install --frozen-lockfile` at the repository root.

For local builds, copy `apps/web/.env.example` to `apps/web/.env.local`. On a host, use its environment settings. Never copy the backend environment file into the web app.

| Web variable | Set to |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Convex client API URL (`.convex.cloud` on managed Convex) |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex HTTP actions URL (`.convex.site`), not the client URL |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key from `bunx web-push generate-vapid-keys`; required by validation even without push delivery |
| `NEXT_PUBLIC_SITE_URL` | Your public HTTPS web origin |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Main app hostname without scheme or port; otherwise defaults to `reflet.app` |
| `NEXT_PUBLIC_REFLET_PUBLIC_KEY` | Your organization's public feedback key, replacing Reflet's default |

The root hostname and its `www` hostname serve the app; single-level subdomains identify organizations. Other hostnames use custom-domain routing. Provision DNS and TLS accordingly.

Turbo can filter host-injected server variables outside its `turbo.json` allowlist. Set [`TURBO_ENV_MODE=loose`](https://turborepo.dev/docs/reference/system-environment-variables#turbo_env_mode) if you need them. Rebuild without cache after changing environment values outside the cache key.

## Configure the backend

Set function secrets on the Convex deployment, not just in a local file or the web host. From `packages/backend`:

```sh
bunx convex env set SITE_URL https://your-web-host.example
bunx convex env set BETTER_AUTH_SECRET '<generated secret>'
```

Generate the secret with `openssl rand -base64 32`. Use `--prod` for managed production and check the selected project first. `packages/backend/.env.example` lists backend variables.

`SITE_URL` is the web origin used by auth and notification links. Add intentional extra auth origins to `ADDITIONAL_TRUSTED_ORIGINS` as a comma-separated list without spaces. This setting is separate from API-key allowed domains.

Next.js forwards `/api/auth` to Convex. For OAuth sign-in, register `https://<web-host>/api/auth/callback/google` or `/github` with the provider. Email/password registration requires verification: configure Resend and a verified sender before opening sign-up. Keep `SKIP_EMAIL_VERIFICATION` and `NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION` off in production.

## Enable integrations

Configure only the features you use. Unconfigured actions can fail even when their controls are visible.

| Feature | Configuration |
| --- | --- |
| Transactional email | Convex: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`. Register `<convex-http-origin>/resend-webhook`. Needed for verification, password resets, invitations, and email notifications. |
| Support email | Convex: `RESEND_SUPPORT_API_KEY`, `RESEND_SUPPORT_EVENTS_WEBHOOK_SECRET`, `RESEND_SUPPORT_INBOUND_WEBHOOK_SECRET`, `SUPPORT_INBOUND_DOMAIN`. Webhooks: `/resend-support-events` and `/resend-support-inbound`. Separate from transactional email. |
| AI | `OPENROUTER_API_KEY` on Convex for triage/session processing and on the web server for web AI routes. Without it, feedback triage follows the project's approval policy; other AI actions report missing configuration. |
| Speaker detection | Convex: `MISTRAL_API_KEY` with `create_client_session` permission. Review [session provider retention](product/reflet-sessions-lot0.md#providers-and-retention) before enabling it. |
| OAuth sign-in | Convex: `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` or `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. These are not GitHub App credentials. |
| GitHub repositories | Convex: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`. Web: `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`. Repository permissions: contents read, issues read/write. Webhook: `<convex-http-origin>/github-webhook`; setup/callback: `<web-origin>/api/github/callback`. |
| Browser push | Convex: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Match the public key to `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. |
| Billing | Convex: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`. Webhook: `<convex-http-origin>/stripe/webhook`. Plan limits still apply without Stripe. |
| Custom domains | Convex: `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`. Automatic provisioning depends on Vercel. |
| Analytics | Web: optional `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`. Source-map upload also needs server-only `POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID`. |

Replace Reflet's sending/inbound domain defaults with domains you control. Keep private API keys, provider secrets, and deployment credentials out of `NEXT_PUBLIC_*`, browser bundles, and source control. The application and some email templates remain Reflet-branded.

## Deploy

### Vercel with managed Convex

Use `apps/web` as the project root. Set the web environment and production `CONVEX_DEPLOY_KEY` there; set function secrets on production Convex separately.

`apps/web/vercel.json` deploys Convex with the web build for production. Preview builds only build the web app: supply a non-production backend explicitly. Both public Convex URLs must match the intended deployment.

### Another host

From `packages/backend`, authenticate the Convex CLI or set the managed production `CONVEX_DEPLOY_KEY`, then deploy:

```sh
bunx convex deploy
```

For self-hosted Convex, use `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY` instead. Remove managed `CONVEX_DEPLOYMENT` and `CONVEX_DEPLOY_KEY` from that runner. Set the web HTTP actions URL separately.

From the repository root, build and start the web app:

```sh
bun run build --force
cd apps/web
PORT=3003 bun run start
```

Keep workspace dependencies and public assets with the built app, and run behind HTTPS ingress. Without `PORT`, `next start` uses port 3000. `railpack.json` handles install/build/start only; deploy Convex separately.

The backend's `bun run deploy` has a Stripe verification prehook. Use the direct Convex command above when billing is not configured. `verify:stripe` reads `.env.local`; `verify:stripe:prod` reads `.env.production`. Both call Stripe and expect active EUR prices of 2900 cents/month and 29000 cents/year plus the configured webhook events.

### Include widget artifacts

The root build builds and copies all three widgets into `apps/web/public/widget/`: `reflet-widget.v1.js`, `reflet-feedback.v1.js`, and `reflet-changelog.v1.js`. Their Convex URLs are compiled in; rebuild when changing backends.

Running `next build` alone skips these steps. The copied files are outside Turbo's cached outputs: use `--force`, or `TURBO_FORCE=true` on Vercel/Railpack. The web build also fetches missing Switzer fonts from Fontshare and needs network access on a clean checkout.

## Before accepting users

- Exercise sign-up/verification, password reset, organization creation, feedback publication, uploads, and each enabled integration.
- Confirm widget URLs serve the new bundles and requests reach your backend.
- Keep development, preview, and production data separate; preview URLs can otherwise write to production.
- Set up database/file backups and test restoration using your backend's tools.
- Watch web/Convex errors, scheduled jobs, and provider webhook delivery. For pending feedback, use the [publication and triage reference](operations/feedback-properties.md).
