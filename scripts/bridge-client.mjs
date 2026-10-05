import {readFile, stat} from 'node:fs/promises';
import {homedir, platform as osPlatform} from 'node:os';
import {join} from 'node:path';

const localEnvironment = typeof process === 'undefined' ? {} : process.env;
export const defaultBridgeDescriptorPath = osPlatform() === 'win32' && localEnvironment.APPDATA
  ? join(localEnvironment.APPDATA, 'ReinforcedComputerUse', 'bridge.json')
  : join(homedir(), '.config', 'reinforced-computer-use', 'bridge.json');

export async function loadBridgeDescriptor(path = defaultBridgeDescriptorPath) {
  let info;
  let value;
  try { info = await stat(path); value = JSON.parse(await readFile(path, 'utf8')); }
  catch { throw new Error('BRIDGE_NOT_RUNNING'); }
  if (osPlatform() !== 'win32' && (info.mode & 0o077) !== 0) throw new Error('BRIDGE_DESCRIPTOR_PERMISSIONS');
  let url;
  try { url = new URL(value.url); }
  catch { throw new Error('BRIDGE_DESCRIPTOR_INVALID'); }
  const validUrl = url.protocol === 'http:' && url.hostname === '127.0.0.1' && /^\d+$/.test(url.port)
    && url.pathname === '/decide' && !url.username && !url.password && !url.search && !url.hash;
  const validToken = typeof value.token === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value.token);
  if (value.version !== 1 || !validUrl || !validToken || !Number.isFinite(value.expiresAt)
      || value.expiresAt <= Date.now()) throw new Error('BRIDGE_DESCRIPTOR_INVALID');
  return {url: url.href, token: value.token, expiresAt: value.expiresAt};
}

export async function createLocalBridgeClient({descriptorPath = defaultBridgeDescriptorPath,
  fetchImpl = globalThis.fetch} = {}) {
  const descriptor = await loadBridgeDescriptor(descriptorPath);
  if (typeof fetchImpl !== 'function') throw new Error('BRIDGE_FETCH_UNAVAILABLE');
  return async (state, questions, {signal, timeoutMs = 9000} = {}) => {
    const startedAt = performance.now();
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), Math.max(1, Math.round(timeoutMs)));
    const requestSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;
    try {
      let response;
      try {
        response = await fetchImpl(descriptor.url, {
          method: 'POST', redirect: 'error', signal: requestSignal,
          headers: {Authorization: `Bridge ${descriptor.token}`, 'Content-Type': 'application/json'},
          body: JSON.stringify({state, questions}),
        });
      } catch { throw new Error(signal?.aborted ? 'CANCELLED' : 'BRIDGE_NETWORK_OR_TIMEOUT'); }
      if (!response.ok) {
        const retry = Number(response.headers?.get?.('retry-after'));
        throw new Error(`BRIDGE_HTTP_${response.status}${retry > 0 ? `: retry after ${retry}s` : ''}`);
      }
      let data;
      try { data = await response.json(); requestSignal.throwIfAborted(); }
      catch { throw new Error(requestSignal.aborted ? 'BRIDGE_NETWORK_OR_TIMEOUT' : 'INVALID_BRIDGE_JSON'); }
      if (!data?.answers) throw new Error('INVALID_BRIDGE_RESPONSE');
      return {...data, latencyMs: data.latencyMs ?? Math.round(performance.now() - startedAt)};
    } finally { clearTimeout(timer); }
  };
}
