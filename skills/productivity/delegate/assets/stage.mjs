#!/usr/bin/env node
// Closes a stage in one call: runs the gate and the scope check, and commits everything
// only if both pass. On a failure it commits nothing and the scripts' output says why.
// Usage: node stage.mjs <task file> "<commit message>" [<main|user> "<reason>"]   (from the project root)
// The last two say the stage went back to the implementer after review, who sent it back and why.
// The gate only sees the code once the implementer has made it green, so without them a stage
// reworked after review looks the same in the log as one that went through at once.
import { spawnSync, execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const [task, message, by, reason = ''] = process.argv.slice(2);
if (!task || !message || (by !== undefined && (!['main', 'user'].includes(by) || !reason.trim()))) {
  console.error('usage: node stage.mjs <task file> "<commit message>" [<main|user> "<reason>"]');
  process.exit(2);
}

const script = (name, ...args) =>
  spawnSync(process.execPath, [fileURLToPath(new URL(name, import.meta.url)), ...args], { stdio: 'inherit' }).status;

if (script('gate.mjs', task) !== 0) process.exit(1);
if (script('check-scope.mjs', task) !== 0) process.exit(1);

try {
  execFileSync('git', ['add', '-A'], { stdio: 'inherit' });
  execFileSync('git', ['commit', '-q', '-m', message], { stdio: 'inherit' });
} catch {
  console.log('stage: commit failed');
  process.exit(1);
}
if (by) {
  const version = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8').match(/^\s*version:\s*"?([^"\n]+)"?/m)?.[1] ?? null;
  // The gate has just written to this log, so .harness/ and its .gitignore exist.
  appendFileSync('.harness/log.jsonl', JSON.stringify({
    ts: new Date().toISOString(), script: 'review', version, task, by, reason: reason.trim(),
  }) + '\n');
}
console.log(`stage: committed ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}`);
