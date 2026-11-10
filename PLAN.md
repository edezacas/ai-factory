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
- `delegate` is at v0.3 (2026-11-10): R1, R2, R3, R5 and R6 are done, with their results below. A branch per work, a commit per stage, the scope check and an untouched `main` stay after R6: they cost 17 % more than v0.2.1 on case 1, below the 30 % cap, with the same result. Whether the review rule saves anything is decided in R7, on a larger task. R4 (verifier) is pending and independent.
- Install: in Claude Code, one plugin from this repo as its own marketplace (stage 5, not built yet); until then, by hand into `~/.agents/skills/` and `~/.claude/agents/`. `gate.mjs` and `check-scope.mjs` live in `delegate`'s `assets/` and log the skill version; only `harness.json` lives in a project, at its root. `PLAN.md` and `PROGRESS.md` of a work go in `docs/plans/<work>/`. `delegate` is invoked by name only, and the user treats it as an agent, so it may name other skills. Other tools (pi, OpenCode, Codex) decide their own install when added.
- Claude Code specific: `Agent`, `.claude/agents/`, `model`, `skills` preload. No `SubagentStop` hook and no session bootstrap yet.

## Decisions this plan adds to `docs/brief.md`

- Claude Code is the only target for now. Portability is a design discipline, not a deliverable: the test is whether a person without Claude Code could run the whole flow with the repo's files and scripts alone.
- Rules that keep the base portable at no cost: state and contracts in neutral files (`PLAN.md`, task files, `PROGRESS.md`, `harness.json`, the log); checks in scripts with no Claude in them; skills speak of files and scripts, never of tool primitives, with anything Claude Code specific in a short section at the end. The agent definitions are the only files written for one tool.
- Layout (changed on 2026-11-10, replacing `core/` and `adapters/claude-code/`): what a skill needs lives in its folder; an agent lives next to the skill that launches it, or in `agents/` when no skill owns it. In Claude Code everything installs as one plugin; a project holds only `harness.json` at its root and its own documents.
- What a project learns stays in the project. It moves into the kit only when it repeats in two projects, by hand, with an eval.
- The harness does not edit itself. Deterministic sensors write a log; a skill invoked by name reads it and proposes additions or removals; the user approves.
- Leiva's rule for growth: a line only after the same failure twice; cheapest level first (`AGENTS.md` line, then skill, then hook or deny rule); every proposal answers the five questions.

## Stages

Each stage leaves the repo green and can be committed alone. "Green" is `node evals/run.mjs --only <skill> --cases 1 --runs 1` for a touched skill, plus the scripts' own smoke test once they exist.

| # | Stage | Task file | What changes | Behaviour to keep | Validation | Checkpoint |
|---|-------|-----------|--------------|-------------------|------------|------------|
| 1 | Brief update | `docs/plans/harness/01-brief.md` | `docs/brief.md`: decisions above, revised phase 2 order, `init-project` as installer, tune skill in "only if data" list | Phases and stop criteria logic | Read-through against this plan | no |
| 2 | Implementer by hand (done) | `docs/plans/harness/02-implementer.md` | Nothing in the repo unless the run shows it; notes in `PROGRESS.md` | Everything | One real task in a real repo: did `skills` preload apply, did the report fit, cost | **yes** |
| 3 | Gate and scope scripts (done; moved into `delegate`'s `assets/` in R5) | `docs/plans/harness/03-gate.md` | `gate.mjs`, `check-scope.mjs` (Node, no dependencies); steps read from `harness.json` in the project; both append one JSON line to `docs/harness/log.jsonl` on every run | Skills untouched | Run both on `evals/fixtures/acme-app` and on one real project; exit codes and log lines correct | no |
| 4 | Session bootstrap | `docs/plans/harness/04-bootstrap.md` | `PROGRESS.md` template gains a "Resume" header (read `PROGRESS.md`, `git log`, run the gate, then work); `delegate` step 0 already resumes from it | `delegate` steps 1 to 7 | New session with no history resumes one in-progress task from `PROGRESS.md` alone | **yes** |
| 5 | Claude Code plugin | `docs/plans/harness/05-plugin.md` | `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json` at the root: one plugin, `ai-factory`, listing the skill folders by category (`./skills/engineering`, ...) and the agents by file (`./skills/productivity/delegate/assets/implementer.md`, later `./agents/verifier.md`), with a `version` bumped on every release. `delegate` reaches its scripts through `${CLAUDE_SKILL_DIR}/assets/` | Runner still installs skills into `.claude/skills/`; `delegate` evals pass with `--configs with` | `claude plugin validate .`; on a clean `CLAUDE_CONFIG_DIR`, after `/plugin marketplace add` and `/plugin install`: every skill listed, `/ai-factory:delegate` launches the implementer on Sonnet from the first session, and `claude --debug` shows `tdd` and `code-design` preloaded (to settle whether the agent needs `ai-factory:tdd`); the permission rule for the scripts under the plugin cache | **yes** |
| 6 | Project setup | `docs/plans/harness/06-project.md` | `init-project` writes `harness.json` at the root from the project's commands and an `AGENTS.md` through `ask-me` if missing; copies nothing else | `init-project` evals | On a fresh clone of a real project: `harness.json` written, the gate passes | no |
| 7 | Tune skill | `docs/plans/harness/07-tune.md` | `skills/productivity/tune`: reads `log.jsonl` and `PROGRESS.md`, proposes a change only on a repeated failure, cheapest level first, five questions answered, also proposes removals; invoked by name; writes nothing without approval | Other skills | Starts only with at least 10 logged stages in one project; eval: a seeded log with two identical failures yields exactly one proposal, a clean log yields none | **yes** |
| 8 | Phase 2 vs phase 1 A/B | `docs/plans/harness/08-ab.md` | Runner case for the expand/migrate/contract task in acme-app, as the brief describes | Everything | Three runs each; stop criteria from the brief | no |

Parallel: stages 2 and 3 are independent and can go in any order. `delegate` uses the scripts once they exist.

## Redesign of `delegate` (v0.3)

Design and reasons are in `docs/brief.md`. The task for every measurement is `skills/productivity/delegate/evals/files/notes/order-management.md` on `evals/fixtures/acme-app`: the fixture already places and lists orders, so the work is the confirmation email, cancellation and the refund. Runs use `--configs with --model claude-opus-5-5 --permission-mode bypassPermissions --also tdd,code-design,write-why --budget 10`.

| # | Stage | What changes | Behaviour to keep | Validation | Checkpoint |
|---|-------|--------------|-------------------|------------|------------|
| R1 | Exploratory run of v0.2 | `evals/run.mjs` keeps `modelUsage` per model instead of only its sum. One run of `delegate` case 1 as it is: one turn, up to the first checkpoint | Totals in `benchmark.json`; every other skill's evals | `benchmark.json` shows tokens and cost per model for the run. Recorded here: cost of one run, the Opus and Sonnet shares, and whether the main session's tokens can be split by phase from `stream-json` | **yes**: the cost decides how many runs R3 and R6 take and whether they go to the end |
| R2 | Baseline tooling | Hidden tests and mutants for the email, cancellation and refund in `delegate/evals/hidden/`. A case can carry fixed replies (`confirmed`, `continue`) that the runner sends by resuming the session until the work ends or the replies run out | One-turn cases run as before | The hidden tests pass on a correct implementation written by hand in a copy of the fixture, and each mutant fails them. A two-reply smoke case resumes the same session | no |
| R3 | Baseline | Nothing in the code. Three runs of v0.2 to the end, or what R1 decided | Everything | Recorded here per run and as median and range: tokens and cost per model, time, number of stages, hidden tests and mutants | **yes**: if the split by phase contradicts the review hypothesis, the design changes before R5 |
| R4 | Verifier | `agents/verifier.md`, one agent file installed globally like the implementer | `delegate` and every skill untouched | On a copy of the fixture with a correct implementation and its task file: `pass`. With one R2 mutant applied: `fail`, naming the criterion. `git status` is the same before and after. In three Opus runs of a coding task that does not mention it, the main session never launches it | **yes** |
| R5 | `delegate` v0.3 | `SKILL.md` at 0.3, the task, plan and progress templates, the implementer's report; the fixture gets a `harness.json`; case 1 gains the replies and checks for the branch, one commit per stage, task files within 120 lines and gate and scope lines in the log | Cases 2 and 3: nothing settled asks first, a one-change task is not delegated | `node evals/run.mjs --only delegate --configs with --model claude-opus-5-5 --runs 1` | no |
| R6 | v0.3 against the baseline | Nothing in the code. The same runs as R3 on v0.3, with the same replies | Everything | Same measures as R3. This task's diffs are too small for the review rule to save, so R6 decides only the safety pieces (a branch per work, a commit per stage, the scope check, `main` untouched): they stay if the hidden tests and mutants match the baseline and the median cost is at most 30 % above it ($1.37). Otherwise revert R5 | **yes** |
| R7 | The review rule on a large task | Notes, hidden tests and mutants for a task of six to eight stages with diffs across several files and one expand, migrate and contract; three baseline runs on v0.2.1 and three on v0.3 | Case 1 and its figures | v0.3's review rule stays only if the main session's cost after the first delegation is lower and `separated`, with the same hidden tests and mutants | **yes**, the end |

R4 is independent of R5 and R6 and can go in any order after R2, whose mutants it uses. The first real-repo task on v0.3 records the two figures the brief asks for about `Explore`.

**Next: R7.** Proposed to the user on 2026-11-10 and not yet agreed:
- **The task.** On the fixture with order management already built (the R2 reference), "customer accounts and partial cancellation". A customer store holds the email. `place` goes through expand, migrate and contract: `place(customerId, lines)` looks up the email, a new `src/clients/storefront.ts` plays the other team and is migrated, then the `email` parameter goes. Cancelling one line within 24 hours refunds that line and recalculates the total, with an email for it. That makes six to eight stages, with diffs across several files.
- **The notes** settle the interface, error messages, concurrency and edge cases before the first run, as R2 and R3 taught.
- **Hidden tests, a reference and mutants,** with `mutants/catch.mjs`, validated as in R2.
- **The runner** computes the split by phase itself, from per-model prices, into `timing.json`: the main session's cost before and after the first delegation. It also installs a skill from a git ref (`--skill-ref`), so the baseline runs v0.2.1 while master holds v0.3.
- **The runs:** three on v0.2.1 and three on v0.3, estimated at $2-4 each.
- Preparing this, the first four items, is one session; the runs and the decision another.

### R1 results (2026-11-10, iterations 118 to 122)

- **Cost of one run to the first checkpoint** (iteration 122, one turn, stage 1 delegated): $0.465 in 124 s. Opus $0.403 (87 %, 164k tokens), Sonnet $0.062 (13 %, 49k tokens). The implementer took 25 s and 12.5k tokens. Checks 5/5, judge 5/8.
- **Split by phase: possible.** Subagent messages carry `parent_tool_use_id` and their own model; each `Agent` result carries `totalTokens` and `totalDurationMs`; main-session messages group by the tools they call. Messages must be counted once by `id`: summing every event gives 292k Opus tokens instead of 164k.
- **R3 decision:** a full run of three stages is estimated at $1 to $1.5, not measured, so R3 and R6 take three runs each to the end.
- **What the case needed before it measured anything:**
  - `dontAsk` refuses writes under `.claude/` even for allowed tools: the runner gained `--permission-mode` (iteration 118).
  - The notes left real gaps (the email address, shipping), and Opus asked instead of planning: the notes now settle them (119). It then found smaller gaps each time, so the prompt tells it to take the option it recommends and say which (120).
  - An agent copied to `.claude/agents/` during the session is not loaded in that session: v0.2 fell back to a `general-purpose` agent on Opus, for $0.536 with no Sonnet (121). The case now starts with the implementer installed, a symlink to `assets/implementer.md`. In a real repo the first `delegate` session pays that fallback.
- **Carried into R2:**
  - The judge sees the response and the files, not the tool calls, so it fails "implementer launched with the path" and "main session wrote no code" even when the events show both. The judge needs the list of subagents launched, or the runner decides these two by itself.
  - "Placing, listing and cancelling in separate stages" is wrong for this fixture, which already lists orders.

### R2 results (2026-11-10)

- The notes settle the interface (another team already calls it), so hidden tests can call the agent's code: `evals/hidden/test/hidden/order-management.test.ts`, 10 tests, one per rule. They pass on the reference in `evals/hidden/mutants/order-management/src/`, and each of the 9 mutants (a `sed` on `order-service.ts`) fails them. Case 1 checks the agent's code against the hidden tests and the agent's tests against the reference and each mutant. Simulated: tests copied from the hidden ones catch 9/9, one weak test catches 0/9.
- A case's `replies` are sent one per turn with `--resume`, until they run out, a turn fails, or `until` exits 0. Case 1 has five `continue` and stops when `PROGRESS.md` says `**Status:** done`. Smoke case 4: three turns, one `session_id`, check passed ($0.07, Sonnet).
- The judge gets the subagents the main session launched, with model and start of prompt, and the code files it wrote itself, counted by write target, not by any path a heredoc mentions. On iterations 121 and 122 it lists the implementer that did not run, the Opus fallback, the Sonnet implementer, and no code from the main session. Case 1's assertions now describe a full run; the listing one is gone.

### R3, first attempt (iteration 124, discarded)

Three runs: $0.86, $0.91 and $1.13 (corrected, see R5); Opus about 81 % of the cost; 3, 3 and 4 stages. In the main session, analysis and plan took 19 to 31 % of the cost and everything after the first delegation 69 to 81 %, which does not contradict the review hypothesis. Weights were relative list prices, not the billed cost. Discarded because of the case, not the skill:

- The reference failed in all three runs, so no mutant counted: the agents' tests asserted error messages and a concurrency rule the notes left open. The notes now settle the four messages, two concurrent cancels and shipping a cancelled or shipped order. There are 12 hidden tests and 12 mutants, all caught.
- Run 3 wrote `PLAN.md` and `PROGRESS.md` under `docs/plans/order-management/`, so `until` never matched and the run sent all five replies. `delegate` 0.2.1 now says both go in `docs/plans/<work>/`, and the checks and `until` look there.
- The judge truncated each file at 4000 characters and failed a complete task file; the limit is now 8000 per file and 48 000 in all.
- In review the main session runs its own mutations with `sed -i` on `src/` and restores the file. The judge counts that as the main session writing code. It stays counted: it is review cost.

### R3 results: the v0.2.1 baseline (iteration 125, 2026-11-10)

| Run | Cost | Opus | Sonnet | Time | Stages | Replies | Judge | Hidden tests | Mutants caught |
|-----|------|------|--------|------|--------|---------|-------|--------------|----------------|
| 1 | $1.15 | $0.90 | $0.25 | 371 s | 4 | 1 | 8/8 | pass | 12/12 |
| 2 | $1.00 | $0.77 | $0.23 | 301 s | 4 | 1 | 7/8 | pass | 12/12 |
| 3 | $1.05 | $0.83 | $0.22 | 334 s | 4 | 1 | 8/8 | pass | 12/12 |

- Median cost $1.05 [1.00-1.15], Opus about 78 %. Corrected in R5: the runner had summed the cumulative cost of every turn. Median time 334 s [301-371]. Every run stopped after stage 1, took one `continue` and finished the other three stages in that turn.
- **Split by phase:** in the main session, analysis and plan took 22 to 28 % of the cost, and launching, reviewing and recording after the first delegation took 72 to 78 %. This does not contradict the review hypothesis, so R5 keeps the design. The figures are relative list-price weights, not the billed cost.
- **Mutants:** in all three runs the agents tested details the notes leave open, which the reference does not follow. All three chose that a second concurrent cancel waits for the first and retries if its refund fails. Two of the three log a failed email with `console.error`, which the reference now does too. Mutants are now counted by `mutants/catch.mjs` (see `AGENTS.md`). The column above was re-checked on the run outputs from fresh workdirs after the change; `benchmark.json` still holds the old count.
- The judge's only fail: run 2, the 24-hour reason.

### Stage 5, the plugin (2026-11-10, branch `plugin`)

- `.claude-plugin/marketplace.json` and `plugin.json` at the root; `claude plugin validate .` passes, warning only that there is no icon. `delegate` 0.3.1 reaches its scripts through `${CLAUDE_SKILL_DIR}`; the README installs through the plugin.
- Checked with `--plugin-dir` on the fixture: all eight skills are discovered from the four category folders, as `ai-factory:<skill>`; the agent loads as `ai-factory:implementer`, runs on Sonnet, and received `tdd` and `code-design` preloaded with their bare names (it quoted each one's first line). `${CLAUDE_SKILL_DIR}` is substituted with the skill's real folder, for a plugin skill and for one installed in a project's `.claude/skills/`, so the runner keeps working.
- Installed from the local marketplace on an empty `CLAUDE_CONFIG_DIR`: added, installed, enabled, eight skills listed. `claude plugin details` counts 0 agents, with the agent declared by path and with it in a default `agents/` folder alike, so the count is not evidence either way. Still to check in a real session after `/plugin install`: `/agents` lists `ai-factory:implementer`, and `/ai-factory:delegate` launches it. Also left: the permission rule for the scripts under the plugin cache.

### R5 results (iteration 126, 2026-11-10)

- **Runner fix.** A resumed session reports `total_cost_usd` and `modelUsage` for the whole session so far, while `num_turns` and `duration_ms` are per turn: in iteration 126 the third turn had 3 turns and 11 s, and reported $1.33. The runner had summed every turn's result and over-counted every case with replies. It now takes cost and usage from the last result. `timing.json` and `benchmark.json` of iterations 123 to 126 were recomputed from their events; the figures above are the corrected ones.
- **One run of v0.3** (`--runs 1`, as the stage asks): case 1 passed every check (the reference one is informational), the judge 8/8, 12/12 mutants, a `delegate/order-management` branch with seven commits on an untouched `main`, task files of 62 to 93 lines, and gate and scope lines in the log. Cases 2 and 3 passed: nothing is delegated before asking, and a one-change task is not delegated.
- **Cost:** $1.33 (Opus $1.08, Sonnet $0.26) against the baseline's median $1.05. Per turn, v0.3 spent $0.71 on the plan and stage 1 against $0.47 to $0.51, $0.56 on stages 2 to 4 against $0.54 to $0.67, and $0.06 on a third turn, because the end is now a checkpoint and the reply only set `done`. The plan holds 32 % of the main session against 22 to 28 %: longer task files (19.9k characters against 14 to 15k) and reading the scripts. The review did not get cheaper on this fixture, where each stage's diff is small. One run is not evidence; R6 decides.

### R6 results (iteration 127, 2026-11-10)

| | v0.2.1 (iteration 125) | v0.3 (iteration 127) |
|---|---|---|
| Cost, median [range] | $1.05 [1.00-1.15] | $1.23 [1.19-1.29] |
| Opus / Sonnet, median | $0.83 / $0.23 | $1.01 / $0.22 |
| Time, median | 334 s | 349 s |
| Stages | 4, 4, 4 | 4, 4, 4 |
| Hidden tests | pass in all three | pass in all three |
| Mutants caught | 12/12 in all three | 12/12 in all three |
| Judge | 8, 7, 8 of 8 | 8, 7, 7 of 8 |

- v0.3 costs 17 % more, `separated`, below the $1.37 cap, with the same hidden tests and mutants. Decision: the safety pieces stay (a branch per work, a commit per stage, the scope check, `main` untouched). The review rule waits for R7.
- The difference is all Opus; Sonnet is unchanged. It sits in the plan, as R5 showed.
- To watch: the judge failed "the 24-hour reason written as not stated" in two of three runs, against one of three. No run invented a reason; they just did not write `not stated`. Not separated, so not evidence.

## Recovery

No data is touched. Each stage is one PR; revert the PR.

## Left out, and what brings it back

- A second tool (pi, OpenCode, Codex), with its own way to install: only when a real project works in that tool. The hands-on mode should port with its own agent files; `delegate` will need its delegation rethought per tool, because `skills` preload and resuming a subagent are Claude Code's. The fallback that works anywhere is another session given the task file path.
- A `SubagentStop` hook running the scripts: the main session runs them itself; back if a run shows it skipping them.
- A JSON feature list as source of state: only if a run shows the model corrupting `PLAN.md` or `PROGRESS.md`.
- Tester, Haiku for code, parallelism: unchanged from the brief, each on a recorded failure. The verifier is stage R4.
- From the redesign, each with its condition in the brief: an advisor before stopping, a worktree per work, a hook blocking writes from the verifier.
- Auto-applying `tune` proposals: never. If approval becomes a bottleneck, that is a phase 3 orchestrator question, not a skill change.
- A TypeScript installer instead of the `init-project` skill: only if the skill fails to install cleanly in two projects.
