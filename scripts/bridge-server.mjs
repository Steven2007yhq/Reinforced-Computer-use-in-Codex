import {createServer} from 'node:http';
import {randomBytes, timingSafeEqual} from 'node:crypto';
import {chmod, mkdir, readFile, unlink, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {bridgeDescriptorPath, createProviderClient, loadConfig} from './provider.mjs';

const headers = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'};

function sameSecret(actual, expected) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function send(response, status, payload = {error: 'BRIDGE_REQUEST_REJECTED'}) {
  if (response.headersSent || response.destroyed) return;
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}

async function readBody(request, maxBytes, timeoutMs) {
  const declared = Number(request.headers['content-length']);
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('BODY_TOO_LARGE');
  const timer = setTimeout(() => request.destroy(new Error('BODY_TIMEOUT')), timeoutMs);
  timer.unref?.();
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > maxBytes) throw new Error('BODY_TOO_LARGE');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { clearTimeout(timer); }
}

export async function startBridge({config, client, descriptorPath = bridgeDescriptorPath(), idleMs = 300000,
  maxLifetimeMs = 3600000, maxBodyBytes = 262144, bodyTimeoutMs = 5000} = {}) {
  if (!config || typeof client !== 'function' || !Number.isInteger(idleMs) || idleMs < 10000
      || !Number.isInteger(maxLifetimeMs) || maxLifetimeMs < idleMs || maxLifetimeMs > 86400000) {
    throw new Error('BRIDGE_INVALID_OPTIONS');
  }
  const token = randomBytes(32).toString('base64url');
  const sockets = new Set();
  let idleTimer;
  let lifetimeTimer;
  let closePromise;
  const server = createServer(async (request, response) => {
    const port = server.address()?.port;
    if (request.headers.host !== `127.0.0.1:${port}` || Object.hasOwn(request.headers, 'origin')) {
      send(response, 403); return;
    }
    if (request.method === 'GET' && request.url === '/health') { send(response, 200, {ready: true}); return; }
    if (request.method !== 'POST' || request.url !== '/decide') { send(response, 404); return; }
    const auth = request.headers.authorization ?? '';
    if (!auth.startsWith('Bridge ') || !sameSecret(auth.slice(7), token)) { send(response, 401); return; }
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')) { send(response, 415); return; }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => void close(), idleMs);
    idleTimer.unref?.();
    try {
      const input = JSON.parse(await readBody(request, maxBodyBytes, bodyTimeoutMs));
      if (!input || typeof input !== 'object' || Array.isArray(input) || !input.state
          || !input.questions || typeof input.questions !== 'object') throw new Error('INVALID_INPUT');
      const controller = new AbortController();
      response.once('close', () => { if (!response.writableEnded) controller.abort(); });
      const data = await client(input.state, input.questions, {signal: controller.signal});
      send(response, 200, data);
    } catch (error) {
      const message = String(error?.message ?? '');
      if (message === 'BODY_TOO_LARGE') send(response, 413);
      else if (error instanceof SyntaxError || message === 'INVALID_INPUT') send(response, 400);
      else if (/HTTP_401|HTTP_403/.test(message)) send(response, 401, {error: 'PROVIDER_AUTH'});
      else if (/HTTP_429/.test(message)) send(response, 429, {error: 'PROVIDER_RATE_LIMIT'});
      else send(response, 502, {error: 'PROVIDER_FAILURE'});
    }
  });
  server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  server.on('clientError', (_error, socket) => socket.destroy());
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/decide`;
  try {
    await mkdir(dirname(descriptorPath), {recursive: true, mode: 0o700});
    await writeFile(descriptorPath, `${JSON.stringify({version: 1, url, token, expiresAt: Date.now() + maxLifetimeMs})}\n`, {mode: 0o600});
    if (process.platform !== 'win32') { await chmod(dirname(descriptorPath), 0o700); await chmod(descriptorPath, 0o600); }
  } catch (error) {
    await new Promise(resolve => server.close(resolve));
    throw error;
  }
  idleTimer = setTimeout(() => void close(), idleMs); idleTimer.unref?.();
  lifetimeTimer = setTimeout(() => void close(), maxLifetimeMs); lifetimeTimer.unref?.();
  function close() {
    if (closePromise) return closePromise;
    closePromise = (async () => {
      clearTimeout(idleTimer); clearTimeout(lifetimeTimer);
      const closed = new Promise(resolve => server.close(resolve));
      for (const socket of sockets) socket.destroy();
      await closed;
      try {
        const current = JSON.parse(await readFile(descriptorPath, 'utf8'));
        if (current.token === token) await unlink(descriptorPath);
      } catch {}
    })();
    return closePromise;
  }
  return {url, port, close};
}

function readIdleMs(argv) {
  const option = argv.find(value => value.startsWith('--idle-ms='));
  const value = option ? Number(option.slice(10)) : 300000;
  if (!Number.isInteger(value) || value < 10000 || value > 3600000) throw new Error('BRIDGE_INVALID_IDLE');
  return value;
}

export async function main(argv = process.argv.slice(2)) {
  const config = await loadConfig();
  const client = createProviderClient(config);
  const idleMs = readIdleMs(argv);
  const bridge = await startBridge({config, client, idleMs});
  console.log(JSON.stringify({ready: true, host: '127.0.0.1', port: bridge.port, provider: config.provider, idleMs}));
  const stop = async () => { await bridge.close(); process.exit(0); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return bridge;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) {
    const safe = /^(CONFIG_|TYPESAFE_API_KEY_MISSING|OPENROUTER_API_KEY_MISSING|BRIDGE_INVALID_IDLE)/.test(error.message)
      ? error.message : 'BRIDGE_START_FAILED';
    console.error(JSON.stringify({ready: false, error: safe}));
    process.exitCode = 1;
  }
}
