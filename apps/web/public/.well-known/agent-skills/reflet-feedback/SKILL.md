---
name: reflet-feedback
description: Read and manage Reflet feedback, roadmaps, and releases with the authenticated Reflet CLI.
---

# Reflet feedback workflow

Use Reflet to collect feedback, inspect reported bugs, and track delivery.

## Connect

Public documentation and public boards need no login. Organization management uses a secret API key. Ask the owner to create or select a key in the dashboard's **Agents & CLI** page. A widget's `fb_pub_` key cannot administer the organization.

Run `npx reflet-cli@latest login` interactively, or provide `REFLET_API_KEY` through the runtime's secret environment. Do not print the key or put it in a repository. `REFLET_API_URL` selects a self-hosted API; hosted Reflet uses the CLI's default API URL.

## Read before changing

```sh
npx reflet-cli@latest feedback list --json
npx reflet-cli@latest feedback get FEEDBACK_ID --json
npx reflet-cli@latest feedback comments FEEDBACK_ID --json
npx reflet-cli@latest screenshot download FEEDBACK_ID
```

Keep the requested organization and feedback scope. Read the report, screenshots, comments, and linked work before classifying or changing status. `screenshot download` writes the annotated images to `.reflet/screenshots/FEEDBACK_ID/` so you can open them. `feedback claim-next` claims work and changes status; it is a mutation, not a queue preview.

For an authorized change, inspect `npx reflet-cli@latest --help` and the relevant command's help, perform that change, then read the item again to verify it. Publishing releases, commenting, deleting, or modifying feedback requires the user's task to authorize that action.

## Fix reported bugs inside a repository

Run `npx reflet-cli@latest agent install` in the repository once. It writes the
end-to-end queue workflow — claim, read, fix, open the pull request, move the
status — to `.agents/skills/reflet/`, `.claude/skills/reflet/` and
`.claude/commands/reflet.md`, so Codex, omp and Claude Code all reach it.
`npx reflet-cli@latest prompt agent` prints the same workflow.

## References

- [CLI commands](https://www.reflet.app/docs/cli)
- [API documentation](https://www.reflet.app/docs/api)
- [Widget setup](https://www.reflet.app/docs/widget/feedback-widget)
- [Authentication](https://www.reflet.app/auth.md)
