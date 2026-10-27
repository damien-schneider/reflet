# Sessions

A team member talks while using an app. Reflet keeps the words and the relevant page context together, proposes the intended outcome, and lets the author decide what to hand to a developer.

This is the development contract, not a release checklist. For setup and use, see [devtools and team access](https://www.reflet.app/docs/sdk/devtools#sessions). Provider decisions and dated measurements live in [lot 0](reflet-sessions-lot0.md). Proposed imports remain [unapproved](reflet-inputs.md).

## What exists

- Recording in development tools and on SDK-equipped deployed pages, with an authenticated Reflet team member. Microphone access starts only on an explicit action.
- Pause, resume, finish, moment marks, element selection, bounded page events, and screenshots. The ordinary recorder captures only its page, not other tabs or native apps.
- Cloud transcription, optional speaker detection, transcript correction, and retry while audio is available.
- Intention review on screenshots or as details: confirm, edit, clarify, defer, dismiss, merge, undo, and inspect the cited moment.
- Corrections to a passage's context, including an explicit unknown context. Review, analysis, and brief use the same correction.
- Continuation of an existing intention: compare a new session against the starting revision, accept or reject individual changes, and record a human verification verdict.
- Brief preview, selected evidence, copy, ZIP export, and explicit creation of internal board feedback. Confirming an intention does not publish it or start an agent.
- Reflet Live: the author runs a local recording window and a separately launched coding agent follows new passages across registered development apps. See the [CLI](https://www.reflet.app/docs/cli) and [Live bridge](https://www.reflet.app/docs/sdk/desktop-live).

## Domain and ownership

| Object | Owns |
| --- | --- |
| Session | Author, organization, visibility, recording state, clock, limits |
| Segment | Text, time range, transcription state, human corrections, revision |
| Evidence | Screenshot or external link, capture context, availability |
| Proposal / intention | Desired outcome, observation, possible response, unknowns, citations, review decision, revision |
| Contribution | A later session's proposed and accepted changes to an intention |
| Handoff | The exact selected intentions, revisions, evidence, brief, and copy/export receipt |

The internal name remains `sessionProposals`; a vocabulary change is not a reason to duplicate the model. Collection, transcription, analysis, review, and delivery have separate states. A finished recording can still be processing; a confirmed intention can remain unshared.

## Invariants

1. Every read, write, upload, and direct identifier checks organization and source permissions. Only the author changes a session; other members may read it only after explicit team sharing.
2. Private means private from other members, not local-only processing. Adding a private contribution to a shared intention requires consent for the passages being shared.
3. Operations are idempotent. Retry must not duplicate uploads, proposals, feedback, or handoffs.
4. Human edits win over late AI results. Analyses and acceptances carry source revisions; conflicts require review rather than silent overwrite.
5. Deleting a session removes its content, storage objects, and derived contributions. Independent contributions survive. Late jobs cannot restore deleted content. Exported files and copied briefs cannot be recalled.
6. Pause, finish, expiry, and deletion release capture resources. Reload, interruption, or a hidden page must not silently restart the microphone. A bounded local draft distinguishes unsynced content from server-acknowledged content.
7. Recorded speech and page content are evidence, not privileged instructions to a model or coding agent. Confirmation, publication approval, and agent authorization are different decisions.
8. Session-derived feedback stays out of the ordinary agent queue. Live is an explicit, separate author-controlled path, not a reason to weaken that barrier.

## Capture and context

All segments and events use the same session clock. Coordinates travel with viewport, scroll, scale, and capture timing. A screenshot close in time is not necessarily the same visual state.

Prefer explicit selections and marks over clicks, then sustained hovers. Preserve ambiguity. Never look up a historic selector in today's page and present that as recorded evidence. Draw an element or pointer overlay only when capture and event context match; otherwise show the approximation or missing evidence.

Sessions do not collect keystrokes, clipboard contents, network traffic, a complete DOM replay, or a continuous pointer trail. Screenshot clones empty standard form fields and hide password/payment fields and configured redactions. Other visible text, including an unmasked rich-text editor, may remain. Third-party frames, canvas, and animation may be incomplete. A captured click does not prove that a server saved anything.

Ordinary sessions can analyze incoming transcripts during recording, at most once per 15 seconds, then run a final analysis after finish. Continuations compare at the end. Live sessions skip intention analysis and are removed after 24 hours of inactivity. Limits come from the backend identity response; do not duplicate them in clients.

## Review and handoff

A useful intention separates the need from a suggested implementation. "Know that my changes were saved" is the need; "add a history screen" may be a suggestion the author later abandons.

- A context correction survives reanalysis. Choosing unknown context must not trigger automatic relinking.
- A continuation proposes changes with sources. Nothing changes the accepted intention until a person accepts it. A distinct topic can remain separate.
- A shared intention must not expose private contribution evidence before consent. A stale comparison remains reviewable as stale, never applied as current.
- Briefs contain selected revisions and evidence. New revisions do not silently rewrite an earlier handoff or expand an agent's instructions.
- Copy/export is the delivery event. Do not imply an agent has started or received anything without a real acknowledgment.
- "Add to board" explicitly creates internal feedback. "Works / Needs more work" is a person's assessment, not proof that a release was deployed or fixed the problem.

## Failures and accessibility

Keep acquired text when transcription, screenshots, or analysis fail. Show the failed step and retry action, not an empty success. Missing evidence stays missing. On storage exhaustion or a collection limit, stop the affected capture and retain acknowledged data. On revoked access, stop transfers and clear the affected account's private caches.

Start, pause, mark, finish, review, and copy must work by keyboard. New views receive focus; closing returns it to their opener. Check narrow panels, long text, reduced motion, and unavailable microphone/storage. Element picking is not the only way to explain context.

## Code map

Paths are relative to the repository root.

| Responsibility | Start here |
| --- | --- |
| Capture, page clock, screenshots, speakers | `packages/sdk/src/sessions/capture/` |
| Durable local drafts | `packages/sdk/src/sessions/local/` |
| Recording, review, moments, handoff UI | `packages/sdk/src/sessions/ui/` |
| Deployed team authentication | `packages/sdk/src/sessions/team/`, `packages/backend/convex/team_access/` |
| Permissions and limits | `packages/backend/convex/sessions/access.ts`, `constants.ts` |
| Temporal links and shared context formatting | `packages/backend/convex/sessions/linking.ts`, `formatters.ts` |
| Transcription, analysis, continuation | `packages/backend/convex/sessions/ai/` |
| Intention lifecycle and revision changes | `packages/backend/convex/sessions/intentions/` |
| Briefs and receipts | `packages/backend/convex/sessions/brief/`, `review/handoffs.ts` |
| Cleanup and interrupted sessions | `packages/backend/convex/sessions/lifecycle/` |
| Agent queue barrier | `packages/backend/convex/feedback/agent_queue.ts` |

## Remaining work

Source-map enrichment is separate from recording and intention review. Reuse the devtools resolver; resolve asynchronously, bound work, and cache by build. Record a relative path and version only when known. Missing maps, non-React elements, timeouts, and unknown builds must not block recording or produce invented locations. Never upload raw sources, personal absolute paths, or maps automatically. A component location is not proof of a bug's cause.

PostHog imports and annotated-image imports are proposals, not available integrations. A dashboard intention browser, integrated delegation with explicit mandates, mobile management, and other conversational surfaces must not be presented as shipped.

The product check remains a real, consented session: another person or agent understands the outcome from the brief and its selected files without an oral explanation. Evaluate French and English corrections, ambiguity, contradictory suggestions, permissions across accounts, revoked sharing, deletion, stale revisions, and already-exported briefs. Existing simulated tests and the dated measurements in lot 0 do not establish model quality or a current production release.
