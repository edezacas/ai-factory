# ai-factory: what is left

The design and the reasons for it are in `docs/brief.md`. This file holds where the work stands and what is left, one PR per item. Finished stages and their results are in git history before this commit.

## Where we are

- The kit installs in Claude Code as the `ai-factory` plugin, from this repo as its own marketplace. A project holds only `harness.json` at its root and its own documents.
- The skills track is closed. `ask-me`, `tdd`, `code-design` and `write-why` are measured, and the five real tasks of phase 1 are done. A skill reopens only on a failure that repeats in real work. The three skills of v0.1 were measured on Opus in iterations 146 to 148, three runs with and without each.
  - `angular-conventions` is read in 12 of 12 runs that touch Angular and in none of the guard case. `effect()`, `@empty` and `inject()` on review pass 3 of 3 with it and 0 of 3 without. Opus already writes the rest alone.
  - `init-project` at 0.1 was read in 9 of 9 runs, yet on `/init` it wrote only `CLAUDE.md` in all six runs, with and without the skill. Since 0.2 it writes `AGENTS.md` and makes `CLAUDE.md` a symbolic link to it. In iteration 150 that holds in 9 of 9 Opus runs with the skill and in none of 9 without, on `/init`, on `/init` over a real `CLAUDE.md` whose content it keeps, and on a request that names `CLAUDE.md`. It is read in 12 of 12 runs and in none of the guard case. It never writes `harness.json`, which belongs to `delegate` alone.
  - `web-performance` stays without evidence that it helps. Its work is measuring in a browser before and after each change, which a single turn on a fixture cannot check. It is read in 3 of 3 runs on a page that feels slow, in none of 12 that ask for advice and in none of the guard case.
- `delegate` is at 0.10.3. It is an ordered way to do any task with agents, and three figures guide what comes next.
  - A branch per work, a commit per stage and the scope check cost 17 % more than v0.2.1 with the same result, and they stay.
  - On tasks that fit one session it costs about 2.3 times a hands-on Opus session with the same quality. The extra is the orchestration, accepted for the order it gives.
  - Since 0.8.0 the implementer stops when a task leaves behaviour open, 3 of 3 runs against 1 of 3 before.
  - Since 0.10.0 `stage.mjs` logs a fix after review with who asked and why. In case 14, a fix asked at the checkpoint, 3 of 3 Opus runs left the `review` line by the user, at $0.49-0.53 against $0.31-0.37 for case 8 without the fix.
  - On a large task the review rule keeps the main session's cost after the first delegation 11 % lower, `separated`, with the same result, so it stays. Details below.
- The evals runner keeps cost per model, resumes a session with fixed replies, and checks hidden tests and seeded mutants. Its gotchas are in `AGENTS.md`.

## Left

| # | Item | What changes | Done when |
|---|------|--------------|-----------|
| R4 | Verifier | `agents/verifier.md`, installed with the plugin | It passes a correct implementation, fails a mutant naming the criterion, leaves `git status` unchanged, and is never launched in three Opus runs that do not mention it |
| 7 | Tune skill | `skills/productivity/tune` reads only `.harness/log.jsonl`, `review` lines included, and proposes a change only on a repeated failure, cheapest level first, and also proposes removals | A seeded log with two identical failures gives exactly one proposal and a clean log gives none. It starts only with ten logged stages in one project |

## R7 results

Delegate cases 11 to 13, iteration 141, three Opus runs each. The task is `notes/customer-accounts.md` on top of order management: a customer store with `place` going through expand, migrate and contract around `src/clients/storefront.ts`, and line cancellation. Runs planned five to seven stages with three checkpoints. Case 13 is case 11 with a variant of `delegate` that reads every stage's diff, the review rule taken out.

| | 11, rule | 13, no rule | 12, hands-on |
|---|---|---|---|
| Opus before the first delegation | $0.37-0.39 | $0.35-0.39 | |
| Opus after the first delegation | $0.64-0.70, median 0.68 | $0.72-0.91, median 0.76 | |
| Total | $1.32-1.46 | $1.38-1.75 | $0.66-0.72 |
| Checks and mutants | 27/27, 15/15 in every run | 27/27, 15/15 in every run | 18/18 twice, 17/18 once |

- The rule stays. The cost after the first delegation is 11 % lower and `separated`, by two cents, so the evidence is weak. Reading every diff found nothing the scripts missed.
- Totals are not separated, because Sonnet and planning vary more than the saving.
- In one run without the rule the main session wrote code itself, which the judge failed.
- Delegating a large task costs about twice a hands-on Opus session, with the same hidden tests and mutants. One hands-on run's tests disagree with the reference on a detail the notes leave open, so its mutants do not count.
- The split is an estimate from input-side weights, described in `AGENTS.md`.

Fewer diff reads when the implementer reports decisions is dropped as an idea. In two real works on `bluplat-api` nearly every report carried decisions, and reading those diffs found a design flaw and two fixture problems with the gate green.

## Left out, and what brings it back

- A second tool such as pi, OpenCode or Codex, with its own install, only when a real project works in that tool. The hands-on mode ports with its own agent files. `delegate` needs its delegation rethought per tool, because `skills` preload and resuming a subagent are Claude Code's. The fallback that works anywhere is another session given the task file path.
- Running `delegate`'s scripts without a permission prompt outside auto mode, if a real run in another mode is slowed by the prompts. Real runs are in auto mode, where the scripts do not prompt. A plugin cannot ship permission rules, and `allowed-tools` in the skill lapses at the user's next message. The way would be a `bin/` folder in the plugin, which gives the scripts fixed names, plus an allow rule the user adds once. The skill would then call the script alone, one more call per stage, because every part of a compound command needs its own permission. The implementer's gate commands would still prompt, since they belong to each project.
- A session bootstrap header in `PROGRESS.md`, if a real session fails to resume from it. `delegate` already resumes on load.
- A `SubagentStop` hook running the scripts, if a run shows the main session skipping them.
- A JSON feature list as the source of state, if a run shows the model corrupting `PLAN.md` or `PROGRESS.md`.
- Tester, Haiku for code and parallelism, each on a recorded failure as the brief says.
- From the redesign, each with its condition in the brief, an advisor before stopping, a worktree per work and a hook blocking writes from the verifier.
- Auto-applying `tune` proposals, never. If approval becomes a bottleneck, that is a question for a phase 3 orchestrator.
