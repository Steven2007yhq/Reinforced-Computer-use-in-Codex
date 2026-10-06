# Troubleshooting

[English](TROUBLESHOOTING.md) · [简体中文](TROUBLESHOOTING.zh-CN.md) · [Getting started](GETTING_STARTED.md)

Start with the [synthetic local demo](DEMO.md). It removes login, provider access, and production-page variability from the first task. Record where the task stops rather than retrying an uncertain action.

## Installation and first use

| Symptom | What to check / do |
| --- | --- |
| Node is missing or older than 22 | Check `node --version`. Install Node.js 22+ and open a new terminal so PATH is refreshed. |
| `codex` is missing or plugin commands are unsupported | Check `codex plugin marketplace list --json`. Use a terminal with the Codex CLI on PATH and a version that provides local plugin marketplaces. This repository has no verified minimum Codex version. |
| “Screenshot dependencies are missing” | Run `npm ci --omit=dev --ignore-scripts` from the source checkout before running the installer. |
| PowerShell blocks the installer | Inspect `scripts/install-windows.ps1` and your device's execution policy. Follow any administrator policy; do not globally disable script protections as a troubleshooting shortcut. |
| Target plugin directory already exists | Inspect and preserve that exact existing installation, then move it aside if updating. The installer intentionally refuses to overwrite it. Do not remove unrelated plugin directories. |
| A marketplace name points at another root | Inspect `codex plugin marketplace list --json` and the specific marketplace entry. Resolve that registration conflict before installing. Preserve unrelated entries and existing backups. |
| Plugin is installed but Codex does not use it | Restart Codex, start a new chat, and explicitly ask to use Reinforced Computer Use. Installation does not make an already running chat reload the skill. |
| `doctor` says adaptive configuration/key is missing | This is expected if you only use local `runPlan()`. Check `nodeSupported: true`; local mode and the demo need no Jev key. |
| `doctor` reports `ready`, but UI operation fails | Doctor checks local runtime/configuration conditions, not CUA availability or a live provider request. Inspect the actual Computer Use surface separately. |
| The demo port is occupied | Use `npm run demo -- --port=4319`, then use the printed URL and that exact origin in the task. Keep the server terminal open. |
| The local page opens, but no plugin task runs | Starting `npm run demo` only starts the fixture server. Run the Codex prompt from [DEMO.md](DEMO.md) so `runPlan()` and `captureLongPage()` operate through the CUA tab. |

## Computer Use and execution

| Symptom / status | Meaning and next step |
| --- | --- |
| No Computer Use tool is available | The current chat cannot perform the UI task. The plugin cannot enable CUA; inspect your Codex setup and current tool exposure. |
| Browser works, but no native app can be bound | Browser and native surfaces are separate. For Windows, inspect the documented `@oai/sky` window inventory and bind one exact returned `Window` through [the Sky adapter](../skills/reinforced-computer-use/references/sky-adapter.md), or use an available legacy native CUA target. A running process alone is not proof. |
| `SKY_ACCESSIBILITY_UNAVAILABLE` | The native service did not return AX. AX batches stop before input. Use ordinary Computer Use with a fresh screenshot, or [grounded action selection](../skills/reinforced-computer-use/references/grounded-actions.md) with Codex visual grounding of the same permitted semantic action. Do not fabricate indexed controls. |
| `BRIDGE_NOT_RUNNING` in REPL while the terminal bridge is running | The REPL may lack global `process`, so the default descriptor path can differ. Pass the explicit `descriptorPath` derived from this machine's terminal `configPath`; see [Jev setup](../skills/reinforced-computer-use/references/jev-setup.md). |
| First CUA call rejects plugin imports | Initialize with exactly one documented entry call, read its returned documentation, and only then import runtime helpers. See [the skill](../skills/reinforced-computer-use/SKILL.md). |
| Missing or duplicate control labels | Inspect fresh UI state with ordinary Computer Use. Use exact observed labels and narrow allowances; do not broaden a regex merely to force a match. |
| `needs_codex_review` / `needs_codex` | Inspect the current state and hand control back to Codex. The label may be sensitive, a frame may lack origin authorization, or the interface may need direct inspection. Follow the current CUA permission policy. |
| `scope_changed` | Check the current tab/window, page origin, and account context. Continue only after establishing the intended scope again. |
| `yielded` | A bounded chunk ended. Inspect progress and, if scope is valid, continue the same RCU session. For `createWorkflow()`, the next run freshly verifies an attempted stage and does not replay its action. |
| `stale_state`, `no_progress`, `needs_inspection`, or `budget_exceeded` | Stop the fast loop and diagnose from fresh state. Increasing budgets or replaying steps without checking may repeat a mutation. |
| `done` but the result looks wrong | The local success predicate passed; it may be insufficient. Inspect the real final state and improve the task-specific verifier. |
| Cross-origin frame is blocked | Confirm its exact origin and authorize it explicitly in `allowedFrameOrigins`, when appropriate to the task. If the tree omits or truncates the frame origin, inspect it normally instead of forcing the fast path. |
| An indexed input fails in a modal | Inspect a new window inventory and the actual dialog's state. Bind the exact returned modal/editor Window and observe its own indexes; seeing a control in the parent tree is insufficient. This may resolve a binding mismatch, but does not prove the backend supports that widget. Inspect an uncertain input before any further action. |
| Video/canvas changed but AX reports no progress | Check a fresh screenshot and an app-specific stage verifier. AX text can remain unchanged after a real visual effect. Do not loosen completion checks or repeat the input to manufacture AX changes. |
| Workflow returns a handoff | Keep `handoff.ticket`/`revision` locally, inspect the actual pending stage, and perform only the permitted continuation. `resume()` checks a new result; it never releases a stored input for replay. See [workflow rules](../skills/reinforced-computer-use/references/workflow.md). |
| `INVALID_WORKFLOW_TICKET` or `WORKFLOW_BUSY` | Use the latest local ticket/revision from that workflow and serialize calls. A JSON copy, an earlier ticket or another workflow's ticket cannot resume it. An in-flight callback retains the lock even after cancellation. |
| Grounded `expired`, `cancelled`, `busy`, `invalid_ticket` or `ticket_consumed` | No additional input is authorized. Stop, inspect current state, and handle the cause. Never prepare a replacement ticket to replay an uncertain input. |
| Grounded `needs_verification` or `failed_verification` | DONE is advisory, and a false local verifier is a failure. Inspect the actual outcome. `executed:true` only means the local executor was called; it is not proof of successful native input. |

Use ordinary Computer Use for canvas, drag-and-drop, file pickers, graphical judgment, inaccessible controls, and consequential final steps. The plugin does not remove current permission requirements.

Version 0.4.0 can retain these continuations as workflow stages and use Jev for an already scoped semantic choice. Codex still performs fresh screenshot grounding, required reviews and independent verification. The helpers provide orchestration, not application-specific import/export or editing logic. Prepared text and coordinates stay in trusted local callbacks.

## Long-page capture

Check that the selected tab provides screenshot, scroll, necessary keyboard actions, and read-only `playwright.evaluate` metrics. Begin at the top. The helper is for document scrolling; an independently scrolling panel may require a different task.

Repeated sections, overlays, missing content, or changed page height require inspection of fresh screenshots and capture metadata. Lazy loading, sticky elements, dynamic content, and nested scrolling can affect results. If the capture exceeds its pixel budget, numbered viewport images are expected instead of one huge PNG. This is a stitching allocation budget, not a cap on total process memory.

For the fixture, inspect `LONG_01` through `LONG_12` in order and `END_OF_LONG_PAGE` at the bottom. For another page, choose its own first/last/content markers. Report document height, captured height, and coverage for that actual run. Do not infer completeness from the existence of an output file or from the preview GIF.

## Optional Jev mode

Use [Jev setup](GETTING_STARTED.md#optional-jev-setup) before adaptive execution. Configuration errors occur before another UI mutation; resolve the cause rather than silently switching providers.

- Missing credentials: check the relevant user environment variable's presence and open a new terminal after changing it. Do not print its value or paste it into chat.
- Bridge unavailable or expired: start the retained bridge process again after checking that the previous task has ended. Do not publish the bridge descriptor or temporary token.
- Provider errors: confirm current provider account/model/access conditions through that provider. A configured route and passing mock tests cannot prove live availability.
- Low confidence or an unsuitable decision: inspect current UI state. Do not lower the confidence floor to force execution.

Adaptive mode sends planning metadata and the provider receives the API key in the authorization header. See [privacy](PRIVACY.md) for the data boundary (Chinese).

When comparing speed, `latencyMs` is the provider client's measured request elapsed time, not a server compute field. Report workflow callback attempts separately from UI inputs and Jev decisions. Startup, observation, verification and Codex handoff time must be included in an end-to-end timing; a single request's latency or a provider DONE cannot establish a speedup.

## Reporting an issue

Use a minimal synthetic reproduction and include:

1. OS and architecture, Node version, plugin version/commit.
2. Whether the CUA browser or native surface is actually available.
3. Reproduction steps and expected versus observed behavior.
4. The sanitized status/error and relevant height/coverage metadata for capture problems.

Exclude credentials, personal paths, account names, raw traces, private screenshots, user config, and bridge descriptors. Security reports use [SECURITY.md](../SECURITY.md). A local fixture success is evidence for that fixture and environment, not production-site, native-application, or real Jev acceptance.
