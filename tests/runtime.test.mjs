import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCandidates, createSession, parseAX} from '../scripts/runtime.mjs';
import {createSkyTarget} from '../scripts/sky-adapter.mjs';

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

function nativeOptions(target, extra = {}) {
  return {target, kind: 'app', platform: 'windows', targetName: 'Test window', goal: 'Review fixture', verify: () => false, ...extra};
}

const chooseFirstAction = async (_state, questions) => ({answers: {next: {
  type: 'choice', choice: 'a0', confidence: 1,
  probabilities: Object.fromEntries(Object.keys(questions.next.criteria).map(id => [id, id === 'a0' ? 1 : 0])),
}}});

const skyTree = `Native app: 7-Zip
\t0 窗口 7-Zip Secondary Actions: Raise
\t\t1 工具栏
\t\t\t2 按钮 Add
\t\t9 窗格 ID: 1000
\t\t\t10 列表 ID: 1001
\t\t\t\t13 列表项目 (selectable) Computer
\t\t\t\t\t14 编辑 Computer
\t\t\t21 窗格
\t\t\t\t22 组合框 (settable, string) ID: 1003
\t\t\t\t\t23 编辑 (settable, string) ID: 1003
\t\t\t\t\t24 按钮 打开 ID: DropDown
\t\t\t\t26 按钮 (disabled)
\t\t32 标题栏 (settable, string) Value: 7-Zip
\t\t38 菜单栏 应用程序 ID: MenuBar
\t\t\t39 菜单项 File
\t\t\t44 菜单项 Help`;

test('parses the live Sky 7-Zip localized tree and metadata without commas', () => {
  const nodes = parseAX(skyTree);
  const node = id => nodes.find(item => item.id === id);
  assert.equal(node(0).role, 'window');
  assert.equal(node(0).label, '7-Zip');
  assert.equal(node(1).role, 'tool bar');
  assert.equal(node(9).role, 'pane');
  assert.equal(node(13).role, 'list item');
  assert.equal(node(13).selected, false);
  assert.equal(node(14).role, 'text field');
  assert.deepEqual([node(22).role, node(23).role], ['combo box', 'text field']);
  assert.equal(node(22).label, '1003');
  assert.equal(node(23).identity, '1003');
  assert.equal(node(24).label, '打开');
  assert.equal(node(24).identity, 'DropDown');
  assert.equal(node(26).disabled, true);
  assert.equal(node(26).label, '');
  assert.equal(node(32).role, 'title bar');
  assert.equal(node(32).value, '7-Zip');
  assert.equal(node(38).role, 'menu bar');
  assert.equal(node(38).label, '应用程序');
  assert.equal(node(39).role, 'menu item');
});

test('Sky capability flags survive label cleanup and disabled controls cannot act', () => {
  const raw = '0 窗口 Test\n\t1 按钮 (disabled) Add\n\t2 复选框 (checked, selected) Option';
  const nodes = parseAX(raw);
  assert.equal(nodes[1].label, 'Add');
  assert.equal(nodes[1].disabled, true);
  assert.equal(nodes[2].checked, true);
  assert.equal(nodes[2].selected, true);
  const built = buildCandidates(raw, nativeOptions(mockApp(raw), {clickLabels: ['Add']}));
  assert.equal(built.candidates.length, 0);
});

test('identical repeated Sky menu references deduplicate while conflicting indexes remain blocked', () => {
  const raw = `${skyTree}\n\t\t45 菜单 Help\n\t\t\t46 菜单项 Contents... F1 ID: 960\n\t\t\t47 菜单项 About 7-Zip... ID: 961\n\t45 菜单 Help\n\t\t46 菜单项 Contents... F1 ID: 960\n\t\t47 菜单项 About 7-Zip... ID: 961`;
  const nodes = parseAX(raw);
  assert.equal(nodes.filter(node => node.id === 47).length, 1);
  assert.equal(nodes.find(node => node.id === 47).duplicate, false);
  assert.deepEqual(buildCandidates(raw, nativeOptions(mockApp(raw), {clickLabels: ['About 7-Zip...']})).candidates
    .map(({target, label}) => ({target, label})), [{target: 47, label: 'About 7-Zip...'}]);
  for (const conflicting of ['47 菜单项 Settings ID: 961', '47 按钮 About 7-Zip... ID: 961',
    '47 菜单项 (disabled) About 7-Zip... ID: 961', '47 菜单项 About 7-Zip... ID: 999']) {
    const conflict = `${raw}\n${conflicting}`;
    assert.equal(parseAX(conflict).find(node => node.id === 47).duplicate, true);
    assert.equal(buildCandidates(conflict, nativeOptions(mockApp(conflict), {clickLabels: ['About 7-Zip...']})).candidates.length, 0);
  }
  const framed = `${framedPage}\n\t\t6 AXWebArea Other, URL: example.com/\n\t\t\t4 button Reveal frame result`;
  assert.equal(parseAX(framed).find(node => node.id === 4).duplicate, true);
});

test('fieldRole resolves a live ComboBox/Edit identity collision without caching indexes', async () => {
  const target = mockApp(skyTree);
  target.replaceText = async (index, value) => {
    target.calls.push(['replaceText', index, value]);
    target.setState(skyTree.replace('23 编辑 (settable, string) ID: 1003', `23 编辑 (settable, string) Value: ${value} ID: 1003`));
  };
  const base = nativeOptions(target, {textSlots: [{name: 'path', fieldLabel: '1003', value: 'D:\\Fixture'}],
    verify: raw => raw.includes('Value: D:\\Fixture')});
  const ambiguous = await createSession(base).runPlan([{kind: 'fill', slot: 'path'}]);
  assert.equal(ambiguous.status, 'needs_codex');
  assert.equal(ambiguous.mutations, 0);
  const selected = await createSession({...base, textSlots: [{...base.textSlots[0], fieldRole: '编辑'}]})
    .runPlan([{kind: 'fill', slot: 'path'}]);
  assert.equal(selected.status, 'done');
  assert.deepEqual(target.calls.filter(call => ['replaceText', 'click', 'pressKey', 'typeText'].includes(call[0])), [
    ['replaceText', 23, 'D:\\Fixture'],
  ]);
  assert.throws(() => createSession({...base, textSlots: [{...base.textSlots[0], fieldRole: 'button'}]}), /INVALID_TEXT_SLOT/);
});

test('native replaceText failure hands off without attempting the legacy fallback', async () => {
  const target = mockApp(app('  4 AXTextField Project name, Value:, ID: project'));
  target.replaceText = async (index, value) => { target.calls.push(['replaceText', index, value]); throw new Error('Partially completed'); };
  const result = await createSession(nativeOptions(target, {
    textSlots: [{name: 'project-name', fieldLabel: 'Project name', value: 'Falcon'}],
  })).runPlan([{kind: 'fill', slot: 'project-name'}]);
  assert.equal(result.status, 'needs_inspection');
  assert.deepEqual(target.calls.filter(call => ['replaceText', 'click', 'pressKey', 'typeText'].includes(call[0])), [
    ['replaceText', 4, 'Falcon'],
  ]);
});

test('Sky key aliases and whitespace cannot bypass consequential key handoff', async () => {
  const target = mockApp(app('  1 AXButton Settings'));
  for (const key of ['Return', 'Enter', 'Delete', 'BackSpace', 'Control_L+Return', 'Control_R + Backspace',
    'Ctrl + Enter', 'KP_Enter', 'Numpad_Enter', 'Shift_L+Delete', 'Alt_R+KP_Delete', 'Control_L+Shift_R+Return']) {
    assert.throws(() => createSession(nativeOptions(target, {keys: [{key, description: 'Fixture'}]})), /KEY_REQUIRES_CODEX/, key);
    const result = await createSession(nativeOptions(target)).runPlan([{kind: 'key', key}]);
    assert.equal(result.status, 'needs_codex_review', key);
    assert.equal(result.mutations, 0, key);
  }
  assert.equal(target.calls.some(call => call[0] === 'pressKey'), false);
});

test('Windows app key limits retain safe plain keys and browser/mac Meta shortcuts', async () => {
  const target = mockApp(app('  1 AXButton Settings'));
  for (const key of ['Win+a', 'Windows_L+r', 'Super_R+a', 'Meta+a', 'Cmd+a', 'Command_L+a']) {
    assert.throws(() => createSession(nativeOptions(target, {keys: [{key, description: 'Fixture'}]})), /KEY_REQUIRES_CODEX/, key);
  }
  for (const key of ['a', 'F2', 'Escape', 'Control_L+a', 'Ctrl + Home', 'Shift_R+Tab', 'Alt_L+Left']) {
    assert.doesNotThrow(() => createSession(nativeOptions(target, {keys: [{key, description: 'Fixture'}]})), key);
  }
  for (const platform of ['mac', 'windows']) {
    const raw = 'Browser tab: 1, Title: "Fixture", URL: "http://localhost:5000/".\n1 AXWebArea Fixture';
    const browser = mockApp(raw);
    browser.pressKey = async (index, key) => { browser.calls.push(['pressKey', index, key]); browser.setState(`${raw}\n2 AXHeading Done`); };
    const result = await createSession(nativeOptions(browser, {kind: 'tab', platform, allowedOrigins: ['http://localhost:5000'],
      keys: [{key: 'Meta+a', description: 'Select prepared text'}], verify: state => state.includes('AXHeading Done')}))
      .runPlan([{kind: 'key', key: 'Meta+a'}]);
    assert.equal(result.status, 'done');
    assert.deepEqual(browser.calls.filter(call => call[0] === 'pressKey'), [['pressKey', null, 'Meta+a']]);
  }
});

test('both runners check initial scope before accepting a successful verifier', async () => {
  for (const mode of ['runPlan', 'runAdaptive']) {
    let verifications = 0;
    const target = mockApp('Native app: Other\n0 AXWindow Other window\n1 AXHeading Done');
    const session = createSession(nativeOptions(target, {scopeCheck: raw => raw.includes('Test window'),
      verify: () => { verifications++; return true; }, client: chooseFirstAction, shareWithPlanner: true, plannerGoal: 'Review fixture'}));
    const result = mode === 'runPlan' ? await session.runPlan([{kind: 'click', label: 'Settings'}]) : await session.runAdaptive();
    assert.equal(result.status, 'scope_changed');
    assert.equal(verifications, 0);
    assert.equal(result.mutations, 0);
  }
});

test('post-action switched scope cannot satisfy a verifier in either runner', async () => {
  for (const mode of ['runPlan', 'runAdaptive']) {
    const target = mockApp(app('  1 AXButton Settings'));
    target.click = async index => { target.calls.push(['click', index]); target.setState('Native app: Other\n0 AXWindow Other window\n1 AXHeading Done'); };
    let verifications = 0;
    const session = createSession(nativeOptions(target, {clickLabels: ['Settings'], scopeCheck: raw => raw.includes('Test window'),
      verify: raw => { verifications++; return raw.includes('AXHeading Done'); },
      client: chooseFirstAction, shareWithPlanner: true, plannerGoal: 'Review fixture'}));
    const result = mode === 'runPlan' ? await session.runPlan([{kind: 'click', label: 'Settings'}]) : await session.runAdaptive();
    assert.equal(result.status, 'scope_changed');
    assert.equal(result.mutations, 1);
    assert.equal(verifications, 1);
    assert.equal(result.trace.at(-1).executed, true);
    assert.equal(result.trace.at(-1).reason, 'scope_changed');
  }
});

test('adaptive refresh rejects switched scope even when the action snapshot is unchanged', async () => {
  const target = mockApp(app('  1 AXButton Settings'));
  const session = createSession(nativeOptions(target, {clickLabels: ['Settings'], scopeCheck: raw => raw.includes('Test window'),
    client: async (...args) => { target.setState('Native app: Other\n0 AXWindow Other window\n  1 AXButton Settings'); return chooseFirstAction(...args); },
    shareWithPlanner: true, plannerGoal: 'Review fixture'}));
  const result = await session.runAdaptive();
  assert.equal(result.status, 'scope_changed');
  assert.equal(result.mutations, 0);
  assert.equal(target.calls.some(call => call[0] === 'click'), false);
});

test('initial accessibility read failure is an explicit handoff before verification', async () => {
  for (const mode of ['runPlan', 'runAdaptive']) {
    const target = mockApp(app('  1 AXButton Settings'));
    target.getAXState = async () => { throw new Error('SKY_ACCESSIBILITY_UNAVAILABLE'); };
    let verifications = 0;
    const session = createSession(nativeOptions(target, {verify: () => { verifications++; return true; },
      client: chooseFirstAction, shareWithPlanner: true, plannerGoal: 'Review fixture'}));
    const result = mode === 'runPlan' ? await session.runPlan([{kind: 'click', label: 'Settings'}]) : await session.runAdaptive();
    assert.equal(result.status, 'needs_inspection');
    assert.equal(result.mutations, 0);
    assert.equal(verifications, 0);
  }
});

test('a failed refresh after successful input records execution and never retries in either runner', async () => {
  for (const mode of ['runPlan', 'runAdaptive']) {
    const initial = app('  1 AXButton Settings');
    const target = mockApp(initial);
    let acted = false;
    target.click = async index => { target.calls.push(['click', index]); acted = true; };
    target.getAXState = async () => { target.calls.push(['observe']); if (acted) throw new Error('SKY_WINDOW_CLOSED'); return initial; };
    const session = createSession(nativeOptions(target, {clickLabels: ['Settings'], client: chooseFirstAction,
      shareWithPlanner: true, plannerGoal: 'Review fixture'}));
    const result = mode === 'runPlan' ? await session.runPlan([{kind: 'click', label: 'Settings'}, {kind: 'click', label: 'Settings'}]) : await session.runAdaptive();
    assert.equal(result.status, 'needs_inspection');
    assert.equal(result.mutations, 1);
    assert.equal(result.trace.at(-1).executed, true);
    assert.equal(result.trace.at(-1).reason, 'observation_error');
    assert.deepEqual(target.calls.filter(call => call[0] === 'click'), [['click', 1]]);
  }
});

test('Windows scrolling preserves explicit coordinate spaces and legacy arrays', async () => {
  for (const point of [[20, 30], {x: 20, y: 30, space: 'window'}, {x: 20, y: 30, space: 'screen'},
    {x: 20, y: 30, space: 'screenshot', screenshotId: 'shot-1'},
    {x: 20, y: 30, space: 'image', screenshotId: 'shot-1', imageWidth: 800, imageHeight: 600}]) {
    const target = mockApp(app('  1 AXList Results'));
    target.scroll = async (...args) => { target.calls.push(['scroll', ...args]); target.setState(app('  2 AXHeading Done')); };
    const result = await createSession(nativeOptions(target, {scrollRegions: [{name: 'results', point, directions: ['down'], pixels: 200}],
      verify: raw => raw.includes('AXHeading Done')})).runPlan([{kind: 'scroll', region: 'results', direction: 'down'}]);
    assert.equal(result.status, 'done');
    assert.deepEqual(target.calls.filter(call => call[0] === 'scroll'), [['scroll', point, 'down', {pixels: 200}]]);
    assert.equal(target.calls.filter(call => call[0] === 'screenshot').length, 1);
  }
  for (const point of [{x: 1, y: 2}, {x: NaN, y: 2, space: 'window'}, {x: 1, y: 2, space: 'screenshot'},
    {x: 1, y: 2, space: 'image', screenshotId: 'shot-1', imageWidth: 0, imageHeight: 600}]) {
    assert.throws(() => createSession(nativeOptions(mockApp(''), {scrollRegions: [{name: 'results', point}]})), /INVALID_SCROLL_POINT/);
  }
});

test('runtime refresh safely rejects an observation-bound screenshot scroll without remapping it', async () => {
  const window = {id: 42, app: 'fixture.exe', title: 'Test window'};
  const calls = [];
  const sky = {async get_window_state(args) {
    calls.push(['get_window_state', args]);
    return {window: {...window},
      accessibility: args.include_text ? {tree: '0 窗口 Test window\n1 列表 Results'} : null,
      screenshots: args.include_screenshot ? [{id: 'reused-id', width: 100, height: 100, zIndex: 0, url: 'data:image/png;base64,AA=='}] : []};
  }};
  for (const method of ['click', 'press_key', 'type_text', 'set_value', 'scroll']) {
    sky[method] = async args => { calls.push([method, args]); };
  }
  const target = createSkyTarget({sky, window});
  await target.getScreenshot();
  const point = {x: 20, y: 30, space: 'screenshot', screenshotId: 'reused-id', observationId: target.observationId()};
  const result = await createSession(nativeOptions(target, {
    scrollRegions: [{name: 'results', point, directions: ['down']}],
  })).runPlan([{kind: 'scroll', region: 'results', direction: 'down'}]);
  assert.equal(result.status, 'needs_inspection');
  assert.equal(result.mutations, 0);
  assert.equal(result.trace.at(-1).executed, false);
  assert.equal(calls.filter(([method]) => method === 'scroll').length, 0);
  assert.equal(calls.filter(([method]) => method === 'get_window_state').length, 3);
  assert.equal(point.observationId, 1);
  assert.equal(target.observationId(), 3);
});
