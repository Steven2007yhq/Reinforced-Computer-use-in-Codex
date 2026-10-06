const KEYS = new Set(['observe', 'scopeCheck', 'predicate', 'signal', 'maxMs', 'pollMs']);
const MAX_TIMER_MS = 2147483647;
// The Computer Use REPL exposes AbortSignal but not the EventTarget global.
// Its signal prototype inherits these methods; capture them for reliable cleanup.
const addListener = AbortSignal.prototype.addEventListener;
const removeListener = AbortSignal.prototype.removeEventListener;

function timing(value) {
  return Number.isFinite(value) && value >= 1 && value <= MAX_TIMER_MS;
}

/**
 * Wait for a locally observed result without input, replay, or provider calls.
 *
 * observe(context) must capture fresh actual state. scopeCheck(observation,
 * context) and predicate(observation, context) must return strict booleans.
 * Context contains phase, remainingMs, and an AbortSignal for cancellation or
 * the deadline. Callbacks must remain read-only and serialize their own target.
 *
 * Returns {status, verified, counts, elapsedMs, reason?}. Status is verified,
 * scope_changed, timeout, cancelled, or needs_inspection. Counts are invoked
 * attempts; raw observations, callback returns, and error text are never exposed.
 *
 * A true predicate is followed by a new observation and scope check. This
 * confirms context, not continued truth of that earlier business predicate;
 * a workflow's final verifier must check any required durable outcomes again.
 *
 * Deadlines are cooperative: an active callback is awaited until it settles,
 * even after its signal aborts. No read is abandoned via Promise.race.
 */
export async function waitForVerified(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)
      || Reflect.ownKeys(options).some(key => !KEYS.has(key))) {
    throw new Error('READ_ONLY_VERIFICATION_INVALID_OPTIONS');
  }
  const {observe, scopeCheck, predicate, signal, maxMs = 5000, pollMs = 250} = options;
  if ([observe, scopeCheck, predicate].some(callback => typeof callback !== 'function')) {
    throw new Error('READ_ONLY_VERIFICATION_CALLBACKS_REQUIRED');
  }
  if (!timing(maxMs) || !timing(pollMs)) throw new Error('READ_ONLY_VERIFICATION_INVALID_TIMING');
  if (signal !== undefined && !(signal instanceof AbortSignal)) {
    throw new Error('READ_ONLY_VERIFICATION_INVALID_SIGNAL');
  }
  const started = performance.now();
  const deadline = started + maxMs;
  const deadlineController = new AbortController();
  const callbackSignal = signal ? AbortSignal.any([signal, deadlineController.signal]) : deadlineController.signal;
  const deadlineTimer = setTimeout(() => deadlineController.abort(), Math.ceil(maxMs));
  const counts = {observations: 0, scopeChecks: 0, predicateChecks: 0, polls: 0};

  const result = (status, reason) => Object.freeze({
    status, verified: status === 'verified', counts: Object.freeze({...counts}),
    elapsedMs: Math.max(0, performance.now() - started), ...(reason ? {reason} : {}),
  });
  const interruption = () => {
    if (signal?.aborted) return 'cancelled';
    if (deadlineController.signal.aborted || performance.now() >= deadline) {
      // A synchronous read can keep timers from dispatching. Its settled
      // deadline still aborts the callback signal before reporting timeout.
      if (!deadlineController.signal.aborted) deadlineController.abort();
      return 'timeout';
    }
    return null;
  };
  const context = phase => Object.freeze({
    phase, signal: callbackSignal, remainingMs: Math.max(0, deadline - performance.now()),
  });

  async function invoke(callback, args, counter, errorReason) {
    const before = interruption();
    if (before) return {stop: result(before)};
    counts[counter]++;
    let value;
    try {
      value = await callback(...args);
    } catch {
      const stopped = interruption();
      return {stop: stopped ? result(stopped) : result('needs_inspection', errorReason)};
    }
    const after = interruption();
    return after ? {stop: result(after)} : {value};
  }

  async function inspectScope(phase) {
    const observed = await invoke(observe, [context(phase)], 'observations', 'observation_error');
    if (observed.stop) return observed;
    const scoped = await invoke(scopeCheck, [observed.value, context(phase)], 'scopeChecks', 'scope_error');
    if (scoped.stop) return scoped;
    if (scoped.value !== true) {
      return {stop: scoped.value === false ? result('scope_changed')
        : result('needs_inspection', 'scope_not_boolean')};
    }
    return {observation: observed.value};
  }

  async function poll() {
    const stopped = interruption();
    if (stopped) return result(stopped);
    const delayMs = Math.min(pollMs, Math.max(0, deadline - performance.now()));
    counts.polls++;
    let failed = false;
    await new Promise(resolve => {
      let timer;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          removeListener.call(callbackSignal, 'abort', finish);
        } catch {
          failed = true;
        } finally {
          resolve();
        }
      };
      try {
        addListener.call(callbackSignal, 'abort', finish, {once: true});
        if (callbackSignal.aborted) finish();
        else timer = setTimeout(finish, Math.ceil(delayMs));
      } catch {
        failed = true;
        finish();
      }
    });
    const after = interruption();
    return after ? result(after) : failed ? result('needs_inspection', 'poll_error') : null;
  }

  try {
    while (true) {
      const inspected = await inspectScope('observe_result');
      if (inspected.stop) return inspected.stop;
      const checked = await invoke(predicate, [inspected.observation, context('predicate')],
        'predicateChecks', 'predicate_error');
      if (checked.stop) return checked.stop;
      if (checked.value !== true && checked.value !== false) {
        return result('needs_inspection', 'predicate_not_boolean');
      }
      if (checked.value === true) {
        const final = await inspectScope('confirm_scope');
        if (final.stop) return final.stop;
        const stopped = interruption();
        return stopped ? result(stopped) : result('verified');
      }
      const waited = await poll();
      if (waited) return waited;
    }
  } finally {
    clearTimeout(deadlineTimer);
  }
}
