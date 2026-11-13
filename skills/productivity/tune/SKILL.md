---
name: tune
description: Reads a project's `.harness/log.jsonl` and proposes the cheapest change that stops a failure seen twice, or a removal that a run without the piece supports. Use it when the user asks to tune the harness from its log. Do not use it to review code, to judge one stage, or when the project has no log.
disable-model-invocation: true
metadata:
  author: edezacas
  version: "0.3"
---

Turn the corrections the user keeps repeating into a lasting rule, placed where it belongs, and propose nothing the log does not support.

## Always

- Propose and never apply. The user decides each proposal, and the report ends the turn.
- Read only `.harness/log.jsonl`, the project's `AGENTS.md` and the list of skills available in this session. A `task` path in a line is an identifier that groups lines by stage and by work, never a file to open, because finished works leave no plan in the tree.
- Keep what the log shows apart from what you infer. Cite every line you rely on by its `ts`.
- Count a failure as repeated only when the same concrete failure shows twice. Two different failures of the same kind are not a repeat, though the report may name the kind as an inference.

## Flow

### 1. Read

Read the whole log. If it is missing or holds fewer than ten stages, say so and stop, because there is too little to tell a pattern from chance. A stage counts once a `check-scope` line for its task passes. A failing gate line without a task is the base failing before any plan, which is a fact about the repo and not about a stage.

### 2. Sort

Sort the lines into the four causes the log can show.

1. A gate step that fails, the same `step` twice.
2. Work outside the task, the same path in `outOfScope` twice.
3. Stages that needed more than one round to go green, by failing gate lines per `task`. Several passing gate lines for one task are fixes after review, not rounds.
4. Stages sent back after review, the `review` lines with who sent them and why.

A skill that never activates leaves no line, and neither do the implementer's reports, so a test never seen failing is out of reach. Say so once if the user expects it.

If no concrete failure shows twice, say so in one line and stop, without the report.

### 3. Place each repeat

For each repeated failure, infer where its rule belongs and say it is an inference, since one project cannot prove a rule holds beyond it.

1. **The project.** Something only this repo does, such as a pattern its own code already follows. The rule is a line in its `AGENTS.md`, written only from what the log says. Leave out paths and names the log does not give rather than leaving a gap to fill.
2. **A technology.** Something true in any project on that framework or library, such as an API that replaced a deprecated one. The rule is the same line in `AGENTS.md` now, and a draft for a `stack` skill. Look in the available skills for one that covers the technology and draft a change to it. Draft a new skill only for two different failures of the same technology, and when this log already repeats two, draft it now with both rules instead of waiting for more. With one, keep the draft as a line for a later skill.
3. **Design or the way of working.** Something about structure, tests or the flow that does not depend on the technology. The rule is the line in `AGENTS.md` now, and a draft for the available `engineering` or `productivity` skill that covers it.

If `AGENTS.md` already holds the rule and the failure came back after it, the cheapest level has failed, and the proposal moves to the next one, a skill and then a hook or deny rule.

### 4. Propose

Give at most five proposals, the most repeated first. Each answers what failure it fixes, whether something simpler would do, what improvement is expected, what it costs, and whether it still helps with the next model. Each ends with its smallest next step. A draft for a skill is text the user carries to the kit's repo, where it is measured like any skill.

Propose a removal only with evidence, a run without the piece, in an eval or a real task, that did not fail. A log without failures is not evidence, because the piece may be what prevents them.

### 5. Report

Write the report from `assets/report.md` in the user's language.
