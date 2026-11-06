#!/usr/bin/env node
// Eval runner for the edezacas skills.
//
// Runs every case in <skill>/evals/evals.json twice — with the skill and
// without it — grades each assertion with an LLM judge, and writes the
// workspace described in AGENTS.md:
//
//   evals/workspace/iteration-N/<skill>/eval-<id>-<slug>/
//     with_skill/run-K/{outputs,events.jsonl,transcript.md,timing.json,grading.json}
//     without_skill/{...}
//   evals/workspace/iteration-N/benchmark.json
//
// Usage:
//   node evals/run.mjs                        # every skill, both configs
//   node evals/run.mjs --only tdd             # one skill
//   node evals/run.mjs --only tdd --cases 1   # smoke test
//   node evals/run.mjs --configs with         # skip the baseline
//   node evals/run.mjs --jobs 1 --iteration 3
//   node evals/run.mjs --model claude-opus-5-5  # agent under test; default Sonnet
//   node evals/run.mjs --judge-model claude-sonnet-5-5
//   node evals/run.mjs --budget 1               # USD cap per agent run
//   node evals/run.mjs --runs 5                 # repetitions per case; default 3
//   node evals/run.mjs --only ask-me --id 1,5   # some cases
//   node evals/run.mjs --only ask-me --also tdd  # another skill installed, to see them compete
//   node evals/run.mjs --no-grade               # no judge: enough to measure activation

import { execFileSync, spawn } from 'node:child_process';
import { mkdir, mkdtemp, cp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const SKILLS = path.join(REPO, 'skills');
const FIXTURE = path.join(REPO, 'evals', 'fixtures', 'acme-app');
const WORKSPACE = path.join(REPO, 'evals', 'workspace');
const RUN_TIMEOUT_MS = 300_000;
const GRADE_TIMEOUT_MS = 180_000;
const CHECK_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------- args

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const only = opt('only', null);
const caseLimit = Number(opt('cases', 0)) || Infinity;
const caseIds = opt('id', null)?.split(',').map(Number) ?? null;
const noGrade = args.includes('--no-grade');
const jobs = Number(opt('jobs', 3));
const configs = opt('configs', 'with,without').split(',');
const iteration = opt('iteration', null);
const regrade = args.includes('--regrade');
const model = opt('model', 'claude-sonnet-5-5');
const judgeModel = opt('judge-model', 'claude-opus-5-5');
const budget = opt('budget', '3');
const repetitions = Number(opt('runs', 3));
const alsoInstall = opt('also', '').split(',').filter(Boolean);
const AGENT_TOOLS = 'Bash,Edit,Read,Write,Skill,Task';

// ------------------------------------------------------------- helpers

// Skills live one level down, in a folder per category. Installed, they are flat, so
// names must be unique across categories.
async function listSkills() {
  const skills = [];
  for (const category of await readdir(SKILLS, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    for (const entry of await readdir(path.join(SKILLS, category.name), { withFileTypes: true })) {
      if (entry.isDirectory()) skills.push({ name: entry.name, dir: path.join(SKILLS, category.name, entry.name) });
    }
  }
  const names = skills.map((skill) => skill.name);
  const repeated = names.find((name, i) => names.indexOf(name) !== i);
  if (repeated) throw new Error(`two skills are named ${repeated}`);
  return skills;
}

async function findSkill(name) {
  const skill = (await listSkills()).find((candidate) => candidate.name === name);
  if (!skill) throw new Error(`no skill named ${name}`);
  return skill;
}

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

// Without the session variables, because a nested claude behaves differently when
// the runner itself is launched from a Claude Code session.
function cleanEnv() {
  const inherited = /^(CLAUDECODE$|CLAUDE_PID$|CLAUDE_EFFORT$|CLAUDE_CODE_(?!OAUTH_TOKEN$))/;
  return Object.fromEntries(Object.entries(process.env).filter(([k]) => !inherited.test(k)));
}

// Project settings only: the user's own skills, plugins, MCP servers and CLAUDE.md
// would otherwise reach both configs and contaminate the baseline.
function claude(argv, { cwd, timeout, input }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(
      'claude',
      [
        '-p',
        '--output-format', 'stream-json',
        '--verbose',
        '--no-session-persistence',
        '--setting-sources', 'project',
        '--strict-mcp-config',
        ...argv,
      ],
      { cwd, env: cleanEnv(), stdio: ['pipe', 'pipe', 'pipe'] },
    );
    let stdout = '';
    let stderr = '';
    let timer = null;
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.stdin.end(input);
    const done = (err) => {
      if (timer) clearTimeout(timer);
      resolve({ err, stdout, stderr, durationMs: Date.now() - started, timedOut: child.killed });
    };
    timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.on('error', done);
    child.on('close', (code) => done(code === 0 ? null : new Error(`exit ${code}`)));
  });
}

function parseEvents(stdout) {
  const events = [];
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('{')) continue;
    try {
      events.push(JSON.parse(line));
    } catch {}
  }
  return events;
}

// One entry per API message, with all its content: a message arrives as one event
// per content block. Subagent messages count too.
function assistantMessages(events) {
  const messages = new Map();
  for (const { type, message } of events) {
    if (type !== 'assistant') continue;
    const known = messages.get(message.id);
    messages.set(message.id, {
      ...message,
      content: [...(known?.content ?? []), ...(message.content ?? [])],
    });
  }
  return [...messages.values()];
}

const toolCalls = (events) => [
  ...new Map(
    assistantMessages(events)
      .flatMap((m) => m.content ?? [])
      .filter((c) => c.type === 'tool_use')
      .map((c) => [c.id, c]),
  ).values(),
];

function usageTotals(result, messages) {
  const models = Object.values(result?.modelUsage ?? {});
  const entries = models.length
    ? models.map((u) => ({
        input: u.inputTokens,
        output: u.outputTokens,
        cacheRead: u.cacheReadInputTokens,
        cacheWrite: u.cacheCreationInputTokens,
      }))
    : messages.map(({ usage: u = {} }) => ({
        input: u.input_tokens ?? 0,
        output: u.output_tokens ?? 0,
        cacheRead: u.cache_read_input_tokens ?? 0,
        cacheWrite: u.cache_creation_input_tokens ?? 0,
      }));
  return entries.reduce(
    (t, e) => ({
      input: t.input + e.input,
      output: t.output + e.output,
      cacheRead: t.cacheRead + e.cacheRead,
      cacheWrite: t.cacheWrite + e.cacheWrite,
    }),
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  );
}

const isTestFile = (file) => /\.(test|spec)\.|(^|\/)tests?\//.test(file);
const isCodeFile = (file) => /\.[jt]sx?$/.test(file) && !isTestFile(file);

// Files a tool call writes. A shell command counts when it can write at all, and
// then every path it mentions counts, because a script may write several files.
function writtenFiles(call) {
  if (call.name === 'Write' || call.name === 'Edit') return [String(call.input?.file_path)];
  if (call.name !== 'Bash') return [];
  const command = String(call.input?.command);
  const writes = /(^|[^0-9&])>>?\s*[^&\s]|\btee\b|\bsed -i|\bpython3?\b|\bnode -e\b|\bperl -i\b/.test(command);
  return writes ? [...command.matchAll(/[\w./-]+\.[jt]sx?\b/g)].map((m) => m[0]) : [];
}

function failedTestRun(call, results) {
  if (call.name !== 'Bash' || !/\b(vitest|jest|mocha)\b|\bnpm (run )?-?s? ?test\b/.test(String(call.input?.command))) return false;
  const result = results.get(call.id);
  const output = typeof result?.content === 'string' ? result.content : JSON.stringify(result?.content ?? '');
  return Boolean(result?.is_error) || /\b\d+ failed\b|\bFAIL\b/.test(output);
}

// One shell command can write a test, run it and write the code without waiting for
// the result: the test did fail first, but nobody looked before writing the code.
function failedBeforeCodeInCommand(call, results) {
  const command = String(call.input?.command);
  const run = command.search(/\b(vitest|jest|mocha)\b|\bnpm (run )?-?s? ?test\b/);
  const write = [...command.matchAll(/(?:>>?|\btee\s+(?:-a\s+)?)\s*([\w./-]+\.[jt]sx?)\b/g)].find((m) => isCodeFile(m[1]));
  return run >= 0 && write && run < write.index && failedTestRun(call, results);
}

// Whether a test was seen failing before any code was written. Null when the run
// wrote no code. The fixture starts green, so a failure can only come from new work.
function redBeforeCode(calls, events) {
  const results = new Map(
    events
      .filter((e) => e.type === 'user' && Array.isArray(e.message?.content))
      .flatMap((e) => e.message.content)
      .filter((c) => c.type === 'tool_result')
      .map((c) => [c.tool_use_id, c]),
  );
  for (const call of calls) {
    if (writtenFiles(call).some(isCodeFile)) {
      return { seen: false, sameCommand: Boolean(failedBeforeCodeInCommand(call, results)) };
    }
    if (failedTestRun(call, results)) return { seen: true, sameCommand: false };
  }
  return { seen: null, sameCommand: false };
}

const contextSize = ({ usage: u = {} }) =>
  (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);

function summarize(events, skillName = null) {
  const result = events.find((e) => e.type === 'result');
  const messages = assistantMessages(events);
  const lastText = (messages.at(-1)?.content ?? [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');
  const calls = toolCalls(events);
  const tokens = usageTotals(result, messages);
  const prompted = tokens.input + tokens.cacheRead + tokens.cacheWrite;
  return {
    text: result?.result ?? lastText,
    metrics: {
      turns: result?.num_turns ?? messages.length,
      tool_calls: calls.length,
      input_tokens: tokens.input,
      output_tokens: tokens.output,
      cache_read_tokens: tokens.cacheRead,
      cache_write_tokens: tokens.cacheWrite,
      total_tokens: prompted + tokens.output,
      cache_hit_rate: prompted ? +(tokens.cacheRead / prompted).toFixed(3) : 0,
      peak_context_tokens: Math.max(0, ...messages.map(contextSize)),
      cost_usd: result?.total_cost_usd ?? 0,
      skills_used: calls.filter((c) => c.name === 'Skill').map((c) => c.input?.skill),
      wrote_code: calls.some((c) => writtenFiles(c).some(isCodeFile)),
      red_before_code: redBeforeCode(calls, events).seen,
      red_in_same_command: redBeforeCode(calls, events).sameCommand,
      skill_read: calls.some(
        (c) =>
          (c.name === 'Skill' && c.input?.skill === skillName) ||
          (c.name === 'Read' && String(c.input?.file_path).includes(`${skillName}/SKILL.md`)),
      ),
      model: events.find((e) => e.type === 'system' && e.subtype === 'init')?.model ?? null,
      run_error: result?.is_error || (result && result.subtype !== 'success') ? (result.result ?? result.subtype) : null,
    },
  };
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.claude', 'dist', '.angular', 'coverage']);

async function walk(dir, base = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, base)));
    else out.push({ full, rel: path.relative(base, full) });
  }
  return out;
}

// A copy-on-write copy where the filesystem allows it, so every run gets its own
// node_modules cheaply and a run that installs something cannot affect the others.
async function prepareWorkdir(dir) {
  const expected = new Map();
  for (const { full, rel } of await walk(FIXTURE)) {
    const target = path.join(dir, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(full, target);
    expected.set(rel, await readFile(full, 'utf8'));
  }
  execFileSync('cp', ['-a', '--reflink=auto', path.join(FIXTURE, 'node_modules'), dir]);
  return expected;
}

// Files the agent created or changed, with their content, relative to the workdir.
async function collectOutputs(workdir, outputsDir, expected) {
  const changed = [];
  for (const { full, rel } of await walk(workdir)) {
    const content = await readFile(full, 'utf8');
    if (expected.get(rel) === content) continue;
    if (content.length > 200_000) continue;
    const target = path.join(outputsDir, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
    changed.push({ rel, content });
  }
  return changed;
}

// Each workdir is its own repo, so an agent that branches or commits stays inside it.
function initGit(cwd) {
  const git = (...argv) => execFileSync('git', argv, { cwd, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  git('add', '-A');
  git('-c', 'user.name=eval', '-c', 'user.email=eval@example.invalid', 'commit', '-q', '-m', 'fixture');
}

// The skill without its evals, which hold the assertions. Excluded from git so it
// stays out of what the agent commits.
async function installSkill(skill, workdir) {
  await cp(skill.dir, path.join(workdir, '.claude', 'skills', skill.name), {
    recursive: true,
    filter: (source) => path.relative(skill.dir, source).split(path.sep)[0] !== 'evals',
  });
  await writeFile(path.join(workdir, '.git', 'info', 'exclude'), '.claude/\n');
}

// Extra input files for a case, copied into the workdir by basename.
// Commands that decide a result with no judge. A check's `files` come from
// evals/hidden/, are copied only now, and so were never visible to the agent.
async function runChecks(testCase, workdir, skillDir) {
  const results = [];
  for (const check of testCase.checks ?? []) {
    for (const file of check.files ?? []) {
      const target = path.join(workdir, file.slice(file.indexOf('/hidden/') + 8));
      await mkdir(path.dirname(target), { recursive: true });
      await cp(path.join(skillDir, file), target, { force: true });
    }
    let passed = true;
    let output = '';
    try {
      output = execFileSync('bash', ['-c', check.run], {
        cwd: workdir,
        env: cleanEnv(),
        timeout: CHECK_TIMEOUT_MS,
        stdio: ['ignore', 'pipe', 'pipe'],
      }).toString();
    } catch (err) {
      passed = false;
      output = `${err.stdout ?? ''}${err.stderr ?? ''}${err.message}`;
    }
    results.push({ name: check.name, passed, mutant: check.mutant, reference: check.reference, output: output.slice(-2000) });
  }
  return results;
}

async function copyCaseFiles(testCase, workdir, skillDir, expected) {
  for (const file of testCase.files ?? []) {
    const source = path.join(skillDir, file);
    if (!existsSync(source)) throw new Error(`missing eval file: ${file}`);
    // evals/files/src/user.ts lands at src/user.ts, so a case can supply files
    // where the prompt expects them.
    const rel = file.includes('/files/') ? file.slice(file.indexOf('/files/') + 7) : path.basename(file);
    const target = path.join(workdir, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { force: true });
    expected.set(rel, await readFile(source, 'utf8'));
  }
}

// -------------------------------------------------------------- grading

// An assertion is either a string or { text, guardrail: true }. Guardrails encode a
// rule the current model already follows; they are reported apart from the
// assertions that can actually fail because of the skill.
const assertionText = (a) => (typeof a === 'string' ? a : a.text);
const isGuardrail = (a) => typeof a === 'object' && a.guardrail === true;

function gradingPrompt(testCase, response, files, baseline = []) {
  const fileBlock = files.length
    ? files
        .map((f) => `--- ${f.rel} ---\n${f.content.slice(0, 4000)}${f.content.length > 4000 ? '\n[truncated]' : ''}`)
        .join('\n\n')
        .slice(0, 24_000)
    : '(none)';
  // Input files the agent did not touch, so "leaves X unchanged" and "keeps the old
  // records" are verifiable instead of failing for lack of a baseline.
  const label = {
    deleted: 'DELETED by the agent',
    modified: 'ORIGINAL INPUT, NOW MODIFIED',
    unchanged: 'UNCHANGED from the input',
  };
  const baselineBlock = baseline.length
    ? baseline
        .map((b) =>
          b.state === 'deleted'
            ? `--- ${b.rel} --- ${label.deleted}`
            : `--- ${b.rel} --- ${label[b.state]}\n${b.content.slice(0, 2000)}${
                b.content.length > 2000 ? '\n[truncated]' : ''
              }`,
        )
        .join('\n\n')
        .slice(0, 16_000)
    : '(none)';
  return [
    'You are grading one agent response against a list of assertions.',
    '',
    `TASK GIVEN TO THE AGENT:\n${testCase.prompt}`,
    '',
    `WHAT A GOOD RESULT LOOKS LIKE:\n${testCase.expected_output}`,
    '',
    `AGENT RESPONSE:\n${response || '(the agent produced no text)'}`,
    '',
    `FILES THE AGENT CREATED OR MODIFIED, WITH THEIR CONTENT:\n${fileBlock}`,
    '',
    `FILES PROVIDED AS INPUT, WITH THEIR ORIGINAL CONTENT:\n${baselineBlock}`,
    '',
    'ASSERTIONS:',
    ...testCase.assertions.map((a, i) => `${i + 1}. ${assertionText(a)}`),
    '',
    'Rules: a PASS needs concrete evidence quoted from the response or from a file.',
    'If the evidence is missing, ambiguous, or only implied, it is a FAIL. Do not give',
    'the benefit of the doubt. For assertions phrased as "does not do X", pass only when',
    'the response and the files can be checked and X is absent.',
    'A file marked UNCHANGED from the input is evidence that the agent left it alone, a file',
    'marked DELETED was removed, and a file marked ORIGINAL INPUT, NOW MODIFIED states how it',
    'read before the agent worked, for comparison with its current content.',
    '',
    'Answer with ONLY this JSON, no prose and no code fences:',
    '{"assertion_results":[{"text":"<assertion>","passed":true,"evidence":"<quote or reference>"}],"summary":{"passed":0,"failed":0,"total":0,"pass_rate":0}}',
  ].join('\n');
}

function parseGrading(raw) {
  const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function summarizeGrading(grading, testCase) {
  const results = grading?.assertion_results ?? [];
  const guardrailTexts = new Set((testCase?.assertions ?? []).filter(isGuardrail).map(assertionText));
  const signal = results.filter((r) => !guardrailTexts.has(r.text));
  const guardrail = results.filter((r) => guardrailTexts.has(r.text));
  const passed = results.filter((r) => r.passed).length;
  return {
    assertion_results: results,
    summary: {
      passed,
      failed: results.length - passed,
      total: results.length,
      pass_rate: results.length ? passed / results.length : 0,
      skill_signal: {
        passed: signal.filter((r) => r.passed).length,
        total: signal.length,
      },
      guardrail: {
        passed: guardrail.filter((r) => r.passed).length,
        total: guardrail.length,
      },
    },
  };
}

// ---------------------------------------------------------------- stats

function statsOf(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  const median = Number.isInteger(middle)
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[Math.floor(middle)];
  const round = (x) => +x.toFixed(4);
  return { median: round(median), min: round(sorted[0]), max: round(sorted.at(-1)), n: sorted.length };
}

const QUALITY = {
  pass_rate: (s) => s.pass_rate,
  skill_signal: (s) => (s.skill_signal.total ? s.skill_signal.passed / s.skill_signal.total : null),
  guardrail: (s) => (s.guardrail.total ? s.guardrail.passed / s.guardrail.total : null),
};

const EFFICIENCY = {
  time_seconds: (t) => t.duration_ms / 1000,
  turns: (t) => t.turns,
  tool_calls: (t) => t.tool_calls,
  input_tokens: (t) => t.input_tokens,
  output_tokens: (t) => t.output_tokens,
  cache_read_tokens: (t) => t.cache_read_tokens,
  cache_write_tokens: (t) => t.cache_write_tokens,
  total_tokens: (t) => t.total_tokens,
  cache_hit_rate: (t) => t.cache_hit_rate,
  peak_context_tokens: (t) => t.peak_context_tokens,
  cost_usd: (t) => t.cost_usd,
};

// A seeded error only counts as caught if the tests also pass on correct code: tests
// that fail on everything would otherwise look as if they caught every error.
const validChecks = (checks = []) =>
  checks.some((c) => c.reference && !c.passed) ? checks.filter((c) => !c.mutant) : checks;

const mapValues = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v, k)]));

// How often each assertion passed: one that neither always passes nor always fails is noise.
function tally(results, label) {
  const entries = new Map();
  for (const r of results) {
    const entry = entries.get(r[label]) ?? { [label]: r[label], passed: 0, total: 0 };
    entry.passed += r.passed ? 1 : 0;
    entry.total += 1;
    entries.set(r[label], entry);
  }
  return [...entries.values()];
}

function configStats(runs) {
  if (!runs.length) return null;
  const graded = runs.filter((r) => r.grading?.summary?.total);
  // A killed or failed run stopped early: its numbers would look efficient.
  const complete = runs.filter((r) => !r.timing.timed_out && !r.timing.run_error);
  return {
    runs: runs.length,
    ungraded_runs: runs.length - graded.length,
    incomplete_runs: runs.length - complete.length,
    skill_read_runs: runs.filter((r) => r.timing.skill_read).length,
    quality: {
      ...mapValues(QUALITY, (metric) =>
        statsOf(graded.map((r) => metric(r.grading.summary)).filter((v) => v !== null)),
      ),
      checks_pass_rate: statsOf(
        runs
          .map((r) => validChecks(r.checks))
          .filter((checks) => checks.length)
          .map((checks) => checks.filter((c) => c.passed).length / checks.length),
      ),
    },
    efficiency_of_complete_runs: mapValues(EFFICIENCY, (metric) =>
      statsOf(complete.map((r) => metric(r.timing))),
    ),
    assertions: tally(graded.flatMap((r) => r.grading.assertion_results), 'text'),
    checks: tally(runs.flatMap((r) => validChecks(r.checks)), 'name'),
    red_in_same_command_runs: runs.filter((r) => r.timing.red_in_same_command).length,
    red_before_code: tally(
      runs
        .filter((r) => r.timing.red_before_code === true || r.timing.red_before_code === false)
        .map((r) => ({ name: 'red_before_code', passed: r.timing.red_before_code })),
      'name',
    )[0] ?? null,
  };
}

// `separated` says the two ranges do not overlap. With one run per config any
// difference would look separated, so it stays null.
function compare(a, b) {
  if (!a || !b) return null;
  return {
    delta: +(a.median - b.median).toFixed(4),
    separated: a.n > 1 && b.n > 1 ? a.min > b.max || a.max < b.min : null,
  };
}

function caseStats(runs) {
  const withSkill = configStats(runs.filter((r) => r.config === 'with_skill'));
  const without = configStats(runs.filter((r) => r.config === 'without_skill'));
  const groups = ['quality', 'efficiency_of_complete_runs'];
  const delta =
    withSkill && without
      ? Object.assign(
          {},
          ...groups.map((g) => mapValues(withSkill[g], (stat, k) => compare(stat, without[g][k]))),
        )
      : null;
  return { id: runs[0].id, with_skill: withSkill, without_skill: without, delta };
}

// Across cases only what can be counted: an average over different tasks hides
// which one moved, so the per-case numbers remain the result.
function deltaSummary(cases) {
  const compared = cases.filter((c) => c.delta);
  if (!compared.length) return null;
  return mapValues(compared[0].delta, (_, metric) => {
    const deltas = compared.map((c) => c.delta[metric]).filter(Boolean);
    return {
      median_delta: statsOf(deltas.map((d) => d.delta))?.median ?? null,
      cases_higher: deltas.filter((d) => d.separated && d.delta > 0).length,
      cases_lower: deltas.filter((d) => d.separated && d.delta < 0).length,
      cases_not_separated: deltas.filter((d) => !d.separated).length,
    };
  });
}

function benchmark(runs) {
  const ids = [...new Set(runs.map((r) => r.id))].sort((a, b) => a - b);
  const cases = ids.map((id) => caseStats(runs.filter((r) => r.id === id)));
  return {
    total_runs: runs.length,
    agent_cost_usd: +runs.reduce((sum, r) => sum + r.timing.cost_usd, 0).toFixed(4),
    judge_cost_usd: +runs.reduce((sum, r) => sum + (r.grading?.judge_cost_usd ?? 0), 0).toFixed(4),
    delta_summary: deltaSummary(cases),
    cases,
  };
}

function printSummary(name, { cases, agent_cost_usd, judge_cost_usd }) {
  console.log(`${name}: agent $${agent_cost_usd}, judge $${judge_cost_usd}`);
  const show = (s) => (s ? `${s.median} [${s.min}-${s.max}]` : '-');
  for (const c of cases) {
    const d = c.delta?.pass_rate;
    console.log(
      `${name} #${c.id}  pass with ${show(c.with_skill?.quality.pass_rate)}` +
        `  without ${show(c.without_skill?.quality.pass_rate)}` +
        (d ? `  delta ${d.delta}${d.separated ? ' separated' : ''}` : '') +
        ` checks ${show(c.with_skill?.quality.checks_pass_rate)}`,
    );
  }
}

// ------------------------------------------------------------------ run

async function nextIteration() {
  const existing = existsSync(WORKSPACE) ? await readdir(WORKSPACE) : [];
  const used = existing.map((d) => Number(String(d).match(/^iteration-(\d+)$/)?.[1] ?? 0));
  return iteration ? Number(iteration) : Math.max(0, ...used) + 1;
}

async function gradeCase(testCase, config, response, files, dir, baseline) {
  let raw = '';
  let parsed = null;
  let judgeCost = 0;
  // Outside this repo, so the judge does not load its CLAUDE.md.
  const judgeDir = await mkdtemp(path.join(os.tmpdir(), 'ai-factory-judge-'));
  for (const attempt of [1, 2]) {
    const {
      stdout,
      stderr,
      timedOut,
    } = await claude(
      ['--model', judgeModel, '--tools', ''],
      {
        cwd: judgeDir,
        timeout: GRADE_TIMEOUT_MS,
        input:
          gradingPrompt(testCase, response, files, baseline) +
          (attempt === 2 ? '\n\nPrevious answer was not valid JSON. Answer with the JSON object only.' : ''),
      },
    );
    const { text, metrics } = summarize(parseEvents(stdout));
    raw = text;
    judgeCost += metrics.cost_usd;
    if (stderr.trim()) await writeFile(path.join(dir, `grading_stderr_${attempt}.log`), stderr);
    if (timedOut) continue;
    parsed = parseGrading(raw);
    if (parsed?.assertion_results?.length) break;
  }

  await rm(judgeDir, { recursive: true, force: true });
  await writeFile(path.join(dir, 'grading_raw.md'), raw + '\n');
  const grading = parsed?.assertion_results?.length
    ? summarizeGrading(parsed, testCase)
    : {
        assertion_results: [],
        summary: { passed: 0, failed: 0, total: 0, pass_rate: 0, skill_signal: { passed: 0, total: 0 }, guardrail: { passed: 0, total: 0 } },
        error: 'unparseable',
      };
  grading.judge_cost_usd = judgeCost;
  await writeFile(path.join(dir, 'grading.json'), JSON.stringify(grading, null, 2) + '\n');
  return grading;
}

async function runCase(skill, testCase, itDir, repetition) {
  const caseDir = path.join(itDir, slug(skill.name), `eval-${testCase.id}-${slug(testCase.prompt)}`);

  const runs = [];
  for (const config of configs) {
    const name = config === 'with' ? 'with_skill' : 'without_skill';
    const dir = path.join(caseDir, name, `run-${repetition}`);
    // Outside this repo: an agent that looks up the tree must not find the skills,
    // the assertions or this repo's CLAUDE.md.
    const workdir = await mkdtemp(path.join(os.tmpdir(), 'ai-factory-eval-'));
    await mkdir(dir, { recursive: true });
    const expected = await prepareWorkdir(workdir);
    await copyCaseFiles(testCase, workdir, skill.dir, expected);
    initGit(workdir);
    if (config === 'with') {
      await installSkill(skill, workdir);
      for (const name of alsoInstall) await installSkill(await findSkill(name), workdir);
    }
    const outputsDir = path.join(dir, 'outputs');
    await mkdir(outputsDir, { recursive: true });

    const argv = [
      '--model', model,
      '--tools', AGENT_TOOLS,
      '--allowedTools', AGENT_TOOLS,
      '--permission-mode', 'dontAsk',
      '--max-budget-usd', budget,
    ];
    const started = Date.now();
    const { stdout, stderr, timedOut } = await claude(argv, {
      cwd: workdir,
      timeout: RUN_TIMEOUT_MS,
      input: testCase.prompt,
    });
    const { text, metrics } = summarize(parseEvents(stdout), skill.name);
    await writeFile(path.join(dir, 'events.jsonl'), stdout);
    if (stderr.trim()) await writeFile(path.join(dir, 'stderr.log'), stderr);

    const timing = { ...metrics, duration_ms: Date.now() - started, timed_out: timedOut };
    await writeFile(path.join(dir, 'transcript.md'), text + '\n');
    await writeFile(path.join(dir, 'timing.json'), JSON.stringify(timing, null, 2) + '\n');
    const files = await collectOutputs(workdir, outputsDir, expected);
    const checks = await runChecks(testCase, workdir, skill.dir);
    await writeFile(path.join(dir, 'checks.json'), JSON.stringify(checks, null, 2) + '\n');
    const changed = new Set(files.map((f) => f.rel));
    const baseline = [...expected].map(([rel, content]) => ({
      rel,
      content,
      state: changed.has(rel)
        ? 'modified'
        : existsSync(path.join(workdir, rel))
          ? 'unchanged'
          : 'deleted',
    }));
    // The agent may npm-install into workdir; keep only outputs/ after grading.
    await rm(workdir, { recursive: true, force: true });

    let grading;
    if (noGrade || !testCase.assertions?.length) {
      grading = { ...summarizeGrading(null, testCase), skipped: true };
      await writeFile(path.join(dir, 'grading.json'), JSON.stringify(grading, null, 2) + '\n');
    } else {
      grading = await gradeCase(testCase, config, text, files, dir, baseline);
    }
    runs.push({ skill: skill.name, id: testCase.id, config: name, repetition, timing, grading, checks });

    const s = grading.summary;
    console.log(
      `  ${skill.name} #${testCase.id} ${name.padEnd(13)} run ${repetition}  ${s.passed}/${s.total} pass  ` +
        `checks ${checks.filter((c) => c.passed).length}/${checks.length}  ` +
        `${(timing.duration_ms / 1000).toFixed(1)}s  ${timing.turns} turns  ${timing.total_tokens} tok  ` +
        `cache ${timing.cache_hit_rate}  $${timing.cost_usd.toFixed(3)}  skill_read=${timing.skill_read}` +
        (timing.run_error ? `  ERROR: ${timing.run_error}` : ''),
    );
  }
  return runs;
}

// Rebuild the run list of an existing iteration from disk.
async function loadRuns(itDir) {
  const runs = [];
  for (const skill of await readdir(itDir, { withFileTypes: true })) {
    if (!skill.isDirectory() || skill.name === 'skills') continue;
    for (const dir of await readdir(path.join(itDir, skill.name), { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      for (const config of ['with_skill', 'without_skill']) {
        const configDir = path.join(itDir, skill.name, dir.name, config);
        if (!existsSync(configDir)) continue;
        for (const repetition of await readdir(configDir)) {
          const runDir = path.join(configDir, repetition);
          if (!existsSync(path.join(runDir, 'timing.json'))) continue;
          runs.push({
            skill: skill.name,
            id: Number(dir.name.split('-')[1]),
            config,
            repetition: Number(repetition.split('-')[1]),
            timing: JSON.parse(await readFile(path.join(runDir, 'timing.json'), 'utf8')),
            grading: existsSync(path.join(runDir, 'grading.json'))
              ? JSON.parse(await readFile(path.join(runDir, 'grading.json'), 'utf8'))
              : null,
            checks: existsSync(path.join(runDir, 'checks.json'))
              ? JSON.parse(await readFile(path.join(runDir, 'checks.json'), 'utf8'))
              : [],
            runDir,
          });
        }
      }
    }
  }
  return runs;
}

async function writeBenchmark(runs, itDir, meta) {
  const perSkill = {};
  for (const name of new Set(runs.map((r) => r.skill))) {
    perSkill[name] = benchmark(runs.filter((r) => r.skill === name));
    printSummary(name, perSkill[name]);
  }
  await writeFile(
    path.join(itDir, 'benchmark.json'),
    JSON.stringify({ ...meta, per_skill: perSkill }, null, 2) + '\n',
  );
}

async function regradeIteration(itDir) {
  const runs = await loadRuns(itDir);
  // Only what the judge failed on: a run made with --no-grade stays without a judge.
  const broken = runs.filter((r) => !r.grading || r.grading.error);
  console.log(`iteration ${path.basename(itDir)}: ${broken.length} run(s) to re-grade`);
  for (const run of broken) {
    const skill = await findSkill(run.skill);
    const { evals } = JSON.parse(await readFile(path.join(skill.dir, 'evals', 'evals.json'), 'utf8'));
    const testCase = evals.find((e) => e.id === run.id);
    const transcript = await readFile(path.join(run.runDir, 'transcript.md'), 'utf8');
    const outputsDir = path.join(run.runDir, 'outputs');
    const files = existsSync(outputsDir)
      ? await Promise.all(
          (await walk(outputsDir)).map(async (f) => ({
            rel: f.rel,
            content: await readFile(f.full, 'utf8'),
          })),
        )
      : [];
    run.grading = await gradeCase(testCase, run.config, transcript.trim(), files, run.runDir);
    console.log(`  re-graded ${run.skill} #${run.id} ${run.config}: ${run.grading.summary.passed}/${run.grading.summary.total}`);
  }
  const meta = JSON.parse(await readFile(path.join(itDir, 'benchmark.json'), 'utf8'));
  await writeBenchmark(runs, itDir, {
    iteration: meta.iteration,
    created_at: meta.created_at,
    model: meta.model,
    judge_model: meta.judge_model,
    configs: meta.configs,
    runs_per_case: meta.runs_per_case,
    regraded_at: new Date().toISOString(),
  });
  console.log('benchmark rebuilt');
}

// A colon followed by a space in an unquoted value is invalid YAML. Claude Code loads
// such a skill anyway, so it would pass every eval and fail in stricter tools.
async function checkHeaders() {
  for (const skill of await listSkills()) {
    const file = path.join(skill.dir, 'SKILL.md');
    if (!existsSync(file)) continue;
    const description = (await readFile(file, 'utf8')).match(/^description: (.*)$/m)?.[1];
    if (!description) throw new Error(`${file}: no description`);
    if (!/^["']/.test(description) && /: |:$/.test(description)) {
      throw new Error(`${file}: the description has an unquoted colon, which is invalid YAML`);
    }
  }
}

async function main() {
  await checkHeaders();
  if (regrade) {
    const it = iteration ?? (await nextIteration()) - 1;
    return regradeIteration(path.join(WORKSPACE, `iteration-${it}`));
  }
  // Evals can exist before the skill, to check first that the agent fails without it.
  const skills = (await listSkills())
    .filter((skill) => existsSync(path.join(skill.dir, 'evals', 'evals.json')))
    .filter((skill) => !only || skill.name === only);

  if (!skills.length) throw new Error(`no skill matches --only ${only}`);
  if (!existsSync(path.join(FIXTURE, 'node_modules'))) {
    execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: FIXTURE, stdio: 'inherit' });
  }

  const it = await nextIteration();
  const itDir = path.join(WORKSPACE, `iteration-${it}`);
  await mkdir(itDir, { recursive: true });
  for (const skill of skills) await cp(skill.dir, path.join(itDir, 'skills', skill.name), { recursive: true });

  console.log(`iteration-${it} · ${model} · judge ${judgeModel} · configs: ${configs.join(',')} · runs: ${repetitions} · jobs: ${jobs}`);

  const queue = [];
  for (const skill of skills) {
    const evalsFile = path.join(skill.dir, 'evals', 'evals.json');
    if (!existsSync(evalsFile)) {
      console.log(`- ${skill.name}: no evals.json, skipped`);
      continue;
    }
    const { evals } = JSON.parse(await readFile(evalsFile, 'utf8'));
    for (const testCase of evals.filter((e) => !caseIds || caseIds.includes(e.id)).slice(0, caseLimit)) {
      for (let repetition = 1; repetition <= repetitions; repetition++) {
        queue.push({ skill, testCase, repetition });
      }
    }
  }

  const runs = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(jobs, queue.length) }, async () => {
      while (cursor < queue.length) {
        const { skill, testCase, repetition } = queue[cursor++];
        console.log(`> ${skill.name} #${testCase.id} run ${repetition}`);
        runs.push(...(await runCase(skill, testCase, itDir, repetition)));
      }
    }),
  );

  await writeBenchmark(runs, itDir, {
    iteration: it,
    created_at: new Date().toISOString(),
    model,
    judge_model: judgeModel,
    configs,
    runs_per_case: repetitions,
  });
  console.log(`\nwrote ${path.relative(REPO, itDir)}/benchmark.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
