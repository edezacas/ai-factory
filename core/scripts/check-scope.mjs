#!/usr/bin/env node
// Fails if a file outside the task file's "## Files" section changed since the base.
// Usage: node check-scope.mjs <task file> [--base <ref>]   (from the project root)
import { execFileSync } from 'node:child_process';
import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';

const LOG = 'docs/harness/log.jsonl';
const start = Date.now();
const [task, flag, base = 'HEAD'] = process.argv.slice(2);

function finish(result, outOfScope, code) {
  mkdirSync('docs/harness', { recursive: true });
  appendFileSync(LOG, JSON.stringify({
    ts: new Date().toISOString(), script: 'check-scope', result, task, base, outOfScope,
    durationMs: Date.now() - start,
  }) + '\n');
  process.exit(code);
}

if (!task || (flag && flag !== '--base')) {
  console.error('usage: node check-scope.mjs <task file> [--base <ref>]');
  process.exit(2);
}

let text;
try {
  text = readFileSync(task, 'utf8');
} catch (e) {
  console.error(`check-scope: cannot read task file ${task}: ${e.message}`);
  finish('fail', [], 2);
}

// Everything in backticks counts as allowed; tokens that are not paths simply never match.
const section = text.split(/^## /m).find(s => s.startsWith('Files')) ?? '';
const allowed = new Set([...section.matchAll(/`([^`]+)`/g)].map(m => m[1].trim()));
allowed.add(task);
allowed.add(LOG);

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).split('\n').filter(Boolean);
const changed = new Set([
  ...git('diff', '--name-only', base),
  ...git('ls-files', '--others', '--exclude-standard'),
]);
const outOfScope = [...changed].filter(f => !allowed.has(f));

if (outOfScope.length) {
  console.log(`check-scope: FAIL, outside ${task}:\n${outOfScope.map(f => `  ${f}`).join('\n')}`);
  finish('fail', outOfScope, 1);
}
console.log(`check-scope: pass (${changed.size} files changed since ${base})`);
finish('pass', [], 0);
