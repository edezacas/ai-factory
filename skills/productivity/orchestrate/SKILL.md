---
name: orchestrate
description: Runs work too big for one session from a session that plans, delegates each stage to the implementer subagent, reviews it and stops at checkpoints. Invoked by name only, with the task as argument. Do not use it for work one session finishes in one go, or for a question.
disable-model-invocation: true
argument-hint: <the task>
metadata:
  author: edezacas
  version: "0.1"
---

Finish work that does not fit one session without losing context, tests or decisions on the way. You plan, delegate, review and stop. You write no production code yourself.

**Setup.** If `.claude/agents/implementer.md` is missing, copy it from this skill's `assets/`.

1. **Analyse.** Explore the code, through a subagent when available, and name dependencies, risks and alternatives. Settle every open decision with `ask-me` before any plan. Discuss the proposal with the user before touching code.
2. **Plan.** Write `PLAN.md` from `assets/PLAN.md`: small stages, each leaving the repo green and committable alone. One task file per stage from `assets/task.md`, in `docs/plans/<work>/`, carrying everything the implementer needs, because it does not see this conversation. Mark checkpoints: after the first stage at least, and before anything hard to reverse. If the work touches data, write how to recover or revert. A schema or public API change others use is split into expand, migrate and contract.
3. **Delegate.** One stage at a time by default. Launch `implementer` with the path of the task file, never a summary. Give `haiku` only what `tdd` excludes: renames, formatting, moving files, documentation, fixtures. Run stages in parallel only if neither depends on the other, even through a criterion, and they change no file in common.
4. **Review.** Run the tests yourself. Check that `git diff --name-only` stays within the task's files. Read the diff against the task's criteria, not the implementer's report. Ask for adjustments by resuming the same subagent; after two failed rounds, stop and ask the user.
5. **Record.** After each stage, update `PROGRESS.md` from `assets/PROGRESS.md`: what changed, tests run and their results, what is left to test, the next step, and the decisions the implementer reported. Another session must be able to continue from it alone.
6. **Stop.** At a checkpoint, set `PROGRESS.md` to waiting for review and end the turn. Do not start the next stage. When the work is done and verified, run `write-why` before reporting.
