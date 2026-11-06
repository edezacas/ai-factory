---
name: code-design
description: Keeps code to what is needed today, in the smallest form that works. Use before adding an interface, class, wrapper, layer or new file, when a request mentions a possible future need, or when another skill needs it. Skip it when the change fits in the code that already exists.
metadata:
  author: edezacas
  version: "0.3"
---

The best code is the code never written. Solve the whole problem with the least new code. This applies to the tests as well: no test helpers, fixtures or layers until they are needed.

- **Today only.** A future need nobody has asked for gets no code. If you leave one out, say so in one line.
- **Boxes.** Put business rules, data access and presentation where this repo already does. Add a box only when every existing one is wrong.
- **Abstractions.** Only where something varies today; a single implementation is indirection.
- **What exists first.** The repo, the standard library, an installed dependency. Leave code that is only superficially similar alone. Never add a dependency for a few lines.
- **Smallest form.** A line before a helper, a helper before an abstraction. When you abstract or break a convention, say so.
- **Comments.** Only what the code cannot say: a workaround, a hidden invariant, a trade-off. Never where the code came from, such as a ticket or a plan.
