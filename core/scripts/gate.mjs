#!/usr/bin/env node
// Runs the steps in harness.json in order and stops at the first that fails.
// Usage: node gate.mjs   (from the project root)
import { spawnSync } from 'node:child_process';
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';

const LOG = 'docs/harness/log.jsonl';
const TAIL = 40;
const start = Date.now();

function finish(result, step, code) {
  mkdirSync('docs/harness', { recursive: true });
  appendFileSync(LOG, JSON.stringify({
    ts: new Date().toISOString(), script: 'gate', result, step, durationMs: Date.now() - start,
  }) + '\n');
  process.exit(code);
}

let steps;
try {
  steps = JSON.parse(readFileSync('harness.json', 'utf8')).gate;
  if (!Array.isArray(steps)) throw new Error('"gate" must be a list of {name, run}');
} catch (e) {
  console.error(`gate: cannot read harness.json in ${process.cwd()}: ${e.message}`);
  finish('fail', null, 2);
}

for (const { name, run } of steps) {
  console.log(`gate: ${name}: ${run}`);
  const r = spawnSync(run, { shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) {
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? r.error.message : ''}`;
    console.log(out.trimEnd().split('\n').slice(-TAIL).join('\n'));
    console.log(`gate: FAIL at ${name}`);
    finish('fail', name, 1);
  }
}
console.log(`gate: pass (${steps.length} steps)`);
finish('pass', null, 0);
