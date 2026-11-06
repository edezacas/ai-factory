# Brief

## Problems to solve

1. From a prompt, find out everything really needed.
2. Define a spec that tells the agent what we want to achieve.
3. Plans too big for one session: split them into small tasks.
4. Tests independent of the implementation, not written just to match it.
5. A document with what matters and the code does not show.
6. All of it under good practice: clean code, only necessary comments, maintainable and readable code, architecture fitted to the context, no over-engineering.

## Decisions

- Skills are `SKILL.md` files (agentskills.io), harness-agnostic.
- Start minimal: skills, then two subagents. The orchestrator script, the ledger and optimizations come only if data justifies them.
- Before writing a skill, run the task without it and confirm the agent fails at what the skill would fix. If it does not fail, do not write it.
- Skills live in `skills/engineering/` (tdd, code-design), `skills/stack/` (angular-conventions), `skills/performance/` (web-performance) and `skills/productivity/` (ask-me, write-why, init-project). Names stay unique, because installing makes them flat.
- Short skills: goal and constraints, no steps the model already knows. Description says when to use and when not. Under 500 lines, templates in `assets/`.
- Persisted documents and artifacts in English; dialogue with the user in Spanish.

## Flow

There is no orchestrator. The agent discovers each skill by its description and uses it when needed:

1. `ask-me`, when something is unclear or undecided.
2. `code-design` when designing, `tdd` when programming.
3. `write-why`, when development is finished and verified, before reporting it, while the agent that did the work still has the context.

## Skills

- **ask-me** (v0.11): leaves nothing forgotten and takes no phantom decision, through rounds of proposals until the user confirms the full account of decisions. Writes no file.
- **tdd** (v0.11): test before code, in Red-Green-Refactor, with rules for what makes a test valid. It does not set the flow: who writes the tests, in what batches, and running the whole suite belong to whoever uses it. ZOMBIES, predicting the failure, a final gap pass and "try to break it" were removed for generating work; bring them back only if measurements ask for it.
- **code-design** (v0.5): a simple design that is easy to change, built for stated needs: no code for future needs nobody asked for, abstractions only where something varies today, reuse and the repo's structure first, comments only for what the code cannot say. Measured without the skill, the agent overbuilt only when a request mentioned a possible future.
- **write-why** (v0.12; base: `decision-records` from edezacas/agent-skills, renamed): 20 lines per decision, no code names or history, `not stated` instead of inventing. Add: only if the decision is hard to reverse or surprising without context, never for each activity done. The decision and its reason matter most; a rejected option is recorded only if there was one. Its description says when to open it; its body is a capability that knows what deserves a record and writes it. Do not record what the code shows; correct stale knowledge. Stored as one unnumbered file per decision under `docs/decisions/<domain>/`, unless the repo already has its own structure. The description must say explicitly that if no decision deserves a record, it writes nothing.

## Subagents (phase 2)

Everything runs from one Claude Code session on Opus, which plans, delegates, waits for each result and reviews it. Each subagent's model is fixed in its definition, not chosen by the main session.

- **tester** (Sonnet, isolated): receives criteria and the public interface, never sees the implementation. Writes the test and checks it fails for the right reason.
- **implementer** (Sonnet, clean context per task): receives the red test, writes the minimum to pass, then simplifies.
- **validator** (optional, Opus, read-only): checks the result against the spec, not the implementer's notes.

Two documents support the work:

- `PLAN.md`: small stages, each with its task contract, what must change, what behaviour to keep and how to validate it. It marks the checkpoints where the main session stops for the user to review.
- `PROGRESS.md`: what changed, which tests ran and their results, what is left to test and the next step, so another agent can take over. It holds state, while `write-why` holds reasons.

Task contract: a subagent does not see the conversation, so each task must carry its criteria, decisions, seam, files, open decisions and dependencies. Tasks can run in parallel only if neither depends on the other, even through a criterion, and they change no file in common. A schema or public API change others use is split into expand, migrate and contract.

This is not a skill. A `splitting` skill was tried and removed: the agent already splits work and launches subagents by itself, the skill doubled or tripled tokens and it did not activate on its own. In phase 2 the contract lives in `PLAN.md`, where nothing enforces it; if the main session skips checkpoints, delegation or tests, that failure is what justifies an orchestrator that can enforce it. The skill is in git history.

Coordination: the main session launches subagents with file paths, not summaries. Parallel tasks need non-overlapping file ownership. Subagents only when they just report; agent teams only if they must talk to each other.

## Phases and stop criteria

1. Style skills, `ask-me`, `tdd` and `write-why`, each discovered on its own, in a single session. Try on 5 real tasks, noting each time a cleanup had to be requested after green.
2. Only if something concrete fails: native subagents tester and implementer, and validator, with `PLAN.md`, checkpoints and `PROGRESS.md`. The entry test is a large real task done with the phase 1 setup, in one session: if it fails, that failure opens this phase and the task is the baseline to compare against. Also record whether the main session keeps to checkpoints, delegation and tests, how much subagent results fill its context, and whether subagents use the skills.
3. Only if unattended execution or real parallelism is needed: minimal TypeScript orchestrator (state machine and files). Later, if data justifies it: structured ledger with context slices per role, stable prefix for prompt caching, model per phase.

Each phase measures tokens, time and failures detected per task against the previous one. If it does not improve, do not move on. Evals use the runner in `evals/` (each case with and without the skill, guardrail assertions).

## Risks

- A skill can be skipped in a long session, or the main session fills with subagent results. Mitigation: short results, in files.
- An isolated tester may write tests on a seam that does not fit the real structure. If the test looks wrong, the implementer stops and reports.
- A weak plan or spec spreads with no human. Take care of `ask-me`.

## Left out for now

llm-council, strategy and OKRs, double red and emoji narration in tdd, starter markers for their token cost, fact cache with hash, model routing per phase beyond the fixed model per subagent in phase 2, Haiku until a task shows it pays for its delegation and review.

Two skills are also left out, neither measured without the skill, so this is judgement, not data. Their drafts are in this file's git history.

- **hexagonal**: `code-design` already covers most of it, and a skill that can add layers would pull against one that holds them back. If a dependency that makes tests slow or brittle needs a port, add a line to `code-design`. A project that needs the architecture states it in its `AGENTS.md`.
- **tidy**: the Refactor step in `tdd`, `code-design` and Claude Code's `/simplify` overlap with it, and it would add a third skill to a chain that already rarely opens together. Whether the agent leaves code dirty after green is unknown. If the phase 1 notes show repeated cleanups, try `/simplify`, then a stronger Refactor step in `tdd`, and only then this skill.

## Pending decisions

- Whether unattended execution is still a requirement (decides whether the script comes earlier).
- Concrete harness and models.
- Whether subagents discover and use the skills on their own (to test).

## References (use as ideas, do not copy)

- https://github.com/edezacas/agent-skills: `tdd`, `code-design`, `decision-records`, and the eval runner.
- https://github.com/eferro/skill-factory, under `output_skills/<category>/<skill>`:
  - ask-me: productivity/grilling, design/align, design/domain-modeling
  - task contract: practices/story-splitting, practices/hamburger-method, practices/small-safe-steps
  - tdd: testing/tdd, testing/mutation-testing
  - style: design/hexagonal-architecture, practices/thin-wrappers, practices/code-simplifier, practices/refactoring, practices/complexity-review
  - write-why: design/domain-modeling, practices/capturing-project-knowledge
  - coordination: productivity/handoff, ai/claude-code/launching-agent-teams, ai/creating-process-files
  - Not yet read in full, reread before relying on them: story-splitting, hamburger-method, small-safe-steps, mutation-testing, complexity-review.
