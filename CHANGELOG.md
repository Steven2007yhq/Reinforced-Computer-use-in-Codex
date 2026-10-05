# Changelog

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
