# <Task title>

<!-- The implementer's whole context. At most 120 lines, 60 of them code fragments; a task that does not fit is a stage to split. No open decisions: a task with one is not delegated. -->

## Goal

<The one behaviour this task delivers.>

## Criteria

- **Given** <state, with literal values>, **when** <action>, **then** <observable result, with literal values>

## Behaviour to keep

- <What must still work when this task is done, or `nothing specific`.>

## Decisions

- <Decision this task relies on>: <its reason, or `not stated`.>

## Seam

<The public interface the test goes through, with the signatures and types this task touches, copied from the code or from the task file of the stage that declares them. No bodies of functions this task does not change.>

```
<signatures and types>
```

## Closest test

`<path>`, the test the new ones follow:

```
<excerpt>
```

## Files

- `<path>`: <what changes>. Each new behaviour has its test file; no test is optional.

## Commands

- This task's tests: `<command>`
- Before finishing, each step of the project's gate: `<command>`, `<command>`

## Depends on

- <Tasks that must be finished first, or `none`.>
