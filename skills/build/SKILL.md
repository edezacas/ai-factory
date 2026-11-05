---
name: build
description: Take a feature from prompt to validated code, unsupervised once the decisions are settled: ask-me, spec, plan, one task at a time with the test first, validation against the spec, write-why. Read this first, before exploring or writing any code, whenever asked to build, add or implement a feature end to end or to execute an existing plan. Not for a small fix that needs no spec, a question, or a review.
metadata:
  author: edezacas
  version: "0.4"
---

# Build

Deliver what the spec asks for, proven against the spec. Each step reads from files and leaves its result in files, so any step can be resumed from a clean context.

## The flow

| Step | Skill | Leaves behind |
|---|---|---|
| 1. Decisions | `ask-me` | every decision settled and confirmed |
| 2. Spec | none | closed spec |
| 3. Plan | `plan` | one file per task, in `docs/plans/<slug>/` |
| 4. Each task, in order | `tdd`, `code-design`, `hexagonal`, `tidy` | green repo, one commit, updated task file |
| 5. Validate | none | criterion-by-criterion evidence |
| 6. Record | `write-why` | records, or none |

Without a closed spec, start at step 1 and write no code. The user takes part only there. From step 2 on, never ask: a question is a block (see below).

If a named skill is not available, keep to the outcome this file describes and say so in the report.

## The spec

Write it from the confirmed account of `ask-me`, with `assets/spec-template.md`, where the repo keeps specs or else in `docs/specs/<slug>.md`. It adds no decision of its own.

- **Reasons and rejected alternatives are the ones stated**, or `not stated`, never inferred.
- **Criteria are observable.** Given/When/Then, with literal values where values matter, so a test can be written from them without seeing any implementation. Every limit settled in the interview has a criterion.
- **No tasks and no implementation.**

## Each task

Tasks follow `assets/task-template.md`. A task holds everything needed to do it; read that file and what it points to, not the rest of the plan.

1. Write the test from the task's criteria and seam, before deciding how to implement.
2. Check it fails for the expected reason.
3. Write the least code that passes, then simplify with the tests untouched.
4. Run the whole suite. Commit the task alone, on a branch that is not the default one. Never push or merge.
5. Update the task's state.

## Handoffs

When a session ends or the context runs short, the task file is the handoff. Update it so that someone with no memory of the session can continue.

- A claim nobody ran goes under **Not verified**.
- Point to the spec and other files by path instead of copying them.
- Keep long output in files. The session keeps the path and one line.

## Repair

A failure gets a new attempt that starts by reading **Dead ends**. Record each failed approach there and why it failed. Each attempt tries something not on that list. When nothing untried remains, it is a block.

## Blocks

Stop the task, and do not work around it, when:

- the spec contradicts itself or leaves open a decision that changes behaviour;
- a test seems wrong for the real structure of the code;
- the repair attempts have run out.

Never pick the missing decision, edit the spec, weaken a test or special-case a value to get past it. An expected value comes from the spec, never from what the code returns. Undo the work on the blocked criterion so the repo is green with nothing standing in for the missing decision: a reported block with a guess in the code is still a guess.

Implementation choices within the spec's limits are yours and are not blocks.

Write the block in the task file with what is needed to lift it. Go on only with tasks that do not depend on it, then report.

## Validate

Read the spec again, not the plan or your notes. For each criterion, exercise the behaviour and record the evidence: command and result. A criterion no task covered is a failure, even if every task is done. Failures become repair tasks.

## Record

Pass the spec's decisions and those taken along the way to `write-why`, which decides whether any deserves a record.

## Report

Short, and to be read cold: each criterion with passed, failed or not verified; blocks and what lifts them; the outcome of `write-why`; paths to everything else. Persisted documents are in English; speak in the user's language.
