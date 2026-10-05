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
