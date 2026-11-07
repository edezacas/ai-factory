# ai-factory as a portable harness

## Goal

Turn ai-factory from a set of skills plus `delegate` into a minimal harness kit that installs in any project. It targets Claude Code, built on a base that another tool (pi, OpenCode) can be added to by writing an adapter and nothing else: portable core (skills, templates, scripts, roles), one Claude Code adapter, and a feedback loop that records evidence per project and proposes changes a human approves.

## Where we are

- Skills, `delegate` and the scripts are independent tracks; none waits for another.
- Skills: `ask-me`, `tdd`, `code-design`, `write-why`, `init-project` measured with the runner; 2 of 5 real tasks done, one of them the large task, which phase 1 finished in one session without losing context.
- `delegate`: the implementer delegated by hand from an Opus session (stage 2) still pending.
- `delegate` v0.2 exists and is Claude Code specific: `Task`, `.claude/agents/`, `model`, `skills` preload, `SubagentStop` hook (not built yet).
- Templates live in `skills/productivity/delegate/assets/`. No scripts, no session bootstrap, no per-project log.

## Decisions this plan adds to `docs/brief.md`

- Claude Code is the only target for now. Portability is a design discipline, not a deliverable: the test is whether a person without Claude Code could run the whole flow with the repo's files and scripts alone.
- Rules that keep the base portable at no cost: state and contracts in neutral files (`PLAN.md`, task files, `PROGRESS.md`, `harness.json`, the log); checks in scripts with no Claude in them, hooks only call them; skills speak of files and scripts, never of tool primitives (`Task`, `.claude/agents`), with anything Claude Code specific in a short section at the end or in the adapter; role text separate from its agent frontmatter; everything tool-specific in `adapters/claude-code/`, so a leak into the core is visible.
- Three layers in the kit: `core/` (skills, templates, scripts, roles), `adapters/claude-code/` (the only adapter), and the installer (`init-project`).
- What a project learns stays in the project. It moves into the kit only when it repeats in two projects, by hand, with an eval.
- The harness does not edit itself. Deterministic sensors write a log; a skill invoked by name reads it and proposes additions or removals; the user approves.
- Leiva's rule for growth: a line only after the same failure twice; cheapest level first (`AGENTS.md` line, then skill, then hook or deny rule); every proposal answers the five questions.

## Stages

Each stage leaves the repo green and can be committed alone. "Green" is `node evals/run.mjs --only <skill> --cases 1 --runs 1` for a touched skill, plus the scripts' own smoke test once they exist.

| # | Stage | Task file | What changes | Behaviour to keep | Validation | Checkpoint |
|---|-------|-----------|--------------|-------------------|------------|------------|
| 1 | Brief update | `docs/plans/harness/01-brief.md` | `docs/brief.md`: decisions above, revised phase 2 order, `init-project` as installer, tune skill in "only if data" list | Phases and stop criteria logic | Read-through against this plan | no |
| 2 | Implementer by hand | `docs/plans/harness/02-implementer.md` | Nothing in the repo unless the run shows it; notes in `PROGRESS.md` | Everything | One real task in a real repo: did `skills` preload apply, did the report fit, cost | **yes** |
| 3 | Gate and scope scripts | `docs/plans/harness/03-gate.md` | `core/scripts/gate.sh`, `core/scripts/check-scope.sh`; commands read from `harness.json` in the project; both append one JSON line to `docs/harness/log.jsonl` on every run | Skills untouched | Run both on `evals/fixtures/acme-app` and on one real project; exit codes and log lines correct | no |
| 4 | Session bootstrap | `docs/plans/harness/04-bootstrap.md` | `core/scripts/init.sh`; `PROGRESS.md` template gains a "Resume" header (read `PROGRESS.md`, `git log`, run `init.sh`, run gate, then work); `delegate` step 0 | `delegate` steps 1 to 6 | New session with no history resumes one in-progress task from `PROGRESS.md` alone | **yes** |
| 5 | Core and adapter layout | `docs/plans/harness/05-layout.md` | Move templates to `core/templates/`, `implementer.md` role text to `core/roles/`; `adapters/claude-code/` with the agent frontmatter, `settings.json` hook calling the scripts, permission policy; `delegate` SKILL.md names files and scripts, with a short Claude Code section at the end; no abstraction over adapters, there is one | Runner still finds `skills/<category>/<skill>/`; `delegate` evals pass with `--configs with` | `node evals/run.mjs --only delegate --configs with --runs 1`; smoke in real project | **yes** |
| 6 | Installer | `docs/plans/harness/06-installer.md` | `init-project` installs the kit: copies core and the Claude Code adapter, creates `harness.json` and `AGENTS.md` through `ask-me` if missing, leaves `init.sh` working | `init-project` evals | Install into a fresh clone of a real project, run `init.sh` and gate | no |
| 7 | Tune skill | `docs/plans/harness/07-tune.md` | `skills/productivity/tune`: reads `log.jsonl` and `PROGRESS.md`, proposes a change only on a repeated failure, cheapest level first, five questions answered, also proposes removals; invoked by name; writes nothing without approval | Other skills | Starts only with at least 10 logged stages in one project; eval: a seeded log with two identical failures yields exactly one proposal, a clean log yields none | **yes** |
| 8 | Phase 2 vs phase 1 A/B | `docs/plans/harness/08-ab.md` | Runner case for the expand/migrate/contract task in acme-app, as the brief describes | Everything | Three runs each; stop criteria from the brief | no |

Parallel: stages 2 and 3 are independent and can go in any order. `delegate` uses the scripts once they exist.

## Recovery

No data is touched. Each stage is one PR; revert the PR.

## Left out, and what brings it back

- A second adapter (`adapters/pi/`, `adapters/opencode/`): only when a real project works in that tool. The hands-on mode should port with the adapter alone; `delegate` will need its delegation rethought per tool, because `skills` preload, `SubagentStop` and resuming a subagent are Claude Code's. The fallback that works anywhere is another session given the task file path.
- A JSON feature list as source of state: only if a run shows the model corrupting `PLAN.md` or `PROGRESS.md`.
- Independent validator, tester, Haiku for code, parallelism: unchanged from the brief, each on a recorded failure.
- Auto-applying `tune` proposals: never. If approval becomes a bottleneck, that is a phase 3 orchestrator question, not a skill change.
- A TypeScript installer instead of the `init-project` skill: only if the skill fails to install cleanly in two projects.
