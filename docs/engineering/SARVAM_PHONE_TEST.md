# Sarvam phone test — 6 October 2026

## Result

The new caller number ending **0585** is active in Sarvam under the existing Vobiz connection. The first call was accepted and connected for 12.35 seconds; the transcript suggests voicemail/call screening, and the user confirmed missing it. A requested retry connected for 18.36 seconds and ended with provider reason `VOICEMAIL`. The user explicitly requested another call; that request was accepted (attempt `0303c261-fdc0-440a-a6db-532857df7c7c`), with its result pending. A full human conversation is not yet verified.

Only the isolated test configuration uses the new number; deployed calling remains unchanged. Prior call journals and transcripts are archived in ignored `call-bridge/.state`. The current journal blocks accidental repeat dispatch.

## Earlier registration problem — old number ending 4620

The Sarvam Voice Agents key works. The existing Vobiz caller number ending **4620** is active, but Sarvam has an inconsistent registration for it. A single outbound API request was rejected with HTTP 404 before an attempt ID was created. No telephone call was placed and no automatic retry was sent.

Observed in the user's logged-in Aside browser:

- Vobiz has one active number ending 4620, with no voice application attached.
- Sarvam exposes one organisation, one workspace and one Vobiz connection: `Vobiz-Akhil-8025fa33-ee65`.
- Sarvam's All numbers and Archived lists both contain zero numbers.
- Importing the owned number returned HTTP 409: “Phone numbers already exist as endpoints”. No import retry, deletion or routing change was made.
- Boomerang agent `Conversatio-a86d995b-df0d` has committed **v1**, with a five-minute call limit. v2 remains a draft.
- The direct outbound request for v1 returned HTTP 404: the agent phone number was not found under this organisation, workspace and connection. This confirms the issue affects the API too.

The organisation is `019e90d9-8355-7c5e-a1d8-db748e8b362c`; workspace is `019e90d9-8385-78c9-9d2b-71f732b17720`.

## Connecting through Vobiz

For an existing hosted Sarvam Voice Agent, [Sarvam's official Vobiz guide](https://docs.sarvam.ai/conversations/deploy/telephony/vobiz) documents:

1. Connect the Vobiz account under Sarvam → Deploy → Phone Numbers. This connection already exists.
2. Register/import the caller number in that Sarvam connection. **Verified for new number ending 0585; still unresolved for old number ending 4620.**
3. For incoming calls, create a Vobiz Voice Application with both **Answer URL** and **Hangup URL** set to `https://apps.sarvam.ai/api/app-runtime/v1/channels/vobiz`, both using **POST**. Attach the owned number to it, then create a Sarvam inbound deployment that maps the number to the agent.
4. For outgoing calls, use Sarvam's [instant outbound API](https://docs.sarvam.ai/api-reference/instant-outbound/create) with the agent version, connection, caller number, recipient and per-call variables. The live Import Numbers dialog says the Vobiz voice application setup is for receiving inbound calls, and numbers work for outbound after import.

Vobiz's [official Sarvam call-router example](https://github.com/vobiz-ai/vobiz-xml-call-router-sarvam) confirms that the number must already be bound to a Sarvam agent for incoming routing. Creating a Vobiz application alone does not establish that binding or resolve the duplicate-registration error. No application or inbound deployment was created during this test.

Vobiz also publishes a [custom Sarvam speech example](https://github.com/vobiz-ai/Vobiz-Sarvam). It combines Sarvam speech recognition and speech generation with OpenAI reasoning on a separately hosted server. That is a different implementation from connecting the user's existing hosted Sarvam agent; it was not installed.

## Prepared personal-number test

- [sarvam-phone-test.cjs](../../scripts/sarvam-phone-test.cjs): dry-run default, configured personal recipient only, explicit `--dial`, no automatic retries, persistent one-attempt journal.
- [sarvam-phone-test.test.cjs](../../scripts/sarvam-phone-test.test.cjs): six checks passed for recipient validation, existing India number format, committed version, duplicate-call prevention, timeout handling and redacted errors.
- [sarvam-phone-scenario.json](../../scripts/sarvam-phone-scenario.json): an iPhone enquiry for a mock shop; no purchase or reservation.
- Ignored `.env.sarvam` contains Voice Agents credentials and workspace settings; ignored `.env.sarvam-phone` contains the observed connection/version and scenario path. No credential values were printed.
- Ignored `call-bridge/.state/sarvam-personal-test.json` records the current request and prevents an accidental repeat. Earlier rejected/completed requests are archived separately before a user-requested retry.
- [sarvam-phone-status.cjs](../../scripts/sarvam-phone-status.cjs) retrieves status and optional transcript for the exact accepted test attempt.

Dry-run command (does not dial):

```sh
node --env-file=.env --env-file=.env.sarvam --env-file=.env.sarvam-phone scripts/sarvam-phone-test.cjs
```

The dry run passed. Actual dialing, provider-reported connection and transcript retrieval are verified for the new number. Voice quality, a full human conversation, recording playback and production call-result handling remain unverified. Boomerang's existing live provider was not switched.

## Support message for old number — drafted, not sent; no longer blocks new-number tests

Our active Vobiz number ending 4620 cannot be used in Sarvam Voice Agents. Its import selector can see it, but importing returns HTTP 409, “Phone numbers already exist as endpoints”. The only visible connection's All and Archived number lists are empty. A direct instant outbound request returns HTTP 404, stating that this agent phone number is not found under the same organisation/workspace/connection.

Organisation: `019e90d9-8355-7c5e-a1d8-db748e8b362c`

Workspace: `019e90d9-8385-78c9-9d2b-71f732b17720`

Connection: `Vobiz-Akhil-8025fa33-ee65`

Please locate the existing number registration and make it available under this connection, or explain how to resolve the conflict without purchasing or deleting the Vobiz number. We can provide the complete number privately. No API keys are needed in the support response.
