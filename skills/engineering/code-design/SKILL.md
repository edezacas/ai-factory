---
name: code-design
description: You MUST use this before writing code that adds or changes behaviour. It keeps the design simple and the code small, without classes, layers, files or abstractions for needs nobody has stated. Skip it only for a rename, formatting, documentation, styles, or a question.
metadata:
  author: edezacas
  version: "0.7"
---

The best code is the code never written. Solve the whole problem with the least new code. This applies to the tests as well: no test helpers, fixtures or layers until they are needed.

- **Stated needs only.** A need nobody has stated gets no code. If you leave one out, say so in one line. A stated need counts even if it is for later, such as an expected load.
- **Simple, not careless.** Keep each responsibility in its place, so the next change is easy. Fewer lines never justify hiding a rule inside something else.
- **Boxes.** Put business rules, data access and presentation where this repo already does. Add a box only when every existing one is wrong.
- **Pure rules.** A business decision, such as who gets a discount or how much, can be tested with plain values, without a repository, a gateway or a mock. The code around it reads the data, passes it in and acts on the result. This holds even when the decision fits in one line.
- **Idempotency.** When an operation can be retried, running it twice must leave the same result as running it once.
- **Abstractions.** Only where something varies today; a single implementation is indirection.
- **What exists first.** The repo, the standard library, an installed dependency. Leave code that is only superficially similar alone. Never add a dependency for a few lines.
- **Smallest form.** A line before a helper, a helper before an abstraction. When you abstract or break a convention, say so.
- **Comments.** Only what the code cannot say: a workaround, a hidden invariant, a trade-off. Never where the code came from, such as a ticket or a plan.
