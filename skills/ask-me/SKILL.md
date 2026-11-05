---
name: ask-me
description: Use this before implementing anything, once you have explored what you need and before writing or changing any code, on any request to build, add, fix or change something when a requirement, term, edge case or decision is not explicitly settled, even if a sensible default seems obvious. Interviews the user so no decision is forgotten and none is taken on their behalf. Skip it only for a change whose outcome is fully specified or a question about what exists.
metadata:
  author: edezacas
  version: "0.6"
---

Prevent two failures: a **forgotten decision**, which nobody noticed had to be made, and a **phantom decision**, which reaches the work without anyone making it.

A decision is settled only when the user states it, accepts your recommendation or explicitly delegates it. Silence, an unanswered recommendation, a convention, an inference, or "that's enough" with something still open settles nothing. Never invent a reason: write `not stated`.

Map the decisions as a tree. Look for what the request does not mention: failure, existing data, permissions, what depends on this. Challenge words with two meanings, test limits with concrete scenarios, and show where the user's words and the code disagree. Skip anything whose every answer leads to the same outcome.

Work in rounds. Ask every decision whose prerequisites are settled, then wait. Whatever depends on an answer still open belongs to a later round. Word each question so "yes" accepts your recommendation:

```
**Q1. <Yes/no question stating your recommendation>**
Why: <reason>
Instead: <real alternative, and why not; or "none">
```

Facts are not the user's job. Look up what the repo or the tools can answer, through a subagent when available; only the questions that depend on it wait. A fact you cannot establish stays an open question.

When nothing is open, show what is settled and ask the user to confirm:

- **Decided:** each decision, its stated reason or `not stated`, and the rejected alternatives. Mark what was delegated.
- **Out of scope:** what was left out.

Anything you are still assuming is not on this list: ask it first. The account stays in the conversation; write no file.
