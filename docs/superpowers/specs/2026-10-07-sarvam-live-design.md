# Sarvam live calling

User authorised the live integration after successful personal English/Telugu tests on 7 October. This advances D126 from evaluation to the primary provider.

Use the existing Railway call bridge with a Sarvam provider adapter. Keep Convex task states, credit reservations, result extraction, private recordings and retries. A separate service would duplicate recovery and billing paths; replacing the entire bridge would risk existing recordings. Keep the old provider available only as an operator-selected rollback, never an automatic fallback after an uncertain request.

Pin agent Conversatio-a86d995b-df0d to committed v2, using its Vobiz connection and caller ending 0585. Map the selected shop name, customer first name, exact product description, comments and requested card offers to the agent inputs. Explicitly forbid purchases, bookings and reservations in each inquiry. Preserve the tested agent's language switching and five-minute maximum.

Persist the local attempt before dispatch and the provider attempt immediately after acceptance. Poll authenticated analytics for that exact identifier; restarting must only look up existing calls, never redial. Unknown dispatch outcomes block capacity and enter existing reconciliation. Map voicemail/busy/no-answer to unanswered, and keep assistant-only transcripts nonbillable. Use the existing evidence-checked answer extractor on human speech rather than trusting agent output fields.

Fetch recordings through Sarvam's authenticated recordings endpoint and proxy through the existing authenticated bridge endpoint into owner-protected Convex storage. Never follow arbitrary media URLs or expose provider keys. Results and recording retrieval retry independently without repeating a call.

Verify provider mapping, duplicate dispatch, uncertainty, restart recovery, voicemail, transcripts, recording access, billing and existing provider compatibility. Validate real completed rehearsal evidence through the adapter; deploy backend and bridge, then run no-dial health/access checks. No unrelated store calls are needed for deployment verification.
