import test from 'node:test';
import assert from 'node:assert/strict';
import {createSkyTarget, normalizeSkyState, toSkyKey, toSkyPoint} from '../scripts/sky-adapter.mjs';
import {createSession, parseAX} from '../scripts/runtime.mjs';

const initialWindow = Object.freeze({app: 'C:\\Program Files\\7-Zip\\7zFM.exe', id: 4021, title: '7-Zip'});
const screenshots = [
  {id: 'main', originX: 100, originY: 200, width: 800, height: 600, zIndex: 0, url: 'data:image/png;base64,AA=='},
  {id: 'popup', originX: 950, originY: 250, width: 300, height: 200, zIndex: 1, url: 'data:image/png;base64,AA=='},
];
const tree = '0 窗口 7-Zip\n\t7 文本栏 地址 Value: D:\\工作 ID: 1001\n\t12 按钮 打开\n\t24 按钮 (disabled) 不可用';

function observation(overrides = {}) {
  return {
    window: {...initialWindow}, screenshots: structuredClone(screenshots),
    accessibility: {
      tree, focused_element: '7 文本栏 (focused) 地址', selected_text: '工作',
      selected_elements: ['12 按钮 打开'], document_text: '目录内容\n第二行',
    },
    ...overrides,
  };
}

function mockSky(state = observation()) {
  const calls = [];
  const sky = {calls, state, async get_window_state(args) {
    calls.push(['get_window_state', args]);
    return {...sky.state, screenshots: args.include_screenshot ? sky.state.screenshots : [],
      accessibility: args.include_text ? sky.state.accessibility : null};
  }};
  for (const method of ['click', 'press_key', 'type_text', 'set_value', 'scroll']) {
    sky[method] = async args => { calls.push([method, args]); };
  }
  return sky;
}

function targetFor(sky = mockSky()) { return createSkyTarget({sky, window: initialWindow}); }

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}

test('normalization preserves the native indexed tree, localized roles, and structured context', () => {
  const state = observation();
  const raw = normalizeSkyState(state);
  assert.ok(raw.includes(state.accessibility.tree));
  assert.ok(raw.includes('Window ID: 4021'));
  for (const key of ['focused_element', 'selected_text', 'selected_elements', 'document_text']) {
    assert.ok(raw.includes(`${key}: ${JSON.stringify(state.accessibility[key])}`));
  }
  assert.deepEqual(parseAX(raw).map(({id, role, label, value, identity, disabled}) =>
    ({id, role, label, value, identity, disabled})), [
    {id: 0, role: 'window', label: '7-Zip', value: '', identity: '', disabled: false},
    {id: 7, role: 'text field', label: '地址', value: 'D:\\工作', identity: '1001', disabled: false},
    {id: 12, role: 'button', label: '打开', value: '', identity: '', disabled: false},
    {id: 24, role: 'button', label: '不可用', value: '', identity: '', disabled: true},
  ]);
  assert.deepEqual(state, observation(), 'normalizing must not mutate the Sky response');
});

test('normalization distinguishes missing accessibility from an empty but valid tree', () => {
  assert.match(normalizeSkyState(observation({accessibility: null})), /Accessibility: unavailable/);
  assert.match(normalizeSkyState(observation({accessibility: undefined})), /Accessibility: unavailable/);
  assert.doesNotMatch(normalizeSkyState(observation({accessibility: {tree: ''}})), /Accessibility: unavailable/);
  assert.throws(() => normalizeSkyState(observation({accessibility: {tree: []}})), /SKY_INVALID_ACCESSIBILITY/);
  for (const window of [null, {app: '', id: 4}, {app: 'x', id: -1}, {app: 'x', id: 1.5}, {app: 'x', id: '4'}]) {
    assert.throws(() => normalizeSkyState(observation({window})), /SKY_INVALID_WINDOW_STATE/);
  }
});

test('keys normalize common Windows chords and retain explicit keysym distinctions', () => {
  for (const [input, expected] of [
    [' ctrl + shift + . ', 'Control_L+Shift_L+period'], ['Control_R+a', 'Control_R+a'],
    ['Alt+ArrowLeft', 'Alt_L+Left'], ['Enter', 'Return'], ['esc', 'Escape'],
    ['PageUp', 'Prior'], ['PageDown', 'Next'], ['Backspace', 'BackSpace'],
    ['Numpad0', 'KP_0'], ['Numpad_9', 'KP_9'], ['Numpad_Add', 'KP_Add'],
    ['Numpad_Enter', 'KP_Enter'], ['KP_1', 'KP_1'], ['F12', 'F12'], ['spacebar', 'space'],
  ]) assert.equal(toSkyKey(input), expected, input);
});

test('keys reject ambiguous empty tokens and forbidden Windows-key aliases', () => {
  for (const input of ['', ' ', null, ['Ctrl', 'a'], 'Ctrl++a', '+a', 'Ctrl+', 'Control L+a']) {
    assert.throws(() => toSkyKey(input), /SKY_INVALID_KEY/, String(input));
  }
  for (const input of ['Win+d', 'WINDOWS+x', 'Meta+a', 'Super_L+d', 'Super_R+d', 'Cmd+a', 'Command+a', 'OS+a']) {
    assert.throws(() => toSkyKey(input), /SKY_WINDOWS_KEY_FORBIDDEN/, input);
  }
});

test('window points use main-screenshot logical coordinates without mixing screen origins', () => {
  assert.deepEqual(toSkyPoint([40, 50], screenshots), {x: 40, y: 50, screenshotId: 'main'});
  assert.deepEqual(toSkyPoint({x: 40.2, y: 50.4, space: 'window'}, screenshots),
    {x: 40, y: 50, screenshotId: 'main'});
  // Auxiliary regions do not enlarge the coordinate bounds of the main image.
  assert.throws(() => toSkyPoint({x: 880, y: 90, space: 'window'}, screenshots), /SKY_POINT_OUT_OF_BOUNDS/);
});

test('screenshot and image points stay local to the selected region at arbitrary physical origins', () => {
  assert.deepEqual(toSkyPoint({x: 30, y: 40, space: 'screenshot', screenshotId: 'main'}, screenshots),
    {x: 30, y: 40, screenshotId: 'main'});
  assert.deepEqual(toSkyPoint({x: 30, y: 40, space: 'screenshot', screenshotId: 'popup'}, screenshots),
    {x: 30, y: 40, screenshotId: 'popup'});
  assert.deepEqual(toSkyPoint({x: 30, y: 40, space: 'image', screenshotId: 'main', imageWidth: 400, imageHeight: 300}, screenshots),
    {x: 60, y: 80, screenshotId: 'main'});
  assert.deepEqual(toSkyPoint({x: 60, y: 80, space: 'image', screenshotId: 'popup', imageWidth: 600, imageHeight: 400}, screenshots),
    {x: 30, y: 40, screenshotId: 'popup'});
  const leftPopup = [{...screenshots[0]}, {...screenshots[1], originX: -200, originY: 100}];
  assert.deepEqual(toSkyPoint({x: 30, y: 40, space: 'screenshot', screenshotId: 'popup'}, leftPopup),
    {x: 30, y: 40, screenshotId: 'popup'});
});

test('screen points use the selected physical origin and an explicit DPI scale', () => {
  assert.deepEqual(toSkyPoint({x: 140, y: 250, space: 'screen'}, screenshots, {screenScale: 1}),
    {x: 40, y: 50, screenshotId: 'main'});
  assert.deepEqual(toSkyPoint({x: 1090, y: 320, space: 'screen', screenshotId: 'popup'}, screenshots, {screenScale: 1.75}),
    {x: 80, y: 40, screenshotId: 'popup'});
  const liveGeometry = [
    {id: 'main', originX: 318, originY: 308, width: 1305, height: 762},
    {id: 'screenshot-2', originX: 708, originY: 393, width: 172, height: 52},
  ];
  assert.deepEqual(toSkyPoint({x: 848, y: 454.25, space: 'screen', screenshotId: 'screenshot-2'}, liveGeometry, {screenScale: 1.75}),
    {x: 80, y: 35, screenshotId: 'screenshot-2'});
  for (const screenScale of [undefined, 0, -1, NaN, Infinity, '1.75']) {
    assert.throws(() => toSkyPoint({x: 140, y: 250, space: 'screen'}, screenshots, {screenScale}), /SKY_SCREEN_SCALE_REQUIRED/);
  }
});

test('points reject stale observations, missing screenshots, malformed coordinates, and unknown spaces', () => {
  assert.throws(() => toSkyPoint([1, 2], []), /SKY_SCREENSHOT_REQUIRED/);
  for (const point of [null, [1], [1, 2, 3], [NaN, 2], {x: 2, y: Infinity}, {x: '2', y: 3}]) {
    assert.throws(() => toSkyPoint(point, screenshots), /SKY_INVALID_POINT/);
  }
  assert.throws(() => toSkyPoint({x: 2, y: 3, space: 'desktop'}, screenshots), /SKY_INVALID_COORDINATE_SPACE/);
  assert.throws(() => toSkyPoint({x: 2, y: 3, screenshotId: 'expired'}, screenshots), /SKY_UNKNOWN_SCREENSHOT/);
  assert.throws(() => toSkyPoint({x: 2, y: 3, observationId: 8}, screenshots, {observationId: 9}), /SKY_STALE_POINT/);
  assert.deepEqual(toSkyPoint({x: 2, y: 3, observationId: 9}, screenshots, {observationId: 9}),
    {x: 2, y: 3, screenshotId: 'main'});
});

test('coordinate conversion requires only the metadata needed for the chosen space', () => {
  const noOrigin = screenshots.map(({originX, originY, ...rest}) => rest);
  assert.deepEqual(toSkyPoint([20, 30], noOrigin), {x: 20, y: 30, screenshotId: 'main'});
  assert.deepEqual(toSkyPoint({x: 20, y: 30, space: 'screenshot', screenshotId: 'main'}, noOrigin),
    {x: 20, y: 30, screenshotId: 'main'});
  assert.throws(() => toSkyPoint({x: 120, y: 230, space: 'screen'}, noOrigin, {screenScale: 1}), /SKY_SCREENSHOT_ORIGIN_REQUIRED/);
  assert.deepEqual(toSkyPoint({x: 20, y: 30, space: 'screenshot', screenshotId: 'popup'}, noOrigin),
    {x: 20, y: 30, screenshotId: 'popup'});
  const noDimensions = [{id: 'main', originX: 100, originY: 200}];
  assert.throws(() => toSkyPoint({x: 20, y: 30, space: 'screenshot'}, noDimensions), /SKY_SCREENSHOT_DIMENSIONS_REQUIRED/);
  for (const dimensions of [{}, {imageWidth: 400}, {imageWidth: 0, imageHeight: 300}, {imageWidth: 400, imageHeight: NaN}]) {
    assert.throws(() => toSkyPoint({x: 20, y: 30, space: 'image', ...dimensions}, screenshots), /SKY_IMAGE_DIMENSIONS_REQUIRED/);
  }
});

test('coordinate bounds exclude outer edges and unrelated regions', () => {
  for (const point of [[-1, 0], [800, 0], [0, 600], [825, 100], [1150, 100]]) {
    assert.throws(() => toSkyPoint(point, screenshots), /SKY_POINT_OUT_OF_BOUNDS/, JSON.stringify(point));
  }
  for (const point of [
    {x: 300, y: 20, space: 'screenshot', screenshotId: 'popup'},
    {x: 20, y: 200, space: 'screenshot', screenshotId: 'popup'},
    {x: 400, y: 20, space: 'image', imageWidth: 400, imageHeight: 300},
    {x: 20, y: -1, space: 'image', imageWidth: 400, imageHeight: 300},
  ]) assert.throws(() => toSkyPoint(point, screenshots), /SKY_POINT_OUT_OF_BOUNDS/);
});

test('rounding a fractional edge must not dispatch an out-of-bounds integer coordinate', () => {
  const bounded = [{id: 'main', originX: 0, originY: 0, width: 100, height: 100}];
  for (const point of [[99.8, 50], [50, 99.8], {x: 49.9, y: 20, space: 'image', imageWidth: 50, imageHeight: 50}]) {
    try {
      const result = toSkyPoint(point, bounded);
      assert.ok(result.x >= 0 && result.x < 100 && result.y >= 0 && result.y < 100,
        `converted point escaped captured bounds: ${JSON.stringify(result)}`);
    } catch (error) {
      assert.match(error.message, /^SKY_POINT_OUT_OF_BOUNDS$/);
    }
  }
});

test('target captures select the requested state and use the returned Window identity for input', async () => {
  const sky = mockSky();
  const returnedWindow = {...initialWindow, title: '7-Zip — 当前目录'};
  sky.state.window = returnedWindow;
  const target = targetFor(sky);
  const raw = await target.getAXState();
  assert.ok(raw.includes(tree));
  assert.deepEqual(sky.calls[0], ['get_window_state', {window: initialWindow, include_screenshot: false, include_text: true}]);
  assert.deepEqual(target.window(), returnedWindow);
  assert.equal(target.observationId(), 1);
  const latest = target.latestState();
  latest.accessibility.tree = 'tampered';
  latest.window.id = 999;
  assert.ok(target.latestState().accessibility.tree.includes('7 文本栏'));
  await target.click(12);
  assert.deepEqual(sky.calls[1][1].window, returnedWindow);
  assert.equal(sky.calls[1][1].element_index, 12);
  assert.equal(target.latestState(), null);
  await target.getScreenshot();
  assert.deepEqual(sky.calls[2], ['get_window_state', {window: returnedWindow, include_screenshot: true, include_text: false}]);
  assert.equal(target.latestState().accessibility, null);
  assert.equal(target.observationId(), 2);
});

test('caller mutation cannot redirect the bound window or invent actionable accessibility indexes', async () => {
  const sky = mockSky();
  const target = targetFor(sky);
  const returned = await target.observe({includeScreenshot: true});
  returned.window.id = 999;
  returned.window.app = 'Other.exe';
  returned.accessibility.tree += '\n99 按钮 没有观察到的控件';
  const exposedWindow = target.window();
  exposedWindow.id = 888;
  exposedWindow.app = 'Another.exe';
  await assert.rejects(target.click(99), /SKY_ELEMENT_NOT_AVAILABLE/);
  assert.equal(sky.calls.some(([method]) => method === 'click'), false);
  assert.equal(target.latestState().window.id, initialWindow.id);
  assert.equal(target.window().app, initialWindow.app);
  await target.click(12);
  assert.deepEqual(sky.calls.at(-1), ['click', {window: sky.state.window, element_index: 12}]);
  await target.observe();
  assert.equal(sky.calls.at(-1)[1].window.id, initialWindow.id,
    'a later capture must remain bound after caller mutation');
});

test('target converts explicit physical scale and canonical key format without extra dispatches', async () => {
  const sky = mockSky();
  const target = createSkyTarget({sky, window: initialWindow, screenScale: 1.75});
  await target.getScreenshot();
  await target.click({x: 1090, y: 320, space: 'screen', screenshotId: 'popup'});
  assert.deepEqual(sky.calls.at(-1), ['click', {window: sky.state.window, x: 80, y: 40, screenshotId: 'popup'}]);
  await target.observe();
  await target.pressKey(' ctrl + shift + . ');
  assert.deepEqual(sky.calls.at(-1), ['press_key', {window: sky.state.window, key: 'Control_L+Shift_L+period'}]);
  assert.equal(sky.calls.length, 4);
});

test('target rejects points from earlier captures even when native screenshot identifiers repeat', async () => {
  const sky = mockSky();
  const target = targetFor(sky);
  await target.getScreenshot();
  const oldPoint = {x: 20, y: 30, space: 'screenshot', screenshotId: 'main', observationId: target.observationId()};
  await target.getScreenshot();
  await assert.rejects(target.click(oldPoint), /SKY_STALE_POINT/);
  assert.equal(sky.calls.some(([method]) => method === 'click'), false);
  await target.click({...oldPoint, observationId: target.observationId()});
  assert.equal(sky.calls.filter(([method]) => method === 'click').length, 1);
});

test('explicit screenshot and image input requires the current observation tag before dispatch', async () => {
  for (const point of [
    {x: 20, y: 30, space: 'screenshot', screenshotId: 'popup'},
    {x: 40, y: 60, space: 'image', screenshotId: 'popup', imageWidth: 600, imageHeight: 400},
  ]) {
    for (const method of ['click', 'scroll']) {
      const sky = mockSky();
      const target = targetFor(sky);
      await target.getScreenshot();
      const act = value => method === 'click' ? target.click(value) : target.scroll(value, 'down', {pixels: 120});
      await assert.rejects(act(point), /SKY_POINT_OBSERVATION_REQUIRED/);
      assert.deepEqual(sky.calls.map(([name]) => name), ['get_window_state']);
      await act({...point, observationId: target.observationId()});
      assert.equal(sky.calls.at(-1)[0], method);
      assert.equal(sky.calls.at(-1)[1].screenshotId, 'popup');
      assert.equal(sky.calls.at(-1)[1].x, 20);
      assert.equal(sky.calls.at(-1)[1].y, 30);
      assert.equal(sky.calls.filter(([name]) => name === method).length, 1);
    }
  }
});

test('target refuses incomplete clients and invalid window identifiers', () => {
  assert.throws(() => createSkyTarget(), /SKY_INVALID_TARGET/);
  for (const window of [{...initialWindow, id: -1}, {...initialWindow, app: ''}]) {
    assert.throws(() => createSkyTarget({sky: mockSky(), window}), /SKY_INVALID_TARGET/);
  }
  const sky = mockSky();
  delete sky.set_value;
  assert.throws(() => targetFor(sky), /SKY_INVALID_TARGET/);
});

test('capture errors and changed window identity invalidate the prior observation without retry', async () => {
  for (const [mutate, expected] of [
    [sky => { sky.state = observation({window: {...initialWindow, id: 999}}); }, /SKY_WINDOW_CHANGED/],
    [sky => { sky.state = observation({window: {...initialWindow, app: 'Other.exe'}}); }, /SKY_WINDOW_CHANGED/],
    [sky => { sky.state = observation({accessibility: {tree: null}}); }, /SKY_INVALID_ACCESSIBILITY/],
    [sky => { sky.get_window_state = async args => { sky.calls.push(['get_window_state', args]); throw new Error('capture failed'); }; }, /capture failed/],
  ]) {
    const sky = mockSky();
    const target = targetFor(sky);
    await target.observe();
    mutate(sky);
    await assert.rejects(target.observe(), expected);
    assert.equal(target.latestState(), null);
    assert.equal(target.observationId(), 1);
    await assert.rejects(target.click(12), /SKY_FRESH_STATE_REQUIRED/);
    assert.equal(sky.calls.filter(([method]) => method === 'get_window_state').length, 2);
    assert.equal(sky.calls.some(([method]) => method === 'click'), false);
  }
});

test('null accessibility is explicit and coordinates remain usable from a fresh screenshot', async () => {
  const sky = mockSky(observation({accessibility: null}));
  const target = targetFor(sky);
  await assert.rejects(target.getAXState(), /SKY_ACCESSIBILITY_UNAVAILABLE/);
  assert.equal(target.latestState(), null);
  await assert.rejects(target.pressKey('Tab'), /SKY_FRESH_STATE_REQUIRED/);
  await target.getScreenshot();
  await assert.rejects(target.click(12), /SKY_ACCESSIBILITY_UNAVAILABLE/);
  await assert.rejects(target.typeText('内容'), /SKY_FOCUS_NOT_OBSERVED/);
  await target.click({x: 40, y: 50, space: 'screenshot', screenshotId: 'main', observationId: target.observationId()});
  assert.deepEqual(sky.calls.at(-1), ['click', {window: sky.state.window, x: 40, y: 50, screenshotId: 'main'}]);
});

test('every dispatched input consumes the observation and never refreshes or retries internally', async () => {
  const operations = [
    ['click', target => target.click(12)], ['click', target => target.click([40, 50])],
    ['press_key', target => target.pressKey('Ctrl+a')], ['type_text', target => target.typeText('中文')],
    ['set_value', target => target.replaceText(7, 'D:\\验收')],
    ['scroll', target => target.scroll([40, 50], 'down')],
  ];
  for (const [method, act] of operations) {
    const sky = mockSky();
    const target = targetFor(sky);
    await target.observe({includeScreenshot: true});
    await act(target);
    assert.equal(target.latestState(), null, method);
    await assert.rejects(target.pressKey('Tab'), /SKY_FRESH_STATE_REQUIRED/);
    await assert.rejects(act(target), /SKY_FRESH_STATE_REQUIRED/);
    assert.deepEqual(sky.calls.map(([name]) => name), ['get_window_state', method]);
  }
});

test('a possibly completed input error consumes state and does not repeat the mutation', async () => {
  for (const [method, act] of [
    ['click', target => target.click(12)], ['press_key', target => target.pressKey('Tab')],
    ['type_text', target => target.typeText('内容')], ['set_value', target => target.replaceText(7, '新值')],
    ['scroll', target => target.scroll([30, 40], 'down')],
  ]) {
    const sky = mockSky();
    sky[method] = async args => { sky.calls.push([method, args]); throw new Error('input outcome unknown'); };
    const target = targetFor(sky);
    await target.observe({includeScreenshot: true});
    await assert.rejects(act(target), /input outcome unknown/);
    assert.equal(target.latestState(), null);
    await assert.rejects(act(target), /SKY_FRESH_STATE_REQUIRED/);
    assert.equal(sky.calls.filter(([name]) => name === method).length, 1);
  }
});

test('numeric controls must be observed, unique, enabled, and editable when replacing text', async () => {
  const sky = mockSky();
  const target = targetFor(sky);
  await target.observe({includeScreenshot: true});
  for (const index of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(target.click(index), /SKY_INVALID_ELEMENT_INDEX/);
  }
  await assert.rejects(target.click('12'), /SKY_INVALID_POINT/);
  await assert.rejects(target.replaceText('7', 'x'), /SKY_INVALID_ELEMENT_INDEX/);
  for (const index of [999, 24]) await assert.rejects(target.click(index), /SKY_ELEMENT_NOT_AVAILABLE/);
  await assert.rejects(target.replaceText(12, 'x'), /SKY_ELEMENT_NOT_EDITABLE/);
  await assert.rejects(target.replaceText(7, 42), /SKY_INVALID_TEXT/);
  await assert.rejects(target.typeText(42), /SKY_INVALID_TEXT/);
  sky.state.accessibility.tree += '\n12 按钮 同号';
  await target.observe();
  await assert.rejects(target.click(12), /SKY_ELEMENT_NOT_AVAILABLE/);
  assert.equal(sky.calls.some(([method]) => method !== 'get_window_state'), false);
});

test('typing requires observed focus and preserves literal characters in one call', async () => {
  const sky = mockSky();
  const target = targetFor(sky);
  sky.state.accessibility.focused_element = '';
  await target.observe();
  await assert.rejects(target.typeText('hello'), /SKY_FOCUS_NOT_OBSERVED/);
  assert.equal(sky.calls.some(([method]) => method === 'type_text'), false);
  sky.state.accessibility.focused_element = '7 文本栏 (focused) 地址';
  await target.observe();
  await target.typeText('中文 + "literal" & 路径');
  assert.deepEqual(sky.calls.at(-1), ['type_text', {window: sky.state.window, text: '中文 + "literal" & 路径'}]);
});

test('replaceText sends exactly one set_value and retains the prepared literal value', async () => {
  const sky = mockSky();
  const target = targetFor(sky);
  await target.observe();
  const value = 'D:\\验收\\中文 & + "原样"';
  await target.replaceText(7, value);
  assert.deepEqual(sky.calls.map(([method]) => method), ['get_window_state', 'set_value']);
  assert.deepEqual(sky.calls[1][1], {window: sky.state.window, element_index: 7, value});
});

test('scroll uses signed pixel deltas at a screenshot-derived point and never element_index', async () => {
  for (const [direction, scrollX, scrollY] of [['up', 0, -120], ['down', 0, 120], ['left', -120, 0], ['right', 120, 0]]) {
    const sky = mockSky();
    const target = targetFor(sky);
    await target.getScreenshot();
    await target.scroll({x: 30, y: 40, space: 'screenshot', screenshotId: 'popup', observationId: target.observationId()}, direction, {pixels: 120});
    assert.deepEqual(sky.calls.at(-1), ['scroll', {window: sky.state.window,
      x: 30, y: 40, screenshotId: 'popup', scrollX, scrollY}]);
    assert.equal('element_index' in sky.calls.at(-1)[1], false);
  }
  const sky = mockSky();
  const target = targetFor(sky);
  await target.getScreenshot();
  for (const [point, direction, options, error] of [
    [12, 'down', {}, /SKY_INVALID_POINT/], [[20, 30], 'diagonal', {}, /SKY_INVALID_SCROLL/],
    [[20, 30], 'up', {pixels: 0}, /SKY_INVALID_SCROLL/], [[20, 30], 'up', {pixels: Infinity}, /SKY_INVALID_SCROLL/],
  ]) await assert.rejects(target.scroll(point, direction, options), error);
  assert.equal(sky.calls.some(([method]) => method === 'scroll'), false);
});

test('busy capture rejects concurrent operations and resumes after it settles', async () => {
  const sky = mockSky();
  const pending = deferred();
  sky.get_window_state = async args => { sky.calls.push(['get_window_state', args]); return pending.promise; };
  const target = targetFor(sky);
  const capture = target.observe();
  await assert.rejects(target.observe(), /SKY_TARGET_BUSY/);
  await assert.rejects(target.click(12), /SKY_TARGET_BUSY/);
  assert.equal(sky.calls.length, 1);
  pending.resolve(observation());
  await capture;
  await target.click(12);
  assert.equal(sky.calls.at(-1)[0], 'click');
});

test('busy mutation rejects concurrent capture/input and releases its lock after failure', async () => {
  const sky = mockSky();
  const pending = deferred();
  sky.click = async args => { sky.calls.push(['click', args]); return pending.promise; };
  const target = targetFor(sky);
  await target.observe();
  const click = target.click(12);
  await assert.rejects(target.observe(), /SKY_TARGET_BUSY/);
  await assert.rejects(target.pressKey('Tab'), /SKY_TARGET_BUSY/);
  assert.equal(target.latestState(), null);
  pending.reject(new Error('dispatch failed'));
  await assert.rejects(click, /dispatch failed/);
  await target.observe();
  assert.ok(target.latestState());
  assert.equal(sky.calls.filter(([method]) => method === 'click').length, 1);
});

test('runtime plan independently refreshes indexed localized controls and fills via one set_value', async () => {
  const sky = mockSky();
  sky.set_value = async args => {
    sky.calls.push(['set_value', args]);
    sky.state = observation({accessibility: {...sky.state.accessibility,
      tree: `0 窗口 7-Zip\n\t7 文本栏 地址 Value: ${args.value} ID: 1001\n\t43 按钮 打开`}});
  };
  sky.click = async args => {
    sky.calls.push(['click', args]);
    sky.state = observation({accessibility: {...sky.state.accessibility, tree: '0 窗口 7-Zip\n\t88 文本 目录加载完成'}});
  };
  const session = createSession({
    target: targetFor(sky), kind: 'app', platform: 'windows', targetName: '7-Zip', goal: '打开准备的本地目录',
    textSlots: [{name: 'directory', fieldLabel: '地址', value: 'D:\\验收'}], clickLabels: ['打开'],
    verify: raw => raw.includes('目录加载完成'), scopeCheck: raw => raw.includes('7-Zip'),
  });
  const result = await session.runPlan([{kind: 'fill', slot: 'directory'}, {kind: 'click', label: '打开'}]);
  assert.equal(result.status, 'done');
  assert.equal(result.verified, true);
  assert.equal(result.mutations, 2);
  assert.deepEqual(sky.calls.map(([method]) => method),
    ['get_window_state', 'set_value', 'get_window_state', 'click', 'get_window_state']);
  assert.equal(sky.calls.find(([method]) => method === 'set_value')[1].element_index, 7);
  assert.equal(sky.calls.find(([method]) => method === 'click')[1].element_index, 43,
    'the second plan step must use the fresh index rather than the prior 12');
});

test('runtime hands an unknown Sky mutation result back for inspection without replay', async () => {
  const sky = mockSky();
  sky.set_value = async args => { sky.calls.push(['set_value', args]); throw new Error('possibly completed'); };
  const target = targetFor(sky);
  const session = createSession({target, kind: 'app', platform: 'windows', targetName: '7-Zip', goal: '填写地址',
    textSlots: [{name: 'directory', fieldLabel: '地址', value: 'D:\\验收'}], verify: () => false});
  const result = await session.runPlan([{kind: 'fill', slot: 'directory'}]);
  assert.equal(result.status, 'needs_inspection');
  assert.equal(target.latestState(), null);
  assert.deepEqual(sky.calls.map(([method]) => method), ['get_window_state', 'set_value']);
});

test('runtime scroll obtains a fresh screenshot before dispatch and verifies fresh accessibility after it', async () => {
  const sky = mockSky();
  sky.scroll = async args => {
    sky.calls.push(['scroll', args]);
    sky.state = observation({accessibility: {...sky.state.accessibility, tree: '0 窗口 7-Zip\n\t88 文本 页尾可见'}});
  };
  const session = createSession({target: targetFor(sky), kind: 'app', platform: 'windows', targetName: '7-Zip', goal: '滚动目录',
    scrollRegions: [{name: 'files', point: [60, 80], directions: ['down'], pixels: 240}],
    verify: raw => raw.includes('页尾可见')});
  const result = await session.runPlan([{kind: 'scroll', region: 'files', direction: 'down'}]);
  assert.equal(result.status, 'done');
  assert.equal(result.mutations, 1);
  assert.deepEqual(sky.calls.map(([method]) => method), ['get_window_state', 'get_window_state', 'scroll', 'get_window_state']);
  assert.deepEqual(sky.calls[1][1], {window: sky.state.window, include_screenshot: true, include_text: false});
  assert.deepEqual(sky.calls[2][1], {window: sky.state.window, x: 60, y: 80, screenshotId: 'main', scrollX: 0, scrollY: 240});
});
