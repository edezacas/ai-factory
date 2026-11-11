#!/usr/bin/env node
// Closes a stage in one call: runs the gate and the scope check, and commits everything
// only if both pass. On a failure it commits nothing and the scripts' output says why.
// Usage: node stage.mjs <task file> "<commit message>"   (from the project root)
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [task, message] = process.argv.slice(2);
if (!task || !message) {
  console.error('usage: node stage.mjs <task file> "<commit message>"');
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
console.log(`stage: committed ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}`);
