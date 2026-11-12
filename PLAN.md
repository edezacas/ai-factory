# ai-factory: what is left

The design and the reasons for it are in `docs/brief.md`. This file holds where the work stands and what is left, one PR per item. Finished stages are in git history, and their results in `docs/measurements.md`.

## Where we are

- The kit installs in Claude Code as the `ai-factory` plugin, from this repo as its own marketplace.
- The skills track is closed. Every skill but `web-performance` is measured, and the five real tasks of phase 1 are done. A skill reopens only on a failure that repeats in real work.
- `delegate` is at 0.11.0, measured against hands-on work on small and large tasks.
- The verifier is built, at `agents/verifier.md`. It meets its criteria on a small change, and is not measured on a large one.
- The evals runner keeps cost per model, resumes a session with fixed replies, and checks hidden tests and seeded mutants. Its gotchas are in `AGENTS.md`.

The figures behind each of these are in `docs/measurements.md`, and the brief gives the decision each supports.

## Left

| # | Item | What changes | Done when |
|---|------|--------------|-----------|
| 7 | Tune skill | `skills/productivity/tune` reads only `.harness/log.jsonl`, `review` lines included, and proposes a change only on a repeated failure, cheapest level first, and also proposes removals | A seeded log with two identical failures gives exactly one proposal and a clean log gives none. It starts only with ten logged stages in one project |
| 8 | Parallel stages and the scripts | `delegate` allows two stages in parallel, and its plan template has a `Parallel` line, but the scripts cannot close them. `check-scope.mjs` compares the whole tree with one task file, so it fails on the other stage's files, and `stage.mjs` commits with `git add -A`, so one commit would take both. Either the skill and the template stop offering it, or each parallel stage gets its own worktree | Two stages changed at once in one tree no longer fail each other's scope check, or the skill no longer offers them. A test in `scripts.test.mjs` covers the one chosen |

## Left out, and what brings it back

- A second tool such as pi, OpenCode or Codex, with its own install, only when a real project works in that tool. The hands-on mode ports with its own agent files. `delegate` needs its delegation rethought per tool, because `skills` preload and resuming a subagent are Claude Code's. The fallback that works anywhere is another session given the task file path.
- Running `delegate`'s scripts without a permission prompt outside auto mode, if a real run in another mode is slowed by the prompts. Real runs are in auto mode, where the scripts do not prompt. A plugin cannot ship permission rules, and `allowed-tools` in the skill lapses at the user's next message. The way would be a `bin/` folder in the plugin, which gives the scripts fixed names, plus an allow rule the user adds once. The skill would then call the script alone, one more call per stage, because every part of a compound command needs its own permission. The implementer's gate commands would still prompt, since they belong to each project.
- A session bootstrap header in `PROGRESS.md`, if a real session fails to resume from it. `delegate` already resumes on load.
- A `SubagentStop` hook running the scripts, if a run shows the main session skipping them.
- A JSON feature list as the source of state, if a run shows the model corrupting `PLAN.md` or `PROGRESS.md`.
- A way to hold a stage whose report carries a behaviour the implementer chose, if a real work commits such a choice without the user being asked. The implementer stops on a gap in its task file in about 3 runs of 10 and two rewordings did not change it, but it names the choice under `Open` every time, and the main session's analysis asked about the same gap in 3 of 3 runs. Seen once in a real work, where the main session relayed it at the checkpoint. The place for it is `delegate`'s review step, not the implementer.
- Tests for `evals/run.mjs`, if the runner fails again in a way a test would have caught. Its functions would first have to be split from its start-up.
- A tester that never sees the implementation, if tests appear written after the code. It forces the interface to be fixed before the code, which pulls against `code-design`.
- Haiku for code, if a task shows that delegating and reviewing it costs less than Sonnet.
- An advisor before stopping, if in two stages the stop after two failed rounds is resolved by an answer that was not the user's decision to make. Try Claude Code's own advisor first, which is experimental and needs the Anthropic API.
- A worktree per work, the first time the user needs to work in the repo while `delegate` runs, or to run two works at once. Then `git worktree add` in a sibling folder, which is plain git.
- What `delegate` does with a `fail` verdict from the verifier, if a failed verification is twice fixed outside the flow or approved as it is. Today the skill only says to wait for approval after the verdict, so the user decides. The verifier's report already names the criterion, the file and the line, so it can go to the implementer as it is, under the same limit of two rounds.
- An unattended run started from a GitHub issue: the user opens the issue and an agent clarifies, plans, implements and verifies with the kit's skills, and ends in a pull request, never a merge. It is phase 3 in the brief and comes back on that phase's conditions. Three things are open. `ask-me` assumes a user who answers, so the run would ask in the issue's comments only what blocks it, and assume and list the rest. The correction loop with the verifier becomes required, with a limit of rounds, and at the limit the run comments on the issue and stops. And it is not a layer over `delegate`, whose checkpoints end the turn. Its name is not decided, and `handoff` already names a skill in the references.
- Measuring the verifier on a large change, with the customer-accounts reference and its 15 mutants, or on a failure that only running reveals, if it passes a real change that later proves wrong. Its cases use a seeded error that reading one line finds.
- A verifier on a model other than the author's in a hands-on session, if a verification by the author's own model passes what another model catches.
- A hook that blocks writes from the verifier's shell, the first time the verifier leaves the tree changed, which its report shows. A shell can write even without edit tools, and a deny rule is not a boundary.
- `passing` and `accepted` as separate states, if the verifier's verdict has to be stored between sessions.
- `Explore` returning code fragments instead of only locations, if a real work shows the main session's cost before the plan dominating while no implementer explores beyond its task file.
- `write-why` adding one line to `AGENTS.md` that points to the records folder, if agents miss a recorded decision twice, in a real project or in an eval like write-why case 8. A script or hook only if the line fails too.
- Rewriting records that a change contradicts, or a periodic pass that finds stale ones, if stale records show up in use. It can live in `tune` or in its own skill.
- A `hexagonal` skill, no. `code-design` covers most of it, and a skill that can add layers would pull against one that holds them back. If a dependency that makes tests slow or brittle needs a port, that is a line in `code-design`.
- A `tidy` skill, if the agent is seen leaving code dirty after green, and then only after trying `/simplify` and a stronger Refactor step in `tdd`. Neither this nor `hexagonal` was measured, so both are judgement.
- With no condition yet: llm-council, strategy and OKRs, double red and emoji narration in `tdd`, starter markers, a fact cache with hash, and model routing per phase beyond the fixed model per subagent.
