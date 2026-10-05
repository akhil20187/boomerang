# Account task history — approved 5 October 2026

User approved the two-screen static mockup and requested implementation (D95).

## Screens

After login, `/tasks` shows My tasks with available credit, All/In progress/Finished tabs, active tasks before recent finished tasks, and load-more history. Rows show product, start date, selected-shop count, outcome/progress and actual settled charge. Empty and loading states are explicit. `/app` retains shop search.

Opening a row navigates to the existing `/status?task=<id>` link. The dedicated website details view shows product/customer request, selected shops and their statuses, expandable per-shop attempts with times/outcomes, answers, private recordings and expandable transcripts. Unknown answers remain Unconfirmed. Recording states distinguish processing from unavailable. Back navigation returns to My tasks. The embedded chat card stays separate.

## Data and privacy

Convex owns the saved tasks, jobs, attempt history, transcripts and reservations. Add an indexed owner-scoped paginated history query and enrich existing owner-checked detail data. Charges come from settled reservations, not inferred call counts. No provider URLs/tokens are exposed; recording playback uses existing owner-checked short-lived grants. Each customer sees only their tasks.

## Verification and limits

Test isolation, history pagination, outcome summaries, actual charges, attempts and transcripts; type-check/build; exercise signed-in list/detail/recording/transcript flow in browser using existing controlled evidence. No new calls. Preserve deep links and chat cards. No new calling, refunds or worker capabilities are part of this change.

## Implementation plan

1. Add backend history/detail regressions before changing data queries.
2. Implement private paginated summaries and bounded per-attempt evidence.
3. Build approved screens and signed-in navigation using existing auth and recording player.
4. Run relevant tests/build, deploy existing Convex app, and verify in browser.
