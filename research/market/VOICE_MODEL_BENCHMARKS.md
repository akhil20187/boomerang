# Voice calling model comparison

Checked 4 October 2026. Public benchmark review, not a measured comparison of our app or Indian telephone calls. Model versions and reasoning settings matter.

## What our integration actually uses

The current browser rehearsal uses **OpenAI `gpt-realtime-2.1`, native speech-to-speech**: microphone audio goes to the model and spoken responses come back. It is not a speech-to-text → text reasoning model → text-to-speech chain.

An additional **`gpt-4o-mini-transcribe`** model supplies captions. The output voice is **`marin`**. There is no separate text-to-speech API request. The server creates a WebRTC session through `/v1/realtime/calls`; this API name does not mean we have connected a telephone number or Vobiz.

Verified against [server code](../../voice-test/server.cjs) and the configured model, without displaying credentials. Reasoning effort is not explicitly selected, so neither High nor Minimal benchmark row below is our app's measured score. See [OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-realtime-2.1).

## Live-agent benchmarks

| Model / setting | Speech index | Reasoning % | Conversation % | Tool tasks % | Agent Elo | Arena success % | First audio, sec |
|---|---:|---:|---:|---:|---:|---:|---:|
| GPT-Realtime-2.1 High | 73.9 | 96 | 95.7 | 45.7 | 928 | 91.5 | 1.21 |
| GPT-Realtime-2.1 Minimal | 70.3 | 87 | 92.7 | 38.0 | 937 | 89.4 | 0.97 |
| Gemini 3.1 Flash Live High | 71.5 | 97 | 74.3 | 37.7 | 1063 | 71.8 | 2.99 |
| Gemini 3.1 Flash Live Minimal | 63.9 | 71 | 72.3 | 26.2 | 1096 | 74.6 | 0.96 |
| Gemini 3.8 Live | 76.0 | 92 | 96.1 | 30.1 | 1083 | 93.2 | 1.18 |
| Gemini 3.8 Live Extended Thinking High | 82.6 | 98 | 91.9 | 68.6 | 990 | 89.1 | 1.35 |

Source: [Artificial Analysis speech-to-speech leaderboard](https://artificialanalysis.ai/speech-to-speech/). No matching numeric Sarvam live-agent row was retrieved. ElevenLabs' documented default evaluated agent combines Scribe v2 Realtime, Gemini 2.5 Flash and Eleven Flash v2; it is a stack, not one ElevenLabs model. Comparable numeric results for that stack were not available in the retrieved summary table.

### What the columns mean

- **Speech index:** combined leaderboard measure; not a shop-call success rate.
- **Reasoning:** Big Bench Audio spoken reasoning questions.
- **Conversation:** handling pauses, speaking turns, interruptions and short acknowledgements, using Full Duplex Bench subsets.
- **Tool tasks:** τ-Voice simulated service tasks with tools and policies.
- **Agent Elo:** human preference after blind comparisons of complete voice conversations. GPT Realtime 1.5 is anchored at 1000.
- **Arena success:** correct task-completing tool calls in eligible arena conversations; a different test from τ-Voice.
- **First audio:** average time to initial generated audio on Big Bench Audio, not telephone end-to-end response delay.

These tests do not establish Hindi/Telugu shop-call accuracy. Elo uncertainty and task mix matter; the retrieved table does not supply confidence intervals. GPT-Realtime-2.1 High's τ-Voice result uses two trials, rather than assuming extensive repeated testing. [Benchmark methodology](https://artificialanalysis.ai/methodology/speech-to-speech-benchmarking).

## Voice quality, transcription and Indian languages

**Text-to-speech Elo is a separate scale.** It ranks generated speech preference, not listening, tools or hangup correctness. Current scores include Eleven v4 **1321 ±18**, Gemini 3.8 Flash TTS **1275 ±16**, Eleven v3 Conversational **1203 ±14**, and Eleven Flash v2.5 **1078 ±11**. No comparable Sarvam score or score for our exact GPT-Realtime-2.1 model was retrieved there. Do not compare these numbers with Agent Elo above. [TTS leaderboard](https://artificialanalysis.ai/text-to-speech/leaderboard/provider-voice).

**Sarvam:** Saaras v3 reports **19.31% word error rate** on a ten-language IndicVoices subset. This is a vendor-reported transcription test, not full calling accuracy; its competing model versions differ from the live agents above. [Sarvam ASR evaluation](https://www.sarvam.ai/blogs/asr).

Sarvam reports a Josh Talks blind listening study across 11 languages: Bulbul v3 led the tested systems after conversion to **8 kHz telephone audio**, while ElevenLabs v3 alpha led full-band audio. This supports testing Sarvam for Indian phone speech, but does not prove it beats newer ElevenLabs versions or native live agents. No comparable public live-agent Elo was verified. [Bulbul v3 evaluation](https://www.sarvam.ai/blogs/bulbul-v3).

**ElevenLabs:** Flash v2.5 advertises roughly **75 ms synthesis latency**; that excludes the rest of the conversation pipeline. Its 32-language list includes Hindi but not Telugu. A Telugu trial needs a different verified speech model. Numbers and currencies also need deliberate normalization with Flash v2.5. [Model documentation](https://elevenlabs.io/docs/overview/models).

**Gemini:** use a **Live native-audio** model for direct spoken conversations. Ordinary Flash text models and Flash TTS are different products. Hindi and Telugu are listed for Live audio. [Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities).

## Recommendation for Human MCP

Keep our working OpenAI integration as the baseline. My reading of the agent table: GPT-Realtime-2.1 performs better than Gemini 3.1 Flash Live on task completion and conversational handling, although users prefer Gemini in the arena. Higher Elo alone would select the wrong system if our priority is dependable store answers.

Test **Gemini 3.8 Live** as the native-audio challenger; its balanced published results are promising. Test **Sarvam Saaras v3 + a text reasoning model + Bulbul v3** as the Hindi/Telugu challenger. That requires building and evaluating the complete pipeline. ElevenLabs is a useful speech-quality challenger, but its TTS Elo cannot select the reasoning model or prove that the complete agent works.

Do not declare a universal winner or switch production providers from these tables. No side-by-side local microphone or Vobiz telephone benchmark has been run.

### Cost comparison boundary

Benchmark cost is normalized by input audio duration, not telephone conversation duration. It is unsuitable as a direct calling quote. Telecom, retries and human follow-up add costs. [Cost methodology](https://artificialanalysis.ai/methodology/speech-to-speech-benchmarking).

Our useful business measure is **total cost per usable verified answer**, matching D18, rather than cheapest generated speech.

## The benchmark we should run next

Use the same 30 scripted shop conversations: ten each in English, Hindi and Telugu. Repeat each three times per candidate, with identical products, correct answers and recording conditions. First compare browser audio; then repeat the shortlisted systems through the same Vobiz telephone route. Have a fluent speaker review each regional language.

| Measure | How to check |
|---|---|
| Exact answer accuracy | Exact product/variant, stock, price, discounts and card conditions against the script; unknown stays unknown |
| Invented facts | Count unconfirmed stock, offers or prices recorded as confirmed; any invention fails that scenario |
| Task completion | Correct structured notes, partial/refusal status and human handoff when needed |
| Response delay | Median and 95th-percentile time from end of shop speech to audible response |
| Interruptions | Time until agent stops speaking; whether it understands the correction |
| Language | Fluent reviewer scores intelligibility and naturalness 1–5; include English product names within Hindi/Telugu |
| Closure | Correct goodbye, saved notes and actual disconnection; no premature or lingering call |
| Cost | All provider and telecom charges, including failed attempts, per usable answer |

Include corrected prices, ambiguous variants, background noise, long pauses, interruptions, busy shopkeepers, refusal, missing offers and requests to end. Use a blind preference comparison as a supplement; a small local sample cannot produce a reliable universal Elo ranking.

**Next step:** run the same Hindi/Telugu scripts against OpenAI and the Sarvam pipeline before choosing a provider for telephone calls.
