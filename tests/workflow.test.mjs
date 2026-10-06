import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkflow} from '../scripts/workflow.mjs';

function deferred() {
  let resolve;
  const promise = new Promise(value => { resolve = value; });
  return {promise, resolve};
}

function fixture(overrides = () => ({})) {
  const state = {scope: true, first: false, second: false, captures: 0};
  const session = {local: true};
  const workflow = createWorkflow({
    session,
    observe: async () => ({...state, capture: ++state.captures}),
    scopeCheck: (_session, observed) => observed.scope,
    stages: [{id: 'first', run: () => { state.first = true; return {status: 'done'}; },
      verify: (_session, observed) => observed.first}],
    verify: (_session, observed) => observed.first,
    ...overrides(state, session),
  });
  return {state, session, workflow};
}

function ticket(result) {
  return {ticket: result.handoff.ticket, revision: result.handoff.revision};
}

test('configuration requires a final verifier, fresh observation hook, and distinct safe stage IDs', () => {
  const base = {observe: () => ({}), scopeCheck: () => true,
    stages: [{id: 'first', run: () => ({status: 'done'}), verify: () => true}], verify: () => true};
  assert.throws(() => createWorkflow({...base, verify: undefined}), /INVALID_WORKFLOW/);
  assert.throws(() => createWorkflow({...base, observe: undefined}), /INVALID_WORKFLOW/);
  assert.throws(() => createWorkflow({...base, stages: [...base.stages, ...base.stages]}), /INVALID_WORKFLOW_STAGE/);
  assert.throws(() => createWorkflow({...base, stages: [{...base.stages[0], id: 'C:/private'}]}), /INVALID_WORKFLOW_STAGE/);
  assert.throws(() => createWorkflow({...base, maxStages: 0}), /MAX_STAGES/);
});

test('every done stage and final completion use fresh observations with scope checks on both sides', async () => {
  const events = [];
  const {workflow} = fixture(state => ({
    observe: () => { events.push('observe'); return {...state, capture: ++state.captures}; },
    scopeCheck: (_session, observed, context) => { events.push(context.phase + ':scope:' + observed.capture); return observed.scope; },
    stages: [{id: 'first', run: () => { events.push('run'); state.first = true; return {status: 'done'}; },
      verify: (_session, observed) => { events.push('verify:' + observed.capture); return observed.first; }}],
    verify: (_session, observed) => { events.push('final:' + observed.capture); return observed.first; },
  }));
  const result = await workflow.run();
  assert.equal(result.status, 'done');
  assert.equal(result.counts.runCalls, 1);
  assert.equal(result.counts.verificationCalls, 1);
  assert.equal(result.counts.finalVerificationCalls, 1);
  assert.equal(result.counts.observations, 5);
  assert.equal(result.counts.scopeChecks, 5);
  assert.ok(events.indexOf('run') < events.indexOf('verify:2'));
  assert.ok(events.indexOf('verify:2') < events.indexOf('after_verification:scope:3'));
  assert.ok(events.indexOf('final:4') < events.indexOf('after_final_verification:scope:5'));
});

test('a false local verifier rejects a fake done and resumes never replay its action', async () => {
  const {workflow, state} = fixture(() => ({
    stages: [{id: 'first', run: () => ({status: 'done'}), verify: (_session, observed) => observed.first}],
  }));
  const initial = await workflow.run();
  assert.equal(initial.reason, 'verification_failed');
  assert.equal(initial.stageIndex, 0);
  const again = await workflow.run();
  assert.equal(again.counts.runCalls, 1);
  assert.equal(again.counts.verificationCalls, 1);
  const incomplete = await workflow.resume(ticket(initial));
  assert.equal(incomplete.reason, 'verification_failed');
  assert.equal(incomplete.counts.runCalls, 1);
  await assert.rejects(workflow.resume(ticket(initial)), /INVALID_WORKFLOW_TICKET/);
  state.first = true;
  const done = await workflow.resume(ticket(incomplete));
  assert.equal(done.status, 'done');
  assert.equal(done.counts.runCalls, 1);
  assert.equal(done.counts.resumes, 2);
});

test('a stage review gate must hand off even if its run would say done', async () => {
  let calls = 0;
  const {workflow, state} = fixture(() => ({
    stages: [{id: 'first', needsReview: true,
      run: () => { calls++; return {status: 'done'}; }, verify: (_session, observed) => observed.first}],
  }));
  const review = await workflow.run();
  assert.equal(review.status, 'needs_codex_review');
  assert.equal(calls, 0);
  const notDone = await workflow.resume(ticket(review));
  assert.equal(notDone.reason, 'verification_failed');
  state.first = true;
  assert.equal((await workflow.resume(ticket(notDone))).status, 'done');
  assert.equal(calls, 0);
});

test('explicit fresh preverification may skip an untouched stage, while review remains mandatory', async () => {
  let calls = 0;
  const {workflow, state} = fixture(() => ({
    stages: [{id: 'first', skipIfVerified: true,
      run: () => { calls++; return {status: 'done'}; }, verify: (_s, o) => o.first}],
  }));
  state.first = true;
  const skipped = await workflow.run();
  assert.equal(skipped.status, 'done');
  assert.equal(skipped.counts.runCalls, 0);
  assert.equal(skipped.counts.skippedStages, 1);
  assert.equal(calls, 0);

  const {workflow: reviewed, state: reviewedState} = fixture(() => ({
    stages: [{id: 'first', skipIfVerified: true, needsReview: true,
      run: () => ({status: 'done'}), verify: () => true}],
  }));
  const gate = await reviewed.run();
  assert.equal(gate.status, 'needs_codex_review');
  assert.equal(gate.counts.verificationCalls, 0);
  reviewedState.first = true;
  assert.equal((await reviewed.resume(ticket(gate))).status, 'done');
});

test('false preverification runs once, while nonboolean preverification never starts input', async () => {
  const {workflow} = fixture(state => ({
    stages: [{id: 'first', skipIfVerified: true,
      run: () => { state.first = true; return {status: 'done'}; }, verify: (_s, o) => o.first}],
  }));
  const done = await workflow.run();
  assert.equal(done.status, 'done');
  assert.equal(done.counts.runCalls, 1);
  assert.equal(done.counts.verificationCalls, 2);
  const {workflow: invalid} = fixture(() => ({
    stages: [{id: 'first', skipIfVerified: true, run: () => ({status: 'done'}), verify: () => 'true'}],
  }));
  const rejected = await invalid.run();
  assert.equal(rejected.reason, 'verification_not_boolean');
  assert.equal(rejected.counts.runCalls, 0);
});

test('needs_codex_review from the session takes precedence over a true stage verifier', async () => {
  const {workflow} = fixture(state => ({
    stages: [{id: 'first', run: () => { state.first = true; return {status: 'needs_codex_review'}; },
      verify: (_session, observed) => observed.first}],
  }));
  const review = await workflow.run();
  assert.equal(review.status, 'needs_codex_review');
  assert.equal(review.counts.verificationCalls, 0);
  const done = await workflow.resume(ticket(review));
  assert.equal(done.status, 'done');
  assert.equal(done.counts.runCalls, 1);
});

test('a throw after a possible mutation produces a sanitized handoff and releases the lock', async () => {
  const privateText = 'C:/private/account-path and private prepared value';
  const {workflow} = fixture(state => ({
    stages: [{id: 'first', run: () => { state.first = true; throw new Error(privateText); },
      verify: (_session, observed) => observed.first}],
  }));
  const failed = await workflow.run();
  assert.equal(failed.reason, 'run_error');
  assert.equal(failed.counts.runCalls, 1);
  assert.equal(failed.counts.verificationCalls, 0);
  assert.ok(!JSON.stringify(failed).includes(privateText));
  assert.equal((await workflow.resume(ticket(failed))).status, 'done');
  assert.equal(workflow.snapshot().counts.runCalls, 1);
});

test('unknown, absent, failed, and throwing run statuses never become completion', async () => {
  const results = [undefined, {}, {status: 'made_up', path: 'C:/private/result'},
    {status: 'failed_verification'}, {get status() { throw new Error('private getter'); }}];
  for (const runResult of results) {
    const {workflow} = fixture(state => ({
      stages: [{id: 'first', run: () => { state.first = true; return runResult; }, verify: () => true}],
    }));
    const result = await workflow.run();
    assert.equal(result.status, 'needs_inspection');
    assert.equal(result.counts.verificationCalls, 0);
    assert.ok(!JSON.stringify(result).includes('private'));
    assert.equal((await workflow.resume(ticket(result))).status, 'done');
    assert.equal(workflow.snapshot().counts.runCalls, 1);
  }
});

test('stage, final, review, and scope predicates accept only strict booleans', async () => {
  for (const value of ['true', 1, {}, undefined]) {
    const {workflow: stage} = fixture(() => ({
      stages: [{id: 'first', run: () => ({status: 'done'}), verify: () => value}],
    }));
    assert.equal((await stage.run()).reason, 'verification_not_boolean');
    const {workflow: final} = fixture(() => ({verify: () => value}));
    assert.equal((await final.run()).reason, 'final_verification_not_boolean');
    const {workflow: scope} = fixture(() => ({scopeCheck: () => value}));
    const rejected = await scope.run();
    assert.equal(rejected.reason, 'scope_not_boolean');
    assert.equal(rejected.counts.runCalls, 0);
    const {workflow: review} = fixture(() => ({
      stages: [{id: 'first', run: () => ({status: 'done'}), verify: () => true, needsReview: () => value}],
    }));
    assert.equal((await review.run()).reason, 'review_not_boolean');
    assert.equal(review.snapshot().counts.runCalls, 0);
  }
});

test('scope changes before input, after input, and inside verification stop progress', async () => {
  const {workflow: initial, state: initialState} = fixture(() => ({}));
  initialState.scope = false;
  const stopped = await initial.run();
  assert.equal(stopped.status, 'scope_changed');
  assert.equal(stopped.counts.runCalls, 0);
  assert.equal(stopped.counts.verificationCalls, 0);

  const {workflow: afterRun, state: afterState} = fixture(state => ({
    stages: [{id: 'first', run: () => { state.scope = false; state.first = true; return {status: 'done'}; },
      verify: (_session, observed) => observed.first}],
  }));
  const changed = await afterRun.run();
  assert.equal(changed.status, 'scope_changed');
  assert.equal(changed.counts.runCalls, 1);
  assert.equal(changed.counts.verificationCalls, 0);
  afterState.scope = true;
  assert.equal((await afterRun.resume(ticket(changed))).status, 'done');
  assert.equal(afterRun.snapshot().counts.runCalls, 1);

  const {workflow: afterVerify} = fixture(state => ({
    stages: [{id: 'first', run: () => ({status: 'done'}),
      verify: () => { state.scope = false; return true; }}],
  }));
  const switched = await afterVerify.run();
  assert.equal(switched.status, 'scope_changed');
  assert.equal(switched.stageIndex, 0);
});

test('resume cannot bypass a review gate that an earlier scope failure prevented from running', async () => {
  let reviews = 0;
  const {workflow, state} = fixture(() => ({
    stages: [{id: 'first', needsReview: () => { reviews++; return true; },
      run: () => ({status: 'done'}), verify: () => true}],
  }));
  state.scope = false;
  const changed = await workflow.run();
  assert.equal(reviews, 0);
  state.scope = true;
  state.first = true;
  const review = await workflow.resume(ticket(changed));
  assert.equal(review.status, 'needs_codex_review');
  assert.equal(review.counts.verificationCalls, 0);
  assert.equal(reviews, 1);
  assert.equal((await workflow.resume(ticket(review))).status, 'done');
  assert.equal(workflow.snapshot().counts.runCalls, 0);
});

test('an asynchronous review predicate cannot change scope and then authorize input', async () => {
  const {workflow} = fixture(state => ({
    stages: [{id: 'first', needsReview: async () => { state.scope = false; return false; },
      run: () => ({status: 'done'}), verify: () => true}],
  }));
  const changed = await workflow.run();
  assert.equal(changed.status, 'scope_changed');
  assert.equal(changed.counts.runCalls, 0);
});

test('observation and verifier exceptions during resume release the lock without replay', async () => {
  let mode = 'run';
  const {workflow, state} = fixture(state => ({
    observe: () => { if (mode === 'observe_throw') throw new Error('private capture'); return {...state}; },
    stages: [{id: 'first', run: () => ({status: 'done'}),
      verify: (_session, observed) => { if (mode === 'verify_throw') throw new Error('private verify'); return observed.first; }}],
  }));
  let failed = await workflow.run();
  mode = 'observe_throw';
  failed = await workflow.resume(ticket(failed));
  assert.equal(failed.reason, 'observation_error');
  mode = 'verify_throw';
  failed = await workflow.resume(ticket(failed));
  assert.equal(failed.reason, 'verification_error');
  mode = 'good';
  state.first = true;
  assert.equal((await workflow.resume(ticket(failed))).status, 'done');
  assert.equal(workflow.snapshot().counts.runCalls, 1);
});

test('yielded keeps the current stage until another fresh verification and never reruns it', async () => {
  const {workflow, state} = fixture(() => ({
    stages: [{id: 'first', run: () => ({status: 'yielded'}), verify: (_session, observed) => observed.first}],
  }));
  const yielded = await workflow.run();
  assert.equal(yielded.status, 'yielded');
  assert.equal(yielded.stageIndex, 0);
  assert.equal(yielded.handoff, null);
  assert.equal(yielded.counts.verificationCalls, 0);
  const pending = await workflow.run();
  assert.equal(pending.reason, 'verification_failed');
  state.first = true;
  assert.equal((await workflow.resume(ticket(pending))).status, 'done');
  assert.equal(workflow.snapshot().counts.runCalls, 1);
});

test('stage chunks preserve ordered progress and an action budget hands off untouched stages', async () => {
  function twoStages(state) {
    return {stages: [
      {id: 'first', run: () => { state.first = true; return {status: 'done'}; }, verify: (_s, o) => o.first},
      {id: 'second', run: () => { state.second = true; return {status: 'done'}; }, verify: (_s, o) => o.second},
    ], verify: (_s, o) => o.first && o.second};
  }
  const {workflow} = fixture(twoStages);
  const first = await workflow.run({maxStages: 1});
  assert.equal(first.status, 'yielded');
  assert.equal(first.stageIndex, 1);
  assert.equal(first.counts.runCalls, 1);
  assert.equal((await workflow.run()).status, 'done');
  assert.equal(workflow.snapshot().counts.runCalls, 2);

  const {workflow: bounded, state} = fixture(state => ({...twoStages(state), maxRunCalls: 1}));
  const budget = await bounded.run({maxStages: 2});
  assert.equal(budget.status, 'budget_exceeded');
  assert.equal(budget.stageIndex, 1);
  assert.equal(budget.stages[1].runCalls, 0);
  state.second = true;
  assert.equal((await bounded.resume(ticket(budget))).status, 'done');
  assert.equal(bounded.snapshot().counts.runCalls, 1);
});

test('a time-bound chunk waits for an in-flight callback and stops before another stage', async () => {
  const entered = deferred();
  const release = deferred();
  const {workflow} = fixture(state => ({
    stages: [
      {id: 'first', run: async () => { entered.resolve(); await release.promise; state.first = true; return {status: 'done'}; },
        verify: (_s, o) => o.first},
      {id: 'second', run: () => { state.second = true; return {status: 'done'}; }, verify: (_s, o) => o.second},
    ], verify: (_s, o) => o.first && o.second,
  }));
  const running = workflow.run({maxStages: 2, maxMs: 50});
  await entered.promise;
  await new Promise(resolve => setTimeout(resolve, 60));
  await assert.rejects(workflow.run(), /WORKFLOW_BUSY/);
  release.resolve();
  const yielded = await running;
  assert.equal(yielded.status, 'yielded');
  assert.equal(yielded.stageIndex, 1);
  assert.equal(yielded.counts.runCalls, 1);
  assert.equal((await workflow.run()).status, 'done');
});

test('tickets are instance/stage/revision-bound, opaque, and absent from snapshot JSON', async () => {
  const {workflow: first} = fixture(() => ({stages: [
    {id: 'first', run: () => ({status: 'done'}), verify: () => false},
  ]}));
  const {workflow: other} = fixture(() => ({stages: [
    {id: 'first', run: () => ({status: 'done'}), verify: () => false},
  ]}));
  const issued = await first.run();
  await other.run();
  await assert.rejects(other.resume(ticket(issued)), /INVALID_WORKFLOW_TICKET/);
  await assert.rejects(first.resume({...ticket(issued), revision: issued.handoff.revision + 1}), /INVALID_WORKFLOW_TICKET/);
  const renewed = await first.resume(ticket(issued));
  await assert.rejects(first.resume(ticket(issued)), /INVALID_WORKFLOW_TICKET/);
  assert.notEqual(issued.handoff.ticket, renewed.handoff.ticket);
  assert.equal(JSON.stringify(issued.handoff.ticket), '{}');
  assert.ok(!JSON.stringify(issued).includes('"ticket"'));
  assert.equal(Object.hasOwn(first.snapshot(), 'handoff'), false);
  assert.ok(!JSON.stringify(first.snapshot()).includes('"ticket"'));
});

test('run/resume races serialize callbacks, and cancellation prevents later advancement', async () => {
  const entered = deferred();
  const release = deferred();
  const {workflow} = fixture(state => ({
    stages: [{id: 'first', run: async (_session, context) => {
      entered.resolve(context.signal); await release.promise; state.first = true; return {status: 'done'};
    }, verify: (_session, observed) => observed.first}],
  }));
  const running = workflow.run();
  const signal = await entered.promise;
  await assert.rejects(workflow.run(), /WORKFLOW_BUSY/);
  await assert.rejects(workflow.resume({}), /WORKFLOW_BUSY/);
  workflow.cancel();
  assert.equal(signal.aborted, true);
  await assert.rejects(workflow.run(), /WORKFLOW_BUSY/);
  release.resolve();
  const cancelled = await running;
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.stageIndex, 0);
  assert.equal(cancelled.counts.verificationCalls, 0);
  assert.equal((await workflow.run()).status, 'cancelled');
  assert.equal(workflow.snapshot().counts.runCalls, 1);
});

test('cancellation while observation, stage verification, or final verification waits prevents later callbacks', async () => {
  for (const phase of ['observe', 'verify', 'final']) {
    const entered = deferred();
    const release = deferred();
    const external = new AbortController();
    const {workflow} = fixture(state => ({
      observe: async () => {
        if (phase === 'observe') { entered.resolve(); await release.promise; }
        return {...state};
      },
      stages: [{id: 'first', run: () => { state.first = true; return {status: 'done'}; },
        verify: async (_s, o) => {
          if (phase === 'verify') { entered.resolve(); await release.promise; }
          return o.first;
        }}],
      verify: async (_s, o) => {
        if (phase === 'final') { entered.resolve(); await release.promise; }
        return o.first;
      },
    }));
    const running = workflow.run({signal: external.signal});
    await entered.promise;
    external.abort();
    release.resolve();
    const cancelled = await running;
    assert.equal(cancelled.status, 'cancelled');
    if (phase === 'observe') assert.equal(cancelled.counts.runCalls, 0);
    if (phase !== 'final') assert.equal(cancelled.counts.finalVerificationCalls, 0);
    assert.equal((await workflow.run()).status, 'cancelled');
  }
});

test('signal cleanup exceptions produce a sanitized handoff and cannot strand the workflow lock', async () => {
  const badSignal = {aborted: false, addEventListener() {},
    removeEventListener() { throw new Error('private cleanup'); }};
  const {workflow} = fixture();
  const failed = await workflow.run({signal: badSignal});
  assert.equal(failed.reason, 'signal_cleanup_error');
  assert.ok(!JSON.stringify(failed).includes('private'));
  assert.equal((await workflow.resume(ticket(failed))).status, 'done');
  assert.equal(workflow.snapshot().counts.runCalls, 1);
});

test('cancellation inside a result accessor cannot be overwritten by yielded', async () => {
  let task;
  const {workflow} = fixture(() => ({
    stages: [{id: 'first', run: () => ({get status() { task.cancel(); return 'yielded'; }}),
      verify: () => true}],
  }));
  task = workflow;
  assert.equal((await workflow.run()).status, 'cancelled');
  assert.equal(workflow.snapshot().status, 'cancelled');
  assert.equal((await workflow.run()).status, 'cancelled');
});

test('resume/resume races consume a ticket before the first awaited verifier', async () => {
  let resumeMode = false;
  const entered = deferred();
  const release = deferred();
  const {workflow, state} = fixture(() => ({
    stages: [{id: 'first', run: () => ({status: 'done'}), verify: async (_session, observed) => {
      if (resumeMode) { entered.resolve(); await release.promise; }
      return observed.first;
    }}],
  }));
  const handed = await workflow.run();
  resumeMode = true;
  state.first = true;
  const resuming = workflow.resume(ticket(handed));
  await entered.promise;
  await assert.rejects(workflow.resume(ticket(handed)), /WORKFLOW_BUSY/);
  release.resolve();
  assert.equal((await resuming).status, 'done');
  await assert.rejects(workflow.resume(ticket(handed)), /INVALID_WORKFLOW_TICKET/);
});

test('final verifier rechecks durable outcomes and failure only resumes final verification', async () => {
  let finalReady = false;
  const {workflow} = fixture(() => ({verify: (_session, observed, context) =>
    observed.first && finalReady && context.completedStageIds.includes('first')}));
  const failed = await workflow.run();
  assert.equal(failed.reason, 'final_verification_failed');
  assert.equal(failed.stageIndex, 1);
  assert.equal(failed.handoff.stageId, null);
  assert.equal(failed.stages[0].status, 'completed');
  const pending = await workflow.resume(ticket(failed));
  assert.equal(pending.reason, 'final_verification_failed');
  finalReady = true;
  const done = await workflow.resume(ticket(pending));
  assert.equal(done.status, 'done');
  assert.equal(done.counts.runCalls, 1);
  assert.equal(done.counts.verificationCalls, 1);
  assert.equal(done.counts.finalVerificationCalls, 3);
});

test('external state regression before final verification is never reported done or replayed', async () => {
  const {workflow, state} = fixture(state => ({
    stages: [
      {id: 'first', run: () => { state.first = true; return {status: 'done'}; }, verify: (_s, o) => o.first},
      {id: 'second', run: () => { state.second = true; state.first = false; return {status: 'done'}; }, verify: (_s, o) => o.second},
    ], verify: (_s, o) => o.first && o.second,
  }));
  const failed = await workflow.run({maxStages: 2});
  assert.equal(failed.reason, 'final_verification_failed');
  assert.equal(failed.counts.runCalls, 2);
  state.first = true;
  assert.equal((await workflow.resume(ticket(failed))).status, 'done');
  assert.equal(workflow.snapshot().counts.runCalls, 2);
});

test('snapshot and original stage mutations cannot replace callbacks or alter progress', async () => {
  const stage = {id: 'first', run: () => ({status: 'done'}), verify: () => false};
  const stages = [stage];
  const {workflow} = fixture(() => ({stages, verify: () => true}));
  stage.run = () => { throw new Error('replacement'); };
  stage.verify = () => true;
  stages.push({...stage, id: 'extra'});
  const failed = await workflow.run();
  assert.equal(failed.reason, 'verification_failed');
  failed.stages[0].status = 'completed';
  failed.counts.runCalls = 0;
  const snap = workflow.snapshot();
  assert.equal(snap.stages.length, 1);
  assert.equal(snap.stages[0].status, 'handoff');
  assert.equal(snap.counts.runCalls, 1);
});
