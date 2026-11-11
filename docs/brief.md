# Brief

## Problems to solve

1. From a prompt, find out everything really needed.
2. Define a spec that tells the agent what we want to achieve.
3. Plans too big for one session: split them into small tasks.
4. Tests independent of the implementation, not written just to match it.
5. A document with what matters and the code does not show.
6. All of it under good practice: clean code, only necessary comments, maintainable and readable code, architecture fitted to the context, no over-engineering.

## Decisions

- The code and its tests are the source of truth. A document exists only to add what cannot be deduced from them.
- Skills are `SKILL.md` files (agentskills.io), harness-agnostic.
- Start minimal: skills, then one subagent. The orchestrator script, the ledger and optimizations come only if data justifies them.
- Before writing a skill, run the task without it and confirm the agent fails at what the skill would fix. If it does not fail, do not write it.
- Skills live in `skills/engineering/` (tdd, code-design), `skills/stack/` (angular-conventions), `skills/performance/` (web-performance) and `skills/productivity/` (ask-me, write-why, init-project, delegate). Names stay unique, because installing makes them flat.
- Short skills: goal and constraints, no steps the model already knows. Description says when to use and when not. Under 500 lines, templates in `assets/`.
- Persisted documents and artifacts in English; dialogue with the user in Spanish.
- ai-factory is the kit that installs into a project, not a project that uses it. It targets Claude Code only, on a base built so that pi or OpenCode can be added later by writing an adapter and nothing else. Portability is a design discipline, not a deliverable: a person without Claude Code must be able to run the whole flow with the repo's files and scripts.
- Rules that keep the base portable: state and contracts in neutral files; everything that must always run lives in scripts with no Claude in them; skills speak of files and scripts, never of tool primitives, with anything Claude Code specific in a short section at the end. The agent definitions are the only files written for one tool; a second tool gets its own.
- Layout: everything a skill needs lives in its folder, templates and scripts in `assets/`. An agent lives next to the skill that launches it (`delegate/assets/implementer.md`), or in `agents/` when no skill owns it (the verifier). In Claude Code the kit installs as one plugin, from this repo acting as its own marketplace; how it installs in other tools (pi, OpenCode, Codex) is decided when one is added. A project holds only its own files: `harness.json` at the root, `AGENTS.md`, `docs/decisions/`, `docs/plans/<work>/` only while that work is open, plus `.harness/log.jsonl`, which ignores itself in git.
- The scripts read the project's gate steps (types, tests, build) from a `harness.json` at the project root, written by `init-project` or by `delegate` during its analysis. Parsing `AGENTS.md` was rejected: it is written for people and breaks when reworded.
- Models: Opus for the main session, Sonnet for the implementer, Haiku for exploration and for what `tdd` excludes, Fable for the verifier.
- What a project learns stays in the project (`AGENTS.md`, local skills, policy). It moves into the kit only when it repeats in two projects, by hand, with an eval.
- The harness does not edit itself. Deterministic sensors (the scripts) write a log; a skill invoked by name reads it and proposes additions or removals; the user approves. A line is proposed only after the same failure twice, at the cheapest level first: an `AGENTS.md` line, then a skill, then a hook or deny rule. Every proposal answers: what failure it fixes, whether something simpler would do, what improvement is expected, what it costs, and whether it still helps with the next model.
- Unattended execution is not a requirement. The orchestrated mode advances on its own between checkpoints, and that is enough until data says otherwise.

The current work is tracked in `PLAN.md` at the repo root, one stage per PR.

## Two modes

The project serves two kinds of user, and each gets a mode:

- **Hands-on (phase 1):** the developer works with the agent in one session and the skills improve each step. Built for a limited AI quota. There is no orchestrator; the agent discovers each skill by its description and uses it when needed:
  1. `ask-me`, when something is unclear or undecided.
  2. `code-design` when designing, `tdd` when programming.
  3. `write-why`, when development is finished and verified, before reporting it, while the agent that did the work still has the context.
- **Orchestrated (phase 2):** an ordered way to do any task with agents, large or small, for a quota that can pay for it. A small change is one stage with a single checkpoint at the end; a large one gets more stages without losing context across sessions. The developer invokes it by name; an Opus session plans, delegates each stage to subagents, reviews and stops at checkpoints. It reuses the phase 1 skills inside the subagents. Details below.

Phase 2 is a mode the user chooses, not a remedy for phase 1 failing. It is still measured against phase 1 on the same task; on tasks that fit one session it costs about 2.3 times a hands-on Opus session, with the same quality, and the extra is the orchestration in the main session; accepted for the order and traceability it gives (2026-11-11).

## Skills

- **ask-me** (v0.11): leaves nothing forgotten and takes no phantom decision, through rounds of proposals until the user confirms the full account of decisions. Writes no file.
- **tdd** (v0.12): test before code, in Red-Green-Refactor, with rules for what makes a test valid. It does not set the flow: who writes the tests, in what batches, and running the whole suite belong to whoever uses it. ZOMBIES, predicting the failure, a final gap pass and "try to break it" were removed for generating work; bring them back only if measurements ask for it.
- **code-design** (v0.9): clean code with just enough architecture: the least complexity, not the fewest lines; concerns separated without new layers; abstractions only where something varies today, except a port at an external boundary or an existing pattern; the smallest form; reuse that does not couple what changes for different reasons; contracts and stored data kept working; idempotent operations, where a retry is the same operation and a new request a new one; comments only for what the code cannot say; design decisions the request did not settle named in the reply. A webhook whose redelivery nobody mentioned deduplicated in 10/10 runs with the idempotency rule against 1/10 without it. The rule once applied only to operations that "can be retried", and the agent then skipped it whenever the request did not mention retries, so it stays unconditional. Two rules were dropped by choice: code for a possible future, which the agent added only when the request mentioned that future, and business rules kept out of the service, which moved a one-line rule out in 9/9 runs against 0/3 without it, a result not worth a function per one-line rule. v0.9 passed cases 1–4 and 10 in 15/15 runs with Opus; the contracts and the decisions in the reply have no case yet.
- **write-why** (v0.12; base: `decision-records` from edezacas/agent-skills, renamed): 20 lines per decision, no code names or history, `not stated` instead of inventing. Add: only if the decision is hard to reverse or surprising without context, never for each activity done. The decision and its reason matter most; a rejected option is recorded only if there was one. Its description says when to open it; its body is a capability that knows what deserves a record and writes it. Do not record what the code shows; correct stale knowledge. Stored as one unnumbered file per decision under `docs/decisions/<domain>/`, unless the repo already has its own structure. The description must say explicitly that if no decision deserves a record, it writes nothing.

## Orchestrated mode (phase 2)

Everything runs from one Claude Code session on Opus, invoked with `/delegate <task>`. Opus analyses with `ask-me` and discusses the proposal before any code; writes the plan; delegates each stage; reviews the result; stops at the agreed checkpoints; and runs `write-why` at the end, because it is the one with the reasons. Each subagent's model is fixed in its definition, not chosen by the main session.

- **delegate** (skill, invoked by name, never self-activated: `disable-model-invocation`): the rules above, with the templates in `assets/`. A command would do the same, but a skill carries its assets and installs like the others.
- **implementer** (Sonnet, clean context per task, `tdd` and `code-design` preloaded): receives the path of a task file, works only in the files it lists, in TDD. It decides only what no test can observe, such as names or inner structure; if the seam does not fit, or the task leaves open something a test could observe, it stops and reports. Its report has a fixed short form: status, files changed, commands run and their result, decisions taken, open. The decisions are what `write-why` needs at the end.
- **Haiku**: exploration goes through the built-in `Explore` subagent, which already runs on it; `ask-me` already delegates fact-finding to a subagent. Beyond that, Haiku gets only what `tdd` excludes: renames, formatting, moving files, documentation, fixtures. Code that changes behaviour goes to Sonnet, because a wrong result costs more in review and retries than it saves.

Documents:

- `PLAN.md`, in `docs/plans/<work>/` with the task files: the index of small stages, each with what must change, what behaviour to keep, how to validate it, and whether it is a checkpoint. If the task touches data, how to recover or revert.
- One task file per stage in `docs/plans/<work>/`, from the template kept from `splitting`: goal, criteria, behaviour to keep, decisions, seam, closest test, files, commands, dependencies. A subagent does not see the conversation, so the file carries everything it needs. Opus launches subagents with the file path, not a summary.
- `PROGRESS.md`, in the same folder: what changed, which tests ran and their results, what is left to test and the next step, so another session can take over after a cut or a `/clear`. It holds state, while `write-why` holds reasons. It records only commits that exist when it is written: each stage's base, the `HEAD` before it, which starts the review range at a checkpoint and is where a rejected checkpoint returns. At a checkpoint it says the work is waiting for review. Once the user approves the last checkpoint, `write-why` records the decisions and the whole `docs/plans/<work>/` folder is deleted in its own commit: a finished plan goes stale and misleads the next agent that reads it as current, and git keeps it. What is left to test goes into the final report.

Review after each stage is two deterministic checks, not a judgement: the tests pass (`gate.mjs`, in `delegate`'s `assets/`: the ordered, named steps in `harness.json`, such as install, types, tests and build, stopping at the first that fails), and the files changed since the base, untracked ones included, stay inside the backticked paths of the task file's `## Files` (`check-scope.mjs`, next to it). Both live in the installed skill, not in each project; only `harness.json` lives in the project, at its root. Each log line carries the skill version that ran. The scripts are Node with no dependencies, so they run the same on Windows, macOS and Linux; bash and jq would leave out native Windows. Both append one JSON line to `.harness/log.jsonl` in the project on every run, pass or fail, so there is evidence to tune on. `.harness/` holds a `.gitignore` with `*`, so the log never enters the project's history or a stage's commit; it lives on the machine that ran the work and does not survive a clone. The main session runs them after each delegation through `stage.mjs`, which commits the stage only if both pass, in the same call that updates `PROGRESS.md`: every tool call rereads the whole session, so mechanical steps are folded into as few calls as possible. A human can run the same scripts. Opus reads the diff only when a script fails, when the report carries a decision or something open, or at a checkpoint.

Every session, with or without `delegate`, starts the same way: read `PROGRESS.md` and the git log, run the gate's steps from `harness.json` (one of them can start the project and smoke-check it), and only then touch code. Starting a feature on a broken repo makes the next session's job worse. Ending a session is a commit and a `PROGRESS.md` update.

A checkpoint is the end of the turn. Nothing enforces it: if the main session goes on past checkpoints, that failure is what justifies phase 3, not a patch in the skill.

Parallel stages only if neither needs the other's code, seam or result, and they change no file in common. A schema or public API change others use is split into expand, migrate and contract. Default is one stage at a time; parallelism only when a task asks for it. Subagents only when they just report; agent teams only if they must talk to each other.

### Redesign of `delegate`

Why: in an earlier orchestrator built on the same idea, results were good but runs were slow and expensive. Subagents received context that was not narrow enough and had to analyse the code again to fill it in. In v0.2 the cost also sits in the main session: about 570k Opus tokens to write and review a one-line task.

Lessons from that orchestrator, both observed in real use:

- The analysis and the answers from `ask-me` stay in the main session. When a subagent did the clarifying, the orchestrator lacked part of the information.
- A verifier that starts from empty context, on a different model from the implementer, caught failures that had slipped past. This is the evidence behind the `verifier` below.

Goal: subagents start from empty context with only what their task needs; the orchestrator keeps the whole analysis and delegates only test and code; a separate agent verifies when the user asks. The baseline task in `PLAN.md` decided its safety pieces (a branch per work, a commit per stage, the scope check): they stay, at 17 % more cost with the same result, within the 30 % the user accepted. Its diffs are too small to test the review rule, so a larger task decides that, kept only if the main session's cost after the first delegation goes down with the same result.

The design of v0.3, each piece with the failure it answers. Until the baseline shows where the main session's tokens go, the review rule is a hypothesis.

- **The user takes part in analysis and specification only.** The main session (Opus) analyses, runs `ask-me` itself and keeps what it learns. Reasoning about the code and clarifying with the user never go to a subagent. `Explore` only locates: it returns paths and line ranges, and the main session reads what it is going to quote. This split is a hypothesis; the fixture is too small to test it. The first task in a real repo records the Opus tokens spent before the plan, and how often an implementer explored beyond its task file or stopped for a missing fragment. If the first dominates and the second is zero, try letting `Explore` return the fragments; if the second repeats, the main session reads everything.
- **The task file is the implementer's whole context.** Fixes: subagents analysing the code again. It carries the goal, criteria in Given/When/Then with literal values, the behaviour to keep, the decisions this task relies on, the seam with the signatures and types it touches copied in, an excerpt of the closest existing test, exact paths, and the commands for its test and for the gate. It leaves out the conversation, rejected alternatives, other stages and the bodies of functions the task does not change. There is no "Open decisions" section: a task with an open decision is not delegated. At most 120 lines, 60 of them fragments; a task that does not fit is a stage to split. The cap is a line in the template, and moves to a script only if it is broken twice.
- **All task files are written before the first stage**, so the analysis is in files before any `/clear`. A later stage quotes the seam an earlier task file declares, not code that does not exist yet.
- **The implementer's report** gains a status and the commands it ran, because in v0.2 it listed only tests: `Status`, `Files changed`, `Commands`, `Decisions taken`, `Open`.
- **Review per stage is the two scripts.** Fixes: the cost of the main session reading every diff, paid again on each later turn. The main session reads the diff only when a script fails, when the report carries a decision or something open, or at a checkpoint, where it reads the diff accumulated since the previous one.
- **One branch per work, `delegate/<work>`, and one commit per green stage.** `delegate` refuses to start on a dirty tree. The base of `check-scope.mjs` is then always `HEAD`, and a failed stage is undone alone. Nothing reaches the main branch until the user has validated the last checkpoint: the user integrates, with a squash, and `delegate` neither merges nor pushes. A rejected checkpoint returns the branch to the commit of the previous one. `PROGRESS.md` records the branch and the commit the work started from.
- **Checkpoints** are proposed by the orchestrator during the analysis and confirmed by the user inside `ask-me`, as one more decision, then marked in `PLAN.md`. The minimum: after the first stage, before anything hard to reverse (data, a contract phase, a public API) and at the end. Never one per stage by default. Two failed rounds in a stage are a stop, not a checkpoint.
- **Verification is outside `delegate`.** A `verifier` subagent with no skill, in one agent file, `agents/verifier.md`, installed globally like the implementer. It starts from empty context, can read and run tests but has no edit, write or delegation tool, writes nothing in the repo, and runs on Fable, the one model that differs from the implementer in both modes (Sonnet in `delegate`, Opus hands-on). Its description says it is used only when the user asks for it, never on the main session's initiative. It receives what to verify against (a task file, `PLAN.md` or the user's description) and a git base, and takes the diff itself. It never receives the implementer's report or opinion. It checks the criteria, looks for cases no test covers and tries to break the change. `delegate` only suggests it when the work ends. It serves the hands-on mode too. If the main session hands it summaries instead of paths and a base, the first fix is a line in `AGENTS.md`; a skill only if the failure repeats. Its report is fixed and short, about 30 lines at most:

  ```
  Verdict: pass | fail | cannot verify
  Checked against: <path or description>; base <sha>; <n> files in diff
  Criteria: <n> met, <n> not met
  - not met: <criterion>: <file:line or command and output>
  Uncovered: <cases with no test, each with a concrete input, or none>
  Broken: <input, command, observed vs expected, or none>
  Commands: <each run, with result>
  Tree: <git status at the end>
  ```

Unchanged from v0.2: Sonnet for the implementer with `tdd` and `code-design` preloaded, Haiku for what `tdd` excludes, `PROGRESS.md`, one stage at a time by default. The scripts run from the skill's own folder; if the project has no `harness.json`, `delegate` writes one at the root during the analysis, from the test and type commands it finds, and confirms it with the user.

Rejected in the redesign:

- **Fable as the orchestrator**: Opus is the default model of Claude Code on every plan, and the measured problem is the cost of the main session.
- **An orchestrator, area leads and workers**: the fixed chain of specialists this brief already rejects. Claude Code allows it, since a subagent can launch subagents up to three levels deep, so the reason is cost and not the tool.
- **More agents in parallel than can be verified.**

Left out of v0.3, each with what would bring it back:

- **An advisor before stopping**: after two failed rounds the stage stops and asks the user. A bounded question to a more capable model comes back if, in two stages, that stop is resolved by an answer that was not the user's decision to make. Try Claude Code's own advisor first; it is experimental and needs the Anthropic API.
- **A worktree per work**: the branch already isolates the history. Comes back the first time the user needs to work in the repo while `delegate` runs, or to run two works at once; then `git worktree add` in a sibling folder, which is plain git.
- **A hook that blocks writes from the verifier's shell**: a shell can write even without edit tools, and a deny rule is not a boundary. Comes back the first time the verifier leaves the tree changed, which its report shows.
- **tester** (isolated, never sees the implementation): forces the interface to be fixed before the code, which pulls against `code-design`. Comes back if tests appear written after the code.
- **Haiku for code**: comes back if a task shows that delegating and reviewing it costs less than Sonnet.

About `splitting`: the skill was tried and removed because, inside one session, splitting was extra work that doubled or tripled tokens and did not activate on its own. In this mode splitting is the plan, so the cost is the price of the mode, and activation is by name. Only the comparison changes: against phase 1 on the same large task, never against a run without the skill.

Installation has two parts. Once per machine, in Claude Code, the plugin: `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json` at the repo root make the repo a marketplace holding one plugin, `edai` ("edezacas ai"), which lists the skill folders and the agent files by path. A user runs `/plugin marketplace add edezacas/ai-factory` and `/plugin install edai@ai-factory`; the plugin is active in that session, the implementer included, so `delegate` copies nothing into a project. Skills and agents are then namespaced (`/edai:delegate`, `edai:implementer`); a skill reaches its scripts through `${CLAUDE_SKILL_DIR}`, which Claude Code substitutes in the `SKILL.md` text; users get a change only when `version` in `plugin.json` goes up. Per project: `init-project` writes `harness.json` and, through `ask-me`, an `AGENTS.md` if there is none. Other tools get their own way to install when they are added.

Confirmed in the Claude Code docs: the `skills` field in an agent definition injects the full skill at startup; subagents read `CLAUDE.md` but do not inherit the parent's skills; a skill with `disable-model-invocation` cannot be preloaded, so the implementer preloads `tdd` and `code-design`, never `delegate`; the hook after each delegation is `SubagentStop` in `settings.json`, matched by agent name; a subagent can be resumed to ask for adjustments; `model` in an agent accepts `sonnet`, `opus`, `haiku`, `fable`, a full model ID or `inherit`, and a model passed at launch wins over it; a subagent receives its own prompt, the delegation message, `CLAUDE.md` and a git status, never the conversation; a subagent can launch subagents unless `Agent` is left out of its `tools`; nothing in an agent definition stops the main session from delegating to it on its own, only the description guides that, and a deny rule on the agent would block the user's request too; the parent's `stream-json` carries a subagent's tool calls and results. Verified in R1: an agent file copied during a session is not loaded in that session, and the main session falls back to a `general-purpose` agent on its own model.

## Phases and stop criteria

1. Style skills, `ask-me`, `tdd` and `write-why`, each discovered on its own, in a single session. Try on 5 real tasks, noting each time a cleanup had to be requested after green.
2. Orchestrated mode, built in this order, each step tried on a real task before the next:
   1. The `implementer` alone, delegated by hand from an Opus session with one task file. Decides whether `skills` preloads, what it costs and whether the report fits.
   2. `gate.mjs` and `check-scope.mjs` with the log, tried on `acme-app` and on one real project.
   3. Session bootstrap: the resume header in `PROGRESS.md` and step 0 of `delegate`, the gate's steps run first. Record whether a new session resumes from `PROGRESS.md` after a cut.
   4. The Claude Code plugin, tried on a clean Claude Code configuration: installed from the marketplace, `/edai:delegate` launches the implementer on Sonnet with `tdd` and `code-design` preloaded from the first session.
   5. `init-project` writing `harness.json` and `AGENTS.md`, tried on a fresh clone of a real project.
   6. `tune`, only once a project has at least 10 logged stages. Finished works leave no `PROGRESS.md` in the tree, so `tune` either reads it from git history or relies on the log alone; decided when it is built.
   7. The runner case and the A/B against phase 1.
   8. Tester, Haiku for code and parallelism, each only on a recorded failure that asks for it. The verifier has its own stage in `PLAN.md`.
3. Only if unattended execution or real parallelism is needed: minimal TypeScript orchestrator (state machine and files). Later, if data justifies it: structured ledger with context slices per role, stable prefix for prompt caching, model per phase.

Measuring phase 2: the same large task, in `evals/fixtures/acme-app`, needing an expand, migrate and contract, three runs with phase 1 and three with phase 2. Hidden tests and mutants, `red_before_code`, files outside the task, tokens and cost per model (`modelUsage`), time, and by hand whether a new session resumes after a cut. The runner can check in one turn that `/delegate` writes a `PLAN.md` with stages and checkpoints, delegates through `Task` to `implementer`, writes no code from the main session and launches no stage past a checkpoint; it cannot check several turns or a human review.

The value of the mode is finishing tasks that do not fit one session. If phase 1 finishes the same task without losing context, the task is too small to justify phase 2. Abandon the mode if there is no task size at which phase 2 finishes and phase 1 does not, within twice the cost; or if checkpoints are skipped in more than one run of three even with the hook, because then the problem asks for phase 3.

Each phase measures tokens, time and failures detected per task against the previous one. If it does not improve, do not move on. Evals use the runner in `evals/` (each case with and without the skill, guardrail assertions).

## Risks

- A skill can be skipped in a long session, or the main session fills with subagent results. Mitigation: the fixed short report, state in `PROGRESS.md`, and the resume-after-cut test.
- A seam or file list fixed in the task file may not fit the real structure. The implementer stops and reports instead of forcing it.
- A weak plan or spec spreads with no human. Take care of `ask-me`.

## Left out for now

llm-council, strategy and OKRs, double red and emoji narration in tdd, starter markers for their token cost, fact cache with hash, model routing per phase beyond the fixed model per subagent in phase 2.

From the harness articles (Leiva, Anthropic), each with what brings it back:

- A second tool (pi, OpenCode, Codex): only when a real project works in that tool. The hands-on mode should port with its own agent files; `delegate` needs its delegation rethought per tool, because `skills` preload and resuming a subagent are Claude Code's. The fallback that works anywhere is another session given the task file path.
- A `SubagentStop` hook that runs the scripts after each delegation: the main session runs them in every R5 and R6 run. Comes back if a run shows it skipping them.
- A JSON feature list as the source of state, which the model is less likely to overwrite than Markdown: only if a run shows `PLAN.md` or `PROGRESS.md` corrupted.
- `passing` versus `accepted` as separate states: only if the verifier's verdict has to be stored between sessions.
- Auto-applying `tune` proposals: never. If approval becomes the bottleneck, that is a phase 3 question.
- A TypeScript installer instead of the `init-project` skill: only if the skill fails to install cleanly in two projects.
- A fixed chain of specialist subagents: no. Leiva and the Terminal-Bench data agree it is cost without gain on frontier models.

From Anthropic's *Components of agent memory* (2026-11-06), which found that telling an agent to read its memory before answering roughly doubled a model's score, though it measured an agent's own notes, not a repo's records:

- `write-why` adding one line to `AGENTS.md` or `CLAUDE.md` that points to the records folder: only if agents miss a recorded decision, twice, in a real project or in an eval like write-why case 8. Cheapest level first; a script or hook only if the line fails too.
- Rewriting records that a change contradicts on another subject, or a periodic pass that finds stale records: only if stale records show up in use. It can live in `tune` or in its own skill.

Two skills are also left out, neither measured without the skill, so this is judgement, not data. Their drafts are in this file's git history.

- **hexagonal**: `code-design` already covers most of it, and a skill that can add layers would pull against one that holds them back. If a dependency that makes tests slow or brittle needs a port, add a line to `code-design`. A project that needs the architecture states it in its `AGENTS.md`.
- **tidy**: the Refactor step in `tdd`, `code-design` and Claude Code's `/simplify` overlap with it, and it would add a third skill to a chain that already rarely opens together. Whether the agent leaves code dirty after green is unknown. If the phase 1 notes show repeated cleanups, try `/simplify`, then a stronger Refactor step in `tdd`, and only then this skill.

## Pending decisions

- None. Step 1 of phase 2 answered the last one: the implementer applies the preloaded skills. Two tasks in a real repo (2026-11-08) showed `tdd` and `code-design` injected at start, a test seen failing before code, only the listed files touched and the four-field report.

## References (use as ideas, do not copy)

- https://github.com/edezacas/agent-skills: `tdd`, `code-design`, `decision-records`, and the eval runner.
- https://devexpert.io/blog/harness-engineering (Leiva): the six pieces of a harness, scripts over text for what admits no exception, grow only on a repeated failure, remove layers that stop paying.
- https://www.anthropic.com/research/effective-harnesses-for-long-running-agents: `init.sh`, progress file, one feature per session, the session start routine, end-to-end checks.
- https://github.com/eferro/skill-factory, under `output_skills/<category>/<skill>`:
  - ask-me: productivity/grilling, design/align, design/domain-modeling
  - task contract: practices/story-splitting, practices/hamburger-method, practices/small-safe-steps
  - tdd: testing/tdd, testing/mutation-testing
  - style: design/hexagonal-architecture, practices/thin-wrappers, practices/code-simplifier, practices/refactoring, practices/complexity-review
  - write-why: design/domain-modeling, practices/capturing-project-knowledge
  - coordination: productivity/handoff, ai/claude-code/launching-agent-teams, ai/creating-process-files
  - Not yet read in full, reread before relying on them: story-splitting, hamburger-method, small-safe-steps, mutation-testing, complexity-review.
