import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startBridge} from '../scripts/bridge-server.mjs';
import {createLocalBridgeClient} from '../scripts/bridge-client.mjs';

test('authenticated loopback bridge forwards only structured decisions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reinforced-cu-'));
  const descriptorPath = join(directory, 'bridge.json');
  let received;
  const provider = async (state, questions) => {
    received = {state, questions};
    return {answers: {next: {type: 'choice', choice: 'DONE', confidence: 1,
      probabilities: {DONE: 1}}}, model: 'jev-latest'};
  };
  const bridge = await startBridge({config: {provider: 'typesafe', model: 'jev-latest'}, client: provider,
    descriptorPath, idleMs: 10000, maxLifetimeMs: 20000});
  try {
    const descriptorText = await readFile(descriptorPath, 'utf8');
    assert.equal(descriptorText.includes('TYPESAFE_API_KEY'), false);
    const client = await createLocalBridgeClient({descriptorPath});
    const result = await client({goal: 'test'}, {next: {type: 'choice', criteria: {DONE: 'done'}}});
    assert.equal(result.answers.next.choice, 'DONE');
    assert.deepEqual(received.state, {goal: 'test'});
  } finally { await bridge.close(); }
});
