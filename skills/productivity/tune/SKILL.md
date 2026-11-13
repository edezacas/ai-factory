---
name: tune
description: Reads a project's `.harness/log.jsonl` and proposes the cheapest lasting rule for each failure seen twice. Use it when the user asks to tune the harness from its log. Do not use it to review code, to judge one stage, or when the project has no log.
disable-model-invocation: true
metadata:
  author: edezacas
  version: "0.4"
---

Turn the corrections the user keeps repeating into a lasting rule, placed where it belongs, and propose nothing the log does not support.

## Always

- Propose and never apply. The user decides each proposal, and the report ends the turn.
- Read only `.harness/log.jsonl`, the project's instructions file and the list of skills available in this session. The instructions file is `AGENTS.md`, or `CLAUDE.md` when there is no `AGENTS.md`, and if both exist as separate files read both. A `task` path in a line only groups lines by stage and by work, and is never a file to open, because finished works leave no plan in the tree.
- Keep what the log shows apart from what you infer, and cite every line you rely on by its `ts`.
- A failure repeats only when the same concrete failure shows twice, in any wording. Two different failures of the same kind are not a repeat.

## Flow

### 1. Read

Read the whole log. If it is missing or holds fewer than ten stages, say so and stop, because there is too little to tell a pattern from chance. A stage counts once a `check-scope` line for its task passes. A failing gate line without a task is the base failing before any plan, a fact about the repo and not about a stage.

### 2. Sort

Sort the lines into the four causes the log can show.

1. A gate step that fails, the same `step` twice.
2. Work outside the task, the same path in `outOfScope` twice.
3. Stages that needed more than one round to go green, by failing gate lines per `task`. Several passing gate lines for one task are fixes after review, not rounds.
4. Stages sent back after review, the `review` lines with who sent them and why.

The log has no line for a skill that never activates or for what the implementer reported, such as a test never seen failing. If no concrete failure shows twice, say so in one line and stop, without the report.

### 3. Place each repeat

Infer where each repeated failure's rule belongs, and say it is an inference, since one project cannot prove a rule holds beyond it. Every rule gets a line for the instructions file now, written only from what the log says, without paths or names the log does not give. A project with no instructions file gets a proposal to create `AGENTS.md`.

1. **The project.** Something only this repo does, such as a pattern its own code already follows. The line is all.
2. **A technology.** Something true in any project on that framework or library, such as an API that replaced a deprecated one. Draft also a change to the available `stack` skill that covers it. With none, draft a new skill once this log repeats two different failures of that technology, with both rules, and with only one keep the draft as a line for a later skill.
3. **Design or the way of working.** Something about structure, tests or the flow that does not depend on the technology. Draft also a change to the available `engineering` or `productivity` skill that covers it.

If the instructions file already holds the rule, it did not prevent the failure. Do not propose the line again, and propose the next level instead, a skill and then a hook or deny rule.

### 4. Propose and report

Write the report from `assets/report.md` in the user's language, with at most five proposals, the most repeated first. A draft for the kit is text the user carries to the kit's repo, where it is measured like any skill.

Propose a removal only with evidence, a run without the piece, in an eval or a real task, that did not fail. A log without failures is not evidence, because the piece may be what prevents them.
