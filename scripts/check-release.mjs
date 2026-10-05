import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Report only categories/locations. Never log matching values.
const forbiddenPath = /(?:^|\/)(?:node_modules|\.git|outputs?|work|traces|logs|coverage)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|config\.json|bridge\.json|credentials[^/]*\.json)$|\.(?:pem|key|pfx|p12|png|jpe?g|webp|mp4|zip|log)$/i;
const detectors = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['provider-token', /\b(?:sk-(?:or-v1-)?[A-Za-z0-9_-]{20,}|tsp_[A-Za-z0-9_-]{20,}|ts_[A-Za-z0-9_-]{24,})\b/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['credential-url', /https?:\/\/[^\s/'"<>:@]+:[^\s/'"<>@]+@/i],
  ['literal-authorization', /(?:Bearer|Bridge)\s+[A-Za-z0-9_-]{24,}/i],
  ['private-profile-path', /(?:[A-Za-z]:[\\/]+Users[\\/]+(?!Public\b|Default\b)[A-Za-z0-9_.-]+|\/Users\/[A-Za-z0-9_.-]+|\/home\/[A-Za-z0-9_.-]+)/i],
];

export function inspectPublicationFile(path, contents = '') {
  const normalized = path.replaceAll('\\', '/');
  const findings = [];
  if (forbiddenPath.test(normalized) && normalized !== '.env.example') {
    findings.push({path: normalized, category: 'excluded-artifact'});
  }
  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    for (const [category, pattern] of detectors) {
      if (pattern.test(line)) findings.push({path: normalized, line: index + 1, category});
    }
  }
  return findings;
}

export function main() {
  let paths;
  try {
    paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {encoding: 'utf8'})
      .split('\0').filter(Boolean);
  } catch {
    console.error('Release check requires a Git checkout.');
    process.exitCode = 1;
    return;
  }
  const findings = paths.flatMap(path => inspectPublicationFile(path, readFileSync(path, 'utf8')));
  if (findings.length) {
    console.error(JSON.stringify({ok: false, checkedFiles: paths.length, findings}, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ok: true, checkedFiles: paths.length, note: 'Heuristic check; manually review publication contents.'}));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
