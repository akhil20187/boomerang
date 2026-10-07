# Sarvam primary calling — 7 October 2026

User approved production integration after successful personal calls including English/Telugu switching (D129). Existing Convex flow calls the same Railway bridge; `CALL_PROVIDER=sarvam` selects the hosted Sarvam agent. `OPENAI_API_KEY` remains necessary only for the existing evidence-checked answer extraction, not conversation audio.

## Configuration

- Committed agent `Conversatio-a86d995b-df0d`, version `2`; never follow draft/latest automatically.
- Existing Sarvam workspace/organisation and connection are provided through Railway environment variables; Voice Agents key stays server-side.
- `SARVAM_FROM_NUMBER` is the tested caller ending 0585. Legacy `VOBIZ_FROM_NUMBER` stays available for old-provider rollback.
- V2 has voicemail setting off, multilingual switching, interruptions enabled and a five-minute call maximum. The off setting did not prevent earlier voicemail classifications; phone screening was a suspected cause, not proven. User subsequently reported successful conversations.

## Dispatch and results

`convex/calls.ts` sends shop name, destination, customer first name, product and comments/card requirements. `call-bridge/sarvam.cjs` maps them to the v2 agent. Each inquiry forbids purchase, booking, holding and reservation.

The existing durable journal prevents duplicate dispatch by application attempt ID. The selected provider and accepted Sarvam attempt ID survive restart. HTTP timeouts/5xx remain uncertain, reserving capacity; there is no automatic old-provider fallback or blind POST retry. Operator investigation is required if a dispatch was accepted but its identifier could not be saved.

Every 30 seconds the bridge checks the exact provider attempt. Analytics date windows include a one-day buffer to tolerate ingestion/time boundary differences; returned IDs are always matched explicitly. Missing/unknown results remain pending. Human transcript roles map to `caller`, assistant roles to `agent`; unknown roles are excluded. Existing answer extraction requires literal human-speech evidence. Voicemail/busy/unanswered results are nonbillable and use the existing one retry after five minutes. Existing price and credit rules are unchanged.

Recordings are fetched from the fixed authenticated Sarvam recording endpoint, never arbitrary returned URLs. The bridge advertises its own exact authenticated attempt-recording URL. Convex downloads with the bridge secret and stores audio privately; existing customer-only playback applies. Recording failure does not overwrite a useful answer or trigger a call.

## Checks

- 87 local tests, 46 backend tests, TypeScript and whitespace checks passed before rollout.
- Real completed rehearsal `d75fe24c-e0fe-4157-8588-503f87dc6ad5` reconciled with the production adapter: 55.15 seconds, 11 transcript messages, 5 human turns, existing extractor returned unavailable/variant-confirmed, 1,216,034-byte audio/wav retrieved. No extra call was made.
- Local bridge integration covers one dispatch across restart, capacity reservation, callback delivery, private recording download and uncertain requests without redial. Backend checks cover exact shop mapping, authenticated recording ingestion, owner isolation and billing.
- Backend published to existing `little-kangaroo-718` deployment. Railway deployment `65899566-1e4e-4c24-88b6-2b93c003c398` succeeded. Remote health reported `provider=sarvam`, ready, zero active/uncertain attempts. Unauthenticated dispatch returned401; authenticated nonexistent-attempt lookup returned404. No new call was placed during rollout; a newly initiated end-to-end product task remains the next live check.

## Rollback

Set `CALL_PROVIDER=openai` on the same Railway service and redeploy only after checking active calls. Keep Sarvam credentials while any Sarvam attempts or recordings remain; journal entries route recovery by their saved provider. The old Vobiz caller/credentials are preserved. Never change the provider to retry an uncertain attempt.

## Sources

- [Outbound call API](https://docs.sarvam.ai/api-reference/instant-outbound/create)
- [Attempts](https://docs.sarvam.ai/api-reference/analytics/attempts)
- [Transcripts](https://docs.sarvam.ai/api-reference/analytics/transcripts)
- [Recordings](https://docs.sarvam.ai/api-reference/analytics/recordings)
