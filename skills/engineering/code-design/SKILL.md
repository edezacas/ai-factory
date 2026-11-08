---
name: code-design
description: You MUST use this before writing code that adds or changes behaviour. It keeps the code clean with just enough architecture, without classes, layers, files or abstractions that nothing needs. Skip it only for a rename, formatting, documentation, styles, or a question.
metadata:
  author: edezacas
  version: "0.7"
---

The best code is the code never written. Solve the whole problem with the least new code, in clean code with just enough architecture. This applies to the tests as well: no test helpers, fixtures or layers until they are needed.

- **Separate concerns, with the structure that exists.** Business rules, data access, presentation and calls to external services each stay in their own place, using the places the repo already has. Add a layer, module, context or port only when a concern has nowhere to go. Fewer lines never justify mixing them.
- **Keep business rules free of I/O and frameworks.** A business rule, such as who gets a discount or how much, can be tested with plain values, without a repository, a gateway, a framework or a mock. The code around it reads the data, passes it in and acts on the result. This holds even when the rule fits in one line, and for every rule you write or change, even where the repo mixes them elsewhere; leave the rest as it is.
- **Abstract only what varies today.** No interface, base class or factory with a single implementation. An interface for I/O at the edge, such as a gateway or a repository, is a port: add one only where the repo already uses them.
- **Choose the smallest form.** A line before a helper, a helper before an abstraction. When you abstract or break a convention, say so in your reply.
- **Reuse before writing.** The repo, the standard library, an installed dependency. Don't merge code that only looks similar. Never add a dependency for a few lines.
- **Make operations idempotent.** Running the same operation twice, or again after a crash halfway through, ends in the same state as running it once. Two different requests are still two operations.
- **Comment only what code cannot say.** A workaround, a hidden invariant, a trade-off. Never where the code came from, such as a ticket or a plan.
