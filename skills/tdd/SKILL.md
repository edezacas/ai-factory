---
name: tdd
description: You MUST use this before writing any code that adds or changes behaviour, such as a feature, a bug fix or a new rule, including one-line fixes, and even when the user is in a hurry or did not ask for tests. Tests come first and are seen failing. Skip it only for a rename, formatting, documentation, styles, or a question.
metadata:
  author: edezacas
  version: "0.7"
---

Write the test before the code.

1. **Red:** write the test and see it fail because the behaviour is missing. For a bug, the test reproduces it. If it passes at once, it proves nothing new: fix it.
2. **Green:** implement the behaviour until it passes.
3. **Refactor:** clean up, with the tests green and no new behaviour.

Rules for the tests:

- **Source:** test what the requirement states. If the expected result has no source, write no test and report it as open.
- **Seam:** the one the task names; if none, choose it and say so. Go through the public interface, with no side channels.
- **Behaviour:** assert what it does, not how it does it, and never the text or structure of a file.
- **Expected values:** literals from the requirement or a worked example. Never change one to match what the code returns.
- **Mocks:** only what you do not own, never your own modules.

If the project has no test setup, use the runner its stack ships with, and ask before adding a dependency.

A failure must never leave data half-changed or be silently swallowed.
