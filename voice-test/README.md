# Browser voice rehearsal

Run from the project root with `npm run voice:test`, then open http://127.0.0.1:3210.

Requires Node 22+ and `OPENAI_API_KEY` in the root `.env`. The key stays on the server. Set the voice model in `.env`:

```env
OPENAI_VOICE_MODEL=gpt-realtime-2.1-mini
```

Change this value and restart `npm run voice:test` to use another supported Realtime model. If omitted, the server falls back to `gpt-realtime-2.1`.

Choose English, Hindi or Telugu, click **Start voice test**, allow your microphone, and act as the shopkeeper. The assistant starts in the selected language and can switch on request. It asks about exact product match, stock, price and offers, then saves the answer, says goodbye and disconnects after goodbye playback. A 20-second closing fallback prevents a stuck connection; two minutes is the total maximum. **End test** stops microphone and connection immediately. **Save test notes** downloads the transcript and returned facts. Transcripts are approximate; compare the notes with what you actually said. Regional-language accuracy and accent quality need a spoken test with a fluent speaker.

The typed-reply option tests the same agent and audio output without microphone access. It does not prove microphone input works. Notes stay in this page until downloaded; refresh clears them.

Suggested cases: exact product with a confirmed price; different storage/colour; unknown card offer; refusal; disconnect before supplying details. This local experiment does not implement Vobiz, real phone calls, worker assignment, retries, customer billing or guest allowances.

`npm test` checks local routes, key non-disclosure and invalid requests. OpenAI API calls incur provider charges. The local-only server is a rehearsal tool, not a public deployment.

## Direct phone test

Reusable function: `createPhoneAgent()` in [phone-agent.cjs](phone-agent.cjs), also exported by `phone.cjs`. It exposes `start`, `call`, `completed`, `getResult` and `stop`; importing it does not dial. Full usage, live-test evidence and deferred work: [Voice calling test record](../docs/engineering/VOICE_CALLING_TEST.md).

`phone.cjs` connects an outbound Vobiz call to the selected OpenAI Realtime model over a bidirectional audio stream. It uses the existing `OPENAI_VOICE_MODEL`, with native mu-law 8 kHz audio, and no separate speech-to-text/text-to-speech conversation pipeline. Transcription supplies local test notes.

Required root `.env` settings: `OPENAI_API_KEY`, `OPENAI_VOICE_MODEL`, `VOBIZ_AUTH_ID`, `VOBIZ_AUTH_TOKEN`, `VOBIZ_FROM_NUMBER`, `TEST_TO_NUMBER`. Number values should include country codes; the helper also accepts an explicit `91` followed by ten digits and adds `+`. `PHONE_TEST_LANGUAGE` optionally selects the greeting language (default Telugu).

1. Start a temporary connection: `cloudflared tunnel --url http://127.0.0.1:3211 --no-autoupdate`.
2. Check the audio session without dialing: `node --env-file=.env voice-test/phone.cjs --public-url https://YOUR-TUNNEL`.
3. Stop that process, then add `--dial` to the same command to request one call to `TEST_TO_NUMBER`. Do not rerun it until the preceding call has ended; each new invocation can dial again.
4. After the test, stop the bridge and tunnel. `Ctrl+C` asks Vobiz to hang up an answered call.

There is no public dialing endpoint. Callback and audio routes use a random per-run token. Only one audio connection is accepted per process. This is an isolated development test, not production webhook authentication or task/quota enforcement. It saves approximate transcripts and call identifiers to git-ignored `voice-test/phone-results/latest.json`; no call recording is enabled by this script.

The test limits calls to five minutes by default. Set `PHONE_TEST_MAX_SECONDS=300` in `.env` to change it (30–900 seconds); restart the bridge after changing it. The provider call, audio stream and local timer all use this value. It clears pending playback on interruption and requests real hangup after the final goodbye playback checkpoint, with a 20-second closing fallback. Verify spoken quality and closure during an actual test; unit checks alone do not prove telephone behaviour.

References: [Vobiz audio streaming](https://www.vobiz.ai/docs/integrations/websockets), [stream formats](https://www.vobiz.ai/docs/xml/stream), [playback checkpoints](https://www.vobiz.ai/docs/xml/stream/checkpoint-event), [outbound API example](https://www.vobiz.ai/integrations/pipecat/).
