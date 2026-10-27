# Session provider and capture decisions

This record preserves the October 2026 decisions behind [Sessions](reflet-sessions.md). Measurements below are dated observations, not current pricing, performance guarantees, or proof of the deployed version.

## Providers and retention

| Task | Decision | Reason and boundary |
| --- | --- | --- |
| Transcription | ElevenLabs Scribe v2 through OpenRouter, zero-retention routing | Recognized mixed French/English technical words better in the recorded comparison; timestamps originate in the browser |
| Intention analysis and element location | OpenRouter with zero-retention routing | Uses bounded session context; current model selection lives in `packages/backend/convex/ai/models.ts` and `openrouter.ts` |
| Optional speaker detection | Mistral Voxtral realtime, direct browser WebSocket | Keeps speaker labels across passages; its text is not used as the transcript |

`OPENROUTER_API_KEY` enables transcription and analysis. `MISTRAL_API_KEY` enables the optional "Several people are talking" setting. Reflet issues a short-lived Mistral client token; the server key never reaches the browser.

Speaker detection is a separate privacy choice: the recorded policy allows Mistral to retain API inputs for up to 30 days without training on them. Zero retention was not requested for this path. Recheck provider terms before changing either implementation or disclosure. Do not describe all session processing as zero retention.

Reflet deletes raw audio after the transcript is durably saved, with a 24-hour recovery window at most. The browser's temporary speaker-reference samples follow local-draft cleanup. Transcripts and screenshots remain until deleted; removing a session cannot recall files or briefs already exported.

## Why Scribe

On 18 October 2026, real API calls transcribed synthetic French speech containing six English technical terms, using 16 kHz mono WAV and zero-retention routing.

| Model | Terms recognized | Observed latency | Recorded price/hour |
| --- | --- | --- | --- |
| Scribe v2 | 5/6 | 0.5–0.8 s | $0.11 |
| Deepgram Nova-3, multilingual | 4/6 | 0.8–1.4 s | $0.31 |
| Whisper large v3 | 1/6 | 0.6–4.9 s | $0.027 |
| Whisper turbo, Qwen3 ASR, Parakeet v3 | 1/6 | 0.3–1.6 s | $0.012–0.09 |

These small synthetic samples explain the choice; they do not measure accuracy on customer recordings. Scribe's bracketed sound-event labels are stripped. A passage consisting only of those labels becomes empty.

## Why separate speaker detection

The 23 October decision kept Scribe for words and used Voxtral only for who spoke when. In a three-voice synthetic sample, Voxtral assigned 10/10 turns correctly but its transcript had about 20% word errors. Speaker references carried 18/18 synthetic turns across a pause; one real meeting sample also preserved the dominant speaker across pause and reload.

The browser maps incoming turns onto the session clock. Reflet attributes Scribe's timed words when reading the transcript. Clock error was roughly ±0.25 s, up to 0.4 s at the first change after reconnecting, so boundary words can have the wrong speaker. A voice with less than three seconds of reference audio can receive a new label after a pause.

A WebSocket starts for each active recording interval. Pausing closes it; resuming supplies short references for previously heard voices. The client token lasts 120 seconds for connection establishment. A measured 17-minute connection outlived that token; it was not evidence that a new connection could use an expired token.

Recorded cost was $0.008/minute for speaker detection, only when enabled. Treat that as a decision-time price, not a billing promise.

## Capture limits and cleanup

`packages/backend/convex/sessions/constants.ts` owns all limits. The client receives them with session identity. Ordinary sessions currently allow 30 minutes, 400 audio segments, 5,000 events, and 60 screenshots; Live has separate larger limits. Do not copy those values into a client policy.

Browser capture is bounded and uses DOM screenshots rather than video. Standard input values are cleared in session screenshot clones; configured redactions are hidden. Other visible text may remain. WebKit stores local audio and images as bytes because Blob persistence in IndexedDB was not reliable.

Interrupted collection is closed by server cleanup. Deletion removes children and stored files, blocks late jobs from restoring content, and retains a content-free tombstone for up to 30 days. Live sessions expire after 24 hours without updates.

## Recorded load check

The original 10-minute Chromium headless run used a synthetic microphone on the Reflet dashboard, about 7,000 DOM nodes, repeated scroll/pointer activity, clicks every 17 seconds, and a mark every 70 seconds.

| Observation | Result |
| --- | --- |
| JavaScript heap | 41–43 MB, no observed growth |
| DOM nodes | 7,027, stable |
| Main-thread time | 3.4% of session duration, including the app |
| Audio segments / screenshots | 20 / 10 |
| Event requests | 116, 81 KB total |
| Storage uploads | 30 files |

The harness did not measure binary upload bodies. The audio format bounds 30 seconds at roughly 0.96 MB, about 19 MB for ten minutes of uninterrupted speech. These figures describe that fixture only. Re-measure with real applications before making cost, browser-support, or latency claims.
