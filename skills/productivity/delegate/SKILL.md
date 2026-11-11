---
name: delegate
description: An ordered way to do any coding task with agents, large or small. The main session clarifies and plans, the implementer subagent builds each stage from a task file, scripts check every stage and the work stops at agreed checkpoints. Invoked by name only, with the task as argument. Do not use it for a question.
disable-model-invocation: true
argument-hint: <the task>
metadata:
  author: edezacas
  version: "0.7.0"
---

Do any task with agents in order. Clarify before planning, plan before writing code, give each agent only the context it needs, check every stage with scripts and record the decisions at the end.

## Always

- Speak to the user in their language, even after writing English files or reading English reports.
- You write no production code. The implementer analyses nothing, so its task file is all it gets.
- Run the scripts from the project root. Never copy them into the project or write their path into a project file.
  - `node ${CLAUDE_SKILL_DIR}/assets/gate.mjs` runs the gate steps listed in `harness.json` at the project root, for example `{"gate": [{"name": "tests", "run": "npm test"}]}`.
  - `node ${CLAUDE_SKILL_DIR}/assets/stage.mjs <task file> "<message>"` runs the gate and the scope check and commits only if both pass.
- Every tool call rereads the whole session, so put in one shell call whatever can go together.
- Never merge or push. The user integrates the branch.

## On load

1. If the tree is dirty, say what is uncommitted and stop.
2. If `docs/plans/<work>/PROGRESS.md` exists, resume from it and its branch.
3. If `harness.json` is missing, propose one from the project's test and type commands as one more decision of the analysis, and write it once the user confirms.

## Flow

### 1. Analyse

- Explore and reason about the code yourself. A subagent only locates code and returns paths and line ranges, and you read what you will quote.
- Name dependencies, risks and alternatives.
- Run the gate on the untouched tree and judge it by its exit code, not its output. A base that fails is one more decision and never something to plan on.
- Settle every open decision with `ask-me` before any plan. The checkpoints are one of them. Propose one after the first stage, one before anything hard to reverse such as data, a contract phase or a public API, and one at the end, never one per stage by default.

### 2. Plan and branch

Do all of this in one shell call.

- Size the work in stages. A small change is one stage with a single checkpoint at the end.
- Write `PLAN.md` from `assets/PLAN.md` and every task file from `assets/task.md` in `docs/plans/<work>/`, even when there is only one stage.
- Each stage is small, leaves the repo green, adds behaviour a test can observe and can be committed alone.
- A task file holds everything the implementer needs and nothing else, within the template's limits. Copy into it the signatures and types it touches and the gate commands from `harness.json`. A later stage quotes the seam an earlier task file declares, not code that does not exist yet.
- If the work touches data, write how to recover or revert it. A schema or public API change that others use is split into expand, migrate and contract.
- Create `delegate/<work>` from `HEAD`, record the branch and its starting commit in `PROGRESS.md` from `assets/PROGRESS.md`, and commit the plan.

### 3. Each stage

1. **Delegate.** Launch `implementer` with the path of the task file, never a summary. Run one stage at a time, and two in parallel only if neither needs the other's code, seam or result and they change no file in common. Launch `implementer` with the `haiku` model only for what `tdd` excludes, which is renames, formatting, moving files, documentation and fixtures.
2. **Review.** Read the diff only when a script fails, when the report says `stopped` or carries a decision or something open, or at a checkpoint, where you read the diff since the previous one. Otherwise the scripts are the review. To fix a stage, resume the same subagent with the script output or with what is wrong. After two failed rounds stop and ask the user, which is a stop and not a checkpoint.
3. **Commit.** In one call update `PROGRESS.md` with the stage, the gate and scope results, what is left to test, the next step and the decisions the implementer reported, then run `stage.mjs` with the stage's commit message. If it fails nothing is committed and you go back to review. Another session must be able to continue from `PROGRESS.md` alone.

### 4. Checkpoint

- In the commit step, set `PROGRESS.md` to waiting for review. Then name the range to review and end the turn without starting the next stage.
- If the user rejects a checkpoint, return the branch to the previous checkpoint's commit once they agree.

### 5. Finish

These steps run once the user approves the last checkpoint.

1. Run `write-why` and commit its records.
2. Delete `docs/plans/<work>/` in its own commit, because a finished plan goes stale and git keeps it.
3. Report what is left to test, since it is no longer written anywhere.
