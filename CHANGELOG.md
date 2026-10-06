# Changelog

## 0.4.0 — 2026-10-05

- Fix explicit cancellation-signal validation during the 2026-10-06 upload.
  Node 22 could accept a duck-typed object where Node 24 rejected it in
  `AbortSignal.any()`. Reject invalid, forged or proxy signals before provider
  calls; reserve and consume commit tickets before caller-owned signal access,
  without invoking scope/input/verification callbacks for invalid signals.
  Add three regressions and expand malformed/reentrant signal cases; the full
  140-test suite passes locally on Node 22.23.3 and Node 24.14.0.
- Add `createWorkflow()` for local ordered stages, strict independent stage and
  final verification, bounded chunks, and revision-bound handoff tickets.
  Resuming verifies the pending result without replaying its action attempt.
- Add grounded `prepare()` / `commit()` for one caller-approved semantic action
  when native accessibility is weak or unavailable. Jev selects from minimal
  descriptions; Codex observes the fresh screenshot, grounds the same action,
  and supplies the local execution, scope, and verification callbacks.
- Require explicit planner sharing, validated choices and confidence of at
  least 0.65; reserve single-use tickets before dispatch and reject expired,
  cancelled, concurrent, or consumed attempts. Unknown input outcomes hand off
  for inspection; sensitive and consequential candidates require Codex review.
- Add `waitForVerified()` for bounded, read-only polling of delayed local
  feedback after an attempted input. It performs no input, mutation replay, or
  provider request, and supports the REPL without global `EventTarget` or
  `process`. Callers keep callbacks read-only; native reads remain cooperative.
- Preserve valid point-click `mouse_button` and `click_count` options instead
  of silently discarding them. Reject invalid values before dispatch; native
  right-click and double-click were independently observed in Multisim.
- Document separate data boundaries: grounded text uses heuristic redaction,
  while existing `runAdaptive()` goal and target text still enter its request
  unchanged. Workflows have no provider transport or persistence; callbacks
  remain responsible for application behavior and actual result checks.
- Update native continuation guidance and bilingual onboarding. Clarify that
  `latencyMs` is client-measured provider request time, not server compute time
  or the duration of a complete workflow. Preserve the existing demo and
  historical acceptance evidence.
- Record passing [mixed Jev + Codex full-flow acceptance](docs/acceptance-fullflow-2026-10-05.md)
  in Multisim and Jianying Pro. Reopened Multisim properties showed 1.2 kΩ;
  an actual Run and SCP waveform data supported about 5 kHz / 0.504 Vpp.
  Jianying exported a fresh 818 × 432, 30 fps, 154-frame MP4, duration
  5.155011 s, with a full ffmpeg decode exit code of 0. Circuit theory is a
  sanity check, not proof of solver cache use; the observed component-selector
  / native-service hang remains unresolved by the plugin.
- Pass 137 automated tests covering the existing runtime and release checks
  plus workflow, grounded ticket, point-click options, REPL compatibility,
  and read-only verification regressions. These helpers do not establish Jev
  vision or autonomous arbitrary-app operation; retain 0.3.0 evidence separately.
- Document four scoped [Office, AI chat and Canva UI checks](docs/acceptance-office-ai-canva-2026-10-05.md)
  and seven additional [desktop, WPS and advanced Office checks on 2026-10-06](docs/acceptance-desktop-wps-advanced-office-2026-10-06.md)
  without changing the implementation for those acceptance rounds. Claude
  desktop and Doubao web synthetic replies passed; WPS preserved the repaired
  three-paragraph Title format and saved three actual formula caches. Word
  preserved a prepared 61-paragraph/two-section document and exported six real
  PDF pages. Excel recalculated and saved all 300003 formulas for 100000 records;
  one actual VBE import/F5 run produced a new MacroResult and persisted its VBA
  source and results in XLSM. Independent validators were read-only.
- Preserve failed decisions, caller guards and ordinary Sky/CUA handoffs in
  those records. WPS macro-plugin prerequisites and missing-font warnings remain
  limits; Doubao web does not establish desktop support, and ChatGPT desktop UI
  was excluded under official Computer Use rules. Seven new Jev responses at
  478–597 ms include non-success outcomes and measure request time only. The
  live checks did not rerun or add to the earlier automated test count, establish
  a matched speed benchmark, or publish private screenshots, traces or documents.

## 0.3.0 — 2026-10-05

- Add the native Windows Sky window2 adapter for returned window state, original
  element numbers, selected screenshot-region coordinates, and keysym chords.
- Require fresh observations for input, reject stale screenshot/image points,
  preserve exact window bindings through defensive copies, and hand off unknown
  outcomes without automatic replay. Prepared native fields use one `set_value`.
- Support additional Chinese accessibility roles, native metadata without commas,
  identical repeated menu references, and an optional prepared-field role.
- Make provider and bridge-client imports compatible with REPLs without global
  `process`; document explicit bridge descriptor paths while keeping credentials
  and provider setup in the terminal.
- Record ten live TypeSafe responses identifying `jev-1.13.0` during Multisim and
  Jianying Pro acceptance. Jev ran the modified Multisim sample and played the
  video; ordinary Codex/Sky handled file selection, resistor editing after failed
  indexed actions, media import, timeline placement, and local export. This does
  not establish fully autonomous operation or arbitrary application support.
- Preserve the existing synthetic browser demo, screenshot normalization,
  installer safeguards, privacy boundaries, and public release checks.

## 0.2.2 — 2026-10-05

- Add a synthetic loopback demo with 12 sections, no login or Jev API key.
- Publish an English default README, complete Chinese README, bilingual first-task
  and troubleshooting guides, contribution instructions, and issue forms.
- Include actual local demo screenshots and an explicitly edited 30-second
  preview, plus a separate illustrated social card with media provenance.
- Normalize uniformly scaled browser screenshots before stitching CSS scroll
  positions; reject unsupported dimension mismatches.
- Restrict public media exceptions to six manually reviewed demo/presentation
  assets and validate file signatures and size limits.

## 0.2.1 — 2026-10-05

- Initial public source release with sensitive local artifacts excluded.
- Add device requirements, privacy/data-flow documentation, license attribution,
  release checks, Windows installer, and Windows/Ubuntu × Node 22/24 mock CI.
- Preserve the original local plan, optional Jev bridge, and runtime behavior.
