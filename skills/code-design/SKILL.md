---
name: code-design
description: You MUST use this before adding an interface, class, wrapper, layer or new file, and whenever a request mentions a possible future need. Build what is needed today, in the smallest form that works. Skip it when the change fits in the code that already exists.
metadata:
  author: edezacas
  version: "0.1"
---

The best code is the code never written. Solve the whole problem with the least new code.

- **Today only.** A future need nobody has asked for gets no code. If you leave one out, say so in one line.
- **Boxes.** Put business rules, data access and presentation where this repo already does. Add a box only when every existing one is wrong.
- **Abstractions.** Only where something varies today; a single implementation is indirection.
- **What exists first.** The repo, the standard library, an installed dependency. Leave code that is only superficially similar alone. Never add a dependency for a few lines.
- **Smallest form.** A line before a helper, a helper before an abstraction. When you abstract or break a convention, say so.
- **Comments.** Only what the code cannot say: a workaround, a hidden invariant, a trade-off. Never where the code came from, such as a ticket or a plan.
