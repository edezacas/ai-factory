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
  return spawnSync(process.execPath, [join(here, '..', 'assets', script), ...args], { cwd: dir, encoding: 'utf8' });
}

function log(dir) {
  return readFileSync(join(dir, '.harness/log.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
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

test('both scripts log the version of the skill they belong to', () => {
  const version = readFileSync(join(here, '..', 'SKILL.md'), 'utf8').match(/version:\s*"([^"]+)"/)[1];
  const p = project({ 'harness.json': JSON.stringify({ gate: [{ name: 'tests', run: pass }] }), 'task.md': '## Files\n' });
  run('gate.mjs', p.dir);
  run('check-scope.mjs', p.dir, 'task.md');
  assert.deepEqual(log(p.dir).map(l => [l.script, l.version]), [['gate', version], ['check-scope', version]]);
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

test('gate logs the task it ran for, and null when run without one', () => {
  const p = project({ 'harness.json': JSON.stringify({ gate: [{ name: 'tests', run: fail }] }) });
  run('gate.mjs', p.dir, 'docs/plans/w/01.md');
  run('gate.mjs', p.dir);
  assert.deepEqual(log(p.dir).map(l => l.task), ['docs/plans/w/01.md', null]);
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

test('check-scope ignores the task file itself', () => {
  const p = project({ 'src/a.ts': 'a' });
  p.write('docs/plans/w/01.md', task);
  const r = run('check-scope.mjs', p.dir, 'docs/plans/w/01.md');
  assert.equal(r.status, 0);
});

test('the log stays out of git: both scripts leave the tree clean', () => {
  const p = project({ 'harness.json': JSON.stringify({ gate: [{ name: 'tests', run: pass }] }), 'task.md': '## Files\n' });
  assert.equal(run('gate.mjs', p.dir).status, 0);
  assert.equal(run('check-scope.mjs', p.dir, 'task.md').status, 0);
  assert.equal(run('check-scope.mjs', p.dir, 'task.md').status, 0);
  assert.equal(readFileSync(join(p.dir, '.harness/.gitignore'), 'utf8'), '*\n');
  assert.equal(p.git('status', '--porcelain').toString(), '');
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

test('check-scope allows the PROGRESS.md next to the task file', () => {
  const p = project({ 'docs/plans/w/01.md': task, 'docs/plans/w/PROGRESS.md': 'p', 'src/a.ts': 'a' });
  p.write('docs/plans/w/PROGRESS.md', 'p2');
  p.write('src/a.ts', 'a2');
  assert.equal(run('check-scope.mjs', p.dir, 'docs/plans/w/01.md').status, 0);
});

function stageProject(gate) {
  return project({
    'harness.json': JSON.stringify({ gate: [{ name: 'tests', run: gate }] }),
    'docs/plans/w/01.md': task, 'docs/plans/w/PROGRESS.md': 'p', 'src/a.ts': 'a', 'src/c.ts': 'c',
  });
}
const head = (p) => p.git('rev-parse', 'HEAD').toString().trim();

test('check-scope passes a listed file whose name is not ASCII, changed or new', () => {
  const p = project({ 'src/año.ts': '1', 'task.md': '## Files\n\n- `src/año.ts`: x\n- `src/camión.ts`: new\n' });
  p.write('src/año.ts', '2');
  p.write('src/camión.ts', '1');
  const r = run('check-scope.mjs', p.dir, 'task.md');
  assert.equal(r.status, 0, r.stdout);
});

test('check-scope names a file outside the list as it is on disk when its name is not ASCII', () => {
  const p = project({ 'task.md': '## Files\n\n- `src/a.ts`: x\n' });
  p.write('src/año.ts', '1');
  const r = run('check-scope.mjs', p.dir, 'task.md');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /src\/año\.ts/);
});

test('check-scope takes the task file by any path that points to it', () => {
  const files = { 'docs/plans/w/1.md': '## Files\n\n- `src/a.ts`: x\n', 'docs/plans/w/PROGRESS.md': 'start' };
  for (const path of [p => './docs/plans/w/1.md', p => join(p.dir, 'docs/plans/w/1.md')]) {
    const p = project(files);
    p.write('docs/plans/w/1.md', files['docs/plans/w/1.md'] + '\nrewritten');
    p.write('docs/plans/w/PROGRESS.md', 'stage 1');
    const r = run('check-scope.mjs', p.dir, path(p));
    assert.equal(r.status, 0, r.stdout);
  }
});

test('check-scope works from a project that is a folder of a larger repo, and looks only inside it', () => {
  const p = project({ 'api/task.md': '## Files\n\n- `src/a.ts`: x\n', 'api/src/a.ts': '1', 'client/b.ts': '1' });
  const api = join(p.dir, 'api');
  p.write('api/src/a.ts', '2');
  p.write('client/b.ts', '2');
  assert.equal(run('check-scope.mjs', api, 'task.md').status, 0);
  p.write('api/src/other.ts', '1');
  p.git('add', '-A');
  const r = run('check-scope.mjs', api, 'task.md');
  assert.equal(r.status, 1);
  assert.deepEqual(log(api).at(-1).outOfScope, ['src/other.ts']);
});

test('stage commits the stage with its message when the gate and the scope pass', () => {
  const p = stageProject(pass);
  p.write('src/a.ts', 'a2');
  p.write('src/b.ts', 'b');
  p.write('docs/plans/w/PROGRESS.md', 'p2');
  const r = run('stage.mjs', p.dir, 'docs/plans/w/01.md', 'stage 1: a and b');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(p.git('log', '-1', '--format=%s').toString().trim(), 'stage 1: a and b');
  assert.deepEqual(p.git('show', '--name-only', '--format=', 'HEAD').toString().trim().split('\n').sort(),
    ['docs/plans/w/PROGRESS.md', 'src/a.ts', 'src/b.ts']);
  assert.equal(p.git('status', '--porcelain').toString(), '');
  assert.deepEqual(log(p.dir).map(l => [l.script, l.result]), [['gate', 'pass'], ['check-scope', 'pass']]);
});

test('stage commits nothing when the gate fails, and shows why', () => {
  const p = stageProject(fail);
  p.write('src/a.ts', 'a2');
  const before = head(p);
  const r = run('stage.mjs', p.dir, 'docs/plans/w/01.md', 'stage 1');
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /boom/);
  assert.equal(head(p), before);
  assert.match(p.git('status', '--porcelain').toString(), /src\/a\.ts/);
});

test('stage logs a failed gate with its task, so each round can be tied to a stage', () => {
  const p = stageProject(fail);
  p.write('src/a.ts', 'a2');
  run('stage.mjs', p.dir, 'docs/plans/w/01.md', 'stage 1');
  assert.deepEqual(log(p.dir).map(l => [l.script, l.result, l.task]), [['gate', 'fail', 'docs/plans/w/01.md']]);
});

test('stage commits nothing when a file outside the task changed, and names it', () => {
  const p = stageProject(pass);
  p.write('src/c.ts', 'c2');
  const before = head(p);
  const r = run('stage.mjs', p.dir, 'docs/plans/w/01.md', 'stage 1');
  assert.equal(r.status, 1);
  assert.match(r.stdout + r.stderr, /src\/c\.ts/);
  assert.equal(head(p), before);
});

test('stage without a message fails with usage and commits nothing', () => {
  const p = stageProject(pass);
  p.write('src/a.ts', 'a2');
  const before = head(p);
  const r = run('stage.mjs', p.dir, 'docs/plans/w/01.md');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage/);
  assert.equal(head(p), before);
});

const fixProject = () => {
  const p = project({
    'harness.json': JSON.stringify({ gate: [{ name: 'tests', run: pass }] }),
    'task.md': '## Files\n- `src/a.ts`\n',
    'src/a.ts': 'one\n',
  });
  p.write('src/a.ts', 'two\n');
  return p;
};

test('stage logs a fix after review once it is committed, with who sent the stage back and why', () => {
  const version = readFileSync(join(here, '..', 'SKILL.md'), 'utf8').match(/version:\s*"([^"]+)"/)[1];
  const p = fixProject();
  const r = run('stage.mjs', p.dir, 'task.md', 'fix: faster query', 'user', 'candidate query too slow on a large agency');
  assert.equal(r.status, 0);
  assert.equal(p.git('log', '-1', '--format=%s').toString().trim(), 'fix: faster query');
  const lines = log(p.dir);
  assert.deepEqual(lines.map(l => l.script), ['gate', 'check-scope', 'review']);
  const line = lines[2];
  assert.equal(line.version, version);
  assert.equal(line.task, 'task.md');
  assert.equal(line.by, 'user');
  assert.equal(line.reason, 'candidate query too slow on a large agency');
  assert.equal(Number.isNaN(Date.parse(line.ts)), false);
  assert.equal(p.git('status', '--porcelain').toString(), '');
});

test('stage accepts the main session as the one who sent the stage back', () => {
  const p = fixProject();
  assert.equal(run('stage.mjs', p.dir, 'task.md', 'fix: history rows', 'main', 'extra history rows').status, 0);
  assert.equal(log(p.dir)[2].by, 'main');
});

test('stage without a sender logs no review line', () => {
  const p = fixProject();
  assert.equal(run('stage.mjs', p.dir, 'task.md', 'feat: a').status, 0);
  assert.deepEqual(log(p.dir).map(l => l.script), ['gate', 'check-scope']);
});

test('stage logs no review line when the fix is not committed', () => {
  const p = fixProject();
  p.write('src/b.ts', 'outside\n');
  assert.equal(run('stage.mjs', p.dir, 'task.md', 'fix: a', 'user', 'too slow').status, 1);
  assert.deepEqual(log(p.dir).map(l => l.script), ['gate', 'check-scope']);
});

test('stage with an unknown sender or without a reason fails with usage and runs nothing', () => {
  const p = fixProject();
  for (const extra of [['script', 'gate failed'], ['user'], ['user', '  ']]) {
    const r = run('stage.mjs', p.dir, 'task.md', 'fix: a', ...extra);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /usage/);
  }
  assert.equal(existsSync(join(p.dir, '.harness/log.jsonl')), false);
  assert.equal(p.git('log', '--oneline').toString().trim().split('\n').length, 1);
});
