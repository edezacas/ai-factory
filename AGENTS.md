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
```
Results land in `evals/workspace/iteration-N/`. `benchmark.json` gives median and range per case, how often each assertion passed, and deltas marked `separated` when the two ranges do not overlap.

## Structure
```
skills/<skill>/SKILL.md          # the skill; the runner looks for them here
skills/<skill>/assets/           # templates
skills/<skill>/evals/evals.json  # cases; files in evals/files/ land in the workdir by their path below it
skills/<skill>/evals/hidden/     # files for a case's `checks`, copied only after the agent has finished
evals/fixtures/acme-app/         # the project every run starts from, with code and passing tests
evals/run.mjs                    # runner, started from edezacas/agent-skills and now specific to Claude Code
docs/brief.md                    # what is being built, the phases and their stop criteria
```

## Conventions
- `CLAUDE.md` is a symlink to `AGENTS.md`; edit `AGENTS.md` only
- Persisted documents are in English; the dialogue is in the user's language
- Skills state the goal and constraints, not steps the model already knows; under 500 lines, templates in `assets/`
- Every description says when to use the skill and when not to
- Every change to a `SKILL.md` bumps `metadata.version`
- An eval assertion marked `guardrail` is a rule the model already follows; it never counts as evidence the skill adds value

## Gotchas
- A `claude -p` eval is a single turn, so `ask-me` cases can only check one round, not a whole interview
- `test_before_code` reads the tool calls, so it can miss a file written in an unusual way; it is null when a run did not write both tests and code
- A case's `checks` are shell commands, passed on exit 0, that need no judge; prefer them to an assertion whenever a command can decide
- Three runs per case by default. A difference that is not `separated` is not evidence, and three runs that do not overlap are still weak evidence
- An installed skill only lists its description, the agent decides whether to read it. A with-skill run with `skill_read=false` is a baseline: cases about behaviour name the skill in the prompt; only cases about activation do not
