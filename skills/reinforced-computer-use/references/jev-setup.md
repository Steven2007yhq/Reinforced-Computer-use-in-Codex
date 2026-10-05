# Optional Jev setup

Adaptive mode is optional. The local `runPlan()` fast path works without it.

## Configure without exposing a key

1. Put the provider key in the Windows user environment through the Windows settings UI. Do not paste it into chat or pass it on a command line.
   - TypeSafe: `TYPESAFE_API_KEY`
   - OpenRouter: `OPENROUTER_API_KEY`
2. In a new terminal, configure only provider metadata:

   ```powershell
   node PLUGIN_ROOT\scripts\setup.mjs --provider=typesafe --model=jev-latest
   ```

   Or:

   ```powershell
   node PLUGIN_ROOT\scripts\setup.mjs --provider=openrouter --model=~typesafe/jev-latest
   ```

3. Verify without printing the credential:

   ```powershell
   node PLUGIN_ROOT\scripts\doctor.mjs
   ```

The metadata file is stored under `%APPDATA%\ReinforcedComputerUse\config.json`. It contains no credential.

Keep the local `configPath` reported by the terminal setup/doctor diagnostics. If the installed doctor does not include that field, read the setup result or run this path-only diagnostic from `PLUGIN_ROOT` in the terminal:

```powershell
node --input-type=module -e "const provider = await import('./scripts/provider.mjs'); console.log(JSON.stringify({configPath: provider.configPath()}));"
```

This prints only the metadata file path. Do not import `provider.mjs`, `setup.mjs`, `doctor.mjs`, or `bridge-server.mjs` directly into `node_repl`; provider credential access and CLI execution belong in the terminal.

## Start the short-lived bridge

Before an adaptive Computer Use task, retain this terminal process:

```powershell
node PLUGIN_ROOT\scripts\bridge-server.mjs --idle-ms=300000
```

The bridge binds a random `127.0.0.1` port, accepts only authenticated local JSON requests, forwards only the configured decision endpoint, never prints the provider key or bridge token, and exits after inactivity. Stop it with Ctrl+C when the task finishes.

Inside `node_repl` or CUA, import `bridge-client.mjs` and pass an explicit `descriptorPath`. Derive it from the terminal's actual `configPath` by replacing the filename with `bridge.json`; do not copy another machine's user directory. For example:

```js
// Replace the placeholder with this machine's observed configPath.
var rcuConfigPath = 'C:/absolute/path/reported-by-terminal/config.json';
var rcuPath = await import('node:path');
var rcuDescriptorPath = rcuPath.join(rcuPath.dirname(rcuConfigPath), 'bridge.json');
var bridge = await import('file://PLUGIN_ROOT/scripts/bridge-client.mjs');
var jevClient = await bridge.createLocalBridgeClient({descriptorPath: rcuDescriptorPath});
```

The REPL may not expose global `process`, and `node:process` can be unavailable there. With no process environment, the default path may resolve under `~/.config` instead of Windows `%APPDATA%`. Passing the observed descriptor path avoids that mismatch without accessing credentials in the REPL. The ordinary Node CLI default remains `%APPDATA%\ReinforcedComputerUse\bridge.json` on Windows.

`createLocalBridgeClient()` reads the ephemeral descriptor and talks only to that loopback address. The descriptor contains a temporary bridge token: never commit or share it. POSIX permissions are enforced on non-Windows hosts; Windows protection relies on the existing user-profile ACLs, without custom ACL enforcement by this plugin. There is no provider fallback. HTTP 401/403 means credential or account access; 429 means rate limiting; transport failures are not authorization to replay UI mutations.

## Data boundary

With `shareWithPlanner:true`, the provider receives:

- the explicitly scoped `plannerGoal` and target name;
- allowlisted control labels, supported operations, checked/selected state, and prepared slot names;
- boolean observation names/values and recent action descriptions.

The decision payload omits screenshots, the full accessibility tree, prepared text values, window coordinates, and local files. The provider API key is transmitted in the HTTP Authorization header. Control labels, target names, goal text, slot/observation identifiers, and action descriptions can still contain private information; review them before enabling adaptive mode. Entering a value into an application can also transmit it through that application.

Provider documentation: [TypeSafe API](https://docs.typesafe.ai/api), [OpenRouter Jev](https://openrouter.ai/~typesafe/jev-latest). Model availability and service terms should be checked with the provider; local mock tests do not prove paid provider access.
