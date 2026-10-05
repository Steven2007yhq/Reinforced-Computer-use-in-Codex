import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('provider and bridge client load and read a fixture descriptor without global process', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reinforced-repl-compat-'));
  const descriptorPath = join(directory, 'bridge.json');
  const descriptor = {version: 1, url: 'http://127.0.0.1:43210/decide',
    token: 'fixture_only_not_a_secret_1234567890', expiresAt: Date.now() + 60000};
  await writeFile(descriptorPath, JSON.stringify(descriptor), {mode: 0o600});
  const providerUrl = new URL('../scripts/provider.mjs', import.meta.url).href;
  const bridgeUrl = new URL('../scripts/bridge-client.mjs', import.meta.url).href;
  for (const url of [providerUrl, bridgeUrl]) assert.equal((await readFile(new URL(url), 'utf8')).includes('node:process'), false);
  const script = `
    import assert from 'node:assert/strict';
    import {dirname, join} from 'node:path';
    const fixturePath = process.argv[1];
    const cliProvider = await import(${JSON.stringify(`${providerUrl}?cli-path-check`)});
    const cliBridge = await import(${JSON.stringify(`${bridgeUrl}?cli-path-check`)});
    assert.equal(cliBridge.defaultBridgeDescriptorPath, cliProvider.bridgeDescriptorPath());
    delete globalThis.process;
    assert.equal(globalThis.process, undefined);
    const provider = await import(${JSON.stringify(providerUrl)});
    const bridge = await import(${JSON.stringify(bridgeUrl)});
    assert.equal(provider.configDirectory({APPDATA: dirname(fixturePath)}, 'win32'), join(dirname(fixturePath), 'ReinforcedComputerUse'));
    assert.equal(bridge.defaultBridgeDescriptorPath, provider.bridgeDescriptorPath());
    assert.equal(provider.credentialStatus({provider: 'typesafe'}, {}).present, false);
    const loaded = await bridge.loadBridgeDescriptor(fixturePath);
    assert.equal(loaded.url, 'http://127.0.0.1:43210/decide');
    assert.equal(loaded.token, 'fixture_only_not_a_secret_1234567890');
    let calls = 0;
    const client = await bridge.createLocalBridgeClient({descriptorPath: fixturePath, fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, loaded.url);
      assert.equal(options.headers.Authorization, 'Bridge ' + loaded.token);
      assert.deepEqual(JSON.parse(options.body), {state: {goal: 'Fixture'}, questions: {next: {type: 'choice', criteria: {DONE: 'Complete'}}}});
      return {ok: true, json: async () => ({model: 'jev-1.13.0', answers: {next: {type: 'choice', choice: 'DONE', confidence: 1, probabilities: {DONE: 1}}}})};
    }});
    const response = await client({goal: 'Fixture'}, {next: {type: 'choice', criteria: {DONE: 'Complete'}}});
    assert.equal(response.model, 'jev-1.13.0');
    assert.equal(response.answers.next.choice, 'DONE');
    assert.equal(calls, 1);
    assert.equal(globalThis.process, undefined);
    console.log('NODE_REPL_COMPAT_OK');
  `;
  try {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script, descriptorPath], {encoding: 'utf8', timeout: 15000});
    assert.equal(output.trim(), 'NODE_REPL_COMPAT_OK');
  } finally { await rm(directory, {recursive: true, force: true}); }
});
