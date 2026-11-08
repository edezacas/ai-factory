---
name: code-design
description: You MUST use this before writing code that adds or changes behaviour. It keeps the code clean with just enough architecture, without classes, layers, files or abstractions that nothing needs. Skip it only for a rename, formatting, documentation, styles, or a question.
metadata:
  author: edezacas
  version: "0.7"
---

The best code is the code never written. Solve the whole problem with the least new code, in clean code with just enough architecture. This applies to the tests as well: no test helpers, fixtures or layers until they are needed.

- **Separate concerns within the existing structure.** Business rules, data access, presentation and external calls each in their own place, so the next change is easy. Add a layer or module only when a concern has nowhere to go. Fewer lines never justify mixing them.
- **Keep business rules free of I/O and frameworks.** They are tested with plain values; the caller reads, passes the data in and acts on the result. Even for one line, and only in code you touch.
- **Abstract only what varies today.** No interface, base class or factory with one implementation.
- **Choose the smallest form.** A line before a helper, a helper before an abstraction. Say in your reply when you abstract or break a convention.
- **Reuse before writing.** The repo, the standard library, an installed dependency. Never a new dependency for a few lines.
- **Make operations idempotent.** Repeating the same operation, even after a crash halfway through, reaches the same state. Two different requests are still two.
- **Comment only what code cannot say.** A workaround, a hidden invariant, a trade-off. Never a ticket or a plan.
