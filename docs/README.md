# Documentation

## Use Reflet

Start with [Using Reflet](https://www.reflet.app/docs/using-reflet): workspace setup, feedback review, roadmap, releases, support, surveys, status, and team settings.

## Integrate

The [website docs](https://www.reflet.app/docs) are the integration reference:

- [SDK](https://www.reflet.app/docs/sdk): JavaScript, React, trusted identity, surveys, devtools, sessions, and desktop/Live bridges.
- [Widgets](https://www.reflet.app/docs/widget): feedback collection, in-app chat, and changelog embeds.
- [Components](https://www.reflet.app/docs/components): installable feedback cards and milestone views.
- [REST API](https://www.reflet.app/docs/api): authentication, reads/writes, administration, and webhooks.
- [CLI](https://www.reflet.app/docs/cli): project setup, agent work queues, and live development sessions.

Package entry points: [SDK README](../packages/sdk/README.md), [CLI README](../packages/cli/README.md).

## Run and contribute

- [Contributing](../CONTRIBUTING.md): local setup, code map, checks, and tests.
- [Self-hosting](self-hosting.md): deployment, environment variables, optional services, and operations.
- [Feedback properties](operations/feedback-properties.md): workflow, publication, visibility, and migration checks.
- [Security](../SECURITY.md): reporting a vulnerability.
- [License](../LICENSE): repository terms. The SDK and CLI declare their own package licenses.

## Design records

These are for maintainers, not setup instructions:

- [Sessions](product/reflet-sessions.md): current domain contracts, privacy boundaries, and remaining work.
- [Session provider decisions](product/reflet-sessions-lot0.md): October 2026 choices and dated measurements.
- [Proposed intention imports](product/reflet-inputs.md): unapproved PostHog and annotated-screenshot design.

Update the relevant reference when behavior changes. Keep release history in the [SDK changelog](../packages/sdk/CHANGELOG.md); do not turn user guides into delivery logs.
