import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPublicationFile} from '../scripts/check-release.mjs';

test('release check rejects a tracked runtime descriptor and private profile path', () => {
  assert.equal(inspectPublicationFile('nested/bridge.json', '{}')[0].category, 'excluded-artifact');
  const path = ['C:', 'Users', 'example-person', 'config'].join('\\');
  assert.equal(inspectPublicationFile('README.md', path)[0].category, 'private-profile-path');
});

test('release check reports a credential location without revealing its value', () => {
  const secret = ['ghp_', 'a'.repeat(36)].join('');
  const findings = inspectPublicationFile('example.mjs', `first line\nconst key = '${secret}';`);
  assert.deepEqual(findings, [{path: 'example.mjs', line: 2, category: 'github-token'}]);
  assert.equal(JSON.stringify(findings).includes(secret), false);
});

test('release check accepts documented variables and loopback endpoints', () => {
  assert.deepEqual(inspectPublicationFile('docs/PRIVACY.md',
    'TYPESAFE_API_KEY OPENROUTER_API_KEY http://127.0.0.1:5000/decide'), []);
});

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6KsAAAAASUVORK5CYII=', 'base64');
const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

test('release check accepts only explicitly reviewed public demo media paths', () => {
  for (const name of ['demo-top.png', 'demo-bottom.png', 'demo-full.png', 'social-preview.png']) {
    assert.deepEqual(inspectPublicationFile(`docs/assets/${name}`, png), []);
  }
  assert.deepEqual(inspectPublicationFile('docs\\assets\\demo-top.png', png), []);
  assert.deepEqual(inspectPublicationFile('docs/assets/demo-preview.gif', gif), []);
  for (const path of ['outputs/private.png', 'docs/assets/other.png', 'docs/assets/private.gif',
    'work/docs/assets/demo-top.png', 'docs/assets/demo-top.jpg', 'docs/assets/demo-video.webm',
    'docs/assets/other.mp4']) {
    assert.deepEqual(inspectPublicationFile(path, png), [{path, category: 'excluded-artifact'}]);
  }
});

test('release check rejects text and mismatched formats disguised as approved media', () => {
  const path = 'docs/assets/demo-top.png';
  assert.deepEqual(inspectPublicationFile(path, 'pretend screenshot'), [{path, category: 'invalid-public-media'}]);
  assert.deepEqual(inspectPublicationFile(path, gif), [{path, category: 'invalid-public-media'}]);
  assert.deepEqual(inspectPublicationFile('docs/assets/demo-preview.gif', png), [
    {path: 'docs/assets/demo-preview.gif', category: 'invalid-public-media'},
  ]);
  assert.deepEqual(inspectPublicationFile(path, png.subarray(0, 33)), [{path, category: 'invalid-public-media'}]);
});

test('release check validates optional MP4 and reports oversized media without dumping bytes', () => {
  const mp4 = Buffer.alloc(24);
  mp4.writeUInt32BE(24, 0);
  mp4.write('ftypisom', 4, 'ascii');
  mp4.write('isommp42', 16, 'ascii');
  assert.deepEqual(inspectPublicationFile('docs/assets/demo-video.mp4', mp4), []);
  const path = 'docs/assets/demo-top.png';
  const oversized = Buffer.concat([png.subarray(0, -12), Buffer.alloc(20 * 1024 * 1024), png.subarray(-12)]);
  assert.deepEqual(inspectPublicationFile(path, oversized), [{path, category: 'oversized-public-media'}]);
});

test('media exception does not relax private runtime or credential exclusions', () => {
  for (const path of ['docs/assets/.env', 'docs/assets/config.json', 'docs/assets/bridge.json',
    'docs/assets/credentials.json', 'docs/assets/private.key']) {
    assert.deepEqual(inspectPublicationFile(path, Buffer.from('{}')), [{path, category: 'excluded-artifact'}]);
  }
  assert.deepEqual(inspectPublicationFile('README.md', Buffer.from('http://127.0.0.1:5000/decide')), []);
});
