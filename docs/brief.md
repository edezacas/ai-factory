# Brief

## Problems to solve

1. From a prompt, find out everything really needed.
2. Define a spec that tells the agent what we want to achieve.
3. Plans too big for one session: split them into small tasks.
4. Tests independent of the implementation, not written just to match it.
5. A document with what matters and the code does not show.
6. All of it under good practice: clean code, only necessary comments, maintainable and readable code, hexagonal architecture fitted to the context, no over-engineering.

## Decisions

- Skills are `SKILL.md` files (agentskills.io), harness-agnostic.
- Start minimal: skills, then two subagents. The orchestrator script, the ledger and optimizations come only if data justifies them.
- Short skills: goal and constraints, no steps the model already knows. Description says when to use and when not. Under 500 lines, templates in `assets/`.
- Persisted documents and artifacts in English; dialogue with the user in Spanish.

## Flow

`ask-me`, spec, `plan`, per task (tester, implementer), validate, `write-why`. The user takes part only in `ask-me`.

## Skills

- **ask-me** (v0.6): leaves nothing forgotten and takes no phantom decision, through rounds of proposals until the user confirms the full account of decisions. Writes no file.
- **plan**: self-contained tasks (criteria, seam and context inside each). Detects big tasks by linguistic signals ("and", "or", "manage") and cuts them into vertical slices. Each task leaves the repo green and can be committed alone. Expand-contract only for tasks touching schema or API.
- **tdd** (base: `tdd` from edezacas/agent-skills): public seam, independent expected values, mocks only of what is not ours. Add: predict what will fail before running; per-task test list reviewed with ZOMBIES; final gap pass. Optional mutation testing with a real tool over changed files, until it shows whether it adds value.
- **code-design** (base: own skill): use the repo's structure, abstract only where something varies today, smallest form that works, comments only if the code cannot say it. Add the question "what can be postponed?".
- **hexagonal** (working name, new): graded levels.
  - 0, CRUD or script: repo structure, no ports.
  - 1, pure domain separated from I/O, no interfaces.
  - 2, ports only on external dependencies that complicate tests or vary today, as thin wrappers in domain language (the 80% rule).
  - 3, full hexagonal: use cases, several adapters, complex domain.
  - Go up only with a second implementation, a dependency that makes tests slow or brittle, or to keep third-party types out of the domain. The agent reads the repo, then declares the level and why.
  - Base content: the "does it do I/O or run out of process?" rule counting dependencies; antipatterns (anemic domain, third-party types in the domain, use cases calling use cases, adapters with logic); tests per layer (domain without doubles, application with fakes of ports, adapters against real infrastructure).
- **tidy** (working name, new, brief; simplify and refactor): after green, one change at a time, tests untouched, no over-simplifying (real versus coincidental duplication, three similar lines beat a helper), final pass as a critic.
- **write-why** (base: `decision-records` from edezacas/agent-skills, renamed): 20 lines per decision, no code names or history, `not stated` instead of inventing. Add: only if the decision is hard to reverse, surprising without context and the result of a real trade-off. Do not record what the code shows; correct stale knowledge. Fed by the decisions in the spec. The description must say explicitly that if no decision deserves a record, it writes nothing.

## Subagents (phase 2)

- **tester** (isolated): receives criteria and the public interface, never sees the implementation. Writes the test and checks it fails for the right reason.
- **implementer** (clean context per task): receives the red test, writes the minimum to pass, then simplifies.
- **validator** (optional, another model, read-only): checks the result against the spec, not the implementer's notes.

Coordination: the main session launches subagents with file paths, not summaries. Parallel tasks need non-overlapping file ownership. Subagents only when they just report; agent teams only if they must talk to each other.

## Phases and stop criteria

1. Style skills, `ask-me`, `plan`, `tdd` and `write-why`, each discovered on its own, in a single session. Try on 5 real tasks.
2. Only if something concrete fails: native subagents tester and implementer, and validator.
3. Only if unattended execution or real parallelism is needed: minimal TypeScript orchestrator (state machine and files). Later, if data justifies it: structured ledger with context slices per role, stable prefix for prompt caching, model per phase.

Each phase measures tokens, time and failures detected per task against the previous one. If it does not improve, do not move on. Evals use the runner in `evals/` (each case with and without the skill, guardrail assertions).

## Risks

- A skill can be skipped in a long session, or the main session fills with subagent results. Mitigation: short results, in files.
- An isolated tester may write tests on a seam that does not fit the real structure. If the test looks wrong, the implementer stops and reports.
- A weak plan or spec spreads with no human. Take care of `ask-me`.

## Left out for now

llm-council, strategy and OKRs, double red and emoji narration in tdd, starter markers for their token cost, fact cache with hash, model routing per phase.

## Pending decisions

- Whether unattended execution is still a requirement (decides whether the script comes earlier).
- Concrete harness and models.
- Whether a separate `spec` skill writes the spec from the confirmed decisions.

## References (use as ideas, do not copy)

- https://github.com/edezacas/agent-skills: `tdd`, `code-design`, `decision-records`, and the eval runner.
- https://github.com/eferro/skill-factory, under `output_skills/<category>/<skill>`:
  - ask-me: productivity/grilling, design/align, design/domain-modeling
  - plan: practices/story-splitting, practices/hamburger-method, practices/small-safe-steps
  - tdd: testing/tdd, testing/mutation-testing
  - style: design/hexagonal-architecture, practices/thin-wrappers, practices/code-simplifier, practices/refactoring, practices/complexity-review
  - write-why: design/domain-modeling, practices/capturing-project-knowledge
  - coordination: productivity/handoff, ai/claude-code/launching-agent-teams, ai/creating-process-files
  - Not yet read in full, reread before relying on them: story-splitting, hamburger-method, small-safe-steps, mutation-testing, complexity-review.
