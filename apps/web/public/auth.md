# Reflet auth.md

Public marketing pages, documentation, and public feedback boards are readable without credentials. Private organizations and administration require authentication.

## CLI and API keys

An organization owner or administrator obtains a secret `fb_sec_` API key from the dashboard's **Agents & CLI** page. Run `npx reflet-cli@latest login` interactively or pass the key through the secret environment variable `REFLET_API_KEY`. The CLI verifies which organization owns the key. Public `fb_pub_` widget keys cannot administer an organization.

The API uses `Authorization: Bearer <secret-key>`. Use the backend URL documented by the CLI or the organization's self-hosted setup; `REFLET_API_URL` overrides it. See [the API documentation](https://www.reflet.app/docs/api) and [CLI commands](https://www.reflet.app/docs/cli).

Keep keys in a secret store, never in public content. Only perform mutations authorized by the user. Organization administrators can revoke keys in the dashboard. Reflet does not advertise an OAuth authorization server or automatic agent account registration.
