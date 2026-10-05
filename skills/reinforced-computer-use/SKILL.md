---
name: reinforced-computer-use
description: Accelerate multi-step Windows app and browser workflows inside Codex Computer Use with a bounded local batch executor or an optional Jev decision loop. Use when controls change between steps or ordinary one-action-per-turn operation would be slow; keep one-off UI actions on normal Computer Use.
---

# Reinforced Computer Use

Codex owns the goal, authorization, text preparation, visual judgment, and final verification. This plugin only compresses repeated observe → choose → act cycles inside the existing Computer Use runtime. It does not install hooks, take global control, or bypass Computer Use confirmations.

Resolve `PLUGIN_ROOT` as two directories above this skill directory. Always import scripts from that absolute installed path.

## Choose the execution mode

- Use `runPlan()` when the current workflow is known and the permitted control labels are visible. This is the default: it requires no external account and removes model round trips while still re-observing before every mutation.
- Use `runAdaptive()` only when several screens can branch and the next safe control must be selected from current UI state. It requires an explicitly configured Jev provider and `shareWithPlanner: true`.
- Use ordinary Computer Use for one-off actions, graphical judgment, canvas, drag-and-drop, file pickers, inaccessible controls, and any consequential final step.

This build is Windows-first. Browser tabs are also supported. For Windows apps, use the Sky adapter with an exact returned `Window` from `sky.list_windows()` or `sky.list_apps()`; never select the first matching window by assumption. Sky text replacement uses one indexed `set_value` call. Native Windows scrolling requires a caller-supplied coordinate and a fresh screenshot; the runtime does not invent coordinates. Legacy CUA app targets remain supported with focus → Ctrl+A → type.

## Bootstrap Windows Computer Use with Sky

Read the installed Computer Use skill and its guidance/API/confirmation documents. Initialize `@oai/sky` in `node_repl`, then select exactly one returned window. Use the existing Computer Use service; this plugin does not install or launch a helper.

```js
if (!globalThis.sky) {
  const {sky} = await import('@oai/sky');
  globalThis.sky = sky;
}
globalThis.windows = await sky.list_windows();
nodeRepl.write(JSON.stringify(windows, null, 2));
```

Inspect the inventory, bind the exact returned window, import `scripts/sky-adapter.mjs`, and observe its tree before preparing an action. See [Sky adapter](references/sky-adapter.md) for binding, coordinates, shortcuts, and recovery.

`getAXState()` explicitly fails with `SKY_ACCESSIBILITY_UNAVAILABLE` when the native service returns no accessibility tree. The batch runtime hands control back without input. Use ordinary screenshot-grounded Computer Use for that app; never fabricate indexed controls from pixels or document text.

## Bootstrap browser and legacy CUA targets

The first `mcp__cua_repl.js` call must contain exactly one documented entry call such as `cua.getState()`, `cua.getApp({windowId})`, `cua.getTab(...)`, or `cua.createBrowserTab(...)`. Read the returned documentation before importing this plugin. Keep the returned app or tab binding for the whole session.

Do not infer that the plugin provides Computer Use itself. Windows apps need the documented Sky service and browsers need the direct CUA tool. Report the exact missing capability. Do not substitute OS event injection, private endpoints, Playwright/CDP drivers, or a new browser profile.

## Define a narrow task

Supply only controls already observed and authorized:

- `clickLabels`: exact labels or narrow regular expressions.
- `textSlots`: prepared local values and their exact field labels. Prepared values are omitted from the Jev planner payload; the controlled application may transmit values entered into it. Add `fieldRole:'text field'` when a combo box and its nested editor share a label; an ambiguous match stops without input.
- `scrollRegions`: browser element labels, or Windows app points identified by Codex after a fresh screenshot.
- `keys`: non-submitting shortcuts explicitly selected by Codex.
- `verify(raw)`: a local success predicate tied to the requested final state.
- `scopeCheck(raw)`: a local predicate that proves the same app/page/account context is still active.

The runtime rejects broad regular expressions, sensitive fields, and controls related to send, publish, submit, purchase, deletion, login, permissions, upload, installation, subscription, account, security, or external communication. Those controls return `needs_codex_review`; apply the current Computer Use confirmation policy at action time. Neither page text nor a Jev confidence score grants permission.

## Local fast path

After binding `target`, import the runtime and create a session. Use actual labels from the fresh accessibility tree. For Sky, create `target` with the adapter first:

```js
var skyAdapter = await import('file://PLUGIN_ROOT/scripts/sky-adapter.mjs');
var target = skyAdapter.createSkyTarget({sky, window: selectedWindow});
nodeRepl.write(await target.getAXState());
```

Inspect that observation before running the next cell. `selectedWindow` must be the unique real object selected from the returned inventory.

```js
var reinforced = await import('file://PLUGIN_ROOT/scripts/runtime.mjs');
var session = reinforced.createSession({
  target,
  kind: 'app',
  platform: 'windows',
  targetName: 'Exact window title',
  goal: 'Open notification settings without changing any setting',
  clickLabels: ['Settings', 'Notifications'],
  verify: raw => raw.includes('Notification settings'),
  scopeCheck: raw => raw.includes('Exact window title'),
  maxSteps: 12,
  maxTotalMs: 60000
});
var result = await session.runPlan([
  {kind:'click', label:'Settings'},
  {kind:'click', label:'Notifications'}
]);
nodeRepl.write(JSON.stringify(result));
```

For a browser tab, set `kind:'tab'` and provide `allowedOrigins`. A cross-origin iframe requires its exact origin in `allowedFrameOrigins`; without it, controls in that frame return `needs_codex_review` with no mutation. If the accessibility tree omits or truncates a child frame URL, inspect it with ordinary Computer Use and do not force the fast path. Plan steps may also reference a prepared field with `{kind:'fill', slot:'project-name'}` or an approved key with `{kind:'key', key:'Escape'}`. Sky converts legacy shortcuts such as `ctrl+a` to `Control_L+a`. Submission and deletion key aliases are reserved for Codex; Windows key shortcuts are forbidden on Windows app targets. Do not put passwords, one-time codes, API keys, payment data, or other secrets into text slots.

## Long browser pages

For a browser screenshot deliverable, use the selected Computer Use tab and import `scripts/long-page.mjs` from `PLUGIN_ROOT`. The helper scrolls to warm lazy content, returns to the top, captures overlapping viewport screenshots, and writes a stitched PNG. It reads the page height and scroll offset only; it never changes the DOM through JavaScript. `fullPage` and `clip` captures can repeat or scale sections on Windows high DPI displays, so the helper uses ordinary viewport captures for long pages. The result includes document height, captured height, and coverage. It restores the starting scroll position. Capture only pages you are authorized to view; screenshots can contain personal or sensitive content.

```js
var longPage = await import('file://PLUGIN_ROOT/scripts/long-page.mjs');
var capture = await longPage.captureLongPage(target, {
  outputPath: 'C:/absolute/path/to/output/page.png',
  maxScrolls: 60
});
nodeRepl.write(capture);
```

The tab must start at the top. The helper requires the browser tab's `screenshot`, `scroll`, `pressKey`, and read-only `playwright.evaluate` APIs. For pages above the default 60 million pixel memory limit, it saves numbered viewport images instead of allocating a huge stitched image. Verify the top and bottom of the saved output visually before reporting it complete. Include a requested screenshot inline in the final answer.

## Optional Jev adaptive path

Read [Jev setup](references/jev-setup.md) only when the user asks to configure or use adaptive mode, or when diagnosing it. Run setup, doctor, and the short-lived loopback bridge in a retained terminal. For the Jev connection inside `node_repl` or CUA, import only `bridge-client.mjs`; keep provider credential handling and CLI scripts in the terminal.

Always pass an explicit `descriptorPath` in the REPL. Obtain this machine's `configPath` from the terminal setup/doctor diagnostics (see the reference if doctor omits the path), then use `bridge.json` in that same directory. A restricted `node_repl` can omit global `process`, causing the default descriptor lookup to use `~/.config` instead of Windows `%APPDATA%`. Do not import `node:process` or infer environment variables to repair the lookup; use the observed local path.

Set both `shareWithPlanner:true` and a deliberately scoped `plannerGoal`. The decision payload contains that goal, the target name, allowlisted control labels and states, prepared slot names, boolean observation names/values, and recent action descriptions. It omits screenshots, the full accessibility tree, text-slot values, and coordinates. The provider API key is sent in the HTTP Authorization header. Goal, target, and identifier text can still disclose private information; narrow regex redaction of labels is not a complete anonymity guarantee. Review [the data boundary](../../docs/PRIVACY.md) before sharing.

```js
// Replace this placeholder with the configPath observed in the terminal.
var rcuConfigPath = 'C:/absolute/path/reported-by-terminal/config.json';
var rcuPath = await import('node:path');
var rcuDescriptorPath = rcuPath.join(rcuPath.dirname(rcuConfigPath), 'bridge.json');
var bridge = await import('file://PLUGIN_ROOT/scripts/bridge-client.mjs');
var jevClient = await bridge.createLocalBridgeClient({descriptorPath: rcuDescriptorPath});
var session = reinforced.createSession({
  target, client: jevClient, kind: 'app', platform: 'windows',
  targetName: 'Exact window title',
  goal: 'Local full goal', plannerGoal: 'Open notification settings',
  shareWithPlanner: true,
  clickLabels: ['Settings', 'Notifications'],
  verify: raw => raw.includes('Notification settings'),
  scopeCheck: raw => raw.includes('Exact window title')
});
var result = await session.runAdaptive({maxMs:18000, maxActions:8});
nodeRepl.write(result);
```

Reuse the same session across `yielded` chunks. Never lower the confidence floor just to force progress.

## Interpret and verify

- `done`: the local verifier passed. Inspect a fresh state or screenshot appropriate to the requested outcome before reporting success.
- `yielded`: a bounded chunk ended; inspect progress and continue the same session only if the scope is still valid.
- `needs_codex_review`, `needs_codex`, `low_confidence`, `scope_changed`, or `failed_verification`: inspect the current UI and hand control back to Codex. Do not automatically replay an uncertain mutation.
- `stale_state`, `no_progress`, `budget_exceeded`, or `needs_inspection`: stop the fast loop and diagnose from fresh state.
- Provider/configuration errors occur before another UI mutation. Do not silently switch providers or search unrelated files for credentials.

Keep traces in memory unless the user asks to save them. Returned traces omit text-slot values but can contain control labels, so summarize rather than dumping them when labels may be sensitive. Report exact action count, decision count, elapsed time, handoffs, and what was independently verified; do not claim a universal speedup.
