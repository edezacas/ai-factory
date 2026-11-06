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
- Start minimal: skills, then one subagent. The orchestrator script, the ledger and optimizations come only if data justifies them.
- Before writing a skill, run the task without it and confirm the agent fails at what the skill would fix. If it does not fail, do not write it.
- Skills live in `skills/engineering/` (tdd, code-design), `skills/stack/` (angular-conventions), `skills/performance/` (web-performance) and `skills/productivity/` (ask-me, write-why, init-project, orchestrate). Names stay unique, because installing makes them flat.
- Short skills: goal and constraints, no steps the model already knows. Description says when to use and when not. Under 500 lines, templates in `assets/`.
- Persisted documents and artifacts in English; dialogue with the user in Spanish.
- Harness is Claude Code. Models: Opus for the main session, Sonnet for the implementer, Haiku for exploration and for what `tdd` excludes.
- Unattended execution is not a requirement. The orchestrated mode advances on its own between checkpoints, and that is enough until data says otherwise.

## Two modes

The project serves two kinds of user, and each gets a mode:

- **Hands-on (phase 1):** the developer works with the agent in one session and the skills improve each step. Built for a limited AI quota. There is no orchestrator; the agent discovers each skill by its description and uses it when needed:
  1. `ask-me`, when something is unclear or undecided.
  2. `code-design` when designing, `tdd` when programming.
  3. `write-why`, when development is finished and verified, before reporting it, while the agent that did the work still has the context.
- **Orchestrated (phase 2):** for a task too big for one session and a quota that can pay for it. The developer invokes it by name; an Opus session plans, delegates each stage to subagents, reviews and stops at checkpoints. It reuses the phase 1 skills inside the subagents. Details below.

Phase 2 is a mode the user chooses, not a remedy for phase 1 failing. It is still measured against phase 1 on the same task.

## Skills

- **ask-me** (v0.11): leaves nothing forgotten and takes no phantom decision, through rounds of proposals until the user confirms the full account of decisions. Writes no file.
- **tdd** (v0.12): test before code, in Red-Green-Refactor, with rules for what makes a test valid. It does not set the flow: who writes the tests, in what batches, and running the whole suite belong to whoever uses it. ZOMBIES, predicting the failure, a final gap pass and "try to break it" were removed for generating work; bring them back only if measurements ask for it.
- **code-design** (v0.5): a simple design that is easy to change, built for stated needs: no code for future needs nobody asked for, abstractions only where something varies today, reuse and the repo's structure first, comments only for what the code cannot say. Measured without the skill, the agent overbuilt only when a request mentioned a possible future.
- **write-why** (v0.12; base: `decision-records` from edezacas/agent-skills, renamed): 20 lines per decision, no code names or history, `not stated` instead of inventing. Add: only if the decision is hard to reverse or surprising without context, never for each activity done. The decision and its reason matter most; a rejected option is recorded only if there was one. Its description says when to open it; its body is a capability that knows what deserves a record and writes it. Do not record what the code shows; correct stale knowledge. Stored as one unnumbered file per decision under `docs/decisions/<domain>/`, unless the repo already has its own structure. The description must say explicitly that if no decision deserves a record, it writes nothing.

## Orchestrated mode (phase 2)

Everything runs from one Claude Code session on Opus, invoked with `/orchestrate <task>`. Opus analyses with `ask-me` and discusses the proposal before any code; writes the plan; delegates each stage; reviews the result; stops at the agreed checkpoints; and runs `write-why` at the end, because it is the one with the reasons. Each subagent's model is fixed in its definition, not chosen by the main session.

- **orchestrate** (skill, invoked by name, never self-activated: `disable-model-invocation`): the rules above, with the templates in `assets/`. A command would do the same, but a skill carries its assets and installs like the others.
- **implementer** (Sonnet, clean context per task, `tdd` and `code-design` preloaded): receives the path of a task file, works only in the files it lists, in TDD. If the seam does not fit or a decision is open, it stops and reports. Its report has a fixed short form: files changed, tests run and their result, decisions taken, doubts. The decisions are what `write-why` needs at the end.
- **Haiku**: exploration goes through the built-in `Explore` subagent, which already runs on it; `ask-me` already delegates fact-finding to a subagent. Beyond that, Haiku gets only what `tdd` excludes: renames, formatting, moving files, documentation, fixtures. Code that changes behaviour goes to Sonnet, because a wrong result costs more in review and retries than it saves.

Documents:

- `PLAN.md`: the index of small stages, each with what must change, what behaviour to keep, how to validate it, and whether it is a checkpoint. If the task touches data, how to recover or revert.
- One task file per stage in `docs/plans/<work>/`, from the template kept from `splitting`: goal, criteria, decisions, open decisions, seam, files, dependencies. A subagent does not see the conversation, so the file carries everything it needs. Opus launches subagents with the file path, not a summary.
- `PROGRESS.md`: what changed, which tests ran and their results, what is left to test and the next step, so another session can take over after a cut or a `/clear`. It holds state, while `write-why` holds reasons. At a checkpoint it says the work is waiting for review.

Review after each stage is two deterministic checks, not a judgement: the tests pass, and `git diff --name-only` stays inside the task's files. They run from a hook after each delegation and append to `PROGRESS.md`, so they do not depend on the model remembering. Only then Opus reads the diff against the criteria.

A checkpoint is the end of the turn. Nothing enforces it: if the main session goes on past checkpoints, that failure is what justifies phase 3, not a patch in the skill.

Parallel stages only if neither depends on the other, even through a criterion, and they change no file in common. A schema or public API change others use is split into expand, migrate and contract. Default is one stage at a time; parallelism only when a task asks for it. Subagents only when they just report; agent teams only if they must talk to each other.

Left out of the first version, each with what would bring it back:

- **tester** (isolated, never sees the implementation): forces the interface to be fixed before the code, which pulls against `code-design`. Comes back if tests appear written after the code.
- **validator** (Opus, read-only): Opus's review already is one. Comes back if a mutant seeded in a stage gets past the review.
- **Haiku for code**: comes back if a task shows that delegating and reviewing it costs less than Sonnet.

About `splitting`: the skill was tried and removed because, inside one session, splitting was extra work that doubled or tripled tokens and did not activate on its own. In this mode splitting is the plan, so the cost is the price of the mode, and activation is by name. Only the comparison changes: against phase 1 on the same large task, never against a run without the skill.

Installation: skill installers do not install agents. The skill's first step copies `assets/implementer.md` to `.claude/agents/` if it is missing. A Claude Code plugin with skills and agents can replace that later.

To verify in a run, because they were not confirmed in the docs: the `skills` field in an agent definition preloads the full skill; subagents read `CLAUDE.md`; the hook event after a `Task` call; whether the parent's `stream-json` carries the subagent's tool calls or only its result, which decides how the runner measures TDD inside the subagent.

## Phases and stop criteria

1. Style skills, `ask-me`, `tdd` and `write-why`, each discovered on its own, in a single session. Try on 5 real tasks, noting each time a cleanup had to be requested after green.
2. Orchestrated mode, built in this order, each step tried on a real task before the next:
   1. The `implementer` alone, delegated by hand from an Opus session with one task file. Decides whether `skills` preloads, what it costs and whether the report fits.
   2. The templates and `orchestrate`, on one large real task. Record checkpoints kept and whether a new session resumes from `PROGRESS.md` after a cut.
   3. The hook with the tests and the files-outside-task check.
   4. The runner case and the A/B against phase 1.
   5. Tester, validator, Haiku for code and parallelism, each only on a recorded failure that asks for it.
3. Only if unattended execution or real parallelism is needed: minimal TypeScript orchestrator (state machine and files). Later, if data justifies it: structured ledger with context slices per role, stable prefix for prompt caching, model per phase.

Measuring phase 2: the same large task, in `evals/fixtures/acme-app`, needing an expand, migrate and contract, three runs with phase 1 and three with phase 2. Hidden tests and mutants, `red_before_code`, files outside the task, tokens and cost per model (`modelUsage`), time, and by hand whether a new session resumes after a cut. The runner can check in one turn that `/orchestrate` writes a `PLAN.md` with stages and checkpoints, delegates through `Task` to `implementer`, writes no code from the main session and launches no stage past a checkpoint; it cannot check several turns or a human review.

The value of the mode is finishing tasks that do not fit one session. If phase 1 finishes the same task without losing context, the task is too small to justify phase 2. Abandon the mode if there is no task size at which phase 2 finishes and phase 1 does not, within twice the cost; or if checkpoints are skipped in more than one run of three even with the hook, because then the problem asks for phase 3.

Each phase measures tokens, time and failures detected per task against the previous one. If it does not improve, do not move on. Evals use the runner in `evals/` (each case with and without the skill, guardrail assertions).

## Risks

- A skill can be skipped in a long session, or the main session fills with subagent results. Mitigation: the fixed short report, state in `PROGRESS.md`, and the resume-after-cut test.
- A seam or file list fixed in the task file may not fit the real structure. The implementer stops and reports instead of forcing it.
- A weak plan or spec spreads with no human. Take care of `ask-me`.

## Left out for now

llm-council, strategy and OKRs, double red and emoji narration in tdd, starter markers for their token cost, fact cache with hash, model routing per phase beyond the fixed model per subagent in phase 2.

Two skills are also left out, neither measured without the skill, so this is judgement, not data. Their drafts are in this file's git history.

- **hexagonal**: `code-design` already covers most of it, and a skill that can add layers would pull against one that holds them back. If a dependency that makes tests slow or brittle needs a port, add a line to `code-design`. A project that needs the architecture states it in its `AGENTS.md`.
- **tidy**: the Refactor step in `tdd`, `code-design` and Claude Code's `/simplify` overlap with it, and it would add a third skill to a chain that already rarely opens together. Whether the agent leaves code dirty after green is unknown. If the phase 1 notes show repeated cleanups, try `/simplify`, then a stronger Refactor step in `tdd`, and only then this skill.

## Pending decisions

- Whether subagents use the skills: preloaded through the agent definition, to verify in step 1 of phase 2.

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
