---
name: write-why
description: You MUST use this when development is finished and verified, before reporting it, including when you chose the approach yourself, or when asked to record a decision. It tells which decisions deserve a record and writes them in the repo. If none does, it writes nothing. Skip it for a question, or for documenting how code works.
metadata:
  author: edezacas
  version: "0.12"
---

Record what someone arriving later could not get from the code, and nothing else.

A decision deserves a record only if the code cannot show why and it is hard to reverse or surprising without context. Complexity alone does not count, nor do activities, names or helpers. Record only what is settled: the user stated or accepted it, or it was yours to decide. A recommendation awaiting an answer, an assumption or a hypothesis gets no record. Say in one line what you recorded, or that nothing deserved it.

```
# <The decision, in one sentence>

**Reason:** <why>
**Cost:** <only if there is a real one: what it makes harder or more expensive>
**Rejected:** <only if a real option lost; why not only if the reason above does not cover it>
```

- **Unknowns:** a reason nobody stated and you did not decide is `not stated`. Leave out a cost or rejected option you do not know. Never invent any of them.
- **Size:** one decision, at most 20 lines. If the title needs an "and", it is two records.
- **Leave out:** names from the code, because the record must stay true if the code is rewritten; history, such as updates or "this replaces"; references to other records, specs or tickets.
- **Place:** in the repo, never only in private memory or the chat. Use the repo's structure if it has one; otherwise, one unnumbered file per decision at `docs/decisions/<domain>/<slug>.md`. Never a second structure. If the repo keeps replaced records, follow its way.
- **One record per decision:** before writing, look for a record on the same subject. If there is one, rewrite it so it is true today, keeping what still holds; never add a second. If the old option is still a real alternative, it goes under Rejected. Delete a record only if its subject no longer exists.
