# Feedback properties deployment

New feedback writes its fixed lifecycle and its board column together. Every column has a lifecycle meaning (`semanticStatus`), and renaming a column never changes it. The board always lists columns in lifecycle order (Backlog, Under Review, Planned, In Progress, Done, Closed); the stored `order` only ranks columns sharing a meaning.

The one-off reconciliation that assigned meanings to legacy columns and moved feedback into the column matching its lifecycle ran on production and dev on 2026-10-04. Its endpoints are removed and the schema requires `semanticStatus`.

Old per-category `requireApproval` and `defaultStatus` settings and roadmap flags are retained only in the storage schema; feedback creation and board filtering no longer use them as lifecycle or publication overrides. Their stored fields can be removed by a separately reviewed data migration before tightening the schema.

## Publication and triage

New web/widget/API submissions begin pending before the asynchronous JEV assessment. A low-junk verdict uses the project's existing `requireApproval` policy. A suspected junk verdict stays pending and displays a JEV discard recommendation; it never archives or permanently deletes anything. A failed run, including a missing `OPENROUTER_API_KEY`, applies the `requireApproval` policy without the junk check, so feedback is never held only because triage could not run. Editing the title or description while the run is in flight discards its result and starts a new moderating run on the edited text. Secret-key API reads include pending submissions with their `publication` state, and `POST /api/v1/admin/feedback/publication` sets it; webhooks deliver approved feedback only.

Human approval, rejection and internal audience decisions survive recomputation. Explicit rejection archives the submission through the existing soft deletion mechanism, so it disappears from the normal board and an admin can restore it from Trash. Restoration retains the rejected publication state until an admin changes it.

New JEV runs store actual title/description, questions, criteria, tag snapshot, thresholds, probabilities and outcomes. Legacy scores have no reconstructed history. Deleted feedback, changed input and superseded runs cannot receive obsolete results.

Category audience is independent from feedback lifecycle and publication. `settings.isPublic` remains active: only explicitly public categories are returned to visitors or public widget readers. Members and authorized private API contexts retain team categories, and JEV evaluates all project categories. Unconfigured category audience stays private. Per-category approval and lifecycle overrides remain removed.
