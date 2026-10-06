// Local orchestration only. No provider, UI client, persistence, or trace transport.
const DEFAULT_CHUNK_MS = 5000;
const DEFAULT_TOTAL_MS = 60000;

class WorkflowStop extends Error {
  constructor(status, reason) {
    super(reason);
    this.status = status;
    this.reason = reason;
  }
}

function positive(value, name, {integer = false, zero = false} = {}) {
  if (!Number.isFinite(value) || (zero ? value < 0 : value <= 0)
      || (integer && !Number.isSafeInteger(value))) throw new Error('INVALID_WORKFLOW_' + name);
  return value;
}

/**
 * Each stage has one action attempt and repeatable, fresh local verification.
 * observe(session, context) must capture the actual current target, never a cache.
 * verify/session scope predicates receive that observation and must return booleans.
 */
export function createWorkflow(input) {
  if (!input || !Array.isArray(input.stages) || !input.stages.length
      || typeof input.observe !== 'function' || typeof input.scopeCheck !== 'function'
      || typeof input.verify !== 'function') throw new Error('INVALID_WORKFLOW');
  const ids = new Set();
  const definitions = input.stages.map(stage => {
    if (!stage || typeof stage.id !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(stage.id)
        || ids.has(stage.id) || typeof stage.run !== 'function' || typeof stage.verify !== 'function'
        || (stage.skipIfVerified !== undefined && typeof stage.skipIfVerified !== 'boolean')
        || (stage.needsReview !== undefined && typeof stage.needsReview !== 'boolean'
          && typeof stage.needsReview !== 'function')) throw new Error('INVALID_WORKFLOW_STAGE');
    ids.add(stage.id);
    return Object.freeze({id: stage.id, run: stage.run, verify: stage.verify,
      needsReview: stage.needsReview ?? false, skipIfVerified: stage.skipIfVerified ?? false});
  });
  const session = input.session;
  const observe = input.observe;
  const scopeCheck = input.scopeCheck;
  const finalVerify = input.verify;
  const maxRunCalls = positive(input.maxRunCalls ?? definitions.length, 'MAX_RUN_CALLS', {integer: true, zero: true});
  const maxTotalMs = positive(input.maxTotalMs ?? DEFAULT_TOTAL_MS, 'MAX_TOTAL_MS');
  const defaultMaxStages = positive(input.maxStages ?? 1, 'MAX_STAGES', {integer: true});
  const defaultMaxMs = positive(input.maxMs ?? DEFAULT_CHUNK_MS, 'MAX_MS');
  const stages = definitions.map(stage => ({id: stage.id, status: 'pending', runCalls: 0, verificationCalls: 0}));
  const reviewHandled = definitions.map(() => false);
  const controller = new AbortController();
  const counts = {runCalls: 0, verificationCalls: 0, finalVerificationCalls: 0,
    scopeChecks: 0, observations: 0, resumes: 0, chunks: 0, skippedStages: 0};
  let index = 0;
  let status = 'ready';
  let busy = false;
  let cancelled = false;
  let revision = 0;
  let pending = null;
  let spentMs = 0;
  let activeStartedAt = null;
  let chunk = null;

  function snapshot() {
    return {status, stageIndex: index, currentStage: stages[index]?.id ?? null,
      counts: {...counts, stages: stages.length, completedStages: index},
      stages: stages.map(stage => ({...stage}))};
  }

  function result(reason) {
    const value = {...snapshot(), handoff: null};
    if (reason) value.reason = reason;
    if (pending) {
      value.handoff = {stageId: stages[index]?.id ?? null, revision: pending.revision, reason: pending.reason};
      // Opaque identity capability: it works only in this process and does not
      // appear in JSON, object spreads, snapshots, or ordinary enumerable logs.
      Object.defineProperty(value.handoff, 'ticket', {value: pending.ticket, enumerable: false});
      Object.freeze(value.handoff);
    }
    return value;
  }

  function checkCancelled() {
    if (cancelled) throw new WorkflowStop('cancelled', 'cancelled');
  }

  function activeMs() {
    return spentMs + (activeStartedAt === null ? 0 : performance.now() - activeStartedAt);
  }

  function context(phase, observation) {
    const value = {stageId: stages[index]?.id ?? null, stageIndex: index, phase,
      signal: controller.signal,
      budget: Object.freeze({maxMs: Math.max(0, Math.min(chunk.deadline - performance.now(),
        maxTotalMs - activeMs())), remainingRunCalls: Math.max(0, maxRunCalls - counts.runCalls)}),
      completedStageIds: Object.freeze(stages.slice(0, index).map(stage => stage.id))};
    if (observation !== undefined) value.observation = observation;
    return Object.freeze(value);
  }

  function handoff(nextStatus, reason) {
    status = nextStatus;
    if (stages[index]) stages[index].status = nextStatus === 'needs_codex_review' ? 'needs_review' : 'handoff';
    revision++;
    pending = {ticket: Object.freeze(Object.create(null)), revision, index, reason,
      reviewRequested: nextStatus === 'needs_codex_review'};
    return result(reason);
  }

  async function invoke(callback, args, reason, nextStatus = 'needs_inspection') {
    checkCancelled();
    try {
      const value = await callback(...args);
      checkCancelled();
      return value;
    } catch (error) {
      if (error instanceof WorkflowStop) throw error;
      checkCancelled();
      throw new WorkflowStop(nextStatus, reason);
    }
  }

  async function freshScope(phase) {
    counts.observations++;
    const observation = await invoke(observe, [session, context(phase)], 'observation_error');
    counts.scopeChecks++;
    const valid = await invoke(scopeCheck, [session, observation, context(phase)], 'scope_error');
    if (valid !== true) {
      throw new WorkflowStop(valid === false ? 'scope_changed' : 'needs_inspection',
        valid === false ? 'scope_changed' : 'scope_not_boolean');
    }
    return observation;
  }

  async function reviewGate(observation) {
    if (reviewHandled[index]) return {observation};
    const definition = definitions[index];
    const review = typeof definition.needsReview === 'function'
      ? await invoke(definition.needsReview, [session, observation, context('review_gate')], 'review_error')
      : definition.needsReview;
    if (review === true) return {stop: handoff('needs_codex_review', 'review_required')};
    if (review !== false) return {stop: handoff('needs_inspection', 'review_not_boolean')};
    if (typeof definition.needsReview === 'function') observation = await freshScope('after_review_gate');
    return {observation};
  }

  async function verifyStage(observation, phase) {
    const stage = stages[index];
    stage.verificationCalls++;
    counts.verificationCalls++;
    const valid = await invoke(definitions[index].verify,
      [session, observation, context(phase)], 'verification_error');
    await freshScope('after_verification');
    if (valid !== true) return handoff('needs_inspection',
      valid === false ? 'verification_failed' : 'verification_not_boolean');
    stage.status = 'completed';
    index++;
    revision++;
    pending = null;
    return null;
  }

  async function verifyFinal() {
    const observation = await freshScope('before_final_verification');
    counts.finalVerificationCalls++;
    const valid = await invoke(finalVerify, [session, observation, context('final_verification')],
      'final_verification_error');
    await freshScope('after_final_verification');
    if (valid !== true) return handoff('needs_inspection',
      valid === false ? 'final_verification_failed' : 'final_verification_not_boolean');
    pending = null;
    revision++;
    status = 'done';
    return result();
  }

  function yieldChunk() {
    checkCancelled();
    status = 'yielded';
    return result();
  }

  async function continueChunk(visited = 0) {
    while (true) {
      checkCancelled();
      if (performance.now() >= chunk.deadline) return yieldChunk();
      if (index === stages.length) return await verifyFinal();
      if (visited >= chunk.maxStages) return yieldChunk();
      const definition = definitions[index];
      const stage = stages[index];
      let observation = await freshScope('before_stage');
      visited++;
      const reviewed = await reviewGate(observation);
      if (reviewed.stop) return reviewed.stop;
      observation = reviewed.observation;
      if (stage.runCalls) {
        // A prior yielded attempt may be inspected in a later chunk, never replayed.
        const verified = await verifyStage(observation, 'verify_yielded_stage');
        if (verified) return verified;
        continue;
      }
      if (definition.skipIfVerified) {
        stage.verificationCalls++;
        counts.verificationCalls++;
        const alreadyComplete = await invoke(definition.verify,
          [session, observation, context('preverification')], 'verification_error');
        observation = await freshScope('after_preverification');
        if (alreadyComplete !== true && alreadyComplete !== false) {
          return handoff('needs_inspection', 'verification_not_boolean');
        }
        if (alreadyComplete === true) {
          stage.status = 'completed';
          counts.skippedStages++;
          index++;
          revision++;
          continue;
        }
      }
      if (counts.runCalls >= maxRunCalls || activeMs() >= maxTotalMs) {
        return handoff('budget_exceeded', 'run_budget_exceeded');
      }
      if (performance.now() >= chunk.deadline) return yieldChunk();
      stage.runCalls++;
      counts.runCalls++;
      stage.status = 'attempted';
      let runResult;
      let runFailed = false;
      try {
        runResult = await invoke(definition.run, [session, context('run', observation)], 'run_error');
      } catch (error) {
        if (error instanceof WorkflowStop && error.reason === 'run_error') runFailed = true;
        else throw error;
      }
      const after = await freshScope('after_stage_run');
      if (runFailed) return handoff('needs_inspection', 'run_error');
      let runStatus;
      try {
        runStatus = typeof runResult === 'string' ? runResult : runResult?.status;
      } catch {
        checkCancelled();
        return handoff('needs_inspection', 'run_result_error');
      }
      checkCancelled();
      if (runStatus === 'needs_codex_review') return handoff('needs_codex_review', 'run_requires_review');
      if (runStatus === 'yielded') {
        stage.status = 'yielded';
        return yieldChunk();
      }
      if (runStatus !== 'done') return handoff('needs_inspection', 'run_incomplete');
      const verified = await verifyStage(after, 'verify_stage');
      if (verified) return verified;
    }
  }

  function options(value = {}) {
    if (!value || typeof value !== 'object') throw new Error('INVALID_WORKFLOW_CHUNK');
    const maxStages = positive(value.maxStages ?? defaultMaxStages, 'MAX_STAGES', {integer: true});
    const maxMs = positive(value.maxMs ?? defaultMaxMs, 'MAX_MS');
    const signal = value.signal;
    if (signal !== undefined && (!signal || typeof signal.addEventListener !== 'function'
        || typeof signal.removeEventListener !== 'function' || typeof signal.aborted !== 'boolean')) {
      throw new Error('INVALID_WORKFLOW_SIGNAL');
    }
    return {maxStages, maxMs, signal};
  }

  function cancel() {
    cancelled = true;
    status = 'cancelled';
    pending = null;
    revision++;
    if (stages[index]) stages[index].status = 'cancelled';
    controller.abort();
    return snapshot();
  }

  async function execute(mode, inputOptions = {}) {
    if (busy) throw new Error('WORKFLOW_BUSY');
    const settings = options(inputOptions);
    if (mode === 'resume' && !cancelled) {
      if (!pending || inputOptions.ticket !== pending.ticket || inputOptions.revision !== pending.revision
          || pending.index !== index) throw new Error('INVALID_WORKFLOW_TICKET');
    }
    if (cancelled) {
      status = 'cancelled';
      return result('cancelled');
    }
    busy = true;
    activeStartedAt = performance.now();
    chunk = {maxStages: settings.maxStages, deadline: activeStartedAt + settings.maxMs};
    const abort = () => cancel();
    try {
      if (settings.signal) {
        settings.signal.addEventListener('abort', abort, {once: true});
        if (settings.signal.aborted) cancel();
      }
      checkCancelled();
      if (mode === 'run' && pending) return result(pending.reason);
      status = 'running';
      counts.chunks++;
      if (mode === 'resume') {
        const requestedReview = pending.reviewRequested;
        pending = null;
        revision++;
        counts.resumes++;
        if (index === stages.length) return await verifyFinal();
        let observation = await freshScope('before_resume');
        if (requestedReview) reviewHandled[index] = true;
        const reviewed = await reviewGate(observation);
        if (reviewed.stop) return reviewed.stop;
        observation = reviewed.observation;
        const verified = await verifyStage(observation, 'resume_verification');
        if (verified) return verified;
        return await continueChunk(1);
      }
      return await continueChunk();
    } catch (error) {
      if (cancelled) {
        status = 'cancelled';
        return result('cancelled');
      }
      if (error instanceof WorkflowStop) return handoff(error.status, error.reason);
      return handoff('needs_inspection', 'workflow_error');
    } finally {
      let cleanupFailed = false;
      try {
        if (settings.signal) settings.signal.removeEventListener('abort', abort);
      } catch {
        cleanupFailed = true;
      } finally {
        spentMs += performance.now() - activeStartedAt;
        activeStartedAt = null;
        chunk = null;
        busy = false;
      }
      if (cleanupFailed && !cancelled) return handoff('needs_inspection', 'signal_cleanup_error');
    }
  }

  return Object.freeze({run: value => execute('run', value),
    resume: value => execute('resume', value), cancel, snapshot});
}
