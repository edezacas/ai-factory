# ai-factory: what is left

The design and the reasons for it are in `docs/brief.md`. This file holds where the work stands and what is left, one PR per item. Finished stages and their results are in git history before this commit.

## Where we are

- The kit installs in Claude Code as the `ai-factory` plugin, from this repo as its own marketplace. A project holds only `harness.json` at its root and its own documents.
- The skills track is closed. `ask-me`, `tdd`, `code-design`, `write-why` and `init-project` are measured, and the five real tasks of phase 1 are done. `angular-conventions`, `init-project` and `web-performance` evals stay unmeasured by choice. A skill reopens only on a failure that repeats in real work.
- `delegate` is at 0.9.0. It is an ordered way to do any task with agents, and three figures guide what comes next.
  - A branch per work, a commit per stage and the scope check cost 17 % more than v0.2.1 with the same result, and they stay.
  - On tasks that fit one session it costs about 2.3 times a hands-on Opus session with the same quality. The extra is the orchestration, accepted for the order it gives.
  - Since 0.8.0 the implementer stops when a task leaves behaviour open, 3 of 3 runs against 1 of 3 before.
- The evals runner keeps cost per model, resumes a session with fixed replies, and checks hidden tests and seeded mutants. Its gotchas are in `AGENTS.md`.

## Left

| # | Item | What changes | Done when |
|---|------|--------------|-----------|
| R7 | The review rule on a large task | Notes, hidden tests and mutants for a task of six to eight stages with one expand, migrate and contract, plus a hands-on twin of the same task. The runner splits the main session's cost before and after the first delegation | Three runs of each. The review rule stays only if the cost after the first delegation goes down, `separated`, with the same hidden tests and mutants |
| R4 | Verifier | `agents/verifier.md`, installed with the plugin | It passes a correct implementation, fails a mutant naming the criterion, leaves `git status` unchanged, and is never launched in three Opus runs that do not mention it |
| 6 | Project setup | `init-project` writes `harness.json` from the project's commands | On a fresh clone of a real project the file is written and the gate passes |
| 7 | Tune skill | `skills/productivity/tune` reads `.harness/log.jsonl` and proposes a change only on a repeated failure, cheapest level first, and also proposes removals | A seeded log with two identical failures gives exactly one proposal and a clean log gives none. It starts only with ten logged stages in one project |
| P | Script permissions | The permission rule for `delegate`'s scripts under the plugin cache | A run outside auto mode starts the scripts without a prompt |

R7 still needs the user's agreement on its task. The proposal is customer accounts and partial cancellation on the order-management reference. `place` goes through expand, migrate and contract to look the email up in a customer store, a new `src/clients/storefront.ts` plays the other team, and cancelling one line within 24 hours refunds that line with an email. Preparing it is one session and the runs another, at an estimated $2 to $4 a run.

An idea not tried yet is fewer diff reads when the implementer reports decisions, now the largest share of avoidable calls in the main session.

## Left out, and what brings it back

- A second tool such as pi, OpenCode or Codex, with its own install, only when a real project works in that tool. The hands-on mode ports with its own agent files. `delegate` needs its delegation rethought per tool, because `skills` preload and resuming a subagent are Claude Code's. The fallback that works anywhere is another session given the task file path.
- A session bootstrap header in `PROGRESS.md`, if a real session fails to resume from it. `delegate` already resumes on load.
- A `SubagentStop` hook running the scripts, if a run shows the main session skipping them.
- A JSON feature list as the source of state, if a run shows the model corrupting `PLAN.md` or `PROGRESS.md`.
- Tester, Haiku for code and parallelism, each on a recorded failure as the brief says.
- From the redesign, each with its condition in the brief, an advisor before stopping, a worktree per work and a hook blocking writes from the verifier.
- Auto-applying `tune` proposals, never. If approval becomes a bottleneck, that is a question for a phase 3 orchestrator.
- A TypeScript installer instead of `init-project`, only if the skill fails to install cleanly in two projects.
