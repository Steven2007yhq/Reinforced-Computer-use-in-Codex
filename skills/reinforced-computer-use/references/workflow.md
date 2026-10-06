# Local multi-stage workflows

Use scripts/workflow.mjs to preserve progress across Jev sessions and ordinary
Codex/Computer Use handoffs. The module does not control a desktop, send planner
requests, write files, approve actions, or record callback results. Each stage is
one local action attempt followed by independently observed verification.

## API

createWorkflow accepts:

- session: an optional local RCU session or other caller-owned value.
- observe(session, context): required; capture a new actual target observation
  on every call. Use a fresh WindowState, accessibility read, screenshot, or
  independent file check suitable for that stage. Never return latestState or a
  cached observation as a substitute for a new inspection.
- scopeCheck(session, observation, context): required; return exactly true only
  while the current target and permitted context still match.
- stages: ordered descriptors with a unique short ASCII id, run(session,
  context), verify(session, observation, context), and optional needsReview
  and skipIfVerified.
- verify(session, observation, context): required final predicate. Check the
  durable outcome of the entire task, including any earlier outcome that must
  still hold. Stage conditions can be transient, so they are not automatically
  rerun at the end.
- maxStages (default 1) and maxMs (default 5000): default chunk limits.
- maxRunCalls (default stage count) and maxTotalMs (default 60000): limits on
  automatic action attempts. Total time counts active chunks, not time spent
  waiting for Codex. Read-only resume/final checks can still validate work
  completed by Codex after the automatic action budget is exhausted.

The returned object exposes run(options), resume(options), cancel(), and
snapshot(). Per-call options can override maxStages and maxMs and provide an
AbortSignal. Callback context includes the stage ID/index, phase, signal,
remaining action/time budget, and completed stage IDs. The action context also
contains the fresh pre-action observation. Prepared values should remain in
local closures; the orchestrator never serializes or forwards them to Jev.

## Completion and handoff rules

A stage run can return an RCU result object, or its status string:

- done triggers fresh independent stage verification. It is never accepted as
  proof that the business outcome happened.
- yielded preserves the same stage index. A later run only verifies that
  stage; it never calls its action again. If unfinished, Codex receives a
  handoff rather than an automatic continuation of uncertain inputs.
- needs_codex_review always returns a review handoff before any stage verifier
  can advance it.
- Unknown results, exceptions, and other statuses return an inspection handoff.

needsReview can be true/false or a local predicate receiving the same arguments
as a verifier. A true result returns a review handoff without invoking run.
Resume means Codex has handled the requested review/action and is asking for
fresh verification of its actual result; it is not an approval flag that
releases the stored action to run.
If an earlier scope/read failure occurred before that stage's review gate was
reached, the first valid resume must still surface the review request. Only a
resume of that explicit review ticket acknowledges the requested review.

For an idempotent stage whose outcome may already be present, set
skipIfVerified:true explicitly. An untouched stage is then freshly verified
before input; true skips its action, false allows its single action attempt,
and errors/non-booleans hand off. The review gate still takes precedence, so
preverification cannot bypass review. Skipped stages count in skippedStages.

All scope, review, stage, and final predicates require strict booleans. Throws
and non-booleans return sanitized handoffs. Scope is inspected before an
action, after its run, and after its verifier; resume and final checks are also
surrounded by fresh scope reads. Observations and callback results stay local.

An explicit handoff result contains handoff.ticket and handoff.revision. Keep
that pair only in a local variable. The ticket is an opaque object identity
bound to this workflow, its current stage (or final check), and revision. It
cannot be reconstructed from JSON, shared with another workflow, or reused
after a resume. The ticket is non-enumerable; snapshots never contain it. Do
not publish the live result object or store capabilities yourself.

An unsuccessful resume issues a new pair and keeps the same stage pending.
Only fresh verification returning true advances; resume never replays the
current stage's run. With maxStages greater than 1, its remaining chunk budget
may execute later, unattempted stages after the pending stage verifies.
After all stages, the final predicate must pass before status becomes done.

## Example

This generic example applies only where the underlying Computer Use API permits
the shown batch. Native Sky inputs must follow the installed Computer Use skill:
finish a fresh observation cell, let Codex inspect it, then execute exactly one
input in the next cell and immediately refresh. For native stages use
`needsReview:true`, `maxStages:1`, and verification-only resume as shown in
[the skill](../SKILL.md); internal workflow observations do not replace that
visual inspection boundary.

The stage callbacks below are supplied by Codex after observing the actual
software and checking its required approvals. They are local functions, not
Jev-generated code:

    var workflowModule = await import('file://PLUGIN_ROOT/scripts/workflow.mjs');
    var task = workflowModule.createWorkflow({
      session: localSession,
      observe: captureActualCurrentTarget,
      scopeCheck: targetIsStillPermitted,
      stages: [
        {id: 'open-document', run: openDocumentChunk, verify: documentIsLoaded},
        {id: 'edit-value', run: editPreparedValueChunk, verify: actualValueMatches},
        {id: 'save-local', needsReview: true,
          run: saveLocalChunk, verify: localFileHasExpectedContent},
      ],
      verify: allRequiredResultsStillHold,
    });
    var progress = await task.run({maxStages: 2, maxMs: 5000});

If progress.handoff exists, inspect the actual application with ordinary
Computer Use and complete only the authorized pending stage. Then:

    var next = await task.resume({
      ticket: progress.handoff.ticket,
      revision: progress.handoff.revision,
      maxStages: 1,
    });
    progress = next;

If status is yielded and there is no handoff, the next task.run performs fresh
verification or moves to the next unattempted stage within its chunk budget.
Never create a new workflow to replay an uncertain stage merely because its
old ticket expired.

## Counts, cancellation, and limits

snapshot returns only stage IDs, statuses, indices, and counts. Counts describe
workflow callback attempts, observations, checks, resumes, and chunks. A
runCalls count is not a successful UI mutation count or a Jev decision count;
one action callback can contain a bounded RCU chunk. Keep those runtime
statistics separate and independently verify results.

Concurrent run/resume calls reject with WORKFLOW_BUSY. All awaited callbacks
retain the lock until they settle, including after cancel. Cancellation is
terminal for this workflow and aborts the callback signal; an uncooperative
callback may already have performed input and cannot be forcibly rolled back.
Inspect the target before any later work.

Time bounds are cooperative and checked between operations. They never race
an in-flight callback against a timer and release the lock prematurely.
Callbacks must honor context.signal and context.budget, and the underlying
RCU session must keep its own action/provider budgets. The orchestrator cannot
make an arbitrary callback safe, prove that observe really captured new data,
or supply missing application accessibility.

## Delayed save or accessibility feedback

Use [read-only verification](read-only-verification.md) when a permitted input
has already happened but its AX, title, or file feedback is delayed. The helper
polls fresh local evidence within a cooperative deadline; it has no input or
provider callback. Return `result.verified === true` from a workflow verifier.
Keep exact window identity and the allowed stage in scope checks; a changing
title is a business signal, not permanent window identity. On timeout, keep the
handoff and use its current ticket/revision for verification-only resume.
Do not issue the save or edit again merely because its feedback has not arrived.
