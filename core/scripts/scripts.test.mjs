import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function project(files) {
  const dir = mkdtempSync(join(tmpdir(), 'harness-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  git('add', '-A');
  git('commit', '-q', '-m', 'start');
  return { dir, git, write: (path, content) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  } };
}

function run(script, dir, ...args) {
  return spawnSync(process.execPath, [join(here, script), ...args], { cwd: dir, encoding: 'utf8' });
}

function log(dir) {
  return readFileSync(join(dir, 'docs/harness/log.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
}

const pass = 'node -e "process.exit(0)"';
const fail = 'node -e "console.log(\'boom\'); process.exit(3)"';

test('gate passes when every step passes and logs it', () => {
  const p = project({ 'harness.json': JSON.stringify({ gate: [{ name: 'types', run: pass }, { name: 'tests', run: pass }] }) });
  const r = run('gate.mjs', p.dir);
  assert.equal(r.status, 0);
  const [line] = log(p.dir);
  assert.equal(line.script, 'gate');
  assert.equal(line.result, 'pass');
  assert.equal(line.step, null);
  assert.equal(typeof line.durationMs, 'number');
});

test('gate stops at the first failing step, shows its output and logs the step', () => {
  const p = project({ 'harness.json': JSON.stringify({ gate: [
    { name: 'types', run: fail },
    { name: 'tests', run: 'node -e "require(\'fs\').writeFileSync(\'ran\', \'\')"' },
  ] }) });
  const r = run('gate.mjs', p.dir);
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /boom/);
  assert.match(r.stdout + r.stderr, /types/);
  assert.equal(existsSync(join(p.dir, 'ran')), false);
  const [line] = log(p.dir);
  assert.equal(line.result, 'fail');
  assert.equal(line.step, 'types');
});

test('gate appends to an existing log', () => {
  const p = project({ 'harness.json': JSON.stringify({ gate: [{ name: 'tests', run: pass }] }) });
  run('gate.mjs', p.dir);
  run('gate.mjs', p.dir);
  assert.equal(log(p.dir).length, 2);
});

test('gate without harness.json fails with a clear error and logs it', () => {
  const p = project({ 'README.md': 'x' });
  const r = run('gate.mjs', p.dir);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /harness\.json/);
  assert.equal(log(p.dir)[0].result, 'fail');
});

const task = `# Task

## Goal

Something.

## Files

- \`src/a.ts\` and \`test/a.test.ts\`
- \`src/b.ts\` (new)

## Depends on

- \`src/c.ts\`
`;

test('check-scope passes when only listed files changed, new ones included', () => {
  const p = project({ 'docs/plans/w/01.md': task, 'src/a.ts': 'a', 'src/c.ts': 'c' });
  p.write('src/a.ts', 'a2');
  p.write('src/b.ts', 'b');
  const r = run('check-scope.mjs', p.dir, 'docs/plans/w/01.md');
  assert.equal(r.status, 0);
  const [line] = log(p.dir);
  assert.equal(line.script, 'check-scope');
  assert.equal(line.result, 'pass');
  assert.equal(line.task, 'docs/plans/w/01.md');
  assert.deepEqual(line.outOfScope, []);
});

test('check-scope fails on a changed or new file outside the list and names it', () => {
  const p = project({ 'docs/plans/w/01.md': task, 'src/a.ts': 'a', 'src/c.ts': 'c' });
  p.write('src/a.ts', 'a2');
  p.write('src/c.ts', 'c2');
  p.write('src/d/e.ts', 'e');
  const r = run('check-scope.mjs', p.dir, 'docs/plans/w/01.md');
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /src\/c\.ts/);
  assert.match(r.stdout + r.stderr, /src\/d\/e\.ts/);
  const [line] = log(p.dir);
  assert.equal(line.result, 'fail');
  assert.deepEqual(line.outOfScope.sort(), ['src/c.ts', 'src/d/e.ts']);
});

test('check-scope ignores the log and the task file itself', () => {
  const p = project({ 'src/a.ts': 'a', 'docs/harness/log.jsonl': '' });
  p.write('docs/plans/w/01.md', task);
  p.write('docs/harness/log.jsonl', '{}\n');
  const r = run('check-scope.mjs', p.dir, 'docs/plans/w/01.md');
  assert.equal(r.status, 0);
});

test('check-scope with --base counts commits since the base and not before', () => {
  const p = project({ 'docs/plans/w/01.md': task, 'src/a.ts': 'a', 'src/c.ts': 'c' });
  p.write('src/c.ts', 'c2');
  p.git('commit', '-qam', 'earlier stage');
  const base = p.git('rev-parse', 'HEAD').toString().trim();
  p.write('src/a.ts', 'a2');
  p.git('commit', '-qam', 'this stage');
  assert.equal(run('check-scope.mjs', p.dir, 'docs/plans/w/01.md', '--base', base).status, 0);
  p.write('src/c.ts', 'c3');
  p.git('commit', '-qam', 'out of scope');
  assert.equal(run('check-scope.mjs', p.dir, 'docs/plans/w/01.md', '--base', base).status, 1);
});

test('check-scope without a task file fails with a clear error', () => {
  const p = project({ 'src/a.ts': 'a' });
  const r = run('check-scope.mjs', p.dir, 'docs/plans/missing.md');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /missing\.md/);
});
