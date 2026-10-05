# Getting started

[English](GETTING_STARTED.md) · [简体中文](GETTING_STARTED.zh-CN.md) · [README](../README.md)

The first task uses a synthetic local browser page, a known plan, and long-page capture. It needs no Jev account or API key. You must already have browser Computer Use available in the Codex chat that runs it.

## 1. Check the prerequisites

The supported installation procedure below targets Windows. The verified development environment is Windows 11 x64; other desktop deployments remain unverified. You need Node.js 22+, npm, Git, PowerShell, and a Codex CLI that supports local plugin marketplaces.

In PowerShell, check:

```powershell
node --version
npm --version
git --version
codex plugin marketplace list --json
```

The last command should return a JSON marketplace inventory. A working Node installation cannot prove that Codex plugin commands or Computer Use are available. Ask Codex to inspect its documented Computer Use surface; browser operation and native desktop operation are separate capabilities. See [compatibility](COMPATIBILITY.md) for device and interface details (Chinese).

## 2. Install the plugin from source

```powershell
git clone https://github.com/Steven2007yhq/Reinforced-Computer-use-in-Codex.git
cd Reinforced-Computer-use-in-Codex
npm ci --omit=dev --ignore-scripts
.\scripts\install-windows.ps1
```

`npm ci` installs the two JavaScript image dependencies from the lockfile. `--ignore-scripts` disables dependency lifecycle scripts. Run it before the installer.

The installer checks Node and Codex before making changes. It copies allowlisted package files and the image dependencies into the current user's `plugins\reinforced-computer-use` directory. It uses `.agents\plugins\marketplace.json` under the same user profile, preserves unrelated entries, and backs up an existing marketplace file before updating it. It registers an unregistered marketplace and invokes `codex plugin add`.

If the plugin directory already exists, the installer refuses to overwrite it. Inspect and preserve your existing installation before moving that exact directory aside for an update. If a marketplace of the same name points elsewhere, resolve that specific conflict first. Do not delete the entire plugin or marketplace tree.

Restart Codex and start a new chat. If Windows blocks script execution, inspect the repository script and your device's execution policy; on managed devices, follow the administrator's policy. The installer does not enable Computer Use.

## 3. Check local runtime conditions

From the source checkout:

```powershell
node scripts/doctor.mjs
npm test
```

For the installed copy:

```powershell
$pluginRoot = Join-Path $env:USERPROFILE 'plugins\reinforced-computer-use'
node "$pluginRoot\scripts\doctor.mjs"
```

Check `nodeSupported: true` as well as the `localPlanMode` hint. Adaptive mode may report missing configuration or credentials; that does not block this local demo. `adaptiveMode: ready` checks configuration and key presence, not provider access or a successful request. Neither mode hint proves that a CUA surface is enabled. Tests use mocks and local fixtures; see [verification](VERIFICATION.md).

## 4. Run a repeatable first task

Keep a terminal open in the source checkout:

```powershell
npm run demo
```

The local fixture listens at `http://127.0.0.1:4318/`. If that port is occupied:

```powershell
npm run demo -- --port=4319
```

Use the printed URL, and update the task URL and allowed origin to the same port. Paste this prompt into a new Codex chat with the plugin and browser Computer Use available:

> Use Reinforced Computer Use in local runPlan mode, without Jev. Open http://127.0.0.1:4318/ in the Computer Use browser. Observe the page, use the exact “Long page” link, and verify LONG_01 on the destination. Capture that long page as a PNG in this chat's workspace output directory. Inspect the saved image for LONG_01 through LONG_12 in order and END_OF_LONG_PAGE at the bottom. Report the document height, captured height, and coverage from the helper. Stop and explain if the required Computer Use APIs are unavailable.

The expected outcome is a saved image whose sections appear once in order, with the first section and footer visible. Height and coverage are reported per capture; they are not a guarantee for other pages. [The demo guide](DEMO.md) gives the exact CUA procedure, API example, evidence, and limitations. Stop the fixture server with Ctrl+C when finished.

## 5. Apply it to your own task

Start with a narrow read-only navigation task. Identify the exact tab/window, currently visible labels, browser origins, and an observable success condition. Codex then creates the session described in [the skill](../skills/reinforced-computer-use/SKILL.md). For Windows native apps, initialize the documented `@oai/sky` client in `node_repl`, select an exact returned `Window`, and bind it through [the Sky adapter](../skills/reinforced-computer-use/references/sky-adapter.md). Browser and legacy CUA targets use the documented CUA initialization call. Retain the selected target.

Browser sessions require exact `allowedOrigins`; cross-origin frames also require exact `allowedFrameOrigins`. Native Windows scrolling needs coordinates chosen from a fresh screenshot. Do not put passwords, one-time codes, API keys, or payment data into text slots. Use ordinary Computer Use for inaccessible controls, visual judgment, file pickers, and consequential final steps.

If the runtime hands control back, inspect the current interface and reason before continuing. `done` means the local predicate passed; use an appropriate fresh state or screenshot for final inspection. Do not replay an uncertain action automatically.

## Optional Jev setup

Skip this section for local plans and the demo. Adaptive mode calls a cloud provider; this repository does not load a Jev model locally. A scoped [TypeSafe live acceptance](acceptance-native-2026-10-05.md) exercised Jev decisions with Codex/Sky handoffs. It does not establish continuing provider availability, billing, or access for other accounts.

Review [privacy and data flow](PRIVACY.md) first (Chinese). The planning goal, target name, allowed labels, slot/observation names, and recent action descriptions may disclose private information. Prepared text values and screenshots are excluded from the default planning JSON; labels can still contain the same information, and target websites can transmit text you enter.

Add the relevant **user environment variable** through Windows settings, then start a new terminal. Keep the real key out of chat, repository files, and command-line arguments.

| Source route | Key variable | Default model |
| --- | --- | --- |
| TypeSafe | `TYPESAFE_API_KEY` | `jev-latest` |
| OpenRouter | `OPENROUTER_API_KEY` | `~typesafe/jev-latest` |

Configure one provider using the installed path:

```powershell
$pluginRoot = Join-Path $env:USERPROFILE 'plugins\reinforced-computer-use'
node "$pluginRoot\scripts\setup.mjs" --provider=typesafe --model=jev-latest
node "$pluginRoot\scripts\doctor.mjs"
```

Or choose the OpenRouter route:

```powershell
node "$pluginRoot\scripts\setup.mjs" --provider=openrouter --model=~typesafe/jev-latest
```

The setup file saves provider/model names, not the API key. Start the local bridge in a terminal you keep open for the adaptive task:

```powershell
node "$pluginRoot\scripts\bridge-server.mjs" --idle-ms=300000
```

The bridge listens on a random loopback port and uses a temporary bridge token. The provider receives your real API key through the HTTPS authorization header. Stop the bridge with Ctrl+C when finished; the default idle timeout is five minutes. The temporary descriptor can contain sensitive authentication material and must not be uploaded.

In the Codex session, adaptive execution requires `shareWithPlanner: true`, a deliberately scoped `plannerGoal`, the bridge client, and the same local controls/scope/verifier restrictions as a plan. In `node_repl`, pass an explicit `descriptorPath` obtained from this machine's terminal diagnostics; do not rely on an environment-derived default when global `process` is unavailable. Follow [the detailed Jev reference](../skills/reinforced-computer-use/references/jev-setup.md). Do not lower confidence limits or change providers merely to force progress.

## If something fails

See [Troubleshooting](TROUBLESHOOTING.md). For a public issue, use synthetic reproduction data and state the OS, Node version, available CUA surface, step that failed, and sanitized error. Keep keys, user configuration, bridge descriptors, raw UI traces, and private screenshots out of issues. Security reports follow [SECURITY.md](../SECURITY.md).
