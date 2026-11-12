---
name: init-project
description: Guidelines for creating or editing a project's AGENTS.md, with CLAUDE.md as a symbolic link to it. Use when running /init, creating or updating AGENTS.md or CLAUDE.md, or when asked to set up agent configuration files for a project or subdirectory. Do not use it for other documentation such as a README.
metadata:
  author: edezacas
  version: "0.2"
---

# Project agent configuration

`AGENTS.md` gives any agent the context of the project, and it is the only file with content. `CLAUDE.md` is a symbolic link to it, so Claude Code reads the same text.

## Always

- Write the content in `AGENTS.md`, even when the request or `/init` names `CLAUDE.md`.
- Create the link in the same folder with `ln -s AGENTS.md CLAUDE.md`. A subdirectory gets its own pair the same way.
- If `CLAUDE.md` is a real file, move what it says into `AGENTS.md`, merged with what is already there, replace it with the link and say so in your report.
- Leave out what belongs to one tool, such as hooks or permissions, which live in that tool's settings. If one of them changes how to work in the project, it is a gotcha like any other.

## Sections

Write only the ones that have content.

1. `## Overview` says in one or two lines what the project is and what it does.
2. `## Stack` lists the key technologies and versions.
3. `## Commands` gives build, dev, test and lint, taken from the project's manifests.
4. `## Structure` maps the relevant directories.
5. `## Gotchas` holds only what cannot be inferred from the code.

Keep the file under 80 lines, with no snippets except for patterns that are not obvious. Add no style guide or personal preference on your own. When the user asks for one, add it and mention that a formatter or linter would enforce it better.

## agent_docs/

Long instructions on one topic go in `agent_docs/`, in files such as `building.md`, `testing.md`, `architecture.md` and `deployment.md`. `AGENTS.md` points to them and the agent reads the one its task needs.
