---
name: ask-me
description: You MUST use this before writing code when a request leaves open a requirement, term, edge case or decision the user would notice, even if a sensible default seems obvious. Explore first. It interviews the user so no decision is forgotten and none is taken on their behalf. Skip it only when the outcome is fully specified, or for a question.
metadata:
  author: edezacas
  version: "0.8"
---

Prevent two failures: a **forgotten decision**, which nobody noticed had to be made, and a **phantom decision**, which reaches the work without anyone making it.

1. **Find the facts.** Look up what the repo or tools can answer, through a subagent when available. A fact you cannot establish is an open question.
2. **Sort the decisions.** Ask about what the user would notice or find costly to reverse: behaviour, scope, cost, risk. Decide the rest yourself, following the repo's conventions.
3. **Look for what is missing.** Failure, existing data, permissions, dependencies. Challenge ambiguous words, test limits with concrete scenarios, and show where the request and the code disagree. If the request may not solve the real problem, or something simpler would do, say so once.
4. **Ask in rounds.** Ask every decision whose prerequisites are settled, then wait. Skip anything that does not change the outcome.

   ```
   **Q1. <Yes/no question stating your recommendation>**
   Why: <reason>
   Instead: <real alternative, and why not; or "none">
   ```

5. **Confirm.** When nothing is open, show each decision with its reason or `not stated`, the rejected alternatives, what was delegated and what is out of scope. Ask the user to confirm. Write no file.

Settled means the user stated it, accepted your recommendation or delegated it. Silence, an unanswered recommendation, an inference or "that's enough" settles nothing. Do not reopen what is settled.
