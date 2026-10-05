import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {saveConfig, loadConfig, validateChoice} from '../scripts/provider.mjs';

test('configuration stores provider metadata but no credential', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reinforced-config-'));
  const path = join(directory, 'config.json');
  await saveConfig({provider: 'openrouter', model: '~typesafe/jev-latest'}, path);
  assert.deepEqual(await loadConfig(path), {provider: 'openrouter', model: '~typesafe/jev-latest'});
  const text = await readFile(path, 'utf8');
  assert.equal(/api.?key|credential/i.test(text), false);
});

test('choice validation rejects a non-maximal selected probability', () => {
  assert.throws(() => validateChoice({type: 'choice', choice: 'a0', confidence: 0.8,
    probabilities: {a0: 0.2, DONE: 0.8}}, {a0: '', DONE: ''}), /INVALID_MODEL_PROBABILITIES/);
});
