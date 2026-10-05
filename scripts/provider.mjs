import {mkdir, readFile, stat, writeFile, chmod} from 'node:fs/promises';
import {homedir, platform as osPlatform} from 'node:os';
import {dirname, join} from 'node:path';

const defaultEnvironment = () => typeof process === 'undefined' ? {} : process.env;

export const providers = Object.freeze({
  typesafe: Object.freeze({
    endpoint: 'https://api.typesafe.ai/v1/systemone',
    keyName: 'TYPESAFE_API_KEY',
    defaultModel: 'jev-latest',
    modelPattern: /^jev-[a-z0-9.-]{1,80}$/,
  }),
  openrouter: Object.freeze({
    endpoint: 'https://openrouter.ai/api/alpha/decisions',
    keyName: 'OPENROUTER_API_KEY',
    defaultModel: '~typesafe/jev-latest',
    modelPattern: /^(?:~?typesafe\/)?jev-[a-z0-9.-]{1,80}$/,
  }),
});

export function configDirectory(env = defaultEnvironment(), platform = osPlatform()) {
  if (platform === 'win32' && env.APPDATA) return join(env.APPDATA, 'ReinforcedComputerUse');
  return join(homedir(), '.config', 'reinforced-computer-use');
}

export function configPath(env = defaultEnvironment(), platform = osPlatform()) {
  return join(configDirectory(env, platform), 'config.json');
}

export function bridgeDescriptorPath(env = defaultEnvironment(), platform = osPlatform()) {
  return join(configDirectory(env, platform), 'bridge.json');
}

export function validateConfig(value) {
  if (!value || typeof value !== 'object' || !Object.hasOwn(providers, value.provider)) {
    throw new Error('CONFIG_INVALID_PROVIDER');
  }
  const route = providers[value.provider];
  const model = value.model ?? route.defaultModel;
  if (typeof model !== 'string' || !route.modelPattern.test(model)) throw new Error('CONFIG_INVALID_MODEL');
  return Object.freeze({provider: value.provider, model});
}

export async function loadConfig(path = configPath()) {
  let raw;
  try { raw = await readFile(path, 'utf8'); }
  catch (error) {
    if (error?.code === 'ENOENT') throw new Error('CONFIG_MISSING');
    throw error;
  }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('CONFIG_INVALID_JSON'); }
  return validateConfig(parsed);
}

export async function saveConfig(value, path = configPath()) {
  const config = validateConfig(value);
  await mkdir(dirname(path), {recursive: true, mode: 0o700});
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, {mode: 0o600});
  if (osPlatform() !== 'win32') {
    await chmod(dirname(path), 0o700);
    await chmod(path, 0o600);
  }
  return {path, ...config};
}

export function credentialStatus(config, env = defaultEnvironment()) {
  const route = providers[config.provider];
  const key = env[route.keyName];
  return {keyName: route.keyName, present: typeof key === 'string' && key.length >= 12};
}

export function readCredential(config, env = defaultEnvironment()) {
  const route = providers[config.provider];
  const key = env[route.keyName];
  if (typeof key !== 'string' || key.length < 12) throw new Error(`${route.keyName}_MISSING`);
  return key;
}

export function validateChoice(answer, criteria) {
  const ids = Object.keys(criteria);
  const valid = value => Number.isFinite(value) && value >= 0 && value <= 1;
  const probabilities = answer?.probabilities;
  if (answer?.type !== 'choice' || !ids.includes(answer.choice) || !valid(answer.confidence)
      || !probabilities || typeof probabilities !== 'object') throw new Error('INVALID_MODEL_CHOICE');
  const keys = Object.keys(probabilities);
  const values = Object.values(probabilities);
  if (keys.length !== ids.length || !ids.every(id => Object.hasOwn(probabilities, id))
      || !values.every(valid) || Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 0.025
      || probabilities[answer.choice] + 1e-6 < Math.max(...values)) {
    throw new Error('INVALID_MODEL_PROBABILITIES');
  }
  return answer;
}

export function createProviderClient(config, {fetchImpl = globalThis.fetch, env = defaultEnvironment()} = {}) {
  const normalized = validateConfig(config);
  const route = providers[normalized.provider];
  const key = readCredential(normalized, env);
  if (typeof fetchImpl !== 'function') throw new Error('PROVIDER_FETCH_UNAVAILABLE');
  return async (state, questions, {signal, timeoutMs = 12000} = {}) => {
    const startedAt = performance.now();
    const timeout = AbortSignal.timeout(Math.max(1, Math.round(timeoutMs)));
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response;
    try {
      response = await fetchImpl(route.endpoint, {
        method: 'POST',
        redirect: 'error',
        headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({model: normalized.model, state, questions}),
        signal: requestSignal,
      });
    } catch {
      throw new Error(signal?.aborted ? 'CANCELLED' : 'PROVIDER_NETWORK_OR_TIMEOUT');
    }
    if (!response.ok) {
      const retry = Number(response.headers?.get?.('retry-after'));
      throw new Error(`${normalized.provider.toUpperCase()}_HTTP_${response.status}${retry > 0 ? `: retry after ${retry}s` : ''}`);
    }
    let data;
    try { data = await response.json(); requestSignal.throwIfAborted(); }
    catch { throw new Error(requestSignal.aborted ? 'PROVIDER_NETWORK_OR_TIMEOUT' : 'INVALID_PROVIDER_JSON'); }
    if (!data?.answers || typeof data.model !== 'string' || !route.modelPattern.test(data.model)) {
      throw new Error('INVALID_PROVIDER_RESPONSE');
    }
    return {
      answers: data.answers,
      model: data.model,
      usage: data.usage ?? {},
      latencyMs: Math.round(performance.now() - startedAt),
    };
  };
}

export async function inspectConfig(path = configPath(), env = defaultEnvironment()) {
  const config = await loadConfig(path);
  let permissions = 'not_enforced_on_windows';
  if (osPlatform() !== 'win32') {
    const info = await stat(path);
    permissions = (info.mode & 0o077) === 0 ? 'private' : 'too_open';
  }
  return {...config, credential: credentialStatus(config, env), permissions};
}
