---
name: code-design
description: You MUST use this before writing code that adds or changes behaviour. It keeps the code clean with just enough architecture, without classes, layers, files or abstractions that nothing needs. Skip it only for a rename, formatting, documentation, styles, or a question.
metadata:
  author: edezacas
  version: "0.9"
---

The best code is the code never written: solve the whole problem with the least new code, clean and with just enough architecture.

Least code means least complexity, not fewest lines. A few clear lines beat a clever one; three classes to avoid a little duplication are more complexity, not less.

This applies to the tests as well: no helpers, fixtures or layers until they are needed.

## Separate concerns

* Business logic, data access, presentation and external calls stay apart, in the places the code already has.
* Apart does not mean a new class or layer per concern. Add a layer or module only when a concern has nowhere to go.
* Keep together what changes for the same reason. Fewer lines never justify mixing concerns.

## Abstract only what varies today

* No interface, base class or factory with one implementation, except a port at the boundary with an external system (database, network, provider) or where the code already follows that pattern.

## Choose the smallest form

* A line before a helper, a helper before an abstraction.

## Reuse before writing

* Before adding a function, method or service, reuse existing code if it does the job.
* Don't force reuse of code that only looks similar: a little duplication beats a shared helper that ties together things that change for different reasons.
* Never add a dependency for a few lines.

## Keep what already works

* Before changing a signature, a stored format or a message other code reads, find who reads it and keep them working.
* Code that changes what is stored still works with what is already stored.

## Make operations idempotent

* Running the same operation twice, or again after a crash halfway through, ends in the same state as running it once.
* A retry is the same operation; a new request is a new one. Don't deduplicate what the caller means to repeat.

## Comment only what the code cannot say

* A workaround, a hidden invariant or a trade-off.
* Never a ticket or a plan.

## Say what a reviewer could not guess

* In your reply, name each design decision the request did not settle: an abstraction, a broken convention or contract, a trade-off. Skip the obvious ones.
