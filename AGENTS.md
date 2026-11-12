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
node --test skills/productivity/delegate/evals/scripts.test.mjs  # tests of delegate's scripts
```
Results land in `evals/workspace/iteration-N/`. `benchmark.json` gives median and range per case, how often each assertion passed, and deltas marked `separated` when the two ranges do not overlap.

## Structure
```
skills/<category>/<skill>/SKILL.md          # the skill; the runner looks for them here
skills/<category>/<skill>/assets/           # templates; delegate's also holds its scripts (gate, check-scope, stage), run from a project's root, where harness.json gives the gate steps
skills/<category>/<skill>/evals/evals.json  # cases; files in evals/files/ land in the workdir by their path below it
skills/<category>/<skill>/evals/hidden/     # files for a case's `checks`, copied only after the agent has finished
agents/<agent>.md                # the subagents, installed with the plugin: the implementer and the verifier
evals/fixtures/acme-app/         # the project every run starts from, with code and passing tests
evals/run.mjs                    # runner, started from edezacas/agent-skills and now specific to Claude Code
docs/brief.md                    # what is being built and why, the phases and their stop criteria
docs/measurements.md             # every measured result, the baseline for the next change; add a row when a measurement decides something
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
- A `claude -p` eval is a single turn unless the case has `replies`: the runner sends them one per turn, resuming the same session, until they run out or the case's `until` command exits 0. Fixed replies cannot answer what the agent asks, so `ask-me` cases still check one round, not a whole interview
- `red_before_code` reads the tool calls and results: a test seen failing before any code was written. It is null when a run wrote no code, and a file written in an unusual way can escape it. `red_in_same_command` marks a test that failed first inside the same shell command that wrote the code, so nobody saw the failure before writing it
- `main_cost_before_first_delegation_usd` and `main_cost_after_first_delegation_usd` split the main session's cost at the first `Agent` call, and are null without one. The stream gives only partial output tokens per message, so each message is weighed by its input and cache tokens at list-price ratios and its model's cost is shared out by those weights: an estimate that adds up to the model's cost, not a billed figure
- A case file under `evals/files/.claude/skills/<skill>/` replaces the installed one after install, so a case can run a variant of a skill, as `delegate` case 13 does with the review rule taken out. A case's `timeout_s` sets its limit per turn, 300 s by default
- A case's `uncommitted` files, each `{ file, as }`, are copied after the fixture commit, so the run starts with a change in the working tree over a clean `HEAD`. A case that reviews a change needs it, because every other case file is part of that commit
- The judge reads each file up to 8,000 characters and 48,000 in all. A file that does not fit is left out, named to the judge and listed in `grading.json` as `files_left_out`, with a warning on the console. Cases run with `--model claude-opus-5-5` are judged by the same model that did the work
- `--also` installs its skills on both sides, so a run with and a run without differ only in the skill under test. Each run keeps its input files in `baseline.json`, which `--regrade` gives back to the judge; an iteration from before 2026-11-12 has none and is re-graded without them, with a warning
- A case's `checks` are shell commands, passed on exit 0, that need no judge; prefer them to an assertion whenever a command can decide
- A check marked `mutant` seeds an error; it counts only in runs whose `reference` check, the tests on correct code, passed. `delegate` case 1 has no `reference` check: its agent decides details the notes leave open and tests them, so `mutants/catch.mjs` counts a mutant as caught when an agent test that passes on the reference fails on the mutant
- Cases that name the skill in the prompt are not comparable with a run without the skill: run them with `--configs with`
- Three runs per case by default. A difference that is not `separated` is not evidence, and three runs that do not overlap are still weak evidence
- An installed skill only lists its description, the agent decides whether to read it. A with-skill run with `skill_read=false` is a baseline: cases about behaviour name the skill in the prompt; only cases about activation do not. Run activation cases with `--model claude-opus-5-5`. Sonnet seldom opens more than one skill, and with every skill installed it opened `code-design` in 1 of 15 runs that wrote code, while Opus opened it 12 of 12. Sonnet also writes code through Bash heredocs instead of Write or Edit
- `delegate` has `disable-model-invocation`, so the model cannot invoke it: its cases start with `/delegate`, which expands the skill into the prompt, and `skill_read` stays false. Run them with `--configs with --model claude-opus-5-5`, because the mode is built for an Opus session. Add `--permission-mode bypassPermissions --also tdd,code-design,write-why`: `dontAsk` refuses writes under `.claude/`, and the implementer preloads those skills. An agent copied to `.claude/agents/` during a session is not loaded in that session, so case 1 starts with the implementer installed, a symlink to `agents/implementer.md`. The judge gets the subagents the main session launched and the code files it wrote itself
- The verifier has no skill, so its cases are `delegate` cases 15 to 19, run with `--configs with`. It inherits the session's model, so `--model` sets the verifier's too. Checks cannot see the reply, so the verdict is the judge's and the unchanged tree is a check
