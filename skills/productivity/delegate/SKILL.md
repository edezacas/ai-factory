---
name: delegate
description: Runs work too big for one session from a session that plans, delegates each stage to the implementer subagent, reviews it and stops at checkpoints. Invoked by name only, with the task as argument. Do not use it for work one session finishes in one go, or for a question.
disable-model-invocation: true
argument-hint: <the task>
metadata:
  author: edezacas
  version: "0.3"
---

Finish work that does not fit one session without losing context, tests or decisions on the way. You analyse, plan, delegate, review and stop. You write no production code yourself, and the implementer analyses nothing: its task file is all it gets.

**Needs.** The `implementer` agent, installed globally. `gate.mjs` and `check-scope.mjs` in this skill's `assets/`, run with `node` from the project root by their path in this skill's folder; never copy them into the project or write that path into a project file. `harness.json` at the project root, with the gate's ordered steps: `{"gate": [{"name": "tests", "run": "npm test"}]}`.

0. **Start.** On a dirty tree, say what is uncommitted and stop. If `docs/plans/<work>/PROGRESS.md` exists, resume from it and its branch. If `harness.json` is missing, propose one from the project's test and type commands as one more decision in step 1, and write it once confirmed.
1. **Analyse.** Explore and reason about the code yourself. A subagent only locates: it returns paths and line ranges, and you read what you will quote. Name dependencies, risks and alternatives. Settle every open decision with `ask-me` before any plan, the checkpoints among them: propose them after the first stage, before anything hard to reverse (data, a contract phase, a public API) and at the end, never one per stage by default.
2. **Plan.** Before the first stage, write `docs/plans/<work>/PLAN.md` from `assets/PLAN.md` and every task file from `assets/task.md`, in the same folder. Small stages, each leaving the repo green, adding behaviour a test can observe and committable alone. A task file holds everything the implementer needs and nothing else, within the template's limits; copy into it the signatures and types it touches, and the gate steps' commands from `harness.json`. A later stage quotes the seam an earlier task file declares, not code that does not exist yet. A task with an open decision is not delegated. If the work touches data, write how to recover or revert. A schema or public API change others use is split into expand, migrate and contract.
3. **Branch.** Create `delegate/<work>` from `HEAD`, record the branch and the commit it started from in `PROGRESS.md` from `assets/PROGRESS.md`, and commit the plan.
4. **Delegate.** One stage at a time by default. Launch `implementer` with the path of the task file, never a summary. Give `haiku` only what `tdd` excludes: renames, formatting, moving files, documentation, fixtures. Run stages in parallel only if neither depends on the other, even through a criterion, and they change no file in common.
5. **Review.** Run `gate.mjs`, then `check-scope.mjs <task file>`. Read the diff only when a script fails, when the report says `stopped` or carries a decision or something open, or at a checkpoint, where you read the diff since the previous one. Otherwise the scripts are the review. To fix a stage, resume the same subagent with the script output or what is wrong; after two failed rounds, stop and ask the user, which is a stop, not a checkpoint.
6. **Commit.** When both scripts pass, update `PROGRESS.md`: the stage, gate and scope results, what is left to test, the next step and the decisions the implementer reported. Then make one commit for the stage, `docs/harness/log.jsonl` included. Another session must be able to continue from `PROGRESS.md` alone.
7. **Stop.** At a checkpoint, set `PROGRESS.md` to waiting for review, name the range to review, and end the turn. Do not start the next stage. A rejected checkpoint returns the branch to the previous checkpoint's commit once the user agrees. Never merge or push: the user integrates the branch. When the work is done and verified, run `write-why` and commit its records before reporting.
