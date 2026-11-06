# ai-factory

Small skills for coding agents, each aimed at one way agents go wrong, and each measured to check that it helps.

An agent is at its most dangerous when it sounds sure of itself. It fills the gaps in your request with guesses, builds on top of them and reports success. The usual answer is more process around the agent. This project goes the other way: short skills that the agent picks up by itself when they're needed, and that have to prove their worth in evaluations to stay.

## Quick start

The skills are built and measured on [Claude Code](https://claude.com/claude-code). Install them and start a new session:

```bash
npx skills add edezacas/ai-factory
```

Then ask for something a little vague, such as "Add a CSV export for orders". If the skill doesn't start by itself, ask for it by name: "Use the ask-me skill".

## Skills

- **[ask-me](skills/ask-me/SKILL.md)**: Before writing code, the agent brings you every open decision as a concrete proposal, so nothing is forgotten and nothing is decided on your behalf.
- **[tdd](skills/tdd/SKILL.md)**: The agent writes the test before the code and sees it fail, with tests that come from your requirements and check what the code does, not how.
- **[code-design](skills/code-design/SKILL.md)**: The agent builds what is needed today in the smallest form that works, instead of code for a future nobody asked for.

## How we know it works

Instructions that read well don't always change what an agent does, so we test them. Each task runs several times, with and without the skill, and reports:

- **Quality:** did the result meet the assertions, according to a judge on a different model?
- **Activation:** did the agent pick up the skill when it should, and leave it alone when it shouldn't?
- **Efficiency:** turns, tool calls, tokens, cache use, peak context and cost.

This has already paid off. With its first short description, `ask-me` triggered in 1 of 10 runs on two vague requests. Rewording the description took that to 10 of 10, and the skill still stayed out of the way on a simple rename and on a question about a file. Without `tdd`, the agent wrote no tests on two small coding tasks in any of 10 runs; with it, it wrote them in all 10.

These results are early: one model (Sonnet), a small test project and each skill measured on its own. A real project may behave differently.

To run an evaluation you need Node 20.11 or later and the Claude Code CLI. It uses your Claude Code account, so each run has a real cost:

```bash
node evals/run.mjs --only ask-me --id 6 --runs 1
```

## Principles

- **One skill, one problem.** If it needs an "and" to explain, it's two skills.
- **Short.** The goal and the constraints, not steps a good model already knows.
- **Discovered, not summoned.** A skill's description should get it used at the right moment, without anyone asking.
- **Measured, or removed.** A skill stays only if the numbers show it helps.

## Credits

The interview approach owes a lot to [Matt Pocock's skills](https://github.com/mattpocock/skills) and to [skill-factory](https://github.com/eferro/skill-factory) by eferro.

## License

[MIT](LICENSE)
