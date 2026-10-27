# Security policy

## Report a vulnerability privately

Use [GitHub's private vulnerability reporting form](https://github.com/damien-schneider/reflet/security/advisories/new). Do not include exploitable details, credentials, or another user's data in a public issue or pull request.

Include:

- The affected app, backend endpoint, SDK, widget, or CLI, with the version or commit if known.
- Reproduction steps using accounts and data you control.
- The access required, observed impact, and a minimal example or redacted evidence.

If private reporting is unavailable, ask the repository owner for a private channel through a contact on their [GitHub profile](https://github.com/damien-schneider).

## Testing boundaries

Do not access, change, or delete data belonging to others. Do not run denial-of-service tests, disruptive automated scans, or social engineering against the hosted service. Use a local instance or an environment you have permission to test whenever possible.

Operators of their own instances are responsible for protecting deployment credentials, applying updates, and configuring their infrastructure and service providers. Deployment notes are in the [self-hosting guide](docs/self-hosting.md).
