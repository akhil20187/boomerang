# Recording recovery — 5 October 2026

Srilochan's Apple Rehab call completed, but its bridge recording stayed `processing` and no file was attached to the task. A read-only Vobiz recording lookup confirmed the file exists. The provider media endpoint returns 401 without provider authentication and audio/mpeg with authentication. The app's recording hostname allowlist was also unset.

## Repair

Completed attempts with a processing recording now perform a bounded, read-only lookup for their exact provider call UUID. Recovery requires one matching recording and, when known, its expected recording ID. Ambiguous or unavailable results remain unconfirmed and never cause a redial.

The authenticated `/attempts/:id/recording` bridge endpoint downloads only HTTPS `media.vobiz.ai` recordings under the configured provider account. Redirects are rejected and audio type/25 MB limits enforced. Provider credentials remain on Railway. Convex validates the observed hostname, downloads through the existing bridge secret, and stores private audio. Owner checks and short-lived playback grants remain intact. Temporary download errors retry up to three times at 15/30/45 seconds; invalid hosts are rejected before fetching.

## Checked

- 78 local tests and 38 backend tests pass; TypeScript checks pass.
- Railway deployment c43a2427-44f5-4024-8220-fdce68906c06 and Convex changes published.
- Existing 61.42-second recording attached: 123,696 bytes, audio/mpeg, recordingStatus=ready.
- Owner-authorised playback returned HTTP206 with a 1,024-byte audio range. Unauthenticated playback returned401.
- No new call, credit change or customer message sent.

The exact reason Vobiz's completion callback did not finish the initial attachment is unproven. Recovery and private download now cover that failure. Listening to the full recording in Srilochan's browser remains his final check.
