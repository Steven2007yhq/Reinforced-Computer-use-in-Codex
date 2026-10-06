# Jev selection with Codex visual grounding

`scripts/grounded-actions.mjs` lets Jev choose one already observed and permitted
semantic action when a Windows application has weak or null accessibility (AX).
It does not create AX controls or let Jev recognize screenshots. Codex observes
the actual interface, authorizes the candidates, freshly grounds the selected
action, performs the input through supported Computer Use, and verifies its
effect. This is a cooperative path, not arbitrary application autonomy.

## Two phases

Read the installed Computer Use skill and initialize its supported client first.
Use the configured local bridge for Jev; credential handling stays in the terminal.
After visually inspecting the exact window, call:

```js
var grounded = await import('file://PLUGIN_ROOT/scripts/grounded-actions.mjs');
var ticket = await grounded.prepare({
  client: jevClient, shareWithPlanner: true,
  plannerGoal: 'Start playback of the prepared local test clip',
  targetName: 'Approved test editor',
  observation: {clipReady: true, playbackStopped: true}, scope: true,
  candidates: [{id:'play', kind:'key', key:'Space', label:'Play prepared clip',
    description:'Start playback in the observed test editor'}],
  minConfidence: 0.65, ttlMs: 30000,
});
```

Successful preparation returns a frozen, opaque, single-use ticket whose only
public property is `selectedAction`. Other results contain `status` and, when
available, only `model`/`latencyMs` provider metadata. A low-confidence, invalid,
cancelled, expired, `DONE` or `BLOCKED` response provides no executable ticket.
`DONE` remains advisory and requires independent verification outside the helper.
There is one provider call, with no automatic retry.

Capture fresh state through the documented Computer Use API in an
observation-only cell, then end that cell. Codex inspects the displayed result
and confirms the exact window, workflow stage, and the same selected semantic
action. Re-ground any coordinate against this screenshot and its current
observation identifier. Only in the next cell provide trusted local callbacks
and dispatch one input:

```js
if (!ticket.selectedAction) {
  nodeRepl.write(JSON.stringify(ticket)); // Stop and inspect the status.
} else {
  // These callbacks are supplied by Codex after the fresh visual inspection.
  var outcome = await grounded.commit(ticket, {
    scopeCheck: async action => freshWindowAndStageMatch(action),
    execute: async action => executeFreshlyGroundedAction(action),
    verify: async action => verifyActualLocalResult(action),
  });
  nodeRepl.write(JSON.stringify(outcome));
}
```

The callback names above are placeholders for local, task-specific checks and
supported UI calls; they are not additional APIs or model-generated code. The
helper cannot prove that a callback inspected a fresh screenshot. The caller must
perform that inspection and ensure the callback executes the same selected action,
not a different one. Scope checks run before input, after input and after result
verification. Both scope checks and the verifier must return strict booleans.

`execute` must perform exactly one input using the model-inspected observation
and immediately capture fresh state; stop the cell after `commit` returns.
Scope callbacks must
not silently refresh away that grounded observation before dispatch. Sky
screenshots are displayed automatically; do not decode or re-emit their payload
for inspection. A local verifier may use independent fresh AX or file evidence.
It cannot claim model visual inspection of an image first emitted in the same
cell. If verification needs that visual inspection, hand control back, inspect
the image in the next model turn, and verify the pending workflow on resume.
Never return true solely because the input call completed.

An outcome's `executed:true` means that the local execute callback was invoked.
It does not by itself prove a native input succeeded. An execute exception returns
`needs_inspection` with `uncertain:true`, consumes the ticket and never replays it.
A false verifier returns `failed_verification`; a verifier exception or nonboolean
result returns `needs_inspection`. Only a true independent verifier with all scope
checks passing yields `done` and `verified:true`.

## Local data and authority

Candidates support only `click`, `fill`, `scroll` and `key`, with explicit IDs,
descriptions and labels. Key candidates include an approved key; fill candidates
include a `slotName` for an already prepared local value. The planner receives only
the goal, target name, semantic action metadata and boolean observations/scope.
It receives no screenshot, coordinates, AX tree, prepared values or Window IDs.
Extra candidate fields are excluded. Common credential, email, local-path and
explicit Window ID patterns are redacted from sent strings, but redaction is
heuristic: caller-written goals, labels and slot names must omit private details.

Sensitive fields, external or consequential actions such as send, publish, upload,
login and deletion, Windows/Meta keys, Enter/Return, Delete and BackSpace aliases
return `needs_codex_review` before contacting the provider. This does not grant any
additional authority for file selection, export, publishing or other business
operations. Codex applies the installed skill's action-time policy and existing
user authorization. A confidence value or this ticket never grants permission.

`cancel(ticket)` and optional `AbortSignal` inputs prevent later callbacks.
Tickets expire after `ttlMs`, measured from the start of preparation. A ticket is
reserved before asynchronous commit checks and consumed by any commit attempt;
concurrent commits of the same ticket return `busy`, later attempts return
`ticket_consumed`. An already dispatched OS input cannot be rolled back or forcibly
cancelled here. Callers must serialize separate tickets for the same UI target and
must not prepare a replacement ticket to replay an uncertain input.
