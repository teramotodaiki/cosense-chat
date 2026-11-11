# GPT-5 migration candidate

This branch prepares GPT-5.6 Sol for the existing Responses API integration. It is
not evidence of a production rollout or a live quality/latency benchmark.

## Selection and compatibility

OpenAI recommends `gpt-5.6-sol` as the replacement for GPT-5, whose API shutdown is
scheduled for December 11, 2026. It supports Responses and function calling.
Fast uses `reasoning.effort: none`; Thinking keeps `medium`. `minimal` is not a
supported Sol effort. Fast is intended to avoid reasoning latency, but its answer
quality is not assumed equivalent to GPT-5 minimal.

Sources checked November 11, 2026:
- https://developers.openai.com/api/docs/deprecations#2026-06-11-gpt-5-and-o3-model-deprecations
- https://developers.openai.com/api/docs/models/gpt-5.6-sol

Sol is the compatibility-first candidate, not a proven best-value choice. A smaller
model should only replace it after Japanese page summaries and linked-page answers
meet the same accuracy criteria on representative examples.

## Cost and release gates

The listed Sol rates are $4 per million input tokens, $0.40 per million cached input
tokens and $20 per million output tokens. These promotional rates end November 30,
2026, before GPT-5 shutdown. Recheck prices before approval and rollout. Usage,
reasoning tokens and repeated tool turns determine actual spend; this branch does
not infer a monthly budget from token prices.

Before merging and installing:
1. Agree on the allowed evaluation spend and operating budget using current prices.
2. With an authorized key, compare representative Japanese summaries, missing-fact
   answers and linked-page questions in both modes against the old model. Record
   accuracy, latency and returned token usage, including reasoning tokens. Mocked
   tests do not establish live API access, response quality or billed cost.
3. Confirm the existing linked-page tool behavior. The current client handles
   `get_page` outputs but does not send a tool declaration; the mocked tool-loop
   test checks continuation handling, not actual tool selection. This predates the
   migration and requires a separately validated fix before relying on on-demand
   linked-page fetching. The first five links are prefetched independently.
4. Run the repository CI. Build the single-file UserScript using the existing
   private local API-key setup. Never commit or publicly upload a bundle containing
   the key, since Vite embeds it in the JavaScript.
5. Replace the actually installed UserScript, reload Cosense and verify both modes
   in browser network requests. Preserve the existing DOM/storage identifiers to
   avoid duplicate drawers and retain the mode preference. A repository merge does
   not update already-installed scripts.
6. Keep the previous local bundle for rollback only before GPT-5 shutdown. After
   shutdown, rolling back to GPT-5 cannot restore service.

No real API requests are made by the automated tests. There is no deployment or
UserScript publishing workflow in this repository, and the installed version is
not established by this change.
