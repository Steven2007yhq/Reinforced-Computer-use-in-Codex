import {parseAX} from './runtime.mjs';

const ALIASES = Object.freeze({
  ctrl: 'Control_L', control: 'Control_L', control_l: 'Control_L', control_r: 'Control_R',
  alt: 'Alt_L', alt_l: 'Alt_L', alt_r: 'Alt_R',
  shift: 'Shift_L', shift_l: 'Shift_L', shift_r: 'Shift_R',
  enter: 'Return', return: 'Return', esc: 'Escape', escape: 'Escape',
  backspace: 'BackSpace', delete: 'Delete', del: 'Delete', tab: 'Tab',
  space: 'space', spacebar: 'space', up: 'Up', down: 'Down', left: 'Left', right: 'Right',
  arrowup: 'Up', arrowdown: 'Down', arrowleft: 'Left', arrowright: 'Right',
  home: 'Home', end: 'End', pageup: 'Prior', pagedown: 'Next',
  '.': 'period', ',': 'comma', '/': 'slash', '-': 'minus', '=': 'equal',
  numpad_add: 'KP_Add', numpad_subtract: 'KP_Subtract', numpad_multiply: 'KP_Multiply',
  numpad_divide: 'KP_Divide', numpad_decimal: 'KP_Decimal', numpad_enter: 'KP_Enter',
});

export function toSkyKey(key) {
  if (typeof key !== 'string' || !key.trim()) throw new Error('SKY_INVALID_KEY');
  const tokens = key.split('+').map(token => token.trim());
  if (tokens.some(token => !token || /\s/.test(token))) throw new Error('SKY_INVALID_KEY');
  return tokens.map(token => {
    const lower = token.toLowerCase();
    if (/^(?:win|windows|meta|super|cmd|command|os)(?:_[lr])?$/.test(lower)) {
      throw new Error('SKY_WINDOWS_KEY_FORBIDDEN');
    }
    if (/^numpad_?[0-9]$/.test(lower)) return `KP_${lower.at(-1)}`;
    return ALIASES[lower] ?? token;
  }).join('+');
}

function validWindow(window) {
  return window && Number.isSafeInteger(window.id) && window.id >= 0
    && typeof window.app === 'string' && window.app.length > 0;
}

export function normalizeSkyState(state) {
  if (!validWindow(state?.window)) throw new Error('SKY_INVALID_WINDOW_STATE');
  const accessibility = state.accessibility;
  if (accessibility !== null && accessibility !== undefined && typeof accessibility.tree !== 'string') {
    throw new Error('SKY_INVALID_ACCESSIBILITY');
  }
  const lines = [
    `Native app: ${JSON.stringify(state.window.title ?? '')}`,
    `Window ID: ${state.window.id}`,
    `App: ${JSON.stringify(state.window.app)}`,
  ];
  if (accessibility) {
    lines.push(accessibility.tree);
    for (const name of ['focused_element', 'selected_text', 'selected_elements', 'document_text']) {
      if (accessibility[name] !== undefined) lines.push(`${name}: ${JSON.stringify(accessibility[name])}`);
    }
  } else lines.push('Accessibility: unavailable');
  return lines.join('\n');
}

// With a screenshotId, Sky interprets logical coordinates within that captured
// region (verified on a real 7-Zip popup at high DPI). Keep the region's ID;
// mixing screen origins with logical pixels produces incorrect popup clicks.
export function toSkyPoint(point, screenshots, {observationId, screenScale} = {}) {
  if (!Array.isArray(screenshots) || !screenshots.length) throw new Error('SKY_SCREENSHOT_REQUIRED');
  const input = Array.isArray(point) ? {x: point[0], y: point[1], space: 'window'} : point;
  if (!input || !Number.isFinite(input.x) || !Number.isFinite(input.y)
      || (Array.isArray(point) && point.length !== 2)) throw new Error('SKY_INVALID_POINT');
  if (input.observationId !== undefined && input.observationId !== observationId) {
    throw new Error('SKY_STALE_POINT');
  }
  const main = screenshots[0];
  const region = input.screenshotId === undefined ? main : screenshots.find(s => s.id === input.screenshotId);
  if (!region || typeof region.id !== 'string' || typeof main.id !== 'string') throw new Error('SKY_UNKNOWN_SCREENSHOT');
  const space = input.space ?? 'window';
  let x = input.x;
  let y = input.y;
  let selected = region;
  if (space === 'screen') {
    if (!Number.isFinite(region.originX) || !Number.isFinite(region.originY)) throw new Error('SKY_SCREENSHOT_ORIGIN_REQUIRED');
    const scale = input.screenScale ?? screenScale;
    if (!Number.isFinite(scale) || scale <= 0) throw new Error('SKY_SCREEN_SCALE_REQUIRED');
    x = (x - region.originX) / scale;
    y = (y - region.originY) / scale;
  } else if (space === 'image' || space === 'screenshot') {
    if (space === 'image') {
      if (![input.imageWidth, input.imageHeight, region.width, region.height].every(n => Number.isFinite(n) && n > 0)) {
        throw new Error('SKY_IMAGE_DIMENSIONS_REQUIRED');
      }
      if (x < 0 || y < 0 || x >= input.imageWidth || y >= input.imageHeight) throw new Error('SKY_POINT_OUT_OF_BOUNDS');
      x *= region.width / input.imageWidth;
      y *= region.height / input.imageHeight;
    }
    if (!(region.width > 0 && region.height > 0)) throw new Error('SKY_SCREENSHOT_DIMENSIONS_REQUIRED');
    if (x < 0 || y < 0 || x >= region.width || y >= region.height) throw new Error('SKY_POINT_OUT_OF_BOUNDS');
  } else if (space === 'window') selected = main;
  else throw new Error('SKY_INVALID_COORDINATE_SPACE');
  if (!(selected.width > 0 && selected.height > 0)) throw new Error('SKY_SCREENSHOT_DIMENSIONS_REQUIRED');
  if (x < 0 || y < 0 || x >= selected.width || y >= selected.height) throw new Error('SKY_POINT_OUT_OF_BOUNDS');
  // Select the containing logical pixel so a valid point next to the right or
  // bottom edge cannot round into the first pixel outside the captured region.
  return {x: Math.floor(x), y: Math.floor(y), screenshotId: selected.id};
}

export function createSkyTarget({sky, window, screenScale} = {}) {
  const methods = ['get_window_state', 'click', 'press_key', 'type_text', 'scroll', 'set_value'];
  if (!validWindow(window) || methods.some(name => typeof sky?.[name] !== 'function')) throw new Error('SKY_INVALID_TARGET');
  if (screenScale !== undefined && (!Number.isFinite(screenScale) || screenScale <= 0)) throw new Error('SKY_INVALID_SCREEN_SCALE');
  const boundId = window.id;
  const boundApp = window.app;
  let currentWindow = structuredClone(window);
  let state = null;
  let observationId = 0;
  let busy = false;
  const sameWindow = value => value?.id === boundId && value?.app === boundApp;
  const invalidate = () => { state = null; };
  async function exclusive(operation) {
    if (busy) throw new Error('SKY_TARGET_BUSY');
    busy = true;
    try { return await operation(); } finally { busy = false; }
  }
  async function capture(include_screenshot, include_text) {
    invalidate();
    const next = await sky.get_window_state({window: currentWindow, include_screenshot, include_text});
    if (!sameWindow(next?.window)) throw new Error('SKY_WINDOW_CHANGED');
    normalizeSkyState(next); // Validate before making an observation actionable.
    // Caller-owned observations must not be able to change our exact binding
    // or turn an observed control into a different actionable element.
    state = structuredClone(next);
    currentWindow = state.window;
    observationId++;
    return structuredClone(state);
  }
  function requireObservation() {
    if (!state) throw new Error('SKY_FRESH_STATE_REQUIRED');
    return state;
  }
  function requireElement(index, editable = false) {
    const observation = requireObservation();
    if (!observation.accessibility) throw new Error('SKY_ACCESSIBILITY_UNAVAILABLE');
    if (!Number.isSafeInteger(index) || index < 0) throw new Error('SKY_INVALID_ELEMENT_INDEX');
    const node = parseAX(observation.accessibility.tree).find(node => node.id === index);
    if (!node || node.duplicate || node.disabled) throw new Error('SKY_ELEMENT_NOT_AVAILABLE');
    if (editable && !/^(?:text field|text area|search field|textbox|combo box)$/.test(node.role)) {
      throw new Error('SKY_ELEMENT_NOT_EDITABLE');
    }
    return observation;
  }
  function pointArgs(point, observation) {
    if (['screenshot', 'image'].includes(point?.space) && point.observationId === undefined) {
      throw new Error('SKY_POINT_OBSERVATION_REQUIRED');
    }
    return toSkyPoint(point, observation.screenshots, {observationId, screenScale});
  }
  async function input(operation) {
    // Invalidate before dispatch, including unknown/partially completed errors.
    invalidate();
    return operation();
  }
  return Object.freeze({
    backend: 'sky', platform: 'windows',
    async getAXState() {
      return exclusive(async () => {
        const next = await capture(false, true);
        if (!next.accessibility) { invalidate(); throw new Error('SKY_ACCESSIBILITY_UNAVAILABLE'); }
        return normalizeSkyState(next);
      });
    },
    async getScreenshot() { return exclusive(() => capture(true, false)); },
    async observe({includeScreenshot = false, includeText = true} = {}) {
      return exclusive(() => capture(includeScreenshot, includeText));
    },
    async click(target) {
      return exclusive(async () => {
        const observation = typeof target === 'number' ? requireElement(target) : requireObservation();
        const args = typeof target === 'number' ? {element_index: target}
          : pointArgs(target, observation);
        return input(() => sky.click({window: observation.window, ...args}));
      });
    },
    async pressKey(key) {
      return exclusive(async () => {
        const converted = toSkyKey(key);
        const observation = requireObservation();
        return input(() => sky.press_key({window: observation.window, key: converted}));
      });
    },
    async typeText(text) {
      return exclusive(async () => {
        if (typeof text !== 'string') throw new Error('SKY_INVALID_TEXT');
        const observation = requireObservation();
        if (!observation.accessibility?.focused_element) throw new Error('SKY_FOCUS_NOT_OBSERVED');
        return input(() => sky.type_text({window: observation.window, text}));
      });
    },
    async replaceText(index, value) {
      return exclusive(async () => {
        if (typeof value !== 'string') throw new Error('SKY_INVALID_TEXT');
        const observation = requireElement(index, true);
        return input(() => sky.set_value({window: observation.window, element_index: index, value}));
      });
    },
    async scroll(point, direction, {pixels = 500} = {}) {
      return exclusive(async () => {
        if (!['up', 'down', 'left', 'right'].includes(direction) || !Number.isFinite(pixels) || pixels <= 0) {
          throw new Error('SKY_INVALID_SCROLL');
        }
        const observation = requireObservation();
        const coords = pointArgs(point, observation);
        const horizontal = direction === 'left' || direction === 'right';
        const delta = (direction === 'up' || direction === 'left' ? -1 : 1) * pixels;
        return input(() => sky.scroll({window: observation.window, ...coords,
          scrollX: horizontal ? delta : 0, scrollY: horizontal ? 0 : delta}));
      });
    },
    window: () => structuredClone(currentWindow),
    latestState: () => state ? structuredClone(state) : null,
    observationId: () => observationId,
  });
}
