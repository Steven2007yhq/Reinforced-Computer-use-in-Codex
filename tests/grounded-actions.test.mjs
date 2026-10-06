import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {prepare, commit, cancel} from '../scripts/grounded-actions.mjs';
import {createSkyTarget} from '../scripts/sky-adapter.mjs';

const click = {id: 'open', kind: 'click', label: 'Open settings', description: 'Open the observed settings panel'};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return {promise, resolve}; };
const answer = (questions, choice = 'open', confidence = 0.99) => ({
  answers: {next: {type: 'choice', choice, confidence,
    probabilities: Object.fromEntries(Object.keys(questions.next.criteria).map(id => [id, id === choice ? 1 : 0]))}},
  model: 'jev-1.13.0', latencyMs: 501, usage: {private: 'raw-response-marker'},
});
function options(extra = {}) {
  return {plannerGoal: 'Open the approved settings panel', targetName: 'Fixture editor', observation: {editorReady: true}, scope: true,
    candidates: [click], shareWithPlanner: true, client: async (_state, questions) => answer(questions), ...extra};
}
const callbacks = extra => ({execute: async () => {}, verify: async () => true, scopeCheck: async () => true, ...extra});

function invalidSignals() {
  const throwing = new AbortController().signal;
  Object.defineProperty(throwing, 'aborted', {get() { throw new Error('PRIVATE_SIGNAL_GETTER'); }});
  const nonboolean = new AbortController().signal;
  Object.defineProperty(nonboolean, 'aborted', {value: 1});
  const revoked = Proxy.revocable(new AbortController().signal, {});
  revoked.revoke();
  return [null, false, 'signal', {}, {aborted: false}, {aborted: true},
    {aborted: false, addEventListener() {}, removeEventListener() {}},
    Object.create(AbortSignal.prototype), new Proxy(new AbortController().signal, {}),
    revoked.proxy, throwing, nonboolean];
}

test('one decision produces an opaque immutable ticket, not raw response or executable model output', async () => {
  let calls = 0;
  const candidates = [{...click, x: 123, y: 456, value: 'LOCAL-VALUE', window: {id: 678}, screenshot: 'LOCAL-IMAGE'}];
  const ticket = await prepare(options({candidates, client: async (_state, questions) => { calls++; return answer(questions); }}));
  candidates[0].description = 'A caller mutation after the decision';
  assert.deepEqual(Object.keys(ticket), ['selectedAction']);
  assert.deepEqual(ticket.selectedAction, click);
  assert.throws(() => { ticket.selectedAction.kind = 'key'; }, TypeError);
  const result = await commit(ticket, callbacks());
  assert.deepEqual(result, {status: 'done', executed: true, verified: true, model: 'jev-1.13.0', latencyMs: 501});
  assert.equal(calls, 1);
  assert.equal(JSON.stringify({ticket, result}).includes('raw-response-marker'), false);
});

test('planner payload only contains scoped semantic metadata and boolean observations', async () => {
  let payload;
  const ticket = await prepare(options({
    plannerGoal: 'Use C:\\private\\fixture.mp4 with Bearer PRIVATE-CREDENTIAL and Window ID: 12345',
    candidates: [{id: 'fillName', kind: 'fill', label: 'Draft name', description: 'Fill the observed draft name', slotName: 'draft-name',
      value: 'PRIVATE-TEXT', x: 991, y: 882, screenshotId: 'SECRET-SHOT', windowId: 12345, rawAX: 'PRIVATE-AX'}],
    screenshot: 'PRIVATE-IMAGE', windowId: 12345, accessibility: null,
    client: async (state, questions) => { payload = {state, questions}; return answer(questions, 'fillName'); },
  }));
  const serialized = JSON.stringify(payload);
  for (const marker of ['PRIVATE-TEXT', 'SECRET-SHOT', 'PRIVATE-AX', 'PRIVATE-IMAGE', 'PRIVATE-CREDENTIAL', '12345', '991', '882', 'C:\\private']) {
    assert.equal(serialized.includes(marker), false, marker);
  }
  assert.deepEqual(payload.state.observation, {editorReady: true});
  assert.deepEqual(ticket.selectedAction, {id: 'fillName', kind: 'fill', label: 'Draft name', description: 'Fill the observed draft name', slotName: 'draft-name'});
  assert.equal(payload.state.actions[0].value, undefined);
});

test('weak or null AX can use a real screenshot observation without fabricated indexes', async () => {
  const window = {id: 42, app: 'fixture.exe', title: 'Fixture editor'};
  const calls = [];
  const sky = {async get_window_state() { calls.push('observe'); return {window, accessibility: null,
    screenshots: [{id: 'main', width: 800, height: 600, originX: 0, originY: 0}]}; }};
  for (const method of ['click', 'press_key', 'type_text', 'scroll', 'set_value']) sky[method] = async args => { calls.push([method, args]); };
  const target = createSkyTarget({sky, window});
  await target.observe({includeScreenshot: true, includeText: false});
  const ticket = await prepare(options({observation: {settingsVisible: true}, accessibility: null}));
  // Codex re-observes and visually grounds the same semantic action before committing.
  const fresh = await target.observe({includeScreenshot: true, includeText: false});
  const result = await commit(ticket, callbacks({
    execute: action => {
      assert.equal(action.id, 'open');
      return target.click({x: 20, y: 30, space: 'screenshot', screenshotId: fresh.screenshots[0].id, observationId: target.observationId()});
    },
  }));
  assert.equal(result.status, 'done');
  assert.deepEqual(calls.at(-1), ['click', {window, x: 20, y: 30, screenshotId: 'main'}]);
  assert.equal(calls.filter(call => Array.isArray(call)).length, 1);
});

test('consumed and forged tickets cannot dispatch another UI input', async () => {
  const ticket = await prepare(options());
  let dispatched = 0;
  const local = callbacks({execute: async () => { dispatched++; }});
  assert.equal((await commit(ticket, local)).status, 'done');
  assert.equal((await commit(ticket, local)).status, 'ticket_consumed');
  assert.equal((await commit({...ticket}, local)).status, 'invalid_ticket');
  assert.equal(dispatched, 1);
});

test('fresh semantic grounding/scope mismatch consumes the ticket before any input', async () => {
  const ticket = await prepare(options());
  let dispatched = 0;
  const result = await commit(ticket, callbacks({scopeCheck: async () => false, execute: async () => { dispatched++; }}));
  assert.equal(result.status, 'scope_changed');
  assert.equal(result.executed, false);
  assert.equal((await commit(ticket, callbacks())).status, 'ticket_consumed');
  assert.equal(dispatched, 0);
});

test('scope change after input or during verification cannot report success', async () => {
  for (const changedAt of [2, 3]) {
    const ticket = await prepare(options());
    let scopes = 0;
    let dispatched = 0;
    const result = await commit(ticket, callbacks({scopeCheck: async () => ++scopes !== changedAt, execute: async () => { dispatched++; }}));
    assert.equal(result.status, 'scope_changed');
    assert.equal(result.executed, true);
    assert.equal(result.verified, false);
    assert.equal(dispatched, 1);
  }
});

test('unknown input exceptions are sanitized, consumed and never retried', async () => {
  const ticket = await prepare(options());
  let attempts = 0;
  const local = callbacks({execute: async () => { attempts++; throw new Error('private native response and credential'); }});
  const result = await commit(ticket, local);
  assert.equal(result.status, 'needs_inspection');
  assert.equal(result.uncertain, true);
  assert.equal(JSON.stringify(result).includes('private native response'), false);
  assert.equal((await commit(ticket, local)).status, 'ticket_consumed');
  assert.equal(attempts, 1);
});

test('result verification must be a strict boolean and failed results consume tickets', async () => {
  for (const value of [false, 'DONE', 1, {done: true}]) {
    const ticket = await prepare(options());
    const result = await commit(ticket, callbacks({verify: async () => value}));
    assert.equal(result.status, value === false ? 'failed_verification' : 'needs_inspection');
    assert.equal(result.verified, false);
    assert.equal((await commit(ticket, callbacks())).status, 'ticket_consumed');
  }
});

test('guard and verifier exceptions/invalid booleans cannot dispatch or certify a result', async () => {
  for (const local of [callbacks({scopeCheck: async () => 'true'}), callbacks({scopeCheck: async () => { throw new Error('private scope'); }}),
    callbacks({verify: async () => { throw new Error('private verify'); }})]) {
    const ticket = await prepare(options());
    const result = await commit(ticket, local);
    assert.equal(result.status, 'needs_inspection');
    assert.equal(result.verified, false);
    assert.equal(JSON.stringify(result).includes('private'), false);
  }
});

test('same-ticket concurrent and reentrant commits reject while execution is pending', async () => {
  const ticket = await prepare(options());
  const pending = deferred();
  const started = deferred();
  let attempts = 0;
  const first = commit(ticket, callbacks({execute: async () => { attempts++; started.resolve(); await pending.promise; }}));
  await started.promise;
  assert.equal((await commit(ticket, callbacks())).status, 'busy');
  pending.resolve();
  assert.equal((await first).status, 'done');
  assert.equal(attempts, 1);
});

test('cancellation before/during dispatch does not retry or run later verification', async () => {
  const cancelled = await prepare(options());
  assert.equal(cancel(cancelled).status, 'cancelled');
  assert.equal((await commit(cancelled, callbacks())).status, 'cancelled');
  const ticket = await prepare(options());
  let verified = 0;
  const result = await commit(ticket, callbacks({execute: async (_action, context) => {
    cancel(ticket); assert.equal(context.signal.aborted, true);
  }, verify: async () => { verified++; return true; }}));
  assert.equal(result.status, 'cancelled');
  assert.equal(result.executed, true);
  assert.equal(verified, 0);
  assert.equal((await commit(ticket, callbacks())).status, 'ticket_consumed');
});

test('cancellation during an awaited post-input scope check prevents the verifier and retains reservation', async () => {
  const ticket = await prepare(options());
  const entered = deferred();
  const release = deferred();
  let scopes = 0;
  let executed = 0;
  let verified = 0;
  const pending = commit(ticket, callbacks({
    execute: async () => { executed++; },
    scopeCheck: async () => {
      if (++scopes === 2) { entered.resolve(); await release.promise; }
      return true;
    },
    verify: async () => { verified++; return true; },
  }));
  await entered.promise;
  cancel(ticket);
  assert.equal((await commit(ticket, callbacks())).status, 'busy');
  release.resolve();
  const result = await pending;
  assert.equal(result.status, 'cancelled');
  assert.equal(result.executed, true);
  assert.equal(result.verified, false);
  assert.equal(executed, 1);
  assert.equal(verified, 0);
  assert.equal((await commit(ticket, callbacks())).status, 'ticket_consumed');
});

test('expiry during an awaited post-input scope check prevents the verifier without replay', async () => {
  const ticket = await prepare(options({ttlMs: 120}));
  const entered = deferred();
  const release = deferred();
  let scopes = 0;
  let executed = 0;
  let verified = 0;
  const pending = commit(ticket, callbacks({
    execute: async () => { executed++; },
    scopeCheck: async () => {
      if (++scopes === 2) { entered.resolve(); await release.promise; }
      return true;
    },
    verify: async () => { verified++; return true; },
  }));
  await entered.promise;
  await delay(140);
  assert.equal((await commit(ticket, callbacks())).status, 'busy');
  release.resolve();
  const result = await pending;
  assert.equal(result.status, 'expired');
  assert.equal(result.executed, true);
  assert.equal(result.verified, false);
  assert.equal(executed, 1);
  assert.equal(verified, 0);
  assert.equal((await commit(ticket, callbacks())).status, 'ticket_consumed');
});

test('invalid signal setup consumes the reserved ticket without stranding it or dispatching input', async () => {
  for (const signal of invalidSignals()) {
    const ticket = await prepare(options());
    const calls = [];
    const result = await commit(ticket, {signal,
      scopeCheck: () => { calls.push('scope'); return true; },
      execute: () => { calls.push('execute'); },
      verify: () => { calls.push('verify'); return true; }});
    assert.equal(result.status, 'needs_inspection');
    assert.equal(result.executed, false);
    assert.equal(result.verified, false);
    assert.deepEqual(calls, []);
    assert.equal(JSON.stringify(result).includes('PRIVATE_SIGNAL_GETTER'), false);
    assert.equal((await commit(ticket, callbacks())).status, 'ticket_consumed');
  }
  assert.equal((await commit(await prepare(options()), callbacks())).status, 'done');
});

test('invalid preparation signals reject before any provider call', async () => {
  let calls = 0;
  for (const signal of invalidSignals()) {
    await assert.rejects(prepare(options({signal, client: async () => { calls++; }})),
      {message: 'GROUNDED_INVALID_SIGNAL'});
  }
  assert.equal(calls, 0);
});

test('a preparation signal with an invalidated accessor consumes its commit ticket', async () => {
  const signal = new AbortController().signal;
  const ticket = await prepare(options({signal}));
  const calls = [];
  let reentrant;
  Object.defineProperty(signal, 'aborted', {get() {
    reentrant = commit(ticket, callbacks({execute: () => { calls.push('reentrant'); }}));
    throw new Error('PRIVATE_LATE_SIGNAL_GETTER');
  }});
  const result = await commit(ticket, {
    scopeCheck: () => { calls.push('scope'); return true; },
    execute: () => { calls.push('execute'); },
    verify: () => { calls.push('verify'); return true; },
  });
  assert.equal(result.status, 'needs_inspection');
  assert.equal(result.executed, false);
  assert.equal((await reentrant).status, 'busy');
  assert.deepEqual(calls, []);
  assert.equal(JSON.stringify(result).includes('PRIVATE_LATE_SIGNAL_GETTER'), false);
  assert.equal((await commit(ticket, callbacks())).status, 'ticket_consumed');
});

test('genuine signal validation and commit work without EventTarget or process globals', () => {
  const moduleUrl = new URL('../scripts/grounded-actions.mjs', import.meta.url).href;
  const script = `
    import assert from 'node:assert/strict';
    delete globalThis.EventTarget;
    delete globalThis.process;
    const {prepare, commit} = await import(${JSON.stringify(moduleUrl)});
    const signal = new AbortController().signal;
    const ticket = await prepare({plannerGoal: 'Open approved settings', targetName: 'Fixture',
      observation: true, scope: true, candidates: [{id:'open', kind:'click', label:'Open settings', description:'Open settings'}],
      shareWithPlanner: true, signal, client: async (_state, questions) => ({answers: {next: {
        type:'choice', choice:'open', confidence:1,
        probabilities:Object.fromEntries(Object.keys(questions.next.criteria).map(id => [id, id === 'open' ? 1 : 0])),
      }}})});
    const result = await commit(ticket, {signal, scopeCheck: () => true, execute: () => {}, verify: () => true});
    assert.equal(result.status, 'done');
    assert.equal((await commit(ticket, {signal})).status, 'ticket_consumed');
    console.log('GROUNDED_REPL_SIGNAL_OK');
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8', timeout: 15000,
  });
  assert.equal(output.trim(), 'GROUNDED_REPL_SIGNAL_OK');
});

test('expired tickets and cancelled signals stop before input; slow preparation issues no ticket', async () => {
  const ticket = await prepare(options({ttlMs: 20}));
  await delay(35);
  assert.equal((await commit(ticket, callbacks())).status, 'expired');
  const controller = new AbortController();
  controller.abort();
  assert.equal((await prepare(options({signal: controller.signal}))).status, 'cancelled');
  const slow = await prepare(options({ttlMs: 10, client: async (_state, questions) => { await delay(25); return answer(questions); }}));
  assert.equal(slow.status, 'expired');
  assert.equal(slow.selectedAction, undefined);
});

test('confidence, choice schema and advisory DONE/BLOCKED never create executable tickets', async () => {
  for (const [choice, confidence, status] of [['open', 0.64, 'low_confidence'], ['DONE', 0.99, 'needs_verification'], ['BLOCKED', 0.99, 'needs_codex']]) {
    const prepared = await prepare(options({client: async (_state, questions) => answer(questions, choice, confidence)}));
    assert.equal(prepared.status, status);
    assert.equal((await commit(prepared, callbacks())).status, 'invalid_ticket');
  }
  const invalid = await prepare(options({client: async (_state, questions) => ({...answer(questions), answers: {next: {type: 'choice', choice: 'invented', confidence: 1, probabilities: {invented: 1}}}})}));
  assert.equal(invalid.status, 'needs_codex');
  await assert.rejects(prepare(options({minConfidence: 0.64})), /GROUNDED_INVALID_LIMIT/);
});

test('sensitive, external and consequential labels or key aliases stop before a provider call', async () => {
  const blocked = [
    {...click, label: 'Password'}, {...click, label: 'API key'}, {...click, label: 'Access token'}, {...click, label: 'Send message'},
    {...click, label: 'Upload file'}, {...click, label: 'Log in'}, {...click, label: '删除项目'},
    {...click, label: '正常', description: 'Publish the result'},
    {id: 'fill', kind: 'fill', label: 'Field', description: 'Fill the approved field', slotName: 'secret'},
    ...['Enter', 'Return', 'KP_Enter', 'Ctrl + Return', 'Delete', 'Control_R+Backspace', 'Win+a', 'Super_L+r', 'Meta+a'].map(key =>
      ({id: 'shortcut', kind: 'key', label: 'Prepared shortcut', description: 'Use the observed shortcut', key})),
  ];
  let requests = 0;
  for (const action of blocked) {
    const result = await prepare(options({candidates: [action], client: async () => { requests++; }}));
    assert.equal(result.status, 'needs_codex_review', JSON.stringify(action));
    assert.equal((await commit(result, callbacks())).status, 'invalid_ticket');
  }
  assert.equal(requests, 0);
});

test('input schema rejects unknown actions, duplicate IDs, nonboolean state and unscoped sharing', async () => {
  for (const extra of [{candidates: [{...click, kind: 'shell'}]}, {candidates: [click, {...click}]},
    {observation: {ready: 'true'}}, {scope: 'true'}, {shareWithPlanner: false},
    {candidates: [{id: 'fill', kind: 'fill', label: 'Field', description: 'Fill the observed field'}]}]) {
    await assert.rejects(prepare(options(extra)), /GROUNDED_/);
  }
  assert.equal((await prepare(options({scope: false}))).status, 'scope_changed');
});

test('a failed provider request exposes no private error response and makes only one call', async () => {
  let calls = 0;
  const result = await prepare(options({client: async () => { calls++; throw new Error('private credential-bearing body'); }}));
  assert.equal(result.status, 'needs_codex');
  assert.equal(JSON.stringify(result).includes('private credential'), false);
  assert.equal(calls, 1);
});

test('the closed decision set cannot be expanded by mutating questions inside an injected client', async () => {
  const ticket = await prepare(options({client: async (_state, questions) => {
    assert.throws(() => { questions.next.criteria.external = 'Execute an unobserved action'; }, TypeError);
    assert.throws(() => { questions.next = {}; }, TypeError);
    return answer(questions);
  }}));
  assert.deepEqual(ticket.selectedAction, click);
});

test('caller abort during preparation or before commit prevents dispatch', async () => {
  const controller = new AbortController();
  const pending = prepare(options({signal: controller.signal, client: async (_state, questions) => {
    await delay(20); return answer(questions);
  }}));
  controller.abort();
  assert.equal((await pending).status, 'cancelled');
  const ticket = await prepare(options());
  assert.equal((await commit(ticket, callbacks({signal: controller.signal}))).status, 'cancelled');
});

test('invalid commit callbacks consume the ticket without calling a UI executor', async () => {
  const ticket = await prepare(options());
  await assert.rejects(commit(ticket, {execute: async () => { throw new Error('must not be called'); }}), /GROUNDED_CALLBACKS_REQUIRED/);
  assert.equal((await commit(ticket, callbacks())).status, 'ticket_consumed');
});
