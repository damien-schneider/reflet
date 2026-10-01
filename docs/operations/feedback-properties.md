# Feedback properties deployment

New feedback writes its fixed lifecycle and its board column together. Existing feedback may have a completed lifecycle with a Backlog column. Renaming a column must never change its lifecycle meaning.

The schema accepts an unset column meaning during rollout because production data has not been migrated. An unset column cannot receive feedback until an admin assigns its meaning. New columns select an explicit meaning, and established meanings cannot change.

## Reconcile existing data

This operation has not been run by the implementation task. Deploy the backend before running it. Review each organization's column meanings explicitly; do not infer them from localized names.

From `packages/backend`, inspect the organization:

```sh
bunx convex run --prod migrations/feedback_properties:preflight '{"organizationId":"ORG_ID"}'
```

Preflight returns a bounded sample of up to 1,000 feedbacks, column names, existing lifecycle values and conflicting feedback IDs. It is read-only. It does not prove there are no conflicts outside the sample.

Supply a meaning for every column whose meaning is unset. Run the reconciliation in batches of 100, passing the returned `continueCursor` until `isDone` is true:

```sh
bunx convex run --prod migrations/feedback_properties:reconcile '{"organizationId":"ORG_ID","cursor":null,"meanings":[{"statusId":"COLUMN_ID","semanticStatus":"open"}]}'
```

The fixed feedback lifecycle is authoritative for reconciliation. A completed item moves to a column with completed meaning, creating that column if necessary. Its historical `completedAt` is preserved. A reopened item clears `completedAt`. Human properties, audience, approval, tags and activity logs are preserved. Repeating the operation is safe.

After every organization is reconciled, make `semanticStatus` required and remove the migration endpoints. Old per-category `requireApproval` and `defaultStatus` settings and roadmap flags are retained only in the storage schema during this rollout; feedback creation and board filtering no longer use them as lifecycle or publication overrides. Their stored fields can be removed by a separately reviewed data migration before tightening the schema.

## Publication and triage

New web/widget/API submissions begin pending before the asynchronous JEV assessment. A low-junk verdict uses the project's existing `requireApproval` policy. A suspected junk verdict stays pending and displays a JEV discard recommendation; it never archives or permanently deletes anything. Failure or missing JEV configuration keeps the submission pending.

Human approval, rejection and internal audience decisions survive recomputation. Explicit rejection archives the submission through the existing soft deletion mechanism, so it disappears from the normal board and an admin can restore it from Trash. Restoration retains the rejected publication state until an admin changes it.

New JEV runs store actual title/description, questions, criteria, tag snapshot, thresholds, probabilities and outcomes. Legacy scores have no reconstructed history. Deleted feedback, changed input and superseded runs cannot receive obsolete results.

Category audience is independent from feedback lifecycle and publication. `settings.isPublic` remains active: only explicitly public categories are returned to visitors or public widget readers. Members and authorized private API contexts retain team categories, and JEV evaluates all project categories. Unconfigured category audience stays private. Per-category approval and lifecycle overrides remain removed.
