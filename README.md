# Reinforced Computer Use for Codex

[English](README.md) · [简体中文](README.zh-CN.md)

**A Windows-first Codex plugin for multi-step UI workflows and long-page capture, with optional Jev planning.** Follow a scoped local plan, observe the interface again before each action, and check the result locally. The default mode needs **no API key**.

[![Version](https://img.shields.io/badge/version-0.2.2-blue)](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/releases/tag/v0.2.2)
[![CI](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/actions/workflows/ci.yml/badge.svg)](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/actions)
[![Node](https://img.shields.io/badge/Node.js-22%2B-43853d)](package.json)
[![MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

![Local demo: open a synthetic long page, capture it, and inspect the first and last sections](docs/assets/demo-preview.gif)

*An edited screenshot sequence of the local synthetic demo, not a real-time recording or a performance benchmark. No Jev provider is called. See [the demo procedure and verification](docs/DEMO.md), including the [first](docs/assets/demo-top.png) and [last](docs/assets/demo-bottom.png) captured viewports.*

**Start here:** [Install and run your first task](docs/GETTING_STARTED.md) · [Reproduce the demo](docs/DEMO.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) · [Releases](https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex/releases)

## What you can do

| Feature | Example | Requirements |
| --- | --- | --- |
| **Scoped local workflows** | Open a known sequence of pages using observed control labels, then verify the destination | An enabled Computer Use surface; no Jev account or API key |
| **Long-page capture** | Scroll a selected browser tab, stitch viewport captures, and check the first and last sections | A browser surface with screenshot, scroll, keyboard, and read-only page-metric APIs |
| **Optional Jev planning** | Choose the next action from a restricted set when the UI can branch | Provider configuration, a valid key, a local bridge, and explicit sharing of planning metadata |

Codex supplies the goal, permission, prepared text, visual judgment, and final inspection. The plugin sets action and time budgets and checks the task scope. Recognized sensitive controls, uncertain state, and failed verification hand control back to Codex. Label rules are helper checks; they cannot detect every consequential action or replace the current Computer Use permission policy.

“Reinforced” is the project name. This repository provides an execution helper; it does not train or distribute a reinforcement-learning model. No universal speedup has been measured.

## Check your environment

The verified development environment is **Windows 11 x64 with Node.js 24.14.0**; the source requires **Node.js 22 or later**. You also need Git, npm, PowerShell, and a Codex installation that supports local plugin marketplaces and `codex plugin add`.

**Computer Use must already be available in your Codex chat. Installing this plugin does not enable it.** Browser workflows require an enabled browser surface. Native Windows applications additionally require an enabled native CUA surface that can bind the exact window.

| Device / platform | Current status |
| --- | --- |
| Windows 11 x64 desktop or laptop | Primary development platform; UI support depends on the available CUA surface |
| Windows 10, Windows ARM64, macOS, Linux | Deployment and native UI operation are unverified |
| Android / iOS phones and tablets | Unsupported deployment targets |

Jev runs through a cloud provider, so this plugin does not require a GPU for local Jev inference. CPU, RAM, GPU, and VRAM minimums have not been established. Read [compatibility and device requirements](docs/COMPATIBILITY.md) for the full conditions (Chinese).

## Install on Windows

In PowerShell:

```powershell
git clone https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex.git
cd Reinforced-Computer-use-in-Codex
npm ci --omit=dev --ignore-scripts
.\scripts\install-windows.ps1
```

Install dependencies before running the installer. It copies the published package content and its two screenshot dependencies to your user plugin directory, registers the local marketplace, and invokes Codex plugin installation. Existing marketplace content is preserved and backed up. If the target plugin directory already exists or the marketplace root conflicts, it stops so you can inspect the conflict.

Restart Codex and start a new chat after installation. For step-by-step checks and installation details, see [Getting started](docs/GETTING_STARTED.md).

## Try the no-key demo

From your source checkout, keep this terminal open:

```powershell
npm run demo
```

In a new Codex chat with the plugin and browser Computer Use available, paste:

> Use Reinforced Computer Use in local runPlan mode, without Jev. Open http://127.0.0.1:4318/ in the Computer Use browser. Observe the page, use the exact “Long page” link, and verify LONG_01 on the destination. Capture that long page as a PNG in this chat's workspace output directory. Inspect the saved image for LONG_01 through LONG_12 in order and END_OF_LONG_PAGE at the bottom. Report the document height, captured height, and coverage from the helper. Stop and explain if the required Computer Use APIs are unavailable.

The page contains synthetic content and requires no login or provider key. Starting the local server alone does not exercise the plugin: the Codex task must use `runPlan()` and `captureLongPage()` through the selected CUA tab. Full prompts, the adjustable port, expected markers, and verification boundaries are in [DEMO.md](docs/DEMO.md).

## Choose an execution mode

Use **`runPlan()`** for a workflow whose permitted steps are already known. Use **`runAdaptive()`** only when you need Jev to choose among currently allowed actions. Use ordinary Computer Use for a single action, visual reasoning, canvas, drag-and-drop, file pickers, inaccessible controls, and consequential final steps.

Sessions bind an exact tab or window, allow observed labels, restrict browser origins, define a local `verify()` predicate, and set step/time budgets. A `done` result means that predicate passed; inspect the final state or screenshot before reporting success. If scope changes or an action is uncertain, inspect fresh state instead of replaying it. The full session API and bootstrap examples are in the [Codex skill](skills/reinforced-computer-use/SKILL.md).

## Optional: connect Jev

Local mode and the demo work without Jev. Adaptive mode needs TypeSafe or OpenRouter configuration, the relevant user environment variable, a retained loopback bridge process, and `shareWithPlanner: true` with a scoped `plannerGoal`. Follow [the setup instructions](docs/GETTING_STARTED.md#optional-jev-setup) or the [detailed Jev reference](skills/reinforced-computer-use/references/jev-setup.md).

Planning requests can disclose the target name, goal, allowed control labels, observation names, prepared slot names, and recent action descriptions. Prepared text values and screenshots are excluded from the default planning JSON, but entered text can still be sent by the target application or website. Your API key is sent to your selected provider in its HTTPS authorization header. The repository does not verify current provider availability, account access, billing, or a live Jev end-to-end call. Read [privacy and data flow](docs/PRIVACY.md) before enabling sharing (Chinese).

## Development and evidence

```powershell
npm ci --omit=dev --ignore-scripts
npm test
npm run check:release
```

The runtime and screenshot helpers are in `scripts/`; the Codex skill is in `skills/reinforced-computer-use/`; tests are in `tests/`. [Verification records](docs/VERIFICATION.md) distinguish mock tests, the local browser demo, historical acceptance, and unverified production/native/provider paths. CI runs mock tests on Windows/Ubuntu and Node 22/24; passing Ubuntu CI does not prove Linux desktop compatibility.

If you try the demo, an issue stating your OS, Node version, available CUA surface, reproduction steps, and expected versus observed result is useful. Remove private labels, credentials, local paths, screenshots, bridge descriptors, and traces before sharing. Follow [troubleshooting](docs/TROUBLESHOOTING.md) and [the security reporting policy](SECURITY.md).

If the project helps with your Codex workflows, a star makes it easier to find again. You can also watch releases for version updates.

## License and attribution

This plugin and its documentation are released under the [MIT license](LICENSE). See [NOTICE](NOTICE) for dependency and reference attribution. Codex, the Computer Use runtime, and Jev models/services are provided separately and are not distributed by this repository.
