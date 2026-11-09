---
name: code-design
description: You MUST use this before writing code that adds or changes behaviour. It keeps the code clean with just enough architecture, without classes, layers, files or abstractions that nothing needs. Skip it only for a rename, formatting, documentation, styles, or a question.
metadata:
  author: edezacas
  version: "0.8"
---

The best code is the code never written: solve the whole problem with the least new code, clean and with just enough architecture.

This applies to the tests as well: no helpers, fixtures or layers until they are needed.

## Separate concerns

* Business logic, data access, presentation and external calls each live in their own place.
* Add a layer or module only when a concern has nowhere to go.

## Abstract only what varies today

* No interface, base class or factory with one implementation.

## Choose the smallest form

* A line before a helper, a helper before an abstraction.
* When you abstract or break a convention, say so in your reply.

## Reuse before writing

* Before adding a function, method or service, reuse existing code if it does the job.
* Don't force reuse of code that only looks similar.
* Never add a dependency for a few lines.

## Make operations idempotent

* Running the same operation twice, or again after a crash halfway through, ends in the same state as running it once.

## Comment only what the code cannot say

* A workaround, a hidden invariant or a trade-off.
* Never a ticket or a plan.
