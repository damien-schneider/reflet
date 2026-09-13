export const AGENT_PROMPT = `Fix the next piece of user feedback from Reflet.

Reflet holds the feedback users filed from the product: title, description,
page URL, browser, the element they pointed at (selector, source location,
component stack) and the console errors at the time. The \`reflet\` CLI reads
and updates it. Every command prints JSON when piped or given \`--json\`.

Auth: \`REFLET_API_KEY\` env, or \`reflet login --api-key fb_sec_…\` once.

## Loop

1. Claim the highest-priority open item and lock it for two hours:

   \`npx reflet-cli feedback claim-next --json\`

   Empty output means the queue is clear — stop. Optional filters:
   \`--statuses open,planned\`, \`--tags <tagId,…>\`, \`--as <name>\` (defaults
   to user@host and is what the dashboard shows as the claimer).

2. Read it. \`context.selection.sourceLocation\` and \`componentStack\` point at
   the code; \`context.consoleEvents\` holds the errors; \`context.url\` the page.
   Comments may carry reproduction steps:

   \`npx reflet-cli feedback comments <id> --json\`

3. Fix it in this codebase the way the surrounding code is written. Run the
   tests that cover the change.

4. Open a pull request. Reference the feedback so the merge closes it:

   - GitHub issue linked (the item has \`githubIssueNumber\`) → \`Closes #<n>\`
     in the PR body.
   - No issue → \`fixes reflet:<id>\` in the PR body. Create one on demand with
     \`npx reflet-cli feedback issue <id>\` when the repo wants an issue per PR.

5. Leave a note for the reporter and move the status along:

   \`npx reflet-cli feedback comment <id> --body "Fixed in #<pr>"\`
   \`npx reflet-cli feedback status <id> in_progress\`

   Merging the PR marks it completed through the GitHub webhook. Without the
   webhook, run \`feedback status <id> completed\` after the merge.

## Rules

- One feedback per branch and pull request.
- Not reproducible or not a bug → \`feedback comment\` with what you found, then
  \`feedback status <id> closed\`. Never leave a claimed item without a note.
- Do not edit the feedback title or description; they are the user's words.
- Statuses: open, under_review, planned, in_progress, completed, closed.`;
