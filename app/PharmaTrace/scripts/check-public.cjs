// Public, offline checks. No credentials or database access.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const files = cp.execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
let links = 0;
const findings = [];
for (const name of files) {
  if (!fs.existsSync(path.join(root, name))) continue;
  if (!/\.(md|tsx?|c?js|json|ya?ml|html|sql|example)$/.test(name)) continue;
  const text = fs.readFileSync(path.join(root, name), 'utf8');
  for (const [kind, regex] of [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
    ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{15,}\b/],
    ['AWS access key', /\bAKIA[A-Z0-9]{16}\b/],
  ]) if (regex.test(text)) findings.push({ file: name, kind });
  for (const jwt of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try { if (JSON.parse(Buffer.from(jwt[1], 'base64url')).role === 'service_role') findings.push({ file: name, kind: 'service_role JWT' }); } catch {}
  }
  if (name.endsWith('.md')) for (const match of text.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(?:https?:|mailto:|codex:|\/)/.test(target)) continue;
    assert.ok(fs.existsSync(path.resolve(root, path.dirname(name), decodeURIComponent(target))), `Broken local link: ${name} -> ${target}`);
    links++;
  }
}
assert.deepEqual(findings, [], 'Credential pattern found (values intentionally not printed)');
const env = fs.readFileSync(path.join(root, 'app/PharmaTrace/.env.example'), 'utf8');
assert.match(env, /^EXPO_PUBLIC_SUPABASE_URL=https:\/\/example\.invalid$/m);
assert.ok(!files.some(f => /(?:^|\/)\.env$/.test(f)), 'Real .env tracked');
console.log(`Public checks passed: ${files.length} tracked paths, ${links} local links; offline, no DB.`);
