---
name: tdd
description: Applies test-driven development, so the test comes first and is seen failing. Use before writing code that adds or changes behaviour, such as a feature, a bug fix or a new rule, even when nobody asked for tests. Skip it for a rename, formatting, documentation, styles, or a question.
metadata:
  author: edezacas
  version: "0.10"
---

Write the test before the code.

1. **Red:** write the test and see it fail because the behaviour is missing or wrong. For a bug, the test reproduces it. If it passes at once, find out why; never force a failure.
2. **Green:** implement the behaviour until it passes.
3. **Refactor:** clean up, with the tests green and no new behaviour.

Rules for the tests:

- **Source:** test each behaviour and limit that the requirement, an agreed decision or an existing contract states. If the expected result has no source, write no test and report it as open.
- **Seam:** the one the task names; if none, the narrowest public interface that shows the behaviour, and say which. No side channels.
- **Behaviour:** assert what it does, not how it does it, and never the text or structure of a file in the repo.
- **Expected values:** literals from the source or a worked example. Never change one to match what the code returns.
- **Doubles:** only at the edge of the process, such as network, time, a third party, or a port that wraps them. Never internal collaborators.

If code-design is available, follow it for the tests and the code.

Follow the project's test setup. If it has none, use the runner its stack ships with, and ask before adding a dependency.

When a step of an operation can fail, test that the failure leaves no data half-changed and is not swallowed. This needs no other source.
