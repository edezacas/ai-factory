---
name: init-project
description: Guidelines for creating or editing CLAUDE.md and AGENTS.md for a project or subdirectory. Use when running /init, creating or updating CLAUDE.md or AGENTS.md, or when asked to set up agent configuration files for a project.
metadata:
  author: edezacas
  version: "0.1"
---

# Project Agent Configuration Guidelines

Two files, same purpose — give the agent context about the project:

- **`CLAUDE.md`** — read by Claude Code. May include Claude-specific sections (hooks, auto-triggers, tool permissions).
- **`AGENTS.md`** — read by Codex, pi, opencode and other compatible agents. Pure context, no agent-specific syntax.

When both files are needed, generate them together. They share the same core content; only the Claude-specific sections differ.

## Shared structure (no empty sections)

1. `## Overview` — 1-2 lines: what it is and what it does
2. `## Stack` — key technologies and versions
3. `## Commands` — build, dev, test, lint
4. `## Structure` — map of relevant directories
5. `## Gotchas` — only what cannot be inferred from the code

**Limits:** max 80 lines each. No snippets except for non-obvious patterns. No style guides. No personal preferences.

## CLAUDE.md only

Add a `## Claude Code Integration` section if the project uses Claude-specific features (hooks, auto-triggers, tool permissions). Keep it at the end.

## AGENTS.md only

Omit any Claude-specific sections. The file must be readable as plain context by any LLM.

## agent_docs/

For topic-specific instructions the agent decides what to read per task:
`building.md` · `testing.md` · `architecture.md` · `deployment.md`
