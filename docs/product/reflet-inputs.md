# Proposed intention imports

Status: unapproved design. No PostHog connector, annotated-image intention import, or dashboard intention browser is implemented. This document is not installation guidance.

## Need

Two existing sources of product context still require manual rewriting:

- A teammate watches a PostHog replay showing checkout rage clicks and abandonment. Reflet could propose an uncertain need with links to the relevant moments.
- A designer annotates a screenshot with text and arrows. Reflet could turn each meaningful annotation into an intention tied to its region.

Reuse the [session intention model](reflet-sessions.md), review decisions, continuation, selected-evidence briefs, and explicit "Add to board" action. Notes remain a separate input with the same handoff choices.

## Shared design

Treat one import as one session. Proposed session origins are `voice`, `posthog`, and `screenshot`; absent origin means voice. A dashboard surface would be new. Keep provenance and source permissions with every event, screenshot, and contribution.

Do not create a second intention table or bypass session access checks. Existing starting points are `sessions/tableFields.ts`, `sessions/ai/`, `sessions/review/`, and `sessions/intentions/` in the backend, plus `packages/sdk/src/sessions/protocol.ts` and the SDK review UI.

## PostHog replay

Proposed flow:

1. An admin connects a project using its host, project ID, and a personal API key limited to `session_recording:read` and `query:read`.
2. Reflet verifies both project access and permission to query events. EU, US, and self-hosted hosts need an explicit host policy.
3. The author selects a replay by date, duration, start URL, clicks, or errors. Importing it again opens the existing session rather than duplicating it.
4. The backend fetches replay metadata and a bounded HogQL event result. The SDK never receives the personal key or calls PostHog directly.
5. Convert pageviews, clicks, rage/dead clicks, and exceptions to timed context. Keep links to the original replay moments; no replay images or local replay renderer in this proposal.
6. Analyze behavior as hypotheses, never as spoken intent. Every proposal cites an event. Ordinary navigation can correctly produce no intentions.

Proposed bounds: 2,000 events, 40 linked evidence items, six intentions, and 30 imports per organization per hour. Store no email or person properties; the proposed identity is a hash of `distinct_id`. Truncate event labels. A query failure must not leave a misleading completed import.

The key needs encryption at rest; no shared integration-secret helper exists today. The proposal is backend AES-256-GCM with `INTEGRATION_SECRETS_KEY`, a displayed last-four-character hint, and manual rotation. This is a decision to approve, not a configured environment variable.

Removing the connection would not delete already imported sessions. Replay links still require access to PostHog. Automatic imports and replay rendering remain out of scope.

## Annotated screenshot

Proposed inputs: upload or paste PNG/JPEG/WebP in the dashboard, or choose an existing feedback screenshot. Reuse the annotator and the server-owned session image limit (currently 2.5 MB).

- Store one screenshot evidence item with annotations and optional typed context.
- Send only the rendered, annotated image to the model. Blur must be baked into that image; never send the raw image to the model instead.
- Number annotations in the rendered image and prompt. Each intention cites its annotation numbers and uses their coordinates for its callout.
- Explicit annotation text can support a clear proposal; an unlabeled shape alone remains uncertain.
- Proposed processing bounds: one image per model call, a maximum 1,568-pixel side, and 20 analyses per author per hour.

This needs image input in the structured-output helper; its current text-only API is not an import implementation. The existing feedback screenshot uploader may store both original and annotated images, so the import's model-input privacy rule must be enforced separately.

## Review and privacy

The proposed dashboard lists visible intentions across sources with source, decision, board/handoff state, and filters. Opening one must reach a usable review surface. Today the complete review lives in SDK shadow DOM; a dashboard list alone does not solve that dependency.

Imported sessions inherit source permissions, explicit sharing, revision conflicts, deletion, and late-job protections. Model calls should use the session zero-retention route. Optional voice speaker detection remains a different provider path; see the [provider record](reflet-sessions-lot0.md).

## Acceptance before shipping

- Limited PostHog credentials work; missing query scope explains the required permission. No secret appears in responses or logs.
- Reimporting a replay is idempotent. Every behavioral hypothesis has an event citation and a working timestamped replay link. No useful signal is a valid empty result.
- Three distinct text annotations produce separately reviewable, correctly located intentions. The model never receives a region that the rendered image masks.
- Imported intentions use the ordinary confirm, brief, board, continuation, and deletion paths without source-specific permission exceptions.
- Rate limits, revoked credentials, deleted sources, failed analysis, and retries do not leave duplicate or half-created sessions.

## Decisions still required

- Approve the shared session model and new origins/surface.
- Choose dashboard review: reuse the SDK review, build a web review, or ship a list that opens the existing tools. The original recommendation was the last option, but it still needs a clear working entry point.
- Choose organization-level or per-person PostHog credentials. A shared key lets members import using the connecting admin's access.
- Approve secret storage and rotation, allowed hosts, event mapping, and processing limits.
- Choose default visibility for replays and screenshots; do not infer team-sharing consent from an import.
- Approve rendered-image-only model input and source-linked hypotheses.
- Choose delivery order. The original proposal was annotated screenshots before PostHog because they need no external credential.

Approval of this design does not authorize automatic publication, agent execution, or building a replay/analytics service.
