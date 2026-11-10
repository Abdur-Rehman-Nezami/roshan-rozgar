# AI provider smoke report

Date: 2026-11-10. **Live smoke tests NOT RUN. No provider is cleared for the live demo.**

This is a pending-check report, not a provider selection or measured result. The referenced model names in BUILD_PLAN.md are proposals; verify current availability, SDK compatibility and account access before attempting them.

| Provider / capability           | Status               | Remaining evidence                                                                                     |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| Anthropic structured LLM/vision | NOT_RUN / no live GO | Verify model/SDK, one structured call per effort level, refusal/bad-output behavior, latency and usage |
| OpenAI transcription            | NOT_RUN / no live GO | Ten recorded Urdu/Roman phrases, forced Urdu output, accuracy and script/latency observations          |
| Azure Urdu speech               | NOT_RUN / no live GO | Three Urdu sentences, listen on target devices, compare with fallback                                  |
| OpenAI TTS fallback             | NOT_RUN / no live GO | Three Urdu sentences, listen/compare, document decision                                                |
| OpenAI embeddings               | NOT_RUN / no live GO | Real vector dimension/quality, cache and retrieval integration                                         |
| Local fake/off runtime          | Unit tests pass only | Explicitly labelled fixtures and tap/caption fallbacks; HTTP/device integration still pending          |

Blockers: no supplied provider credentials, registry/network access unavailable, missing provider SDK integration, and no device/browser recording session. Do not fill in accuracy or latency numbers from estimates. To finish F-08, record the real inputs, provider/model/SDK versions, measured outcomes and actual GO/NO-GO decisions here. Never commit audio containing private information or credentials.
