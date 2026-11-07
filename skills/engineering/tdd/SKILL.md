---
name: tdd
description: You MUST use this before writing any code that adds or changes behaviour, such as a feature, a bug fix or a new rule, including one-line fixes, and even when the user is in a hurry or did not ask for tests. Tests come first and are seen failing. Skip it only for a rename, formatting, documentation, styles, or a question.
metadata:
  author: edezacas
  version: "0.13"
---

Write the test before the code.

1. **Red:** write the test and see it fail because the behaviour is missing or wrong. For a bug, the test reproduces it. If it passes at once, find out why; never force a failure.
2. **Green:** implement the behaviour until it passes. Comment only what the code cannot say, such as a workaround, a hidden invariant or a trade-off; never where it came from, such as a plan section, a decision id or a ticket.
3. **Refactor:** clean up, with the tests green and no new behaviour.

Rules for the tests:

- **Source:** test each behaviour and limit that the requirement, an agreed decision or an existing contract states. If the expected result has no source, write no test and report it as open.
- **Seam:** the one the task names; if none, the narrowest public interface that shows the behaviour, and say which. No side channels.
- **Behaviour:** assert what it does, not how it does it, and never the text or structure of a file in the repo.
- **Expected values:** literals from the source or a worked example. Never change one to match what the code returns.
- **Doubles:** only at the edge of the process, such as network, time, a third party, or a port that wraps them. Never internal collaborators.

Follow the project's test setup. If it has none, use the runner its stack ships with, and ask before adding a dependency.

When a step of an operation can fail, test that the failure leaves no data half-changed and is not swallowed. This needs no other source.
