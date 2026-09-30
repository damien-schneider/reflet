# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security problems.

Report privately through either channel:

- [GitHub private vulnerability reporting](https://github.com/damien-schneider/reflet/security/advisories/new)
- Email [security@reflet.app](mailto:security@reflet.app)

Include the affected component (web app, Convex backend, SDK, widgets, CLI), steps to reproduce, and the impact you observed. You will get an answer from a person, usually within a few days.

## Scope

- The hosted service at reflet.app and its API
- Code in this repository: `apps/web`, `packages/backend`, `packages/sdk`, the embeddable widgets, and `packages/cli`

Only the latest release of each published package receives security fixes.

## Please avoid

- Accessing, modifying, or deleting data that is not yours
- Denial-of-service tests or automated scanning that degrades the service
- Social engineering of users or the team
