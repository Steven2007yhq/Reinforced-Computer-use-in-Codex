# Bounded read-only verification

`scripts/read-only-verification.mjs` exports `waitForVerified()` for delayed
local feedback after an already attempted input. It sends no planner requests,
accepts no input callback, and never replays a mutation.

```js
var readOnly = await import('file://PLUGIN_ROOT/scripts/read-only-verification.mjs');
var result = await readOnly.waitForVerified({
  observe: captureFreshTargetAndFileEvidence,
  scopeCheck: observation => exactTargetAndStageMatch(observation),
  predicate: observation => savedContentMatches(observation),
  signal: currentContext.signal,
  maxMs: 5000,
  pollMs: 250,
});
// A workflow verifier returns exactly a boolean:
return result.verified === true;
```

`observe(context)` must read current actual evidence every time.
`scopeCheck(observation, context)` and `predicate(observation, context)` must
return strict booleans. Context includes `phase`, `remainingMs`, and a signal.
When the predicate first returns true, a second fresh observation and scope
check confirm that the target still matches. This final scope read does not
prove a transient predicate stayed true: the workflow's final verifier must
check all required durable outcomes again.

The frozen result contains `status`, `verified`, `elapsedMs`, and counts for
observations, scope checks, predicate checks, and polls. Possible statuses are
`verified`, `scope_changed`, `timeout`, `cancelled`, and `needs_inspection`.
Errors have fixed reason codes; raw observations and exception text are omitted.
Extra options such as `input`, `execute`, or `run` are rejected.

Cancellation or the deadline stops later callbacks and signals the active read.
An active callback remains awaited until it settles, so a native read that
ignores cancellation can exceed `maxMs`. The helper never uses `Promise.race`
to abandon a read. The caller must serialize target access and keep every
callback read-only. Screenshot-only effects still need Codex's separate visual
inspection cell; polling cannot pretend to inspect a newly emitted screenshot.
