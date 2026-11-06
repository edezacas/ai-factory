---
name: code-design
description: Keeps the design simple and easy to change, without code for needs nobody has stated. Use before adding an interface, class, wrapper, layer or new file, when a request mentions a possible future need, or when another skill needs it. Skip it when the change fits in the code that already exists.
metadata:
  author: edezacas
  version: "0.5"
---

The best code is the code never written. Solve the whole problem with the least new code. This applies to the tests as well: no test helpers, fixtures or layers until they are needed.

- **Stated needs only.** A need nobody has stated gets no code. If you leave one out, say so in one line. A stated need counts even if it is for later, such as an expected load.
- **Simple, not careless.** Keep each responsibility in its place, so the next change is easy. Fewer lines never justify hiding a rule inside something else.
- **Boxes.** Put business rules, data access and presentation where this repo already does. Add a box only when every existing one is wrong.
- **Abstractions.** Only where something varies today; a single implementation is indirection.
- **What exists first.** The repo, the standard library, an installed dependency. Leave code that is only superficially similar alone. Never add a dependency for a few lines.
- **Smallest form.** A line before a helper, a helper before an abstraction. When you abstract or break a convention, say so.
- **Comments.** Only what the code cannot say: a workaround, a hidden invariant, a trade-off. Never where the code came from, such as a ticket or a plan.
