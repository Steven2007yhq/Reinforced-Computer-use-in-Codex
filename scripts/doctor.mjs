import {pathToFileURL} from 'node:url';
import {inspectConfig} from './provider.mjs';

export async function doctor() {
  const major = Number(process.versions.node.split('.')[0]);
  const result = {node: process.versions.node, nodeSupported: major >= 22, platform: process.platform};
  try {
    const config = await inspectConfig();
    return {...result, configured: true, provider: config.provider, model: config.model,
      credential: config.credential.present ? 'present, not displayed' : `missing: ${config.credential.keyName}`,
      configPermissions: config.permissions,
      localPlanMode: 'ready', adaptiveMode: major >= 22 && config.credential.present ? 'ready' : 'not_ready'};
  } catch (error) {
    return {...result, configured: false, configurationError: error.message,
      localPlanMode: major >= 22 ? 'ready' : 'requires Node 22+', adaptiveMode: 'not_ready'};
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await doctor();
  console.log(JSON.stringify(result, null, 2));
  if (!result.nodeSupported) process.exitCode = 1;
}
