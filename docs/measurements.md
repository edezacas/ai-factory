# Measurements

The figures that show whether a piece of the kit has an effect, kept as the baseline for the next change. The brief gives the decision each one supports. `evals/workspace/` is not in git, so this file is where a result survives.

Every row is three runs per side unless it says otherwise. Iterations 1 to 129 were deleted, so their rows keep only what the documents of the time recorded. A difference is evidence only when it is `separated`, the two ranges not overlapping, and three runs that do not overlap are still weak evidence. Add a row when a measurement decides something, and leave the old row in place.

## Skills, with and without

| Skill | Iteration | Model | Result |
|---|---|---|---|
| `ask-me` | deleted | not kept | Its first description triggered in 1 of 10 runs on two vague requests, the reworded one in 10 of 10, and it stayed out of a rename and a question |
| `tdd` | deleted | not kept | On two small coding tasks the agent wrote no tests in 10 of 10 runs without it, and wrote them in 10 of 10 with it |
| `code-design` | deleted | not kept | A webhook whose redelivery nobody mentioned was deduplicated in 10 of 10 runs with the idempotency rule and 1 of 10 without. Keeping business rules out of the service moved a one-line rule out in 9 of 9 against 0 of 3, and was dropped |
| `code-design` v0.9 | deleted | Opus | Cases 1 to 4 and 10 passed in 15 of 15 runs. Opus opened it in 12 of 12 runs that wrote code, Sonnet in 1 of 15 |
| `angular-conventions` | 146 | Opus | Read in 12 of 12 runs that touch Angular, 0 of 3 in the guard case. `effect()`, `@empty` and `inject()` on review 3 of 3 against 0 of 3. `input()`, `output()`, `OnPush`, `@for` and `@if` pass on both sides |
| `init-project` 0.1 | 147 | Opus | Read in 9 of 9. On `/init` it wrote only `CLAUDE.md` in 6 of 6 runs, with and without |
| `init-project` 0.2 | 150 | Opus | Read in 12 of 12, 0 of 3 in the guard case. `AGENTS.md` with `CLAUDE.md` linked to it in 9 of 9 with the skill and 0 of 9 without, over three cases. The `agent_docs/` case, 3 of 3 against 0 of 3, tests a convention the skill defines |
| `web-performance` | 148 | Opus | Read in 3 of 3 on a page that feels slow, 0 of 12 on advice questions, 0 of 3 in the guard case. In the one case it opens, pass rate 1 [0.75-1] against 0.5 [0.5-0.75], not separated |

## Hands-on, five real tasks

No numbers per run. An independent review found removable production code of about 4 %, 9 %, 2 % and 12 % in tasks 2 to 5. In 4 of 5 tasks a decision was taken or changed during implementation without asking. In 3 tasks existing code or conventions were not reused, which did not reproduce in a 27-file repo. Twice the user and not the agent raised a key risk.

## `delegate`

All on Opus as the main session, with Sonnet as the implementer. Costs are per run, median and range.

| What is compared | Iteration | Result |
|---|---|---|
| Branch per work, commit per stage and scope check (v0.3) against v0.2.1, order management | 125, 127 | $1.23 [1.19-1.29] against $1.05 [1.00-1.15], 17 % more, `separated`. Opus $1.01 against $0.83, Sonnet $0.22 against $0.23. 349 s against 334 s. Hidden tests pass and 12 of 12 mutants in all six runs |
| Plan and stage each in one shell call (0.6.0) against 7 earlier runs | 131 | Main-session calls 20 [16-21] against 24 [21-37], main $0.75 against $0.86, total $1.30 against $1.30. Not separated, kept for fewer calls |
| Implementer stops on open behaviour (0.8.0) against 0.6.0, case 7 | 134, 135 | Stopped in 3 of 3 against 1 of 3, about $0.06 a run. Not separated |
| 0.8.0 on order management, case 1 | 133 | Judge 9, 8 and 9 of 9, 12 of 12 mutants each, $1.065 to $1.085, so no regression |
| `delegate` against hands-on, small task, cases 8 and 9 | 139 | $0.37 [0.345-0.390] against $0.16 [0.144-0.177], `separated`. Opus $0.31-0.35, Sonnet $0.04. Mutants 8 of 8 on both sides |
| `delegate` against hands-on, medium task, cases 1 and 10 | 139 | $1.01 [0.90-1.11] against $0.42 [0.37-0.44], `separated`. Mutants 12, 11 and 12 of 12 against 12 of 12 |
| Fix asked at the checkpoint, case 14 (0.10.0) | 142 | The `review` line by the user was logged in 3 of 3 runs, at $0.49-0.53 against $0.31-0.37 for case 8 without the fix |

### Large task, the review rule

Cases 11 to 13, iteration 141. The task is customer accounts on top of order management, five to seven stages with three checkpoints. Case 13 is case 11 with the review rule taken out, so the main session reads every stage's diff.

| | 11, rule | 13, no rule | 12, hands-on |
|---|---|---|---|
| Opus before the first delegation | $0.37-0.39 | $0.35-0.39 | |
| Opus after the first delegation | $0.64-0.70, median 0.68 | $0.72-0.91, median 0.76 | |
| Total | $1.32-1.46 | $1.38-1.75 | $0.66-0.72 |
| Checks and mutants | 27/27, 15/15 in every run | 27/27, 15/15 in every run | 18/18 twice, 17/18 once |

The cost after the first delegation is 11 % lower with the rule, `separated` by two cents. Totals are not separated. In one run without the rule the main session wrote code itself. One hands-on run's tests disagree with the reference on a detail the notes leave open, so its mutants do not count. The split before and after is an estimate, described in `AGENTS.md`.

## Real works with `delegate`

Not comparisons, since no work was done twice. They are what the evals cannot show.

| Work | Date | What it showed |
|---|---|---|
| First real work, 4 stages | 2026-11-10 | The base gate was red and the agent missed it by reading the output instead of the exit code. It switched to English after the plan. The log entered the project's commits. All three fixed in 0.3.2 to 0.4.0 |
| Second, in another project | 2026-11-11 | Reading diffs found two fixture problems with the gate green |
| Third, in that same project, 4 stages, 87 min, main session on Fable | 2026-11-12 | The diff was read in 6 of 7 rounds, because 5 of 6 reports carried decisions, and one read found a design flaw. Main-session context went from 43k to 234k tokens, and 43 requests after the first delegation reread 8.5M cached tokens, 3.5 times the 2.4M of the four implementers. The implementer reported `done` once with a criterion untested |
| The log of that project over three works and nine stages | 2026-11-12 | 27 lines, all `pass`, while the works had two fixes asked by the user and one stage rejected by the main session. That is why 0.10.0 logs a fix after review |
