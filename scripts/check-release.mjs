import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Report only categories/locations. Never log matching values.
const forbiddenPath = /(?:^|\/)(?:node_modules|\.git|outputs?|work|traces|logs|coverage)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|config\.json|bridge\.json|credentials[^/]*\.json)$|\.(?:pem|key|pfx|p12|png|jpe?g|gif|webp|mp4|webm|mov|avi|mkv|m4v|zip|log)$/i;
const mediaExtension = /\.(?:png|jpe?g|gif|webp|mp4|webm|mov|avi|mkv|m4v)$/i;
// Reviewed media from the synthetic public demo is the only binary exception.
// Adding a filename here requires manual visual/privacy review before publication.
const publicMedia = new Map([
  ['docs/assets/demo-top.png', {type: 'png', maxBytes: 20 * 1024 * 1024}],
  ['docs/assets/demo-bottom.png', {type: 'png', maxBytes: 20 * 1024 * 1024}],
  ['docs/assets/demo-full.png', {type: 'png', maxBytes: 20 * 1024 * 1024}],
  ['docs/assets/social-preview.png', {type: 'png', maxBytes: 20 * 1024 * 1024}],
  ['docs/assets/demo-preview.gif', {type: 'gif', maxBytes: 25 * 1024 * 1024}],
  ['docs/assets/demo-video.mp4', {type: 'mp4', maxBytes: 90 * 1024 * 1024}],
]);

function hasMediaSignature(type, bytes) {
  if (type === 'png') {
    return bytes.length >= 45
      && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      && bytes.readUInt32BE(8) === 13
      && bytes.toString('ascii', 12, 16) === 'IHDR'
      && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0
      && bytes.readUInt32BE(bytes.length - 12) === 0
      && bytes.toString('ascii', bytes.length - 8, bytes.length - 4) === 'IEND';
  }
  if (type === 'gif') {
    return bytes.length >= 14
      && /^(?:GIF87a|GIF89a)$/.test(bytes.toString('ascii', 0, 6))
      && bytes.readUInt16LE(6) > 0 && bytes.readUInt16LE(8) > 0
      && bytes[bytes.length - 1] === 0x3b;
  }
  if (type === 'mp4') {
    return bytes.length >= 24
      && bytes.toString('ascii', 4, 8) === 'ftyp'
      && bytes.readUInt32BE(0) >= 16 && bytes.readUInt32BE(0) <= bytes.length;
  }
  return false;
}
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
  const allowedMedia = publicMedia.get(normalized);
  if (allowedMedia) {
    const bytes = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
    if (bytes.length > allowedMedia.maxBytes) {
      findings.push({path: normalized, category: 'oversized-public-media'});
    }
    if (!hasMediaSignature(allowedMedia.type, bytes)) {
      findings.push({path: normalized, category: 'invalid-public-media'});
    }
    // Binary decoding is not a secret scan. Visual/privacy review is still required.
    return findings;
  }
  if (forbiddenPath.test(normalized) && normalized !== '.env.example') {
    findings.push({path: normalized, category: 'excluded-artifact'});
  }
  if (mediaExtension.test(normalized)) return findings;
  const source = Buffer.isBuffer(contents) ? contents.toString('utf8') : contents;
  for (const [index, line] of source.split(/\r?\n/).entries()) {
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
  const findings = paths.flatMap(path => inspectPublicationFile(path, readFileSync(path)));
  if (findings.length) {
    console.error(JSON.stringify({ok: false, checkedFiles: paths.length, findings}, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ok: true, checkedFiles: paths.length, note: 'Heuristic check; manually review publication contents, including approved synthetic demo media.'}));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
