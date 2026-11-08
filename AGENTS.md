# ai-factory

## Overview
Skills and subagents that take an agent from a prompt to validated code: clarify, spec, small tasks, independent tests, recorded decisions. Goals, components and phases are in `docs/brief.md`.

## Stack
- Skills: Markdown (`SKILL.md`) in the agentskills.io format, harness-agnostic, no build step
- Evals: Node, no dependencies; runs on `claude -p`, Sonnet as agent and Opus as judge by default

## Commands
```bash
node evals/run.mjs                          # every skill, with and without it
node evals/run.mjs --only ask-me --cases 1 --runs 1 # smoke test
node evals/run.mjs --regrade --iteration 5  # re-grade without re-running
node --test core/scripts/                   # tests of gate.mjs and check-scope.mjs
```
Results land in `evals/workspace/iteration-N/`. `benchmark.json` gives median and range per case, how often each assertion passed, and deltas marked `separated` when the two ranges do not overlap.

## Structure
```
skills/<category>/<skill>/SKILL.md          # the skill; the runner looks for them here
skills/<category>/<skill>/assets/           # templates
skills/<category>/<skill>/evals/evals.json  # cases; files in evals/files/ land in the workdir by their path below it
skills/<category>/<skill>/evals/hidden/     # files for a case's `checks`, copied only after the agent has finished
evals/fixtures/acme-app/         # the project every run starts from, with code and passing tests
core/scripts/                    # gate.mjs and check-scope.mjs, run from a project's root; harness.json gives the gate steps
evals/run.mjs                    # runner, started from edezacas/agent-skills and now specific to Claude Code
docs/brief.md                    # what is being built, the phases and their stop criteria
PLAN.md                          # the stages of the current work on the kit, one PR each
```

## Conventions
- Categories: `engineering` for general architecture and patterns, `stack` for what only applies to one technology, `performance`, and `productivity`
- `CLAUDE.md` is a symlink to `AGENTS.md`; edit `AGENTS.md` only
- Persisted documents are in English; the dialogue is in the user's language
- Skills state the goal and constraints, not steps the model already knows; under 500 lines, templates in `assets/`
- Every description says when to use the skill and when not to
- Every change to a `SKILL.md` bumps `metadata.version`
- An eval assertion marked `guardrail` is a rule the model already follows; it never counts as evidence the skill adds value

## Gotchas
- A `claude -p` eval is a single turn, so `ask-me` cases can only check one round, not a whole interview
- `red_before_code` reads the tool calls and results: a test seen failing before any code was written. It is null when a run wrote no code, and a file written in an unusual way can escape it. `red_in_same_command` marks a test that failed first inside the same shell command that wrote the code, so nobody saw the failure before writing it
- A case's `checks` are shell commands, passed on exit 0, that need no judge; prefer them to an assertion whenever a command can decide
- A check marked `mutant` seeds an error; it counts only in runs whose `reference` check, the tests on correct code, passed
- Cases that name the skill in the prompt are not comparable with a run without the skill: run them with `--configs with`
- Three runs per case by default. A difference that is not `separated` is not evidence, and three runs that do not overlap are still weak evidence
- An installed skill only lists its description, the agent decides whether to read it. A with-skill run with `skill_read=false` is a baseline: cases about behaviour name the skill in the prompt; only cases about activation do not
- `delegate` has `disable-model-invocation`, so the model cannot invoke it: its cases start with `/delegate`, which expands the skill into the prompt, and `skill_read` stays false. Run them with `--configs with --model claude-opus-5-5`, because the mode is built for an Opus session. The skill copies `assets/implementer.md` to `.claude/agents/` at run time
