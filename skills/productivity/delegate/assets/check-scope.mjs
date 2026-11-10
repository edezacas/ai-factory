#!/usr/bin/env node
// Fails if a file outside the task file's "## Files" section changed since the base.
// Usage: node check-scope.mjs <task file> [--base <ref>]   (from the project root; the script itself lives in the delegate skill's assets/)
import { execFileSync } from 'node:child_process';
import { posix } from 'node:path';
import { readFileSync, appendFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';

// The log is evidence for this machine, not part of the project: .harness/ ignores itself,
// so it never shows up in git status or in a stage's commit.
const LOG = '.harness/log.jsonl';
const start = Date.now();
// The skill version goes on every log line: the scripts are shared by every project that
// uses the installed skill, so the log must say which version ran.
const VERSION = (() => {
  try {
    return readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8').match(/^\s*version:\s*"?([^"\n]+)"?/m)?.[1] ?? null;
  } catch {
    return null;
  }
})();
const [task, flag, base = 'HEAD'] = process.argv.slice(2);

function finish(result, outOfScope, code) {
  mkdirSync('.harness', { recursive: true });
  if (!existsSync('.harness/.gitignore')) writeFileSync('.harness/.gitignore', '*\n');
  appendFileSync(LOG, JSON.stringify({
    ts: new Date().toISOString(), script: 'check-scope', version: VERSION, result, task, base, outOfScope,
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
// The main session updates the work's PROGRESS.md before it commits the stage.
allowed.add(posix.join(posix.dirname(task), 'PROGRESS.md'));

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
