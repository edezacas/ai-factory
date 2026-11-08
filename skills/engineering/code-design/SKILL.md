---
name: code-design
description: You MUST use this before writing code that adds or changes behaviour. It keeps the design simple and the code small, without classes, layers, files or abstractions for needs nobody has stated. Skip it only for a rename, formatting, documentation, styles, or a question.
metadata:
  author: edezacas
  version: "0.7"
---

The best code is the code never written. Solve the whole problem with the least new code. This applies to the tests as well: no test helpers, fixtures or layers until they are needed.

- **Don't build for guessed needs.** A need nobody has stated gets no code. If you leave one out, say so in one line. A stated need counts even if it is for later, such as an expected load.
- **Small, but in its place.** Each responsibility stays where it belongs, so the next change is easy. Fewer lines never justify hiding a rule inside something else.
- **Follow the repo's layout.** Put business rules, data access and presentation where this repo already does. Add a new place only when every existing one is wrong.
- **Keep business rules free of I/O and frameworks.** A business rule, such as who gets a discount or how much, can be tested with plain values, without a repository, a gateway, a framework or a mock. The code around it reads the data, passes it in and acts on the result. This holds even when the rule fits in one line.
- **Make operations idempotent.** Running the same operation twice, or again after a crash halfway through, ends in the same state as running it once.
- **Abstract only what varies today.** A single implementation is indirection.
- **Reuse before writing.** The repo, the standard library, an installed dependency. Leave code that is only superficially similar alone. Never add a dependency for a few lines.
- **Choose the smallest form.** A line before a helper, a helper before an abstraction. When you abstract or break a convention, say so.
- **Comment only what code cannot say.** A workaround, a hidden invariant, a trade-off. Never where the code came from, such as a ticket or a plan.
