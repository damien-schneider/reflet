# Reflet auth.md

Public marketing pages, documentation, and public feedback boards are readable without credentials. Private organizations and administration require authentication.

## CLI and API keys

An organization owner or administrator obtains a secret `fb_sec_` API key from the dashboard's **Agents & CLI** page. Run `npx reflet-cli@latest login` interactively or pass the key through the secret environment variable `REFLET_API_KEY`. The CLI verifies which organization owns the key. Public `fb_pub_` widget keys cannot administer an organization.

The API uses `Authorization: Bearer <secret-key>`. Use the backend URL documented by the CLI or the organization's self-hosted setup; `REFLET_API_URL` overrides it. See [the API documentation](https://www.reflet.app/docs/api) and [CLI commands](https://www.reflet.app/docs/cli).

Keep keys in a secret store, never in public content. Only perform mutations authorized by the user. Organization administrators can revoke keys in the dashboard. Reflet does not advertise an OAuth authorization server or automatic agent account registration.

## Public documentation MCP

Connect using Streamable HTTP at https://www.reflet.app/api/mcp. No credentials are required: the server only reads the public overview, this authentication guide, and the published integration skill. It cannot access an account or perform writes.

## Public A2A documentation

Discover the A2A 1.0 documentation agent at `/.well-known/agent-card.json`. Send JSON-RPC `SendMessage` requests to `/api/a2a` with `A2A-Version: 1.0` and one `text/plain` part containing exactly `overview`, `authentication`, or `integration`. Responses contain the corresponding published Markdown document.

This interface requires no credentials, retains no conversation history or tasks, and cannot read account data or perform account actions. It does not support streaming or push notifications. Existing product authentication still applies to account operations.
