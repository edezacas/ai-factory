# ai-factory

Small skills for coding agents, each aimed at one way agents go wrong, and each measured to check that it helps.

An agent is at its most dangerous when it sounds sure of itself. It fills the gaps in your request with guesses, builds on top of them and reports success. The usual answer is more process around the agent. This project goes the other way: short skills that the agent picks up by itself when they're needed, and that have to prove their worth in evaluations to stay.

## Quick start

The skills are built and measured on [Claude Code](https://claude.com/claude-code), where they install as one plugin, the `implementer` subagent included. In a Claude Code session:

```
/plugin marketplace add edezacas/ai-factory
/plugin install ai-factory@edezacas
```

The plugin is active right away. Its skills are named `ai-factory:<skill>`, so `delegate` is invoked as `/ai-factory:delegate <task>`. You get a new version when the plugin's version goes up; to get it, update from `/plugin`, or turn on auto-update for this marketplace there.

Then ask for something a little vague, such as "Add a CSV export for orders". If the skill doesn't start by itself, ask for it by name: "Use the ask-me skill".

## Two ways to work

**Hands-on.** You work with the agent in one session, and each skill steps in when it is needed. `ask-me` clears up what is undecided, `code-design` and `tdd` shape the code, and `write-why` records the decisions at the end.

**Delegate.** You invoke `/ai-factory:delegate <task>` and the session works in order. It clarifies with you, writes a plan in small stages, hands each stage to an `implementer` subagent with only the context it needs, checks every stage with scripts and stops at checkpoints for your review. It suits any task, large or small, and keeps the work going across sessions without losing context. On tasks that fit one session it costs about 2.3 times a hands-on session with the same quality, which is the price of the order and traceability it gives. Use Opus as the main session.

## Skills

### Engineering

- **[tdd](skills/engineering/tdd/SKILL.md)**: The agent writes the test before the code and sees it fail, with tests that come from your requirements and check what the code does, not how.
- **[code-design](skills/engineering/code-design/SKILL.md)**: The agent writes clean code with just enough architecture: each concern in its own place without new layers, no abstraction with a single implementation, operations safe to repeat.

### Performance

- **[web-performance](skills/performance/web-performance/SKILL.md)**: Improves the speed of a web app by measuring before and after every optimization.

### Stack

- **[angular-conventions](skills/stack/angular-conventions/SKILL.md)**: Keeps Angular code to current conventions: standalone components, signals, `inject()` and the new control flow.

### Productivity

- **[ask-me](skills/productivity/ask-me/SKILL.md)**: Before writing code, the agent brings you every open decision as a concrete proposal, so nothing is forgotten and nothing is decided on your behalf.
- **[init-project](skills/productivity/init-project/SKILL.md)**: Guides the creation and editing of `CLAUDE.md` and `AGENTS.md`.
- **[write-why](skills/productivity/write-why/SKILL.md)**: When the work is done, the agent records the decisions the code can't explain and that are hard to reverse or surprising, and writes nothing if none qualifies.
- **[delegate](skills/productivity/delegate/SKILL.md)** is an ordered way to do any task with agents. It needs a `harness.json` at the project root with the gate's steps, and proposes one if there is none. Each stage goes to an `implementer` subagent on Sonnet that carries `tdd` and `code-design`, works only in the files its task lists and stops instead of deciding behaviour the task leaves open. The work stays on its own branch with one commit per stage, and you merge it. It never starts on its own.

## How we know it works

Instructions that read well don't always change what an agent does, so we test them. Each task runs several times and reports three things.

- **Quality.** A judge on Opus checks the assertions, a different model from the agent except in the cases that run on Opus themselves, such as `delegate`'s. Shell commands check what a command can decide, such as hidden tests the agent never saw and seeded errors its tests should catch.
- **Activation.** Did the agent pick up the skill when it should, and leave it alone when it shouldn't?
- **Efficiency.** Turns, tool calls, tokens, cache use, peak context and cost.

A skill is compared with the same task without it. `delegate` is compared with doing the same task hands-on.

This has already paid off. With its first short description, `ask-me` triggered in 1 of 10 runs on two vague requests, and rewording it took that to 10 of 10 while it still stayed out of the way on a rename and on a question. Without `tdd`, the agent wrote no tests on two small coding tasks in any of 10 runs, and with it in all 10. Given a task that left a rounding rule open, the `implementer` stopped and asked in 3 of 3 runs after its rules were tightened, against 1 of 3 before.

The skills are measured on Sonnet and Opus, on a small test project and on five tasks in real projects. Few runs separate clearly, so a real project may still behave differently. `web-performance` is the exception: its work is measuring in a browser before and after each change, which these runs cannot check, so it is kept without numbers.

To run an evaluation you need Node 20.11 or later and the Claude Code CLI. It uses your Claude Code account, so each run has a real cost:

```bash
node evals/run.mjs --only ask-me --id 6 --runs 1
```

## Principles

- **One skill, one problem.** If it needs an "and" to explain, it's two skills.
- **Short.** The goal and the constraints, not steps a good model already knows.
- **Discovered, not summoned.** A skill's description should get it used at the right moment, without anyone asking. `delegate` is the one exception, because it is a way of working you choose.
- **Measured, or removed.** A skill stays only if the numbers show it helps, or if its work cannot be measured here and that is said.

## Credits

The interview approach owes a lot to [Matt Pocock's skills](https://github.com/mattpocock/skills) and to [skill-factory](https://github.com/eferro/skill-factory) by eferro.

## License

[MIT](LICENSE)
