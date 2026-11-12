# Brief

What is being built and why. How each piece works is in its own file, the skill, the agent or the script. What is left to build, and what was left out with the condition that brings it back, is in `PLAN.md`. The figures behind the decisions, in full, are in `docs/measurements.md`.

## Problems to solve

1. From a prompt, find out everything really needed.
2. Define a spec that tells the agent what we want to achieve.
3. Plans too big for one session: split them into small tasks.
4. Tests independent of the implementation, not written just to match it.
5. A document with what matters and the code does not show.
6. All of it under good practice: clean code, only necessary comments, maintainable and readable code, architecture fitted to the context, no over-engineering.

## Decisions

- The code and its tests are the source of truth. A document exists only to add what cannot be deduced from them.
- Start minimal: skills, then one subagent. An orchestrator script, a ledger and optimizations come only if data justifies them.
- Before writing a skill, run the task without it and confirm the agent fails at what the skill would fix. If it does not fail, do not write it.
- Skills are short `SKILL.md` files in the agentskills.io format, with the goal and the constraints and no steps the model already knows. Names stay unique, because installing makes them flat.
- Persisted documents and artifacts are in English, and the dialogue is in the user's language.
- The kit targets Claude Code only. Portability is a design discipline, not a deliverable: a person without Claude Code must be able to run the whole flow with the repo's files and scripts.
- Three rules keep the base portable. State and contracts live in neutral files. Everything that must always run lives in scripts with no Claude in them. Skills speak of files and scripts, never of tool primitives. `delegate` is the exception, because it speaks of subagents, their models and resuming them, and its delegation is rethought for any other tool. The agent definitions are the only files written for one tool.
- Everything a skill needs lives in its folder, except the agents, which live in `agents/`. A skill launches an agent by name and never by path, and `delegate` launches both.
- A project holds only its own files: `harness.json` at the root, `AGENTS.md`, `docs/decisions/`, `docs/plans/<work>/` while that work is open, and `.harness/log.jsonl`, which ignores itself in git.
- The scripts read the project's gate steps from `harness.json`, written by `delegate` during its analysis. No other skill writes it, because the file serves only `delegate`. Parsing `AGENTS.md` was rejected, since it is written for people and breaks when reworded.
- The main session runs on the model the user has chosen, Opus or Fable, and `delegate` does not set it. Every figure here was measured with Opus as the main session, and nothing is measured with Fable. The implementer runs on Sonnet, exploration and what `tdd` excludes on Haiku, and the verifier on the session's model.
- What a project learns stays in the project, in its `AGENTS.md`, local skills and policy. It moves into the kit only when it repeats in two projects, by hand, with an eval.
- The harness does not edit itself. Scripts write a log, a skill invoked by name reads it and proposes, and the user approves.
- Unattended execution is not a requirement. The orchestrated mode advances on its own between checkpoints, and that is enough until data says otherwise.

## Two modes

- **Hands-on (phase 1)** is for a limited AI quota. The developer works with the agent in one session and there is no orchestrator. The agent discovers each skill by its description: `ask-me` when something is undecided, `code-design` and `tdd` when writing code, and `write-why` when the work is finished and verified, while the agent that did it still has the context.
- **Orchestrated (phase 2)** is an ordered way to do any task with agents, large or small, for a quota that can pay for it. The developer invokes `delegate` by name. The session plans, delegates each stage to a subagent, reviews and stops at checkpoints, and the phase 1 skills work inside the subagents.

Phase 2 is a mode the user chooses, not a remedy for phase 1 failing. It was first justified by tasks that do not fit one session, and was to be abandoned if it cost more than twice phase 1. That changed on 2026-11-11. It costs about 2.3 times a hands-on Opus session on tasks that fit one session and about twice on a large task, with the same hidden tests and mutants, and the extra is the orchestration in the main session. The cost is accepted for the order and traceability it gives. The mode is still abandoned if checkpoints are skipped in more than one run of three, because then the problem asks for phase 3.

## Skills: what the text of each does not say

- **tdd** does not set the flow. Who writes the tests, in what batches, and running the whole suite belong to whoever uses it. ZOMBIES, predicting the failure, a final gap pass and "try to break it" were removed because they generated work, and they come back only if measurements ask for it.
- **code-design** keeps its idempotency rule unconditional. A webhook whose redelivery nobody mentioned was deduplicated in 10 of 10 runs with the rule against 1 of 10 without it. When the rule applied only to operations that "can be retried", the agent skipped it whenever the request did not mention retries. Two rules were dropped by choice. Code for a possible future was added only when the request mentioned that future. Business rules kept out of the service moved a one-line rule out in 9 of 9 runs against 0 of 3, a result not worth a function per one-line rule. The contracts and the decisions named in the reply have no eval case yet.
- **write-why** comes from `decision-records` in edezacas/agent-skills. Its description must say that it writes nothing when no decision deserves a record, because a record per activity is the failure it prevents.
- **angular-conventions** measures conformity with the author's conventions, not quality. Opus already writes most of them alone. `effect()`, `@empty` and `inject()` on review pass 3 of 3 with it and 0 of 3 without.
- **init-project** writes `AGENTS.md` and makes `CLAUDE.md` a symbolic link to it, so there is one text for every tool. Without the skill, `/init` wrote only `CLAUDE.md` in 9 of 9 Opus runs, and with it the pair in 9 of 9.
- **web-performance** is kept without numbers. Its work is measuring in a browser before and after each change, which the evals cannot check. It is read in 3 of 3 runs on a page that feels slow and in none of 12 that ask for advice.
- **splitting** was tried and removed. Inside one session it doubled or tripled tokens and did not activate on its own. In the orchestrated mode splitting is the plan, so its cost is the price of the mode.

## Orchestrated mode: the design and its reasons

An earlier orchestrator built on the same idea gave good results, but its runs were slow and expensive. Its subagents received context that was not narrow enough and analysed the code again to fill it in. Two lessons came from real use. When a subagent did the clarifying, the orchestrator lacked part of the information. And a verifier that started from empty context, on a different model from the implementer, caught failures that had slipped past.

So the main session keeps the whole analysis and delegates only tests and code, each subagent starts from empty context with only what its task needs, and a separate agent verifies when the user asks. Each piece follows, with the reason for it.

- **`delegate` is a skill invoked by name**, never self-activated. A command would do the same, but a skill carries its assets and installs like the others.
- **The user takes part in analysis and specification only.** The main session analyses, runs `ask-me` itself and keeps what it learns. `Explore` only locates code, and the main session reads what it will quote. The fixture is too small to test this split, so it stays a hypothesis.
- **The task file is the implementer's whole context**, which is what stops subagents from analysing the code again. It has no section for open decisions, because a task with one is not delegated. Its cap of 120 lines, 60 of them code, is a line in the template and moves to a script only if it is broken twice.
- **All task files are written before the first stage**, so the analysis is in files before any `/clear`. A later stage quotes the seam an earlier task file declares, not code that does not exist yet.
- **The main session keeps the whole conversation through every stage.** Its analysis and the discussion with the user are what let it judge each implementer's report. Every later call rereads them, and that cost is accepted. In one real work it was 8.5M cached tokens after the first delegation, of which a fresh session would have saved about half. The user can still run `/clear` and `/delegate` once the plan is committed, because the work resumes from `PROGRESS.md`.
- **The implementer decides only what no test can observe.** If the seam does not fit, or the task leaves open something a test could observe, it stops and reports. The rule is followed in few runs. On a task file that left a rounding rule open it stopped in 4 of 13, and two rewordings did no better. The gap shows only once the code is being written, after the tests of the stated criteria, so the implementer chooses, reports `done` and names the choice under `Open`, which it did in every run that did not stop. That is the second line of defence. The first is the main session's analysis, which asked the user about the same gap before any plan in 3 of 3 runs, so the rule's text stays as it is. Its report is short and fixed, and the decisions in it are what `write-why` needs at the end.
- **Haiku gets only what `tdd` excludes.** Code that changes behaviour goes to Sonnet, because a wrong result costs more in review and retries than it saves.
- **Review per stage is two scripts, not a judgement.** The gate passes, and the changed files stay inside the task's list. The main session reads the diff only when a script fails, when the report carries a decision or something open, or at a checkpoint. On a large task, reading every diff instead cost 11 % more in the main session after the first delegation and found nothing the scripts missed. The difference is `separated` by two cents over three runs, so the evidence is weak, and totals are not separated. In one run without the rule the main session wrote code itself. In two real works nearly every report carried decisions, and reading those diffs found a design flaw and two fixture problems with the gate green, so that part of the rule is not relaxed.
- **The scripts live in the installed skill**, and only `harness.json` lives in the project. They are Node with no dependencies, so they run the same on Windows, macOS and Linux. A human can run them.
- **Every run of a script appends one line to `.harness/log.jsonl`**, pass or fail, with the skill version and the task, so there is evidence to tune on. `.harness/` ignores itself in git, so the log never enters a stage's commit and does not survive a clone.
- **A fix after review is logged by `stage.mjs`.** The implementer runs the gate before it reports, so the scripts mostly see green. In three real works on one project the log had 27 lines and no failure, while one of those works had two fixes asked by the user and one stage rejected by the main session. `stage.mjs` therefore takes who sent the stage back and why, and logs it once the fix is committed. In its eval case, a fix asked at the checkpoint, 3 of 3 Opus runs left that line. It is an argument of a script every round already runs, so it costs no call and is not a step to forget.
- **Mechanical steps are folded into as few calls as possible**, because every tool call rereads the whole session.
- **One branch per work and one commit per green stage.** They cost 17 % more than working without them, with the same result, and they stay. `delegate` refuses to start on a dirty tree, so the scope check always compares with `HEAD` and a failed stage is undone alone. The user integrates the branch, and `delegate` neither merges nor pushes.
- **`stage.mjs` warns of commits made since the last stage**, which it reads from the commit that last changed `PROGRESS.md`. A commit by the implementer hides its work from the scope check. It only warns, since the commit may be the user's.
- **`PROGRESS.md` holds state, and `write-why` holds reasons.** It records only commits that exist when it is written, each stage's base, which is where a review range starts and where a rejected checkpoint returns. It does not record the gate and scope results, because it is written before they are known and a committed stage has passed both.
- **The plan folder is deleted when the work ends.** A finished plan goes stale and misleads the next agent that reads it as current, and git keeps it. What is left to test goes into the final report.
- **The gate runs on the untouched tree before any plan.** Starting on a broken repo makes every later stage harder to judge, so a base that fails is a decision for the user.
- **Checkpoints are one more decision of the analysis.** The minimum is one after the first stage, one before anything hard to reverse and one at the end, never one per stage by default. Two failed rounds in a stage are a stop, not a checkpoint.
- **A checkpoint is the end of the turn, and nothing enforces it.** If the main session goes on past checkpoints, that failure is what justifies phase 3, not a patch in the skill.
- **One stage at a time by default.** Subagents are for work that only reports back, and agent teams only if the agents must talk to each other. The skill still allows two independent stages in parallel, which the scripts cannot close, because the scope check and the commit both see the whole tree. The option is to be removed, since the way out is a worktree per stage and that is not wanted in this mode. It is item 8 in `PLAN.md`, and parallel stages come back with the unattended mode.

Rejected for good:

- **An orchestrator, area leads and workers**, or any fixed chain of specialist subagents. Leiva and the Terminal-Bench data agree it is cost without gain on frontier models. Claude Code allows it, so the reason is cost and not the tool.
- **More agents in parallel than can be verified.**
- **A required model for the main session.** The redesign rejected Fable because the measured problem is the cost of the main session. Since 2026-11-12 the model is the user's choice per work, and one real work has run on Fable. Its cost against Opus is not measured.
- **Auto-applying `tune` proposals.** If approval becomes the bottleneck, that is a phase 3 question.

## Verifier

Verification is outside `delegate`. `agents/verifier.md` is a subagent with no skill, installed with the plugin. It receives what to verify against, a task file, a plan or the user's description, and a git base, and takes the diff itself. It starts from empty context and never receives the author's report or opinion, because that is what caught failures that had slipped past in the earlier orchestrator. It has no edit, write or delegation tool. Its shell can still write, so its text keeps scratch files outside the repo. Its report is fixed and short, and its form is in the agent file.

- **It inherits the session's model**, as `delegate` does, so nobody spends a model they did not choose, and whoever launches it can name another. In `delegate` it still differs from the implementer, which runs on Sonnet. In a hands-on session it is the author's own model and only its empty context differs. What that loses is not measured.
- **It runs only when the user asks.** Its description says so, and nothing else can enforce it. With it installed it was never launched in three `delegate` runs and three hands-on runs that did not ask for it, and those runs cost the same as without it.
- **`delegate` offers it at the last checkpoint, not when the work ends**, because approving that checkpoint deletes the plan folder, which holds the criteria it checks against. The line also says what to hand it, the path of `PLAN.md` and the branch's starting commit. With the line, `delegate` offered it and did not launch it in 3 of 3 runs where nobody asked, and in 3 of 3 where the user asked it launched it with those two and nothing else, and waited for approval after its verdict. On a one-stage work the verification added about a quarter to the cost.
- **Its rules are few, and only one has been measured.** On a small change it passed a correct implementation and failed a seeded error under a green suite in 3 of 3 Opus runs each, naming the criterion and leaving the tree as it was. Without the rule that a green suite is not evidence, Opus did the same. On Sonnet the verdict was also the same, but the verifier saw the failure by running it in 3 of 3 runs with the rule and 0 of 3 without, where two of the three were probes that broke. The rule stays on that weak signal. The seeded error can be found by reading one line, so nothing here shows the verifier on a large change, or on a failure that only running reveals.

## Designed, not built

### tune

- It is invoked by name and reads only `.harness/log.jsonl`. Finished works leave no `PROGRESS.md` or task file in the tree, and git loses them when a rejected branch is deleted. A task file's path in a line is an identifier that groups lines by stage and by work, never a file to open, which is why a `review` line carries its reason.
- It sorts what it reads into the four causes the log can show: a gate step that fails (same `step` twice), work outside the task (same path in `outOfScope` twice), stages that need more than one round to go green (failed gate lines per `task`), and stages sent back after review (`review` lines). Several passing gate lines for one task are fixes after review, not rounds to go green. A stage counts once its `check-scope` line passes. A skill that never activates leaves no line in the log, and that stays a manual note.
- It proposes a line only after the same failure twice, at the cheapest level first: an `AGENTS.md` line, then a skill, then a hook or deny rule. Every proposal answers what failure it fixes, whether something simpler would do, what improvement is expected, what it costs, and whether it still helps with the next model.
- Its report separates what log lines show, cited by `ts`, from what it infers. At most five proposals, each with the smallest next step, and one verdict per piece it looked at: keep, change, remove, or left out with what brings it back.
- A removal needs evidence, a run without the piece, in an eval or a real task, that does not fail. No failures in the log is not evidence, because the piece may be what prevents them. A model change is the moment to look for removals.

## What the design relies on in Claude Code

Confirmed in its docs, except the last item.

- The `skills` field in an agent definition injects the full skill at startup. Subagents read `CLAUDE.md` but do not inherit the parent's skills.
- A skill with `disable-model-invocation` cannot be preloaded, so the implementer preloads `tdd` and `code-design`, never `delegate`.
- A subagent receives its own prompt, the delegation message, `CLAUDE.md` and a git status, never the conversation. It can be resumed to ask for adjustments.
- `model` in an agent accepts `sonnet`, `opus`, `haiku`, `fable`, a full model ID or `inherit`, and a model passed at launch wins over it.
- A subagent can launch subagents unless `Agent` is left out of its `tools`.
- Nothing in an agent definition stops the main session from delegating to it on its own. Only the description guides that, and a deny rule on the agent would block the user's request too.
- The hook after each delegation is `SubagentStop` in `settings.json`, matched by agent name. The parent's `stream-json` carries a subagent's tool calls and results.
- In the plugin, skills and agents are namespaced (`/ai-factory:delegate`, `ai-factory:implementer`), a skill reaches its scripts through `${CLAUDE_SKILL_DIR}`, and users get a change only when `version` in `plugin.json` goes up.
- Seen in a run, not in the docs: an agent file copied during a session is not loaded in that session, and the main session falls back to a `general-purpose` agent on its own model.

## Phases and stop criteria

1. Hands-on: the skills, each discovered on its own, in a single session. Done, on five real tasks.
2. Orchestrated: `delegate`, the implementer and the scripts are built and measured against phase 1, and the verifier is built and measured on a small change. `tune` is left, in `PLAN.md`.
3. Only if unattended execution or real parallelism is needed: a minimal TypeScript orchestrator, a state machine and files. The unattended case in mind is a run started from a GitHub issue that ends in a pull request, noted in `PLAN.md`. Later, if data justifies it, a structured ledger with context slices per role, a stable prefix for prompt caching and a model per phase.

Each phase measures tokens, time and failures detected per task against the previous one. If it does not improve, do not move on.

## Risks

- A skill can be skipped in a long session, or the main session fills with subagent results. Mitigation: the fixed short report, state in `PROGRESS.md`, and resuming after a cut.
- A seam or file list fixed in the task file may not fit the real structure. The implementer stops and reports instead of forcing it.
- A weak plan or spec spreads with no human. Take care of `ask-me`.

## References (use as ideas, do not copy)

- https://github.com/edezacas/agent-skills: `tdd`, `code-design`, `decision-records`, and the eval runner.
- https://devexpert.io/blog/harness-engineering (Leiva): the six pieces of a harness, scripts over text for what admits no exception, grow only on a repeated failure, remove layers that stop paying.
- https://www.anthropic.com/research/effective-harnesses-for-long-running-agents: `init.sh`, progress file, one feature per session, the session start routine, end-to-end checks.
- Anthropic's *Components of agent memory* (2026-11-06): telling an agent to read its memory before answering roughly doubled a model's score, though it measured an agent's own notes, not a repo's records.
- https://github.com/eferro/skill-factory, under `output_skills/<category>/<skill>`:
  - ask-me: productivity/grilling, design/align, design/domain-modeling
  - task contract: practices/story-splitting, practices/hamburger-method, practices/small-safe-steps
  - tdd: testing/tdd, testing/mutation-testing
  - style: design/hexagonal-architecture, practices/thin-wrappers, practices/code-simplifier, practices/refactoring, practices/complexity-review
  - write-why: design/domain-modeling, practices/capturing-project-knowledge
  - coordination: productivity/handoff, ai/claude-code/launching-agent-teams, ai/creating-process-files
  - Not yet read in full, reread before relying on them: story-splitting, hamburger-method, small-safe-steps, mutation-testing, complexity-review.
