import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {startDemoServer} from '../scripts/demo-site.mjs';

test('demo serves a local-only key-free navigation and twelve unique checkpoints', async t => {
  const demo = await startDemoServer();
  t.after(() => demo.close());
  assert.equal(demo.server.address().address, '127.0.0.1');
  assert.equal(demo.server.address().family, 'IPv4');
  const home = await fetch(demo.url);
  assert.equal(home.status, 200);
  const homeHtml = await home.text();
  assert.match(homeHtml, /<title>Reinforced Computer Use demo<\/title>/);
  assert.match(homeHtml, /href="\/long">Long page<\/a>/);
  assert.doesNotMatch(homeHtml, /<(?:script|form|iframe)\b|\b(?:src|href)="https?:/i);

  const long = await fetch(`${demo.url}/long`);
  assert.equal(long.status, 200);
  assert.match(long.headers.get('content-security-policy'), /default-src 'none'/);
  const longHtml = await long.text();
  const markers = Array.from({length:12}, (_, index) => `LONG_${String(index + 1).padStart(2, '0')}`);
  markers.push('END_OF_LONG_PAGE');
  let previous = -1;
  for (const marker of markers) {
    assert.equal(longHtml.split(marker).length - 1, 1, `${marker} occurs once`);
    const position = longHtml.indexOf(marker);
    assert.ok(position > previous, `${marker} appears in document order`);
    previous = position;
  }
  assert.doesNotMatch(longHtml, /<(?:script|form|iframe)\b|\b(?:src|href)="https?:/i);
  const missing = await fetch(`${demo.url}/unknown`);
  assert.equal(missing.status, 404);
  await missing.text();
  const head = await fetch(`${demo.url}/long`, {method:'HEAD'});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const post = await fetch(demo.url, {method:'POST'});
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
  await post.text();
});

test('demo rejects invalid ports before binding', async () => {
  for (const port of [-1, 65536, 2.5, NaN, Infinity, '4318', null]) {
    await assert.rejects(startDemoServer({port}), /integer from 0 to 65535/);
  }
});

test('demo closure releases its port and accepts repeated cleanup', async () => {
  const demo = await startDemoServer({port:0});
  const port = demo.server.address().port;
  await demo.close();
  await demo.close();
  assert.equal(demo.server.listening, false);
  await assert.rejects(new Promise((resolve, reject) => {
    const socket = net.createConnection({port, host:'127.0.0.1'});
    socket.once('connect', () => { socket.destroy(); resolve(); });
    socket.once('error', reject);
  }), {code:'ECONNREFUSED'});
  const next = await startDemoServer({port});
  await next.close();
});
