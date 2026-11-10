# ai-factory as a portable harness

## Goal

Turn ai-factory from a set of skills plus `delegate` into a minimal harness kit that installs in any project. It targets Claude Code, built on a base that another tool (pi, OpenCode) can be added to by writing an adapter and nothing else: portable core (skills, templates, scripts, roles), one Claude Code adapter, and a feedback loop that records evidence per project and proposes changes a human approves.

## Where we are

- Skills, `delegate` and the scripts are independent tracks; none waits for another.
- Skills: `ask-me`, `tdd`, `code-design`, `write-why`, `init-project` measured with the runner. The 5 real tasks of phase 1 are done (2026-11-06 to 2026-11-09). One of them is the large task, which phase 1 finished in one session without losing context. The third counts with caveats, because its prompt also asked to delegate.
  - No cleanup was requested after green in any task, so `tidy` stays out. No session compacted.
  - `tdd` showed red before code whenever it opened. Since `code-design` v0.6, `code-design` and `tdd` open on their own before code.
  - Removable production code found by an independent review: about 4%, 9%, 2% and 12% in tasks 2 to 5.
  - Repeated misses:
    - In 4 of 5 tasks, a decision was taken or changed during implementation without asking. Once it contradicted a confirmed one. `ask-me` is no longer active by then.
    - In 3 tasks, existing code or repo conventions were not reused.
    - Comments still restate the code in task 5 with `code-design` open.
    - Twice, the user and not the agent raised a key risk. One task opened with a "how do we" question, so `ask-me` did not open.
  - Follow-up on 2026-11-09:
    - A spec that contradicts itself: the agent asks in every run, and its own choice is sensible. It stays as a `tdd` guardrail case.
    - `ask-me` 0.12 skips only when the request says exactly what to change.
    - Reuse and conventions did not reproduce in a 27-file repo: the model reuses on its own there.
    - Activation is measured with Opus. Sonnet opened `code-design` in 1 of 15 runs.
  - **The skills track is closed.** `angular-conventions`, `init-project` and `web-performance` stay unmeasured by choice. A skill reopens only on a failure that repeats in real work.
- `delegate`: stage 2 done on 2026-11-08 with two tasks in a real repo. `skills` preload applies; red before code, only the listed files, the report fits. Cost: a one-line task took about 78k input tokens in the implementer (Sonnet) and about 570k in the Opus session that wrote the task file and reviewed it; a six-file task took about 196k in the implementer. Misses: the implementer chose a case the task did not cover instead of stopping, and reported it; it skipped tests the task file called optional; its report lists only tests, so the main session could not see other commands it ran.
- `delegate` is being redesigned as v0.3 (see "Redesign of `delegate`" in `docs/brief.md` for the design, and the stages below). Before it is built, v0.2 runs one task in `evals/fixtures/acme-app` and its tokens per model (`modelUsage`) are recorded as the baseline, because the real-repo figures above cannot be repeated. The redesign is kept only if it costs less on that same task, with the same result.
- `delegate` v0.2 exists and is Claude Code specific: `Task`, `.claude/agents/`, `model`, `skills` preload, `SubagentStop` hook (not built yet).
- Templates live in `skills/productivity/delegate/assets/`. `core/scripts/gate.mjs` and `check-scope.mjs` exist and write `docs/harness/log.jsonl`. There is no session bootstrap yet.

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
| 2 | Implementer by hand (done) | `docs/plans/harness/02-implementer.md` | Nothing in the repo unless the run shows it; notes in `PROGRESS.md` | Everything | One real task in a real repo: did `skills` preload apply, did the report fit, cost | **yes** |
| 3 | Gate and scope scripts | `docs/plans/harness/03-gate.md` | `core/scripts/gate.mjs`, `core/scripts/check-scope.mjs` (Node, no dependencies); steps read from `harness.json` in the project; both append one JSON line to `docs/harness/log.jsonl` on every run | Skills untouched | Run both on `evals/fixtures/acme-app` and on one real project; exit codes and log lines correct | no |
| 4 | Session bootstrap | `docs/plans/harness/04-bootstrap.md` | `core/scripts/init.sh`; `PROGRESS.md` template gains a "Resume" header (read `PROGRESS.md`, `git log`, run `init.sh`, run gate, then work); `delegate` step 0 | `delegate` steps 1 to 6 | New session with no history resumes one in-progress task from `PROGRESS.md` alone | **yes** |
| 5 | Core and adapter layout | `docs/plans/harness/05-layout.md` | Move templates to `core/templates/`, `implementer.md` role text to `core/roles/`; `adapters/claude-code/` with the agent frontmatter, `settings.json` hook calling the scripts, permission policy; `delegate` SKILL.md names files and scripts, with a short Claude Code section at the end; no abstraction over adapters, there is one | Runner still finds `skills/<category>/<skill>/`; `delegate` evals pass with `--configs with` | `node evals/run.mjs --only delegate --configs with --runs 1`; smoke in real project | **yes** |
| 6 | Installer | `docs/plans/harness/06-installer.md` | `init-project` installs the kit: copies core and the Claude Code adapter, creates `harness.json` and `AGENTS.md` through `ask-me` if missing, leaves `init.sh` working | `init-project` evals | Install into a fresh clone of a real project, run `init.sh` and gate | no |
| 7 | Tune skill | `docs/plans/harness/07-tune.md` | `skills/productivity/tune`: reads `log.jsonl` and `PROGRESS.md`, proposes a change only on a repeated failure, cheapest level first, five questions answered, also proposes removals; invoked by name; writes nothing without approval | Other skills | Starts only with at least 10 logged stages in one project; eval: a seeded log with two identical failures yields exactly one proposal, a clean log yields none | **yes** |
| 8 | Phase 2 vs phase 1 A/B | `docs/plans/harness/08-ab.md` | Runner case for the expand/migrate/contract task in acme-app, as the brief describes | Everything | Three runs each; stop criteria from the brief | no |

Parallel: stages 2 and 3 are independent and can go in any order. `delegate` uses the scripts once they exist.

## Redesign of `delegate` (v0.3)

Design and reasons are in `docs/brief.md`. The task for every measurement is `skills/productivity/delegate/evals/files/notes/order-management.md` on `evals/fixtures/acme-app`: the fixture already places and lists orders, so the work is the confirmation email, cancellation and the refund. Runs use `--configs with --model claude-opus-5-5`.

| # | Stage | What changes | Behaviour to keep | Validation | Checkpoint |
|---|-------|--------------|-------------------|------------|------------|
| R1 | Exploratory run of v0.2 | `evals/run.mjs` keeps `modelUsage` per model instead of only its sum. One run of `delegate` case 1 as it is: one turn, up to the first checkpoint | Totals in `benchmark.json`; every other skill's evals | `benchmark.json` shows tokens and cost per model for the run. Recorded here: cost of one run, the Opus and Sonnet shares, and whether the main session's tokens can be split by phase from `stream-json` | **yes**: the cost decides how many runs R3 and R6 take and whether they go to the end |
| R2 | Baseline tooling | Hidden tests and mutants for the email, cancellation and refund in `delegate/evals/hidden/`. A case can carry fixed replies (`confirmed`, `continue`) that the runner sends by resuming the session until the work ends or the replies run out | One-turn cases run as before | The hidden tests pass on a correct implementation written by hand in a copy of the fixture, and each mutant fails them. A two-reply smoke case resumes the same session | no |
| R3 | Baseline | Nothing in the code. Three runs of v0.2 to the end, or what R1 decided | Everything | Recorded here per run and as median and range: tokens and cost per model, time, number of stages, hidden tests and mutants | **yes**: if the split by phase contradicts the review hypothesis, the design changes before R5 |
| R4 | Verifier | `core/roles/verifier.md` and its frontmatter in `adapters/claude-code/`, joined into one agent file on install | `delegate` and every skill untouched | On a copy of the fixture with a correct implementation and its task file: `pass`. With one R2 mutant applied: `fail`, naming the criterion. `git status` is the same before and after. In three Opus runs of a coding task that does not mention it, the main session never launches it | **yes** |
| R5 | `delegate` v0.3 | `SKILL.md` at 0.3, the task, plan and progress templates, the implementer's report; the fixture gets a `harness.json`; case 1 gains the replies and checks for the branch, one commit per stage, task files within 120 lines and gate and scope lines in the log | Cases 2 and 3: nothing settled asks first, a one-change task is not delegated | `node evals/run.mjs --only delegate --configs with --model claude-opus-5-5 --runs 1` | no |
| R6 | v0.3 against the baseline | Nothing in the code. The same runs as R3 on v0.3, with the same replies | Everything | Same measures as R3. v0.3 stays only if its cost is lower and `separated`, with the hidden tests and mutants as in the baseline; otherwise revert R5 | **yes**, the end |

R4 is independent of R5 and R6 and can go in any order after R2, whose mutants it uses. The first real-repo task on v0.3 records the two figures the brief asks for about `Explore`.

## Recovery

No data is touched. Each stage is one PR; revert the PR.

## Left out, and what brings it back

- A second adapter (`adapters/pi/`, `adapters/opencode/`): only when a real project works in that tool. The hands-on mode should port with the adapter alone; `delegate` will need its delegation rethought per tool, because `skills` preload, `SubagentStop` and resuming a subagent are Claude Code's. The fallback that works anywhere is another session given the task file path.
- A JSON feature list as source of state: only if a run shows the model corrupting `PLAN.md` or `PROGRESS.md`.
- Tester, Haiku for code, parallelism: unchanged from the brief, each on a recorded failure. The verifier is stage R4.
- From the redesign, each with its condition in the brief: an advisor before stopping, a worktree per work, a hook blocking writes from the verifier.
- Auto-applying `tune` proposals: never. If approval becomes a bottleneck, that is a phase 3 orchestrator question, not a skill change.
- A TypeScript installer instead of the `init-project` skill: only if the skill fails to install cleanly in two projects.
