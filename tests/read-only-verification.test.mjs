import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {waitForVerified} from '../scripts/read-only-verification.mjs';
import {createWorkflow} from '../scripts/workflow.mjs';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}
function options(extra = {}) {
  return {observe: () => ({scope: true, ready: true}),
    scopeCheck: observed => observed.scope, predicate: observed => observed.ready, ...extra};
}

test('REPL without the EventTarget or process global imports and verifies, cancels, and times out', () => {
  const moduleUrl = new URL('../scripts/read-only-verification.mjs', import.meta.url).href;
  const script = `
    import assert from 'node:assert/strict';
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    delete globalThis.EventTarget;
    delete globalThis.process;
    assert.equal(typeof EventTarget, 'undefined');
    assert.equal(typeof AbortSignal.prototype.addEventListener, 'function');
    assert.equal(typeof AbortSignal.prototype.removeEventListener, 'function');
    const {waitForVerified} = await import(${JSON.stringify(moduleUrl)});
    const base = {observe: () => ({scope: true}), scopeCheck: state => state.scope,
      predicate: () => true, maxMs: 1000, pollMs: 1};
    let reads = 0;
    const verified = await waitForVerified({...base,
      observe: () => ({scope: true, ready: ++reads >= 2}), predicate: state => state.ready});
    assert.equal(verified.status, 'verified');
    assert.equal(reads, 3);
    assert.equal(verified.counts.polls, 1);

    const controller = new AbortController();
    let pollStarted;
    const entered = new Promise(resolve => { pollStarted = resolve; });
    reads = 0;
    const polling = waitForVerified({...base, signal: controller.signal, maxMs: 10000, pollMs: 10000,
      observe: () => { reads++; return {scope: true}; },
      predicate: () => { pollStarted(); return false; }});
    await entered;
    await delay(5);
    controller.abort();
    assert.equal((await polling).status, 'cancelled');
    assert.equal(reads, 1);

    let release;
    let startRead;
    let returned = false;
    const readEntered = new Promise(resolve => { startRead = resolve; });
    const readGate = new Promise(resolve => { release = resolve; });
    const expired = waitForVerified({...base, maxMs: 10,
      observe: async context => { startRead(context.signal); await readGate; return {scope: true}; }})
      .then(result => { returned = true; return result; });
    const signal = await readEntered;
    await delay(20);
    assert.equal(signal.aborted, true);
    assert.equal(returned, false, 'the REPL timeout must still await its active read');
    release();
    const timedOut = await expired;
    assert.equal(timedOut.status, 'timeout');
    assert.equal(timedOut.counts.scopeChecks, 0);
    assert.equal(timedOut.counts.predicateChecks, 0);
    assert.equal(typeof EventTarget, 'undefined');
    assert.equal(typeof process, 'undefined');
    console.log('READ_ONLY_REPL_COMPAT_OK');
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8', timeout: 15000,
  });
  assert.equal(output.trim(), 'READ_ONLY_REPL_COMPAT_OK');
});

test('strict success requires a new observation and scope check after the predicate', async () => {
  const events = [];
  let generation = 0;
  const result = await waitForVerified(options({
    observe: context => { const observed = {generation: ++generation}; events.push(context.phase + ':' + generation); return observed; },
    scopeCheck: (observed, context) => { events.push(context.phase + ':scope:' + observed.generation); return true; },
    predicate: observed => { events.push('predicate:' + observed.generation); return true; },
  }));
  assert.equal(result.status, 'verified');
  assert.equal(result.verified, true);
  assert.deepEqual(events, ['observe_result:1', 'observe_result:scope:1', 'predicate:1',
    'confirm_scope:2', 'confirm_scope:scope:2']);
  assert.deepEqual(result.counts, {observations: 2, scopeChecks: 2, predicateChecks: 1, polls: 0});
});

test('delayed feedback uses distinct actual observations and exposes only safe counts', async () => {
  const snapshots = [];
  const evaluated = [];
  const result = await waitForVerified(options({pollMs: 1,
    observe: () => {
      const snapshot = {scope: true, ready: snapshots.length >= 2, private: 'LOCAL_OBSERVATION_MARKER'};
      snapshots.push(snapshot);
      return snapshot;
    },
    predicate: observed => { evaluated.push(observed); return observed.ready; },
  }));
  assert.equal(result.status, 'verified');
  assert.equal(evaluated.length, 3);
  assert.equal(new Set(snapshots).size, snapshots.length);
  assert.deepEqual(evaluated, snapshots.slice(0, 3));
  assert.equal(result.counts.observations, 4);
  assert.equal(result.counts.polls, 2);
  assert.equal(JSON.stringify(result).includes('LOCAL_OBSERVATION_MARKER'), false);
  assert.throws(() => { result.counts.observations = 999; }, TypeError);
});

test('scope mismatch at the initial or final observation stops before any later callback', async () => {
  for (const mismatchAt of [1, 2]) {
    let reads = 0;
    let predicates = 0;
    const result = await waitForVerified(options({
      observe: () => ({scope: ++reads !== mismatchAt}),
      predicate: () => { predicates++; return true; },
    }));
    assert.equal(result.status, 'scope_changed');
    assert.equal(result.verified, false);
    assert.equal(reads, mismatchAt);
    assert.equal(predicates, mismatchAt === 1 ? 0 : 1);
    assert.equal(result.counts.polls, 0);
  }
});

test('scope changes while a true predicate waits cannot pass final confirmation', async () => {
  let scope = true;
  const entered = deferred();
  const release = deferred();
  const waiting = waitForVerified(options({
    observe: () => ({scope}),
    predicate: async () => { entered.resolve(); await release.promise; return true; },
  }));
  await entered.promise;
  scope = false;
  release.resolve();
  const result = await waiting;
  assert.equal(result.status, 'scope_changed');
  assert.equal(result.counts.observations, 2);
});

test('truthy nonbooleans from scope or predicate are explicit inspection failures', async () => {
  for (const value of ['true', 1, {}, undefined]) {
    for (const callback of ['scopeCheck', 'predicate']) {
      const result = await waitForVerified(options({[callback]: () => value}));
      assert.equal(result.status, 'needs_inspection');
      assert.equal(result.reason, callback === 'scopeCheck' ? 'scope_not_boolean' : 'predicate_not_boolean');
      assert.equal(result.verified, false);
      assert.equal(result.counts.observations, 1);
      assert.equal(result.counts.polls, 0);
    }
  }
});

test('already cancelled calls perform no observations, scope checks, or predicates', async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await waitForVerified(options({signal: controller.signal,
    observe: () => { throw new Error('must not read'); }}));
  assert.equal(result.status, 'cancelled');
  assert.deepEqual(result.counts, {observations: 0, scopeChecks: 0, predicateChecks: 0, polls: 0});
});

test('cancel during each callback waits for it to settle and never starts later work', async () => {
  for (const callback of ['observe', 'scopeCheck', 'predicate']) {
    const entered = deferred();
    const release = deferred();
    const controller = new AbortController();
    let active = 0;
    let returned = false;
    const waiting = waitForVerified(options({signal: controller.signal,
      [callback]: async (...args) => {
        active++;
        const context = args.at(-1);
        entered.resolve(context);
        await release.promise;
        active--;
        return callback === 'observe' ? {scope: true, ready: true} : true;
      },
    })).then(result => { returned = true; return result; });
    const context = await entered.promise;
    controller.abort();
    await delay(5);
    assert.equal(context.signal.aborted, true);
    assert.equal(returned, false);
    assert.equal(active, 1);
    release.resolve();
    const result = await waiting;
    assert.equal(result.status, 'cancelled');
    assert.equal(active, 0);
    assert.equal(result.counts.observations, 1);
    assert.equal(result.counts.polls, 0);
    if (callback === 'observe') assert.equal(result.counts.scopeChecks, 0);
    if (callback !== 'predicate') assert.equal(result.counts.predicateChecks, 0);
  }
});

test('abort during a long poll stops without another read and clears the wait', async () => {
  const first = deferred();
  const controller = new AbortController();
  let reads = 0;
  const waiting = waitForVerified(options({signal: controller.signal, maxMs: 10000, pollMs: 10000,
    observe: () => { reads++; return {scope: true}; },
    predicate: () => { first.resolve(); return false; },
  }));
  await first.promise;
  await delay(5);
  controller.abort();
  const result = await waiting;
  assert.equal(result.status, 'cancelled');
  assert.equal(reads, 1);
  assert.equal(result.verified, false);
});

test('a slow read crosses the deadline without an abandoned callback or later scope check', async () => {
  const entered = deferred();
  const release = deferred();
  let returned = false;
  const waiting = waitForVerified(options({maxMs: 20,
    observe: async context => { entered.resolve(context); await release.promise; return {scope: true, ready: true}; },
  })).then(result => { returned = true; return result; });
  const context = await entered.promise;
  await delay(30);
  assert.equal(context.signal.aborted, true);
  assert.equal(returned, false);
  release.resolve();
  const result = await waiting;
  assert.equal(result.status, 'timeout');
  assert.equal(result.counts.observations, 1);
  assert.equal(result.counts.scopeChecks, 0);
  assert.equal(result.counts.predicateChecks, 0);
});

test('a synchronous read past the deadline still aborts its signal before timeout is returned', async () => {
  let observedSignal;
  const result = await waitForVerified(options({maxMs: 2,
    observe: context => {
      observedSignal = context.signal;
      const until = performance.now() + 10;
      while (performance.now() < until) { /* An in-flight synchronous read. */ }
      return {scope: true, ready: true};
    },
  }));
  assert.equal(result.status, 'timeout');
  assert.equal(observedSignal.aborted, true);
  assert.equal(result.counts.observations, 1);
  assert.equal(result.counts.scopeChecks, 0);
});

test('a late true predicate cannot become success or start final observation', async () => {
  const entered = deferred();
  const release = deferred();
  let returned = false;
  const waiting = waitForVerified(options({maxMs: 20,
    predicate: async context => { entered.resolve(); await release.promise; return true; },
  })).then(result => { returned = true; return result; });
  await entered.promise;
  await delay(30);
  assert.equal(returned, false);
  release.resolve();
  const result = await waiting;
  assert.equal(result.status, 'timeout');
  assert.equal(result.counts.observations, 1);
  assert.equal(result.counts.scopeChecks, 1);
  assert.equal(result.counts.predicateChecks, 1);
});

test('poll intervals exceeding remaining time are capped and cannot start another read', async () => {
  let reads = 0;
  const result = await waitForVerified(options({maxMs: 20, pollMs: 10000,
    observe: () => { reads++; return {scope: true, ready: false}; },
  }));
  assert.equal(result.status, 'timeout');
  assert.equal(reads, 1);
  assert.ok(result.elapsedMs < 1000, 'remaining-budget poll must not wait the full interval');
});

test('callback errors are sanitized and cancellation during rejection takes precedence', async () => {
  for (const callback of ['observe', 'scopeCheck', 'predicate']) {
    const result = await waitForVerified(options({[callback]: () => { throw new Error('PRIVATE_ERROR_BODY'); }}));
    assert.equal(result.status, 'needs_inspection');
    assert.equal(result.reason, callback === 'observe' ? 'observation_error'
      : callback === 'scopeCheck' ? 'scope_error' : 'predicate_error');
    assert.equal(JSON.stringify(result).includes('PRIVATE_ERROR_BODY'), false);
  }
  const entered = deferred();
  const release = deferred();
  const controller = new AbortController();
  const waiting = waitForVerified(options({signal: controller.signal,
    observe: async () => { entered.resolve(); await release.promise; throw new Error('PRIVATE_ABORT_BODY'); },
  }));
  await entered.promise;
  controller.abort();
  release.resolve();
  const result = await waiting;
  assert.equal(result.status, 'cancelled');
  assert.equal(JSON.stringify(result).includes('PRIVATE_ABORT_BODY'), false);
});

test('input callbacks and malformed timing/signal options are rejected before any observation', async () => {
  let reads = 0;
  const base = options({observe: () => { reads++; return {scope: true, ready: true}; }});
  for (const extra of [{input: () => {}}, {execute: () => {}}, {run: () => {}},
    {maxMs: 0}, {maxMs: -1}, {maxMs: NaN}, {maxMs: Infinity}, {maxMs: 2147483648},
    {pollMs: 0}, {pollMs: -1}, {pollMs: Infinity}, {signal: {aborted: false}}]) {
    await assert.rejects(waitForVerified({...base, ...extra}), /READ_ONLY_VERIFICATION_/);
  }
  await assert.rejects(waitForVerified(options({predicate: undefined})), /CALLBACKS_REQUIRED/);
  assert.equal(reads, 0);
});

test('workflow resumes delayed save feedback using only reads without replaying the saved action', async () => {
  let savedFeedback = false;
  let actionAttempts = 0;
  const checks = [];
  const fresh = () => ({scope: true, saved: savedFeedback});
  const task = createWorkflow({
    observe: fresh, scopeCheck: (_session, observed) => observed.scope,
    stages: [{id: 'save-local', run: () => { actionAttempts++; return {status: 'done'}; },
      verify: async (_session, _observed, context) => {
        const result = await waitForVerified({
          observe: fresh, scopeCheck: observed => observed.scope,
          predicate: observed => observed.saved, signal: context.signal,
          maxMs: 20, pollMs: 10,
        });
        checks.push(result);
        return result.verified === true;
      }}],
    verify: (_session, observed) => observed.saved,
  });
  const waiting = await task.run();
  assert.equal(waiting.status, 'needs_inspection');
  assert.equal(checks[0].status, 'timeout');
  assert.equal(actionAttempts, 1);
  savedFeedback = true;
  const finished = await task.resume({
    ticket: waiting.handoff.ticket, revision: waiting.handoff.revision,
  });
  assert.equal(finished.status, 'done');
  assert.equal(checks[1].status, 'verified');
  assert.equal(actionAttempts, 1);
  assert.equal(finished.counts.runCalls, 1);
});
