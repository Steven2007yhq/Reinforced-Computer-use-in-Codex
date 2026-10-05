import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCandidates, createSession, parseAX} from '../scripts/runtime.mjs';

const app = body => `Native app: Test\n0 AXWindow Test window\n${body}`;

function mockApp(initial) {
  let state = initial;
  const calls = [];
  return {
    calls,
    setState(value) { state = value; },
    async getAXState() { calls.push(['observe']); return state; },
    async click(index) { calls.push(['click', index]); },
    async pressKey(key) { calls.push(['pressKey', key]); },
    async typeText(value) { calls.push(['typeText', value]); },
    async getScreenshot() { calls.push(['screenshot']); return new Uint8Array([1]); },
    async scroll(target, direction, distance) { calls.push(['scroll', target, direction, distance]); },
  };
}

test('parses Windows-style accessibility nodes', () => {
  const nodes = parseAX(app('  1 AXButton Settings\n  2 AXTextField Project, Value: Demo, ID: project'));
  assert.deepEqual(nodes.map(({id, role, label}) => ({id, role, label})), [
    {id: 0, role: 'window', label: 'Test window'},
    {id: 1, role: 'button', label: 'Settings'},
    {id: 2, role: 'text field', label: 'Project'},
  ]);
});

test('local plan re-observes and independently verifies', async () => {
  const states = [
    app('  1 AXButton Settings'),
    app('  2 AXButton Notifications'),
    app('  3 AXHeading Notification settings'),
  ];
  let stage = 0;
  const target = mockApp(states[0]);
  target.click = async index => { target.calls.push(['click', index]); stage++; target.setState(states[stage]); };
  const session = createSession({
    target, kind: 'app', platform: 'windows', targetName: 'Test window', goal: 'Open notifications',
    clickLabels: ['Settings', 'Notifications'], verify: raw => raw.includes('Notification settings'),
    scopeCheck: raw => raw.includes('Test window'),
  });
  const result = await session.runPlan([{kind: 'click', label: 'Settings'}, {kind: 'click', label: 'Notifications'}]);
  assert.equal(result.status, 'done');
  assert.equal(result.verified, true);
  assert.equal(result.mutations, 2);
  assert.deepEqual(target.calls.filter(call => call[0] === 'click'), [['click', 1], ['click', 2]]);
});

test('consequential controls are handed back without mutation', async () => {
  const target = mockApp(app('  7 AXButton Delete account'));
  const session = createSession({
    target, kind: 'app', platform: 'windows', targetName: 'Test window', goal: 'Delete account',
    clickLabels: ['Delete account'], verify: () => false,
  });
  const result = await session.runPlan([{kind: 'click', label: 'Delete account'}]);
  assert.equal(result.status, 'needs_codex_review');
  assert.equal(target.calls.some(call => call[0] === 'click'), false);
});

test('Windows prepared text stays local and uses focus-select-type', async () => {
  let filled = false;
  const target = mockApp(app('  4 AXTextField Project name, Value:, ID: project'));
  target.typeText = async value => { target.calls.push(['typeText', value]); filled = true; target.setState(app(`  4 AXTextField Project name, Value: ${value}, ID: project`)); };
  const session = createSession({
    target, kind: 'app', platform: 'windows', targetName: 'Test window', goal: 'Fill project',
    textSlots: [{name: 'project-name', fieldLabel: 'Project name', value: 'Falcon'}],
    verify: raw => raw.includes('Value: Falcon'),
  });
  const result = await session.runPlan([{kind: 'fill', slot: 'project-name'}]);
  assert.equal(result.status, 'done');
  assert.equal(filled, true);
  assert.deepEqual(target.calls.filter(call => ['click', 'pressKey', 'typeText'].includes(call[0])), [
    ['click', 4], ['pressKey', 'ctrl+a'], ['typeText', 'Falcon'],
  ]);
});

test('adaptive planner receives only scoped metadata, not prepared values or full AX', async () => {
  const target = mockApp(app('  1 AXButton Settings\n  2 AXTextField Project name, Value:, ID: project'));
  let captured;
  let clicked = false;
  target.click = async index => { target.calls.push(['click', index]); clicked = true; target.setState(app('  3 AXHeading Settings opened')); };
  const client = async (state, questions) => {
    captured = {state, questions};
    return {answers: {next: {type: 'choice', choice: 'a0', confidence: 0.9,
      probabilities: {a0: 0.88, a1: 0.04, DONE: 0.03, BLOCKED: 0.03, WAIT: 0.02}}}};
  };
  const session = createSession({
    target, client, kind: 'app', platform: 'windows', targetName: 'Test window', goal: 'Private local goal',
    plannerGoal: 'Open settings', shareWithPlanner: true, clickLabels: ['Settings'],
    textSlots: [{name: 'project-name', fieldLabel: 'Project name', value: 'TOP-SECRET-VALUE'}],
    verify: raw => raw.includes('Settings opened'),
  });
  const result = await session.runAdaptive();
  assert.equal(result.status, 'done');
  assert.equal(clicked, true);
  const serialized = JSON.stringify(captured.state);
  assert.equal(serialized.includes('TOP-SECRET-VALUE'), false);
  assert.equal(serialized.includes('Private local goal'), false);
  assert.equal(serialized.includes('Open settings'), true);
  assert.equal(serialized.includes('Native app:'), false);
});

test('Windows native scrolling requires a caller-provided point', () => {
  const target = mockApp(app('  5 AXScrollArea Results'));
  const options = {
    target, kind: 'app', platform: 'windows', targetName: 'Test window', goal: 'Scroll', verify: () => false,
    scrollRegions: [{name: 'results', label: 'Results', directions: ['down']}],
  };
  const built = buildCandidates(app('  5 AXScrollArea Results'), options);
  assert.equal(built.candidates.length, 1);
  const session = createSession(options);
  return session.runPlan([{kind: 'scroll', region: 'results', direction: 'down'}]).then(result => {
    assert.equal(result.status, 'needs_inspection');
    assert.equal(target.calls.some(call => call[0] === 'scroll'), false);
  });
});

const framedPage = `Browser tab: 1, Title: "Fixture", URL: "http://localhost:5000/".\n1 AXWebArea Fixture, URL: localhost:5000/\n\t2 container Embedded\n\t\t3 AXWebArea Child, URL: 127.0.0.1:5001/frame\n\t\t\t4 button Reveal frame result\n\t5 text Frame result: pending`;

test('cross-origin iframe action requires an explicit frame origin', async () => {
  const target = mockApp(framedPage);
  const base = {target, kind: 'tab', platform: 'windows', targetName: 'Fixture', goal: 'Reveal result',
    allowedOrigins: ['http://localhost:5000'], clickLabels: ['Reveal frame result'], verify: () => false};
  const node = parseAX(framedPage).find(item => item.label === 'Reveal frame result');
  assert.equal(node.frameOrigin, 'http://127.0.0.1:5001');
  const blocked = await createSession(base).runPlan([{kind: 'click', label: 'Reveal frame result'}]);
  assert.equal(blocked.status, 'needs_codex_review');
  assert.equal(blocked.mutations, 0);
  const allowed = await createSession({...base, allowedFrameOrigins: ['http://127.0.0.1:5001']})
    .runPlan([{kind: 'click', label: 'Reveal frame result'}]);
  assert.equal(allowed.mutations, 1);
  assert.equal(target.calls.some(call => call[0] === 'click' && call[1] === 4), true);
});

test('login, captcha, upload, and file chooser controls never enter the fast path', async () => {
  const raw = `Browser tab: 1, Title: "Fixture", URL: "http://localhost:5000/".\n1 AXWebArea Fixture, URL: localhost:5000/\n\t2 AXTextField Password\n\t3 AXTextField Verification code\n\t4 AXButton Log in\n\t5 AXButton Verify captcha\n\t6 AXButton Upload fixture\n\t7 AXButton Choose fixture file`;
  const target = mockApp(raw);
  const base = {target, kind: 'tab', platform: 'windows', targetName: 'Fixture', goal: 'Check handoff',
    allowedOrigins: ['http://localhost:5000'], clickLabels: ['Log in', 'Verify captcha', 'Upload fixture', 'Choose fixture file'],
    textSlots: [{name: 'dummy-pass', fieldLabel: 'Password', value: 'fixture-pass'},
      {name: 'dummy-code', fieldLabel: 'Verification code', value: 'HUMAN'}], verify: () => false};
  for (const step of [{kind: 'fill', slot: 'dummy-pass'}, {kind: 'fill', slot: 'dummy-code'},
    ...base.clickLabels.map(label => ({kind: 'click', label}))]) {
    const result = await createSession(base).runPlan([step]);
    assert.equal(result.status, 'needs_codex_review', JSON.stringify(step));
    assert.equal(result.mutations, 0);
  }
  assert.equal(target.calls.some(call => call[0] === 'click' || call[0] === 'typeText'), false);
});
