import {pathToFileURL} from 'node:url';
import {providers, saveConfig} from './provider.mjs';

function parse(argv) {
  const values = Object.fromEntries(argv.filter(value => value.startsWith('--') && value.includes('='))
    .map(value => value.slice(2).split(/=(.*)/s, 2)));
  const provider = values.provider ?? 'typesafe';
  if (!Object.hasOwn(providers, provider)) throw new Error('provider must be typesafe or openrouter');
  return {provider, model: values.model ?? providers[provider].defaultModel};
}

export async function main(argv = process.argv.slice(2)) {
  const saved = await saveConfig(parse(argv));
  return {
    configured: true,
    provider: saved.provider,
    model: saved.model,
    configPath: saved.path,
    credentialVariable: providers[saved.provider].keyName,
    note: 'No credential was written. Set the Windows user environment variable through Windows settings, then open a new terminal.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await main(), null, 2)); }
  catch (error) { console.error(JSON.stringify({configured: false, error: error.message})); process.exitCode = 1; }
}
