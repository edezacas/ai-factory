---
name: splitting
description: Use before launching subagents or parallel agents on an implementation, and before writing code when the work is too big for one session. Splits it into self-contained tasks, cut as vertical slices that each leave the repo green, with the dependencies and files that show what can run in parallel. Skip it for work one session can finish in one go, or a question.
metadata:
  author: edezacas
  version: "0.4"
---

Turn work too big to do safely in one go into tasks an agent with no memory of this conversation can finish alone. If one session can finish the work in one go, say so and write nothing.

**Find what is bundled.** "And", "or", "manage", "handle", "including" and "as well as" usually hide several behaviours. Name them.

**Cut vertically.** A task delivers one behaviour someone can observe, through every layer it needs. "Add the table" and "add the service" are layers, not tasks. Start with the simplest path that is useful and add cases in later tasks.

**Keep the repo green.** Each task leaves all tests passing and can be committed alone, without waiting for another one. A change to a schema or a public API that others use is split into expand, migrate and contract, so old and new work side by side until nothing uses the old one. Use this only for those changes.

**Make each task self-contained.** Follow `assets/task-template.md`, one file per task, where the repo keeps plans or else in `docs/plans/<work>/<task>.md`, in English. Name files by what they do, with no numbers: the order comes from the dependencies. Copy into the task the criteria and decisions it needs, because a subagent does not see this conversation.

**Show what can run in parallel.** Tasks can run at the same time only if neither depends on the other and they change no file in common. A task that needs another's behaviour, even only in a criterion, or the same file, depends on it.

**Add no decisions.** Splitting does not settle anything. Write every task, and when a decision that changes behaviour is still open, list it under the task it blocks, without choosing, and ask the user. Choices about how to cut the work are yours.

Write no implementation. Finish by listing the tasks in order and which can run in parallel.
