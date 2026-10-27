# Authentication

Public documentation needs no account. Account data and writes require the credentials below.

## Organization API

Default origin: `https://harmless-clam-802.convex.site`. Use `/api/v1` for public endpoints and `/api/v1/admin` for administrative endpoints. Self-hosted clients use their backend HTTP origin, not its `.convex.cloud` URL.

Send `Authorization: Bearer <key>`. The key selects one organization.

| Credential | Access |
| --- | --- |
| `fb_pub_` | Browser-safe key. Reads public organizations; creates feedback, uploads screenshots and answers surveys, including ingestion into private organizations. No administration or authenticated user identity. Allowed-domain restrictions require a matching `Origin` or `Referer`, not proof of user identity. |
| `fb_sec_` | Server-only key. Adds private feedback reads, internal creation and organization administration. Obtain it as an owner/administrator in dashboard settings. Keep it out of browsers, URLs, logs and git. Disable or delete compromised keys in the dashboard. |
| `X-User-Token` header | Signed customer identity for voting, commenting, subscribing and unsubscribing, in addition to the bearer key. Authenticate the person in your app, then call server-side `signUser` with the secret paired with that key. Unsigned tokens only attribute new feedback/survey responses. Invalid/expired tokens are ignored; required user actions return `401`. |

See [HTTP endpoints, limits and errors](https://www.reflet.app/docs/api) and [user signing](https://www.reflet.app/docs/sdk/installation#user-signing).

## CLI

`npx reflet-cli login` validates and stores a secret key in `~/.reflet/config.json` with mode `0600`. The prompt is not masked. Use a secret-store-provided `REFLET_API_KEY` in automation; `--api-key` can expose it in shell history/process arguments. `REFLET_API_URL` overrides the backend origin. Environment values override stored config.

There is no logout command: remove the stored credential and revoke the key when no longer needed. See [CLI usage and current signed-user command limits](https://www.reflet.app/docs/cli).

## Member and recording access

Dashboard members and your app's customers are different identities. Browser devtools and recordings use scoped `fb_dev_` or origin-bound `fb_team_` credentials, not organization API keys. The credential in `~/.reflet/live.json` authorizes local Live handoff, not organization administration. See [member access](https://www.reflet.app/docs/sdk/devtools#access).

## Documentation interfaces

Public MCP and A2A interfaces serve published documentation without credentials. They cannot read account data, perform account writes, register accounts or issue account authorization credentials.
